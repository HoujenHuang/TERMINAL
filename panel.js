// Battery saver
let isActive = true;
let isTabVisible = !document.hidden;
let tabHiddenTime = 0;

document.addEventListener("visibilitychange", () => {
 const now = performance.now();
 if (document.hidden) {
   isTabVisible = false;
   tabHiddenTime = now;
 } else {
   isTabVisible = true;
   if (tabHiddenTime > 0) {
     const timeHidden = now - tabHiddenTime;
     pauseChartTimeline(timeHidden);
     tabHiddenTime = 0;
   }
   if (start && typeof resumeFPS === "function") {
     resumeFPS();
   }
 }
});

function toggleBatterySaver() {
 isActive = !isActive;

 if (!isActive) {
   Object.values(charts).forEach(chart => {
     const ctx = chart.el.getContext("2d");
     ctx.clearRect(0, 0, chart.el.width, chart.el.height);
   });
   closeSide();
 } else if (!document.hidden && typeof resumeFPS === "function") {
   resumeFPS();
 }
}

function shouldRun() {
 return isActive && isTabVisible;
}

// Time
let isTimeInit = false;

function displayTime() {
 if (!shouldRun()) {
   document.getElementById("clock").innerText = "00:00:00";
   return;
 }

 const now = new Date();

 let hours = now.getHours();
 let minutes = now.getMinutes();
 let seconds = now.getSeconds();

 minutes = minutes < 10 ? "0" + minutes : minutes;
 seconds = seconds < 10 ? "0" + seconds : seconds;

 const timeString = hours + ":" + minutes + ":" + seconds;

 document.getElementById("clock").innerText = timeString;

 if (!isTimeInit) {
   load(`[ OK ] Clock initialized: ${timeString}`);
   isTimeInit = true;
 }
}

// Date
function displayDate() {
 const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

 const d = new Date();

 let year = d.getFullYear();
 document.getElementById("year").textContent = year;

 let month = months[d.getMonth()];
 document.getElementById("month").textContent = month;

 let day = d.getDate();
 document.getElementById("day").textContent = day;

 load(`[ OK ] Date initialized: ${day} ${month} ${year}`);
}

// Uptime
let isUptimeInit = false;

let totalSeconds = 0;
const timerElement = document.getElementById("timer");

function updateTimer() {
 if (!shouldRun()) {
   timerElement.innerText = "00:00:00";
   return;
 }

 totalSeconds++;

 let hours = Math.floor(totalSeconds / 3600);
 let minutes = Math.floor((totalSeconds % 3600) / 60);
 let seconds = totalSeconds % 60;

 let hDisplay = hours.toString().padStart(2, "0");
 let mDisplay = minutes.toString().padStart(2, "0");
 let sDisplay = seconds.toString().padStart(2, "0");

 timerElement.textContent = `${hDisplay}:${mDisplay}:${sDisplay}`;

 if (!isUptimeInit) {
   load(`[ OK ] Uptime initialized: ${hDisplay}:${mDisplay}:${sDisplay}`);
   isUptimeInit = true;
 }
}

// Browser
function checkBrowser() {
 const browser = document.getElementById("browser");
 const userAgent = navigator.userAgent;

 if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
   browser.textContent = "CHROME";
   load(`[ OK ] Operating System fetched: ${userAgent}`);
 } else if (userAgent.includes("Firefox")) {
   browser.textContent = "FIREFOX ⚠";
   load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
 } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
   browser.textContent = "SAFARI ⚠";
   load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
 } else if (userAgent.includes("Edg")) {
   browser.textContent = "EDGE";
   load(`[ OK ] Operating System fetched: ${userAgent}`);
 } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
   browser.textContent = "OPERA";
   load(`[ OK ] Operating System fetched: ${userAgent}`);
 } else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
   browser.textContent = "IE ⚠";
   load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
 } else {
   browser.textContent = "UNKNOWN ⚠";
   load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
 }
}

// Charts
const charts = {
 fps: {
   el: document.getElementById("fpsChart"),
   text: document.getElementById("fpsText"),
   history: [],
   currentVal: 60,
   targetVal: 60,
   max: 60,
   targetMax: 60,
   timeWindow: 30000,
   inverted: false
 },
 memory: {
   el: document.getElementById("memChart"),
   history: [],
   currentVal: 0,
   targetVal: 0,
   max: 20,
   targetMax: 20,
   timeWindow: 60000,
   inverted: false
 },
 speedUp: {
   el: document.getElementById("speedUpChart"),
   history: [],
   currentVal: 0,
   targetVal: 0,
   max: 10,
   targetMax: 10,
   timeWindow: 60000,
   inverted: false
 },
 speedDown: {
   el: document.getElementById("speedDownChart"),
   history: [],
   currentVal: 0,
   targetVal: 0,
   max: 10,
   targetMax: 10,
   timeWindow: 60000,
   inverted: true
 }
};

function pauseChartTimeline(duration) {
 if (duration <= 0) return;
 Object.values(charts).forEach(chart => {
   if (!chart || !chart.history) return;
   for (let i = 0; i < chart.history.length; i++) {
     chart.history[i].time += duration;
   }
 });
}

function pushChartMetric(key, value) {
 const chart = charts[key];
 if (!chart) return;

 const now = performance.now();
 const safeVal = Math.max(0, Number(value) || 0);

 chart.targetVal = safeVal;
 chart.history.push({ time: now, val: safeVal });

 const minCeiling = key === "fps" ? 60 : (key === "memory" ? 20 : 5);
 let peak = minCeiling;
 for (let i = 0; i < chart.history.length; i++) {
   if (chart.history[i].val > peak) peak = chart.history[i].val;
 }
 chart.targetMax = Math.max(minCeiling, Math.ceil(peak * 1.25));
}

function drawGraph(key, value) {
 if (key === "speed") {
   pushChartMetric("speedDown", value);
 } else {
   pushChartMetric(key, value);
 }
}

function resizeHiDpiCanvas(canvas) {
 const dpr = window.devicePixelRatio || 1;
 const displayWidth = Math.round(canvas.clientWidth || 100);
 const displayHeight = Math.round(canvas.clientHeight || 85);

 const targetPixelWidth = Math.round(displayWidth * dpr);
 const targetPixelHeight = Math.round(displayHeight * dpr);

 const ctx = canvas.getContext("2d");
 if (Math.abs(canvas.width - targetPixelWidth) > 2 || Math.abs(canvas.height - targetPixelHeight) > 2) {
   canvas.width = targetPixelWidth;
   canvas.height = targetPixelHeight;
   ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
 }
 return { ctx, width: displayWidth, height: displayHeight };
}

function parseRgbComponents(colorStr) {
 const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
 if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
 if (colorStr.startsWith("#")) {
   let hex = colorStr.slice(1);
   if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
   const num = parseInt(hex, 16);
   return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
 }
 return [51, 255, 51];
}

function renderChart(key, now) {
 const chart = charts[key];
 if (!chart || !chart.el) return;

 const { ctx, width, height } = resizeHiDpiCanvas(chart.el);
 if (width <= 0 || height <= 0) return;

 const oldestAllowed = now - chart.timeWindow - 4000;
 while (chart.history.length > 0 && chart.history[0].time < oldestAllowed) {
   chart.history.shift();
 }

 chart.max += (chart.targetMax - chart.max) * 0.05;
 const safeMax = Math.max(1, chart.max || 1);
 chart.currentVal += (chart.targetVal - chart.currentVal) * 0.12;

 const padLeft = 34;
 const padRight = 8;
 const padTop = 6;
 const padBottom = 16;
 const plotWidth = Math.max(10, width - padLeft - padRight);
 const plotHeight = Math.max(10, height - padTop - padBottom);

 const style = getComputedStyle(document.documentElement);
 const themeColor = style.getPropertyValue("--theme").trim() || "rgb(51, 255, 51)";
 const [tr, tg, tb] = parseRgbComponents(themeColor);

 ctx.clearRect(0, 0, width, height);

 ctx.lineWidth = 1;
 ctx.strokeStyle = `rgba(${tr}, ${tg}, ${tb}, 0.12)`;
 ctx.setLineDash([]);

 const gridStepsY = 2;
 ctx.beginPath();
 for (let i = 0; i <= gridStepsY; i++) {
   const y = Math.round(padTop + (plotHeight / gridStepsY) * i) + 0.5;
   ctx.moveTo(padLeft, y);
   ctx.lineTo(padLeft + plotWidth, y);
 }

 const gridStepsX = 4;
 for (let i = 0; i <= gridStepsX; i++) {
   const x = Math.round(padLeft + (plotWidth / gridStepsX) * i) + 0.5;
   ctx.moveTo(x, padTop);
   ctx.lineTo(x, padTop + plotHeight);
 }
 ctx.stroke();

 ctx.fillStyle = themeColor;
 ctx.font = "8px 'Courier New', monospace";
 ctx.textBaseline = "middle";
 ctx.textAlign = "right";

 if (chart.inverted) {
   ctx.fillText("0", padLeft - 4, padTop + 2);
   ctx.fillText(Math.round(safeMax).toString(), padLeft - 4, padTop + plotHeight);
 } else {
   ctx.fillText(Math.round(safeMax).toString(), padLeft - 4, padTop + 2);
   ctx.fillText("0", padLeft - 4, padTop + plotHeight);
 }

 ctx.textAlign = "left";
 ctx.textBaseline = "top";
 ctx.fillText(`-${Math.round(chart.timeWindow / 1000)}s`, padLeft, padTop + plotHeight + 3);
 ctx.textAlign = "right";
 ctx.fillText("now", padLeft + plotWidth, padTop + plotHeight + 3);

 ctx.save();
 ctx.beginPath();
 ctx.rect(padLeft - 1, padTop - 1, plotWidth + 3, plotHeight + 2);
 ctx.clip();

 const getCoordinates = (timestamp, value) => {
   const progress = (timestamp - (now - chart.timeWindow)) / chart.timeWindow;
   const x = padLeft + progress * plotWidth;
   const normalizedVal = Math.min(Math.max(value, 0), safeMax);

   let y;
   if (chart.inverted) {
     y = padTop + (normalizedVal / safeMax) * plotHeight;
   } else {
     y = (padTop + plotHeight) - (normalizedVal / safeMax) * plotHeight;
   }
   return { x, y };
 };

 const rawPoints = chart.history;
 if (rawPoints.length > 0) {
   let points = rawPoints.map(item => getCoordinates(item.time, item.val));

   if (points[0].x > padLeft) {
     points.unshift({ x: padLeft, y: points[0].y });
   } else {
     let crossIdx = -1;
     for (let i = 0; i < points.length - 1; i++) {
       if (points[i].x <= padLeft && points[i + 1].x >= padLeft) {
         crossIdx = i;
         break;
       }
     }

     if (crossIdx !== -1) {
       const p0 = points[crossIdx];
       const p1 = points[crossIdx + 1];
       const dx = p1.x - p0.x;
       const ratio = dx > 0 ? Math.min(1, Math.max(0, (padLeft - p0.x) / dx)) : 0;
       const yCross = p0.y + ratio * (p1.y - p0.y);
       points = points.slice(crossIdx + 1);
       points.unshift({ x: padLeft, y: yCross });
     } else {
       points = [{ x: padLeft, y: points[points.length - 1].y }];
     }
   }

   points.push({ x: padLeft + plotWidth, y: getCoordinates(now, chart.currentVal).y });

   if (points.length >= 2) {
     const buildSmoothPath = () => {
       ctx.beginPath();
       ctx.moveTo(points[0].x, points[0].y);
       for (let i = 0; i < points.length - 1; i++) {
         const xc = (points[i].x + points[i + 1].x) / 2;
         const yc = (points[i].y + points[i + 1].y) / 2;
         ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
       }
       ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
     };

     const baselineY = chart.inverted ? padTop : (padTop + plotHeight);
     buildSmoothPath();
     ctx.lineTo(points[points.length - 1].x, baselineY);
     ctx.lineTo(points[0].x, baselineY);
     ctx.closePath();

     const gradient = ctx.createLinearGradient(
       0,
       chart.inverted ? padTop : padTop + plotHeight,
       0,
       chart.inverted ? padTop + plotHeight : padTop
     );
     gradient.addColorStop(0, `rgba(${tr}, ${tg}, ${tb}, 0.28)`);
     gradient.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0.0)`);
     ctx.fillStyle = gradient;
     ctx.fill();

     buildSmoothPath();
     ctx.strokeStyle = `rgba(${tr}, ${tg}, ${tb}, 0.95)`;
     ctx.lineWidth = 1.6;
     ctx.lineJoin = "round";
     ctx.lineCap = "round";
     ctx.stroke();
   }
 }

 ctx.restore();
}

// FPS
let isFPSInit = false;
let frames = 0;
let lastSampleTime = performance.now();
let fpsRafId = null;
let smoothedFps = 60;

function checkFPS(now = performance.now()) {
 if (!shouldRun()) {
   if (fpsRafId) {
     cancelAnimationFrame(fpsRafId);
     fpsRafId = null;
   }
   return;
 }

 frames++;

 if (now >= lastSampleTime + 1000) {
   const delta = now - lastSampleTime;

   if (delta < 2000) {
     const rawFps = Math.round((frames * 1000) / delta);
     smoothedFps = Math.round(smoothedFps * 0.7 + rawFps * 0.3);
     charts.fps.text.innerText = `${smoothedFps} FPS`;
     pushChartMetric("fps", smoothedFps);

     if (!isFPSInit) {
       load(`[ OK ] FPS initialized: ${smoothedFps}`);
       isFPSInit = true;
     }
   }

   frames = 0;
   lastSampleTime = now;
 }

 renderChart("fps", now);
 renderChart("memory", now);
 renderChart("speedUp", now);
 renderChart("speedDown", now);

 fpsRafId = requestAnimationFrame(checkFPS);
}

function resumeFPS() {
 if (!start || !isActive) return;
 if (fpsRafId) return;
 frames = 0;
 const now = performance.now();
 lastSampleTime = now;
 fpsRafId = requestAnimationFrame(checkFPS);
}

const origOpenSide = openSide;
openSide = function() {
 origOpenSide();
 resumeFPS();
};

// Memory
let isMemoryInit = false;
let memIntervalTimer = null;

const activePrograms = new Map([
 ["TERMINAL Core", {
   bytes: 4.2 * 1024 * 1024,
   type: "SYS",
   hits: 1,
   updated: Date.now()
 }]
]);

function registerProgramRun(name, initialBytes, type = "APP") {
 const current = activePrograms.get(name) || {
   bytes: 0,
   hits: 0
 };
 activePrograms.set(name, {
   bytes: Math.max(current.bytes, Number(initialBytes) || 0),
   type: type,
   hits: current.hits + 1,
   updated: Date.now()
 });
 checkMemory();
}

function estimateStringBytes(str) {
 if (!str) return 0;
 return typeof str === "string" ? str.length : 0;
}

function formatBytes(bytes) {
 if (bytes === 0) return "0 B";
 if (!bytes || isNaN(bytes) || bytes < 0) return "0 KB";
 const b = Number(bytes);
 if (b < 1024) return Math.round(b) + " B";
 const kb = b / 1024;
 if (kb < 1024) return kb.toFixed(1) + " KB";
 const mb = kb / 1024;
 if (mb < 1024) return mb.toFixed(1) + " MB";
 return (mb / 1024).toFixed(2) + " GB";
}

// Memory
async function checkMemory() {
 if (!shouldRun()) return;

 if (!memIntervalTimer) {
   memIntervalTimer = setInterval(() => {
     if (shouldRun()) checkMemory();
   }, 2500);
 }

 let jsHeap = 0;
 let heapLimit = 0;

 if (typeof performance !== "undefined" && performance.memory) {
   jsHeap = performance.memory.usedJSHeapSize || 0;
   heapLimit = performance.memory.jsHeapSizeLimit || 0;
 } else {
   const domCount = document.getElementsByTagName("*").length;
   jsHeap = 16 * 1024 * 1024 + (domCount * 1800);
   heapLimit = (navigator.deviceMemory ? navigator.deviceMemory * 1024 * 1024 * 1024 : 4096 * 1024 * 1024) * 0.5;
 }

 let storageUsage = 0;
 if (navigator.storage && navigator.storage.estimate) {
   try {
     const est = await navigator.storage.estimate();
     storageUsage = est.usage || 0;
   } catch (e) {}
 }

 let lsBytes = 0;
 try {
   for (let k in localStorage) {
     if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
       lsBytes += estimateStringBytes(localStorage[k]);
     }
   }
 } catch (e) {}

 const cookieBytes = estimateStringBytes(document.cookie);

 const sysProg = activePrograms.get("TERMINAL Core");
 if (sysProg) {
   sysProg.bytes = (jsHeap > 0 ? (jsHeap * 0.35) : 4.5 * 1024 * 1024) + lsBytes + cookieBytes;
 }

 if (typeof assetCache !== "undefined" && assetCache.size > 0) {
   let proxyBytes = 0;
   assetCache.forEach(v => {
     proxyBytes += typeof v === "string" ? v.length : 256 * 1024;
   });
   const currentProxy = activePrograms.get("Proxy Cache");
   activePrograms.set("Proxy Cache", {
     bytes: proxyBytes,
     type: "NET",
     hits: (currentProxy ? currentProxy.hits : 0) + 1,
     updated: Date.now()
   });
 }

 let totalProgBytes = 0;
 activePrograms.forEach(p => {
   totalProgBytes += p.bytes;
 });

 const totalSystemMem = Math.max(jsHeap + storageUsage, totalProgBytes, 4.5 * 1024 * 1024);
 const totalMB = totalSystemMem / (1024 * 1024);

 pushChartMetric("memory", totalMB);

 const memTextEl = document.getElementById("memText");
 if (memTextEl) memTextEl.innerText = `${totalMB.toFixed(1)} MB`;

 const heapEl = document.getElementById("memHeap");
 const maxEl = document.getElementById("memMax");
 const storageEl = document.getElementById("memStorage");

 if (heapEl) heapEl.textContent = `${(jsHeap / (1024 * 1024)).toFixed(1)} MB`;
 if (maxEl) maxEl.textContent = formatBytes(heapLimit);
 if (storageEl) storageEl.textContent = `${((storageUsage + lsBytes + cookieBytes) / 1024).toFixed(0)} KB`;

 const topProcContainer = document.getElementById("topProcesses");
 if (topProcContainer) {
   const sorted = Array.from(activePrograms.entries())
     .sort((a, b) => b[1].bytes - a[1].bytes)
     .slice(0, 5);

   topProcContainer.innerHTML = sorted.map(([name, data]) => {
     const sizeStr = formatBytes(data.bytes);
     const pct = totalSystemMem > 0 ? Math.min(100, Math.round((data.bytes / totalSystemMem) * 100)) : 0;
     return `
       <span>${data.type}</span>
       <b>${name}</b>
       <span>${sizeStr} (${pct}%)</span><br>`;
   }).join("");
 }

 if (!isMemoryInit) {
   load(`[ OK ] Memory fetched: ${totalMB.toFixed(1)} MB OUT OF ${formatBytes(heapLimit)}`);
   isMemoryInit = true;
 }
}

// Network speed
let isSpeedInit = false;
let networkLoopTimer = null;
let lastKnownDownMbps = 10;
let lastKnownUpMbps = 5;

let isSpeedTesting = false;
let speedTestEndTimestamp = 0;
let speedTestTimer = null;

const SPEED_CONFIG = {
 pingUrl: "https://speed.cloudflare.com/__down?bytes=0",
 downUrl: "https://speed.cloudflare.com/__down?bytes=",
 upUrl: "https://speed.cloudflare.com/__up"
};

async function executeSinglePing() {
 const t0 = performance.now();
 try {
   const ctrl = new AbortController();
   const timeout = setTimeout(() => ctrl.abort(), 1500);

   await fetch(`${SPEED_CONFIG.pingUrl}&_=${Math.random()}`, {
     cache: "no-store",
     mode: "cors",
     signal: ctrl.signal
   });

   clearTimeout(timeout);
   return Math.max(1, performance.now() - t0);
 } catch (e) {
   return null;
 }
}

async function measurePassivePing() {
 try {
   const [p1, p2] = await Promise.all([executeSinglePing(), executeSinglePing()]);
   const validPings = [p1, p2].filter(p => typeof p === "number" && p > 0);

   if (validPings.length === 0) {
     return { minPing: 20, avgLatency: 20, jitter: 1 };
   }

   const minPing = Math.min(...validPings);
   const avgLatency = validPings.reduce((sum, v) => sum + v, 0) / validPings.length;
   const jitter = validPings.length > 1 ? Math.abs(validPings[0] - validPings[1]) : 1;
   return { minPing, avgLatency, jitter };
 } catch (err) {
   return { minPing: 20, avgLatency: 20, jitter: 1 };
 }
}

async function samplePassiveNetworkMetrics() {
 try {
   const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
   let downEst = conn && conn.downlink ? conn.downlink : lastKnownDownMbps;
   let upEst = downEst * 0.35;

   const { minPing, avgLatency, jitter } = await measurePassivePing();

   lastKnownDownMbps = downEst;
   lastKnownUpMbps = upEst;

   pushChartMetric("speedDown", downEst);
   pushChartMetric("speedUp", upEst);

   const speedText = document.getElementById("speedText");
   const pingEl = document.getElementById("pingVal");
   const jitterEl = document.getElementById("jitterVal");
   const latencyEl = document.getElementById("latencyVal");

   if (speedText) {
     speedText.innerText = `${downEst.toFixed(1)} MB OUT, ${upEst.toFixed(1)} MB IN (EST)`;
   }
   if (pingEl) pingEl.textContent = Math.round(minPing).toString();
   if (jitterEl) jitterEl.textContent = jitter.toFixed(1);
   if (latencyEl) latencyEl.textContent = Math.round(avgLatency).toString();

   if (!isSpeedInit) {
     load(`[ OK ] Network fetched: ${downEst.toFixed(1)} MB DOWN / ${upEst.toFixed(1)} MB UP`);
     isSpeedInit = true;
   }
 } catch (err) {

 }
}

async function measureDownloadStream() {
 const targetBytes = Math.min(2000000, Math.max(300000, Math.round((lastKnownDownMbps * 1e6 * 0.3) / 8)));
 const t0 = performance.now();
 const res = await fetch(`${SPEED_CONFIG.downUrl}${targetBytes}&_=${Math.random()}`, {
   cache: "no-store",
   mode: "cors"
 });
 if (!res.ok) throw new Error("Network stream unavailable");

 const buf = await res.arrayBuffer();
 const durationSec = Math.max(0.01, (performance.now() - t0) / 1000);
 const mbps = (buf.byteLength * 8) / (durationSec * 1e6);
 lastKnownDownMbps = mbps;
 return mbps;
}

async function measureUploadThroughput(baseRtt) {
 const uploadBytes = Math.min(800000, Math.max(150000, Math.round((lastKnownUpMbps * 1e6 * 0.25) / 8)));
 const payload = new Uint8Array(uploadBytes);
 const tStart = performance.now();
 await fetch(SPEED_CONFIG.upUrl, {
   method: "POST",
   body: payload,
   cache: "no-store",
   mode: "cors"
 });
 const totalElapsedSec = (performance.now() - tStart) / 1000;
 const transferSec = Math.max(0.01, totalElapsedSec - ((baseRtt || 20) / 1000));
 const mbps = (uploadBytes * 8) / (transferSec * 1e6);
 lastKnownUpMbps = mbps;
 return mbps;
}

async function sampleActiveNetworkMetrics() {
 try {
   const { minPing, avgLatency, jitter } = await measurePassivePing();
   const downMbps = await measureDownloadStream();
   const upMbps = await measureUploadThroughput(minPing);

   pushChartMetric("speedDown", downMbps);
   pushChartMetric("speedUp", upMbps);

   const speedText = document.getElementById("speedText");
   const pingEl = document.getElementById("pingVal");
   const jitterEl = document.getElementById("jitterVal");
   const latencyEl = document.getElementById("latencyVal");

   if (speedText) {
     speedText.innerText = `${downMbps.toFixed(1)} MB OUT, ${upMbps.toFixed(1)} MB IN`;
   }
   if (pingEl) pingEl.textContent = Math.round(minPing).toString();
   if (jitterEl) jitterEl.textContent = jitter.toFixed(1);
   if (latencyEl) latencyEl.textContent = Math.round(avgLatency).toString();
 } catch (err) {
   await samplePassiveNetworkMetrics();
 }
}

function triggerSpeedTest() {
 if (isSpeedTesting) return;
 isSpeedTesting = true;
 speedTestEndTimestamp = Date.now() + 30000;

 const btn = document.getElementById("speedTestBtn");
 if (btn) btn.disabled = true;

 if (speedTestTimer) clearInterval(speedTestTimer);
 speedTestTimer = setInterval(() => {
   const remaining = Math.max(0, Math.ceil((speedTestEndTimestamp - Date.now()) / 1000));
   if (btn) btn.textContent = `TEST (${remaining}s)`;
   if (remaining <= 0) {
     clearInterval(speedTestTimer);
     isSpeedTesting = false;
     if (btn) {
       btn.disabled = false;
       btn.textContent = "TEST (30s)";
     }
   }
 }, 1000);

 sampleActiveNetworkMetrics();
}

function startContinuousNetworkLoop() {
 if (networkLoopTimer) clearTimeout(networkLoopTimer);

 const loop = async () => {
   try {
     if (shouldRun()) {
       if (isSpeedTesting && Date.now() < speedTestEndTimestamp) {
         await sampleActiveNetworkMetrics();
       } else {
         await samplePassiveNetworkMetrics();
       }
     }
   } catch (e) {}
   const delay = isSpeedTesting ? 2500 : 7000;
   networkLoopTimer = setTimeout(loop, delay);
 };

 loop();
}

async function checkSpeed() {
 startContinuousNetworkLoop();
}

// Battery
const batteryDiv = document.getElementById("battery");

function checkBattery() {
 if (!shouldRun()) {
   batteryDiv.textContent = "Calculating...";
   return;
 }

 try {
   navigator.getBattery().then(function(battery) {
     function updateAllStatus() {
       const level = `${Math.round(battery.level * 100)}%`;
       const isCharging = battery.charging ? "🗲" : "";

       function formatTime(seconds) {
         if (seconds === Infinity || isNaN(seconds)) return "Calculating...";

         const hours = Math.floor(seconds / 3600);
         const mins = Math.floor((seconds % 3600) / 60);
         const displayMins = mins < 10 ? `0${mins}` : mins;
         return `${hours}:${displayMins}`;
       }

       let timeInfo = "";
       const time = battery.charging ? battery.chargingTime : battery.dischargingTime;
       const formatted = formatTime(time);

       if (formatted === "Calculating...") {
         timeInfo = `${formatted}`;
       } else if (battery.charging) {
         timeInfo = `${formatted} until full`;
       } else {
         timeInfo = `${formatted} left`;
       }
       batteryDiv.textContent = `${level} - ${timeInfo}`;
       document.getElementById("batteryTitle").textContent = `BATTERY ${isCharging}`;
     }
     updateAllStatus();

     const events = ["levelchange", "chargingchange", "chargingtimechange", "dischargingtimechange"];
     events.forEach(event => battery.addEventListener(event, updateAllStatus));
     load(`[ OK ] Battery fetched: ${Math.round(battery.level * 100)}%`);
   });
 } catch (e) {
   load("[ FAIL ] Battery " + e);
   batteryDiv.textContent = "ERROR";
 }
}

// Internet
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

function checkConnection() {
 if (!shouldRun()) {
   document.getElementById("status").textContent = "Calculating...";
   return;
 }

try {
   if (connection.effectiveType = "slow-2g") {
     document.getElementById("status").textContent = "2G ⚠";
   } else if (connection.effectiveType = "2g") {
     document.getElementById("status").textContent = "2G";
   } else if (connection.effectiveType = "3g") {
     document.getElementById("status").textContent = "3G";
   } else if (connection.effectiveType = "4g") {
     document.getElementById("status").textContent = "4G";
   }

   load(`[ OK ] Network fetched: ${connection.effectiveType}`);
 } catch (e) {
   load("[ FAIL ] Network status " + e);
   document.getElementById("status").textContent = "ERROR";
 }
}

// IP
let userData = null;
let isGlobeInit = false;
let root, chart, rotationAnimation;
let polygonTemplate, graticuleTemplate, circleTemplate;

async function fetchIPData() {
 if (userData) return userData;

 try {
   const response = await fetch("https://ipapi.co/json/");

   if (!response.ok) throw new Error("Network response was not ok");

   const data = await response.json();
   userData = {
     ip: data.ip,
     lat: data.latitude,
     lon: data.longitude
   };

   document.getElementById("ip").textContent = userData.ip;
   document.getElementById("coords").textContent = `${userData.lat}, ${userData.lon}`;
   if (typeof load === "function") load(`[ OK ] IP fetched: ${userData.ip}`);

   return userData;
 } catch (e) {
   document.getElementById("ip").textContent = "ERROR";
   document.getElementById("coords").textContent = "ERROR";
   if (typeof load === "function") load("[ FAIL ] IP fetch error: " + e.message);
   userData = {
     ip: 0,
     lat: 0,
     lon: 0
   };

   return null;
 }
}

// World view
async function initMap() {
 if (root) return;

 const data = await fetchIPData();
 if (!data) return;

 root = am5.Root.new("chartdiv");
 root._logo.dispose();
 root.setThemes([am5themes_Animated.new(root)]);

 chart = root.container.children.push(am5map.MapChart.new(root, {
   panX: "rotateX",
   panY: "rotateY",
   projection: am5map.geoOrthographic(),
   rotationX: -data.lon,
   rotationY: -data.lat,
   maxZoomLevel: 1
 }));

 let graticuleSeries = chart.series.unshift(am5map.GraticuleSeries.new(root, {
   step: 10
 }));
 graticuleTemplate = graticuleSeries.mapLines.template;

 let polygonSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {
   geoJSON: am5geodata_worldLow
 }));
 polygonTemplate = polygonSeries.mapPolygons.template;

 let pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
 pointSeries.bullets.push(() => {
   const circle = am5.Circle.new(root, {
     radius: 5
   });
   circleTemplate = circle;
   return am5.Bullet.new(root, {
     sprite: circle
   });
 });

 pointSeries.data.setAll([{
   geometry: {
     type: "Point",
     coordinates: [data.lon, data.lat]
   }
 }]);

 refreshColors();

 const toggleSpin = () => {
   if (rotationAnimation) {
     rotationAnimation.stop();
     rotationAnimation = null;
   } else {
     rotationAnimation = chart.animate({
       key: "rotationX",
       from: chart.get("rotationX"),
       to: chart.get("rotationX") + 360,
       duration: 30000,
       loops: Infinity
     });
   }
 };

 const goHome = () => {
   if (rotationAnimation) toggleSpin();
   chart.animate({
     key: "rotationX",
     to: -data.lon,
     duration: 1000,
     easing: am5.ease.out(am5.ease.cubic)
   });
   chart.animate({
     key: "rotationY",
     to: -data.lat,
     duration: 1000,
     easing: am5.ease.out(am5.ease.cubic)
   });
 };

 document.getElementById("spinBtn").onclick = toggleSpin;
 document.getElementById("homeBtn").onclick = goHome;

 chart.appear();

 if (!isGlobeInit) {
   if (typeof load === "function") load("[ OK ] World Map fetched");
   isGlobeInit = true;
 }
}

function refreshColors() {
 if (!root) return;
 const style = getComputedStyle(document.documentElement);
 const themeColor = am5.color(style.getPropertyValue("--theme").trim() || "#00FF00");

 if (graticuleTemplate) graticuleTemplate.setAll({
   stroke: themeColor,
   strokeOpacity: 0.25
 });
 if (polygonTemplate) polygonTemplate.setAll({
   stroke: themeColor,
   strokeWidth: 1,
   fillOpacity: 0
 });
 if (circleTemplate) circleTemplate.set("fill", themeColor);
}

setInterval(() => {
 refreshColors();
}, 1000);

// Glitch effect
const container = document.querySelectorAll(".container");
const body = document.querySelectorAll("*");
const filter = document.getElementById("displacement");
const noise = document.querySelector("feTurbulence");
const glowline = document.getElementById("glowline");
const scanline = document.getElementById("scanline");

let isCrtEnabled = true;

function triggerGlitch() {
 if (!isCrtEnabled || !shouldRun()) {
   filter.setAttribute("scale", 0);
   return;
 }

 noise.setAttribute("seed", Math.random() * 100);
 filter.setAttribute("scale", Math.random() * 4);

 const duration = 80;
 setTimeout(() => {
   filter.setAttribute("scale", 0);
   if (isCrtEnabled && shouldRun()) {
     setTimeout(triggerGlitch, Math.random() * 4000 + 2000);
   }
 }, duration);
}

let userCrtSetting = getCookie("crtEnabled");
if (userCrtSetting === null || userCrtSetting === undefined) {
 userCrtSetting = true;
}

function applyCrt(enable) {
 isCrtEnabled = enable;

 const containers = document.querySelectorAll(".container");
 containers.forEach(el => {
   el.style.filter = enable ? "url(#chromatic-aberration) url(#glitch)" : "none";
 });

 if (enable) {
   triggerGlitch();
   if (glowline) glowline.style.display = "block";
   if (scanline) scanline.style.display = "block";
   document.body.classList.add("flicker");
 } else {
   if (filter) filter.setAttribute("scale", 0);
   if (glowline) glowline.style.display = "none";
   if (scanline) scanline.style.display = "none";
   document.body.classList.remove("flicker");
 }
}

function toggleCrt() {
 userCrtSetting = !userCrtSetting;
 setCookie("crtEnabled", userCrtSetting, 30);
 applyCrt(userCrtSetting);
}

function triggerGlitch() {
 if (!isCrtEnabled || !shouldRun()) {
   if (filter) filter.setAttribute("scale", 0);
   return;
 }

 noise.setAttribute("seed", Math.random() * 100);
 filter.setAttribute("scale", Math.random() * 4);

 const duration = 80;
 setTimeout(() => {
   if (filter) filter.setAttribute("scale", 0);
   if (isCrtEnabled && shouldRun()) {
     setTimeout(triggerGlitch, Math.random() * 4000 + 2000);
   }
 }, duration);
}

applyCrt(userCrtSetting);
