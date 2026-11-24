import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import os from "node:os";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import pty from "node-pty";
import * as wisp from "./src/server/index.mjs";

dns.setDefaultResultOrder("ipv4first");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const REQUEST_LOG_FILE = path.join(__dirname, "requests.jsonl");

const MAX_WISP_CONNS_GLOBAL = 60;
const MAX_WISP_CONNS_PER_IP_GUEST = 4;
const MAX_WISP_CONNS_PER_IP_ADMIN = 10;
const GUEST_WISP_IDLE_MS = 5 * 60 * 1000;
const GUEST_WISP_MAX_MS = 30 * 60 * 1000;
const TTY_IDLE_MS = 30 * 60 * 1000;

const rateLimitStore = new Map();
const activeWispByIp = new Map();
let totalActiveWisp = 0;

function getClientIp(req) {
  const cfIp = req.headers["cf-connecting-ip"];
  if (cfIp && typeof cfIp === "string") return cfIp.trim();
  const xff = req.headers["x-forwarded-for"];
  if (xff && typeof xff === "string") return xff.split(",")[0].trim();
  const realIp = req.headers["x-real-ip"];
  if (realIp && typeof realIp === "string") return realIp.trim();
  return req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(bucket, ip, limit, windowMs) {
  const now = Date.now();
  const key = `${bucket}:${ip}`;
  let entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function isRateLimited(bucket, ip, limit) {
  const entry = rateLimitStore.get(`${bucket}:${ip}`);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    rateLimitStore.delete(`${bucket}:${ip}`);
    return false;
  }
  return entry.count >= limit;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expires) activeSessions.delete(token);
  }
}, 5 * 60 * 1000).unref();

function safeComparePassword(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

let currentLogMonth = getCurrentMonthKey();

function ensureCurrentMonthLog() {
  const nowMonth = getCurrentMonthKey();
  try {
    if (fs.existsSync(REQUEST_LOG_FILE)) {
      const stats = fs.statSync(REQUEST_LOG_FILE);
      const mDate = new Date(stats.mtimeMs);
      const fileMonth = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, "0")}`;
      if (fileMonth !== nowMonth) {
        fs.writeFileSync(REQUEST_LOG_FILE, "", "utf8");
      }
    } else {
      fs.writeFileSync(REQUEST_LOG_FILE, "", "utf8");
    }
  } catch (err) {
    console.error("[request-log] Monthly log check failed:", err.message);
  }
  currentLogMonth = nowMonth;
}

function logRequest(type, query) {
  try {
    const nowMonth = getCurrentMonthKey();
    if (nowMonth !== currentLogMonth || !fs.existsSync(REQUEST_LOG_FILE)) {
      ensureCurrentMonthLog();
    }
    const entry = {
      time: new Date().toISOString(),
      month: nowMonth,
      type: String(type || "unknown").slice(0, 32),
      query: String(query || "").slice(0, 512)
    };
    fs.appendFileSync(REQUEST_LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("[request-log] Failed to write request log:", err.message);
  }
}

function getMonthlyRequestStats() {
  const now = new Date();
  const nowMonth = getCurrentMonthKey();
  const todayKey = `${nowMonth}-${String(now.getDate()).padStart(2, "0")}`;
  let total = 0;
  let youtube = 0;
  let proxy = 0;
  let todayTotal = 0;
  let todayYoutube = 0;
  let todayProxy = 0;
  try {
    ensureCurrentMonthLog();
    const raw = fs.readFileSync(REQUEST_LOG_FILE, "utf8");
    if (raw) {
      const lines = raw.split("\n");
      for (const line of lines) {
        if (!line) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.month === nowMonth && (parsed.type === "youtube" || parsed.type === "proxy")) {
            total++;
            if (parsed.type === "youtube") youtube++;
            else if (parsed.type === "proxy") proxy++;

            if (parsed.time) {
              const dt = new Date(parsed.time);
              if (!isNaN(dt.getTime())) {
                const entryDay = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
                if (entryDay === todayKey) {
                  todayTotal++;
                  if (parsed.type === "youtube") todayYoutube++;
                  else if (parsed.type === "proxy") todayProxy++;
                }
              }
            }
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
  return { month: nowMonth, total, youtube, proxy, todayTotal, todayYoutube, todayProxy };
}

ensureCurrentMonthLog();

let ADMINS = {};
if (process.env.ADMINS_JSON) {
  try {
    ADMINS = JSON.parse(process.env.ADMINS_JSON);
    console.log(`[auth] Successfully loaded ${Object.keys(ADMINS).length} admin account(s)`);
  } catch (e) {
    console.error("[auth] FATAL: Failed to parse ADMINS_JSON environment variable:", e.message);
  }
} else {
  console.warn("[auth] Warning: ADMINS_JSON is not configured in .env");
}

wisp.options.dns_method = "resolve";
wisp.options.dns_servers = [
  "1.1.1.3",
  "1.0.0.3",
  "2606:4700:4700::1113",
  "2606:4700:4700::1003"
];

wisp.options.allow_direct_ip = false;
wisp.options.allow_loopback_ips = false;
wisp.options.allow_private_ips = false;

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain"
};

const activeSessions = new Map();

function verifyAuth(req, parsedUrl) {
  let token = null;
  const authHeader = req.headers["authorization"] || req.headers["x-admin-token"];
  if (authHeader) {
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  } else if (parsedUrl && parsedUrl.searchParams.has("token")) {
    token = parsedUrl.searchParams.get("token");
  }

  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    activeSessions.delete(token);
    return false;
  }
  return session;
}

const MAX_TTY_SESSIONS = 4;
const activeTtySessions = new Set();
const ttyWss = new WebSocketServer({ noServer: true });

ttyWss.on("connection", (ws, req, parsedUrl, session) => {
  if (activeTtySessions.size >= MAX_TTY_SESSIONS) {
    console.warn(`[tty] Rejected connection for ${session.username}: maximum TTY sessions reached`);
    ws.close(1013, "Maximum TTY sessions reached");
    return;
  }

  const rawCols = parseInt(parsedUrl.searchParams.get("cols") || "80", 10);
  const rawRows = parseInt(parsedUrl.searchParams.get("rows") || "24", 10);
  const cols = Math.max(20, Math.min(400, isNaN(rawCols) ? 80 : rawCols));
  const rows = Math.max(5, Math.min(200, isNaN(rawRows) ? 24 : rawRows));

  const shell = process.env.SHELL || "/bin/bash";
  const homeDir = os.homedir() || "/home/houjen";
  const ttyEnv = {
    PATH: process.env.PATH || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    HOME: homeDir,
    USER: process.env.USER || "houjen",
    LOGNAME: process.env.LOGNAME || "houjen",
    SHELL: shell,
    LANG: process.env.LANG || "en_US.UTF-8",
    TERM: "xterm-256color",
    COLORTERM: "truecolor"
  };

  let ptyProcess;
  try {
    ptyProcess = pty.spawn(shell, ["-l"], {
      name: "xterm-256color",
      cols,
      rows,
      cwd: homeDir,
      env: ttyEnv
    });
  } catch (err) {
    console.error("[tty] Failed to spawn PTY:", err.message || err);
    ws.close(1011, "Failed to spawn PTY");
    return;
  }

  console.log(`[tty] Session opened for ${session.username} (${cols}x${rows})`);
  activeTtySessions.add(ptyProcess);
  ws.isAlive = true;

  let idleTimer = null;
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (ws.readyState === ws.OPEN) {
        try { ws.send("\r\n[PhosphorOS sudo] Session closed due to inactivity.\r\n"); } catch (_) {}
        ws.close(1000, "Idle timeout");
      }
      try { ptyProcess.kill(); } catch (_) {}
    }, TTY_IDLE_MS);
  };
  resetIdleTimer();

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  const pingTimer = setInterval(() => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  }, 25000);

  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });

  ptyProcess.onExit(() => {
    clearInterval(pingTimer);
    if (idleTimer) clearTimeout(idleTimer);
    activeTtySessions.delete(ptyProcess);
    if (ws.readyState === ws.OPEN) {
      ws.close(1000, "Shell exited");
    }
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "input" && typeof msg.data === "string") {
        resetIdleTimer();
        ptyProcess.write(msg.data);
      } else if (msg.type === "resize") {
        resetIdleTimer();
        const nextCols = Math.max(20, Math.min(400, parseInt(msg.cols, 10) || cols));
        const nextRows = Math.max(5, Math.min(200, parseInt(msg.rows, 10) || rows));
        ptyProcess.resize(nextCols, nextRows);
      }
    } catch (_) {}
  });

  const cleanupTty = () => {
    clearInterval(pingTimer);
    if (idleTimer) clearTimeout(idleTimer);
    activeTtySessions.delete(ptyProcess);
    try { ptyProcess.kill(); } catch (_) {}
  };

  ws.on("close", cleanupTty);
  ws.on("error", cleanupTty);
});

let awsCache = null;
let awsCacheTime = 0;
let awsFetchPromise = null;
const AWS_CACHE_TTL = 6 * 60 * 60 * 1000;

let lastCpuIdle = 0;
let lastCpuTotal = 0;
let lastNetSampleTime = Date.now();
let lastNetStats = {
  enp0s31f6: { rx: 0, tx: 0 },
  wg0: { rx: 0, tx: 0 }
};

function execCommand(cmd, timeoutMs = 10000) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: timeoutMs }, (error, stdout) => {
      resolve(error ? "" : stdout.trim());
    });
  });
}

function formatUptimeSeconds(sec) {
  const totalSec = Math.max(0, Math.floor(sec));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} minute${mins === 1 ? "" : "s"}`);
  return parts.join(", ");
}

async function getSystemTemp() {
  try {
    const zones = await fs.promises.readdir("/sys/class/thermal");
    let fallbackTemp = null;
    for (const z of zones) {
      if (!z.startsWith("thermal_zone")) continue;
      const typePath = path.join("/sys/class/thermal", z, "type");
      const tempPath = path.join("/sys/class/thermal", z, "temp");
      const [zType, zTempRaw] = await Promise.all([
        fs.promises.readFile(typePath, "utf8").catch(() => ""),
        fs.promises.readFile(tempPath, "utf8").catch(() => "")
      ]);
      const milliC = parseInt(zTempRaw.trim(), 10);
      if (!isNaN(milliC) && milliC > 0) {
        const c = `${(milliC / 1000).toFixed(1)} C`;
        if (/x86_pkg_temp|cpu|core|k10temp|acpitz/i.test(zType)) return c;
        if (!fallbackTemp) fallbackTemp = c;
      }
    }
    if (fallbackTemp) return fallbackTemp;
  } catch (_) {}

  try {
    const hwmons = await fs.promises.readdir("/sys/class/hwmon");
    for (const h of hwmons) {
      const temp1 = await fs.promises.readFile(path.join("/sys/class/hwmon", h, "temp1_input"), "utf8").catch(() => "");
      const milliC = parseInt(temp1.trim(), 10);
      if (!isNaN(milliC) && milliC > 0 && milliC < 125000) {
        return `${(milliC / 1000).toFixed(1)} C`;
      }
    }
  } catch (_) {}

  const out = await execCommand("sensors 2>/dev/null | grep -m1 -oE '[+-]?[0-9]+(\\.[0-9]+)?°C' || true");
  return out || "N/A";
}

async function fetchEc2Telemetry(ec2Id) {
  if (!ec2Id || ec2Id === "N/A" || ec2Id === "None") {
    return null;
  }
  const TARGET_USER = "houjen";
  const TARGET_HOME = `/home/${TARGET_USER}`;
  const AWS = `sudo -u ${TARGET_USER} HOME=${TARGET_HOME} PATH=$PATH:/usr/local/bin:/usr/bin aws`;

  const ssmScript = 'M=$(free -m | awk \'/^Mem:/{printf "%.1f%%", ($3/$2)*100}\'); S=$(free -m | awk \'/^Swap:/{if($2>0) printf "%.1f%%", ($3/$2)*100; else print "OFF"}\'); D=$(df -k / | awk \'NR==2{p=($3/$2)*100; t=$2/1024; if(t>=1024) printf "%.1f%% of %.2fGB", p, t/1024; else printf "%.1f%% of %.0fMB", p, t}\'); L=$(cut -d" " -f1-3 /proc/loadavg); P=$(ps -e --no-headers | wc -l); T=$(cat /sys/class/thermal/thermal_zone*/temp /sys/class/hwmon/hwmon*/temp*_input 2>/dev/null | awk \'$1>0 && $1<125000{printf "%.1f C", $1/1000; exit}\'); [ -z "$T" ] && T="N/A"; N=$(systemctl is-active nginx 2>/dev/null); N=${N:-unknown}; W=$(systemctl is-active wg-quick@wg0 2>/dev/null); W=${W:-unknown}; C=$(systemctl is-active crowdsec 2>/dev/null); C=${C:-unknown}; echo "${M}|${S}|${D}|${L}|${P}|${T}|${N}/${W}/${C}"';
  const paramsJson = JSON.stringify({ commands: [ssmScript] });
  const paramsArg = "'" + paramsJson.replace(/'/g, "'\\''") + "'";

  const cmdId = await execCommand(
    `${AWS} ssm send-command --instance-ids "${ec2Id}" --document-name "AWS-RunShellScript" --parameters ${paramsArg} --query "Command.CommandId" --output text 2>/dev/null`,
    15000
  );
  if (!cmdId || cmdId === "None") return null;

  await execCommand(
    `${AWS} ssm wait command-executed --command-id "${cmdId}" --instance-id "${ec2Id}" 2>/dev/null || true`,
    25000
  );
  const ssmOut = await execCommand(
    `${AWS} ssm get-command-invocation --command-id "${cmdId}" --instance-id "${ec2Id}" --query "StandardOutputContent" --output text 2>/dev/null`,
    15000
  );
  if (!ssmOut || !ssmOut.includes("|")) return null;

  const ssmParts = ssmOut.replace(/[\r\n]/g, "").split("|");
  return {
    ec2Mem: ssmParts[0] || "Unavailable",
    ec2Swap: ssmParts[1] || "N/A",
    ec2Disk: ssmParts[2] || "N/A",
    ec2Load: ssmParts[3] || "N/A",
    ec2Processes: ssmParts[4] || "N/A",
    ec2Temp: ssmParts[5] || "N/A",
    ec2Services: ssmParts[6] || "N/A"
  };
}

function refreshAwsCache() {
  if (awsFetchPromise) return awsFetchPromise;

  awsFetchPromise = (async () => {
    try {
      const TARGET_USER = "houjen";
      const TARGET_HOME = `/home/${TARGET_USER}`;
      const AWS = `sudo -u ${TARGET_USER} HOME=${TARGET_HOME} PATH=$PATH:/usr/local/bin:/usr/bin aws`;

      const nowDate = new Date();
      const sYear = nowDate.getFullYear();
      const sMonth = String(nowDate.getMonth() + 1).padStart(2, "0");
      const sDate = `${sYear}-${sMonth}-01`;
      const nextDate = new Date(sYear, nowDate.getMonth() + 1, 1);
      const eDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-01`;

      const [ec2Out, cfOut, accountIdOut] = await Promise.all([
        execCommand(
          `${AWS} ec2 describe-instances --filters "Name=instance-state-name,Values=running,stopped,pending" --query "Reservations[0].Instances[0].[PublicIpAddress,State.Name,InstanceId,InstanceType,Placement.AvailabilityZone]" --output text 2>/dev/null`,
          15000
        ),
        execCommand(
          `${AWS} cloudfront list-distributions --query "DistributionList.Items[0].[Status,Id,DomainName]" --output text 2>/dev/null`,
          15000
        ),
        execCommand(
          `${AWS} sts get-caller-identity --query "Account" --output text 2>/dev/null`,
          10000
        )
      ]);

      const ec2Parts = ec2Out && ec2Out !== "None" ? ec2Out.split(/\s+/) : [];
      const ec2Ip = ec2Parts[0] || "N/A";
      const ec2State = ec2Parts[1] || "Not Found";
      const ec2Id = ec2Parts[2] || "N/A";
      const ec2Type = ec2Parts[3] || "N/A";
      const ec2Az = ec2Parts[4] || "N/A";

      const cfParts = cfOut && cfOut !== "None" ? cfOut.split(/\s+/) : [];
      const cfStatus = cfParts[0] || "None";
      const cfId = cfParts[1] || "N/A";
      const cfDomain = cfParts[2] || "";

      const accountId = accountIdOut && /^\d{12}$/.test(accountIdOut.trim()) ? accountIdOut.trim() : "";
      let budgetOut = "";
      if (accountId) {
        budgetOut = await execCommand(
          `${AWS} budgets describe-budgets --account-id "${accountId}" --query "Budgets[?BudgetType=='COST'] | [0].[CalculatedSpend.ActualSpend.Amount,CalculatedSpend.ForecastedSpend.Amount,CostTypes.UseBlended]" --output text 2>/dev/null`,
          15000
        );
      }

      const formatUsd = (val) => {
        if (!val || val === "None") return null;
        const parsed = parseFloat(val);
        if (isNaN(parsed)) return null;
        const clean = Math.abs(parsed) < 0.005 ? 0 : parsed;
        return `$${clean.toFixed(2)} USD`;
      };

      const bParts = budgetOut && budgetOut !== "None" ? budgetOut.split(/\s+/) : [];
      const budgetActual = formatUsd(bParts[0]);
      const budgetForecast = formatUsd(bParts[1]);
      const useBlended = bParts[2] === "True";

      const costTotal = budgetActual || "N/A";
      const costUnblended = (!useBlended && budgetActual) ? budgetActual : "N/A";
      const costEstimated = budgetForecast || budgetActual || "N/A";

      const telemetry = ec2State === "running" ? await fetchEc2Telemetry(ec2Id) : null;

      awsCache = {
        ec2Ip,
        ec2State,
        ec2Id,
        ec2Type,
        ec2Az,
        cfStatus,
        cfId,
        cfDomain,
        cfWss: cfDomain ? `wss://${cfDomain}/wisp/` : "None",
        costTotal,
        costUnblended,
        costEstimated,
        costPeriod: `${sDate} to ${eDate}`,
        ec2Mem: telemetry ? telemetry.ec2Mem : "Unavailable",
        ec2Swap: telemetry ? telemetry.ec2Swap : "N/A",
        ec2Disk: telemetry ? telemetry.ec2Disk : "N/A",
        ec2Load: telemetry ? telemetry.ec2Load : "N/A",
        ec2Processes: telemetry ? telemetry.ec2Processes : "N/A",
        ec2Temp: telemetry ? telemetry.ec2Temp : "N/A",
        ec2Services: telemetry ? telemetry.ec2Services : "N/A"
      };
      awsCacheTime = Date.now();
    } catch (e) {
      console.error("AWS Cache update failed:", e.message);
    } finally {
      awsFetchPromise = null;
    }
  })();

  return awsFetchPromise;
}

function getCpuUsageInstant() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) total += cpu.times[type];
    idle += cpu.times.idle;
  }
  if (lastCpuTotal === 0) {
    lastCpuIdle = idle;
    lastCpuTotal = total;
    return { percent: 0, formatted: "0.0%" };
  }
  const idleDiff = idle - lastCpuIdle;
  const totalDiff = total - lastCpuTotal;
  lastCpuIdle = idle;
  lastCpuTotal = total;

  const usage = totalDiff > 0 ? Math.max(0, Math.min(100, 100 - (100 * idleDiff / totalDiff))) : 0;
  return { percent: parseFloat(usage.toFixed(1)), formatted: `${usage.toFixed(1)}%` };
}

async function getNetworkRates() {
  const now = Date.now();
  const timeDeltaSec = Math.max(0.1, (now - lastNetSampleTime) / 1000);
  lastNetSampleTime = now;

  let procNet = "";
  try {
    procNet = await fs.promises.readFile("/proc/net/dev", "utf8");
  } catch (_) {}

  const parseInterface = (name) => {
    const regex = new RegExp(`^\\s*${name}:\\s*(\\d+)(?:\\s+\\d+){7}\\s+(\\d+)`, "m");
    const match = procNet.match(regex);
    if (!match) return { rx: 0, tx: 0 };
    return { rx: parseInt(match[1], 10), tx: parseInt(match[2], 10) };
  };

  const currEnp = parseInterface("enp0s31f6");
  const currWg = parseInterface("wg0");

  const calcRate = (curr, last) => {
    if (last === 0) return 0;
    const bytesSec = Math.max(0, curr - last) / timeDeltaSec;
    return parseFloat((bytesSec / 1024).toFixed(1));
  };

  const formatRate = (kb) => {
    if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB/s`;
    return `${kb.toFixed(1)} KB/s`;
  };

  const enpRxRate = calcRate(currEnp.rx, lastNetStats.enp0s31f6.rx);
  const enpTxRate = calcRate(currEnp.tx, lastNetStats.enp0s31f6.tx);
  const wgRxRate = calcRate(currWg.rx, lastNetStats.wg0.rx);
  const wgTxRate = calcRate(currWg.tx, lastNetStats.wg0.tx);

  lastNetStats.enp0s31f6 = currEnp;
  lastNetStats.wg0 = currWg;

  const netInterfaces = os.networkInterfaces();
  const iface = netInterfaces["enp0s31f6"];
  const ipv4 = iface ? iface.find(i => i.family === "IPv4" && !i.internal) : null;

  return {
    enp0s31f6: {
      ip: ipv4 ? ipv4.address : "No IPv4",
      rxRate: enpRxRate,
      txRate: enpTxRate,
      rxRateFormatted: formatRate(enpRxRate),
      txRateFormatted: formatRate(enpTxRate)
    },
    wg0: {
      rxRate: wgRxRate,
      txRate: wgTxRate,
      rxRateFormatted: formatRate(wgRxRate),
      txRateFormatted: formatRate(wgTxRate)
    }
  };
}

function parseBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error("Payload too large"));
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(new Error("Invalid JSON: " + err.message));
      }
    });
    req.on("error", reject);
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = parsedUrl.pathname;
  const clientIp = getClientIp(req);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
    });
    res.end();
    return;
  }

  if (pathname === "/api/admin/tty" || pathname === "/api/admin/tty/") {
    return sendJSON(res, 426, { error: "WebSocket Upgrade required" });
  }

  if (pathname === "/api/health" && req.method === "GET") {
    const ytConfigured = Boolean(process.env.YOUTUBE_KEY);
    const geminiConfigured = Boolean(process.env.GEMINI_KEY);

    return sendJSON(res, 200, {
      youtube: ytConfigured ? "OK" : "MISSING_KEY",
      gemini: geminiConfigured ? "OK" : "MISSING_KEY",
      wisp: "ONLINE"
    });
  }

  if (pathname === "/api/track" && req.method === "POST") {
    if (!checkRateLimit("track", clientIp, 30, 60 * 1000)) {
      return sendJSON(res, 429, { error: "Rate limit exceeded" });
    }
    try {
      const body = await parseBody(req, 16 * 1024);
      if (body.type === "proxy") {
        logRequest("proxy", body.query || "");
      }
      return sendJSON(res, 200, { success: true });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  if (pathname === "/api/login" && req.method === "POST") {
    if (!checkRateLimit("login", clientIp, 5, 15 * 60 * 1000)) {
      return sendJSON(res, 429, { error: "Too many login attempts. Try again later." });
    }
    try {
      const body = await parseBody(req, 8 * 1024);
      const { username, password } = body;

      if (username && ADMINS[username] && safeComparePassword(password, ADMINS[username].password)) {
        const token = crypto.randomUUID();
        activeSessions.set(token, {
          username: username,
          expires: Date.now() + 24 * 60 * 60 * 1000
        });
        return sendJSON(res, 200, { success: true, message: "Authenticated", user: username, token: token });
      }
      return sendJSON(res, 401, { error: "Invalid username or password" });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  if (pathname === "/api/gemini" && req.method === "POST") {
    if (!checkRateLimit("gemini", clientIp, 20, 60 * 1000)) {
      return sendJSON(res, 429, { error: "Rate limit exceeded" });
    }
    try {
      if (!process.env.GEMINI_KEY) {
        return sendJSON(res, 500, { error: "GEMINI_KEY not configured on server" });
      }
      const body = await parseBody(req, 512 * 1024);
      const models = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
      let lastStatus = 502;
      let lastData = { error: "Upstream Gemini request failed" };

      for (const model of models) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_KEY}`;
        try {
          const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(7000)
          });
          const rawText = await response.text();
          let data;
          try {
            data = rawText ? JSON.parse(rawText) : {};
          } catch (_) {
            data = { error: "Non-JSON response from Gemini", raw: rawText.slice(0, 200) };
          }
          lastStatus = response.status;
          lastData = data;
          if (response.ok) {
            return sendJSON(res, response.status, data);
          }
          if (![429, 500, 502, 503, 504].includes(response.status)) {
            return sendJSON(res, response.status, data);
          }
        } catch (modelErr) {
          lastStatus = 504;
          lastData = { error: "Gemini request timed out or failed", details: modelErr.message };
        }
      }
      return sendJSON(res, lastStatus, lastData);
    } catch (err) {
      console.error("[gemini-gateway] Execution error:", err.message);
      return sendJSON(res, 504, { error: "Gemini request timed out or failed", details: err.message });
    }
  }

  if (pathname === "/api/youtube" && req.method === "GET") {
    if (!checkRateLimit("youtube", clientIp, 20, 60 * 1000)) {
      return sendJSON(res, 429, { error: "Rate limit exceeded" });
    }
    try {
      const query = parsedUrl.searchParams.get("q");
      if (!query) return sendJSON(res, 400, { error: "Missing query parameter 'q'" });
      logRequest("youtube", query);
      if (!process.env.YOUTUBE_KEY) return sendJSON(res, 500, { error: "YOUTUBE_KEY not configured on server" });

      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=24&type=video&safeSearch=moderate&q=${encodeURIComponent(query)}&key=${process.env.YOUTUBE_KEY}`;
      const response = await fetch(ytUrl, { signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      return sendJSON(res, response.status, data);
    } catch (err) {
      return sendJSON(res, 500, { error: "YouTube request failed", details: err.message });
    }
  }

  if (pathname === "/api/admin/costs" && req.method === "GET") {
    if (!verifyAuth(req, parsedUrl)) {
      return sendJSON(res, 401, { error: "Unauthorized: Admin authentication required" });
    }

    try {
      const isDetails = parsedUrl.searchParams.get("details") === "true";
      const cpu = getCpuUsageInstant();
      const netRates = await getNetworkRates();

      const pm2Promise = execCommand(
        `sudo -u houjen PM2_HOME="/home/houjen/.pm2" PATH="$PATH:/usr/local/bin:/usr/bin" pm2 pid terminal 2>/dev/null`
      );
      const wgPromise = execCommand(
        `sudo -n wg show all latest-handshakes 2>/dev/null || sudo -n wg show wg0 latest-handshakes 2>/dev/null || wg show all latest-handshakes 2>/dev/null || wg show wg0 latest-handshakes 2>/dev/null`
      );

      const [pm2Pid, wgHandshake] = await Promise.all([pm2Promise, wgPromise]);
      const pm2Status = (pm2Pid && parseInt(pm2Pid, 10) > 0) ? `online (PID ${pm2Pid})` : "stopped";

      let wgStatus = "Disconnected";
      if (wgHandshake) {
        const timestamps = wgHandshake.match(/\b\d{10}\b/g);
        if (timestamps && timestamps.length > 0) {
          const latest = Math.max(...timestamps.map(Number));
          if (latest > 0) {
            const ago = Math.max(0, Math.floor(Date.now() / 1000) - latest);
            wgStatus = `Active (${ago}s ago)`;
          }
        }
      }

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memGb = (usedMem / (1024 ** 3)).toFixed(2);
      const totalGb = (totalMem / (1024 ** 3)).toFixed(2);
      const memPercent = parseFloat(((usedMem / totalMem) * 100).toFixed(1));
      const memStatus = `${memGb} GB / ${totalGb} GB (${memPercent}%)`;

      const now = Date.now();
      const isExpired = !awsCache || (now - awsCacheTime > AWS_CACHE_TTL);

      if (isDetails && !awsCache) {
        await refreshAwsCache();
      } else if (isExpired) {
        refreshAwsCache();
      }

      let detailsPayload;
      if (isDetails) {
        const ec2TelemetryPromise = (awsCache && awsCache.ec2State === "running")
          ? fetchEc2Telemetry(awsCache.ec2Id)
          : Promise.resolve(null);

        const cfPingPromise = (awsCache && awsCache.cfDomain)
          ? fetch(`https://${awsCache.cfDomain}/api/health`, { signal: AbortSignal.timeout(3500) })
              .then(r => r.ok)
              .catch(() => false)
          : Promise.resolve(awsCache ? awsCache.cfStatus === "Deployed" : false);

        const [tempOut, dfOut, swapOut, procOut, updatesRaw, aptCheckOut, esmUpgradeCount, liveEc2, cfPingOk] = await Promise.all([
          getSystemTemp(),
          execCommand(`df -k / | awk 'NR==2{p=($3/$2)*100; t=$2/1024; if(t>=1024) printf "%.1f%% of %.2fGB", p, t/1024; else printf "%.1f%% of %.0fMB", p, t}'`),
          execCommand(`free -m | awk '/^Swap:/{if($2>0) printf "%.1f%%", ($3/$2)*100; else print "OFF"}'`),
          execCommand(`ps -e --no-headers | wc -l`),
          fs.promises.readFile("/var/lib/update-notifier/updates-available", "utf8").catch(() => ""),
          execCommand(`/usr/lib/update-notifier/apt-check 2>&1 || true`),
          execCommand(`apt-get -s -o Debug::NoLocking=true upgrade 2>/dev/null | grep -cE '^Inst .*esm' || true`),
          ec2TelemetryPromise,
          cfPingPromise
        ]);

        if (liveEc2 && awsCache) {
          Object.assign(awsCache, liveEc2);
        }

        const totalMatch = updatesRaw.match(/(\d+)\s+(?:updates?\s+can\s+be\s+applied|packages?\s+can\s+be\s+updated)/i);
        const secMatch = updatesRaw.match(/(\d+)\s+(?:of\s+these\s+updates?\s+(?:is|are)\s+(?:a\s+)?(?:standard\s+)?security|updates?\s+(?:is|are)\s+(?:a\s+)?security)/i);
        const esmMatch = updatesRaw.match(/(\d+)\s+(?:additional\s+)?(?:security\s+)?updates?\s+(?:can\s+be\s+applied\s+(?:with|via)|require)\s+ESM/i);
        const esmEnabled = /Expanded Security Maintenance.*?is enabled/i.test(updatesRaw);

        const aptParts = (aptCheckOut.match(/(\d+);(\d+)/) || []);
        const totalUpdates = totalMatch ? parseInt(totalMatch[1], 10) : (aptParts[1] ? parseInt(aptParts[1], 10) : 0);
        const securityUpdates = secMatch ? parseInt(secMatch[1], 10) : (aptParts[2] ? parseInt(aptParts[2], 10) : 0);
        const parsedEsmCount = parseInt(esmUpgradeCount, 10);
        const esmUpdates = esmMatch ? parseInt(esmMatch[1], 10) : (!isNaN(parsedEsmCount) ? parsedEsmCount : 0);

        const updatesSummary = `${totalUpdates} total, ${securityUpdates} security, ${esmUpdates} ESM (${esmEnabled ? "enabled" : "disabled"})`;

        const ec2Svc = String((awsCache && awsCache.ec2Services) || "").split("/");
        const ec2Responsive = Boolean(awsCache && awsCache.ec2State === "running" && liveEc2 && ec2Svc[0] === "active" && ec2Svc[1] === "active");
        const cfResponsive = Boolean(awsCache && awsCache.cfStatus === "Deployed" && cfPingOk);

        detailsPayload = {
          load: os.loadavg().map(n => n.toFixed(2)).join(" "),
          disk: dfOut || "N/A",
          mem: `${memPercent}%`,
          swap: swapOut || "N/A",
          temperature: tempOut,
          processes: procOut || "N/A",
          updates: updatesSummary,
          requests: getMonthlyRequestStats(),
          ping: {
            home: pm2Status.startsWith("online"),
            ec2: ec2Responsive,
            cloudfront: cfResponsive
          }
        };
      }

      return sendJSON(res, 200, {
        system: {
          pm2: pm2Status,
          wireguard: wgStatus,
          cpu: cpu.formatted,
          cpuVal: cpu.percent,
          memory: memStatus,
          memPercent: memPercent,
          network: `${netRates.enp0s31f6.ip} (UP | RX: ${netRates.enp0s31f6.rxRateFormatted}, TX: ${netRates.enp0s31f6.txRateFormatted})`,
          interfaces: netRates
        },
        aws: awsCache || {
          ec2Ip: "Updating...",
          ec2State: "...",
          ec2Id: "N/A",
          ec2Type: "N/A",
          ec2Az: "N/A",
          cfStatus: "...",
          cfId: "N/A",
          cfDomain: "",
          cfWss: "Updating...",
          costTotal: "Updating / Pending",
          costUnblended: "Updating / Pending",
          costEstimated: "Updating / Pending",
          costPeriod: "N/A",
          ec2Mem: "Updating...",
          ec2Swap: "N/A",
          ec2Disk: "N/A",
          ec2Load: "N/A",
          ec2Processes: "N/A",
          ec2Temp: "N/A",
          ec2Services: "N/A"
        },
        details: detailsPayload
      });
    } catch (err) {
      return sendJSON(res, 500, { error: "Failed to gather admin health metrics", details: err.message });
    }
  }

  if (pathname === "/") pathname = "/index.html";
  const targetFile = path.resolve(PUBLIC_DIR, "." + pathname);

  if (!targetFile.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.stat(targetFile, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    const stream = fs.createReadStream(targetFile);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
    });
    stream.pipe(res);
  });
});

server.on("upgrade", (req, socket, head) => {
  socket.on("error", (err) => {
    console.error("[websocket]", err.message);
  });

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const clientIp = getClientIp(req);

  if (parsedUrl.pathname === "/api/admin/tty" || parsedUrl.pathname === "/api/admin/tty/") {
    if (isRateLimited("tty-fail", clientIp, 10) || !checkRateLimit("tty-upgrade", clientIp, 30, 5 * 60 * 1000)) {
      socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    const session = verifyAuth(req, parsedUrl);
    if (!session) {
      checkRateLimit("tty-fail", clientIp, 10, 15 * 60 * 1000);
      console.warn(`[tty] Rejected unauthenticated upgrade from ${clientIp}`);
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    ttyWss.handleUpgrade(req, socket, head, (ws) => {
      ttyWss.emit("connection", ws, req, parsedUrl, session);
    });
    return;
  }

  if (parsedUrl.pathname.startsWith("/wisp")) {
    if (!checkRateLimit("wisp-upgrade", clientIp, 30, 60 * 1000)) {
      socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const isAdminConn = Boolean(verifyAuth(req, parsedUrl));
    const currentIpCount = activeWispByIp.get(clientIp) || 0;
    const maxPerIp = isAdminConn ? MAX_WISP_CONNS_PER_IP_ADMIN : MAX_WISP_CONNS_PER_IP_GUEST;

    if (totalActiveWisp >= MAX_WISP_CONNS_GLOBAL) {
      socket.write("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    if (currentIpCount >= maxPerIp) {
      socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    totalActiveWisp++;
    activeWispByIp.set(clientIp, currentIpCount + 1);

    let released = false;
    let wispIdleTimer = null;
    let wispMaxTimer = null;

    const releaseWisp = () => {
      if (released) return;
      released = true;
      if (wispIdleTimer) clearTimeout(wispIdleTimer);
      if (wispMaxTimer) clearTimeout(wispMaxTimer);
      totalActiveWisp = Math.max(0, totalActiveWisp - 1);
      const nextCount = (activeWispByIp.get(clientIp) || 1) - 1;
      if (nextCount <= 0) activeWispByIp.delete(clientIp);
      else activeWispByIp.set(clientIp, nextCount);
    };

    if (!isAdminConn) {
      const resetWispIdle = () => {
        if (wispIdleTimer) clearTimeout(wispIdleTimer);
        wispIdleTimer = setTimeout(() => {
          try { socket.destroy(); } catch (_) {}
        }, GUEST_WISP_IDLE_MS);
      };
      resetWispIdle();
      socket.on("data", resetWispIdle);
      wispMaxTimer = setTimeout(() => {
        try { socket.destroy(); } catch (_) {}
      }, GUEST_WISP_MAX_MS);
    }

    socket.once("close", releaseWisp);
    socket.once("error", releaseWisp);

    const profileParam = parsedUrl.searchParams.get("profile");
    if (profileParam) req.profile = profileParam;
    else if (parsedUrl.searchParams.get("tor") === "true") req.profile = "tor";
    else req.profile = "warp";

    req.useTor = (req.profile === "tor");
    wisp.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[terminal] Listening on port ${PORT}`);
  refreshAwsCache();
});
