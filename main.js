// Radio
const songData = [
  { filename: "resurrection.mp3", title: "ППК - Воскрешение" },
  { filename: "dont_leave.mp3", title: "Gummy Boy - Don't Leave" },
  { filename: "zagadka1.mp3", title: "PRNRML - Загадка 1" },
  { filename: "zodiak.mp3", title: "Зодиак - Зодиак" },
  { filename: "groza.mp3", title: "Творожное озеро - Гроза" },
  { filename: "phobos.mp3", title: "Dmitriy Ivankov - Phobos" },
  { filename: "vremya.mp3", title: "Наукоград - Время" },
  { filename: "8080.mp3", title: "Priroda - 8080" },
  { filename: "mlechnymi_putyami_v_prekrasnoye_daleko.mp3", title: "NTorchestra - Млечными путями" }
];

const audioBaseUrl = "https://raw.githack.com/HoujenHuang/TERMINAL/main/static/";
let radioPlayer = new Audio();
let searchPlayer = null;
let currentSongIndex = -1;

function getRandomSong() {
  return songData[Math.floor(Math.random() * songData.length)];
}

function playNewRadioSong() {
  const song = getRandomSong();
  radioPlayer.src = audioBaseUrl + song.filename;
  updateTitleDisplay(song.title);
  radioPlayer.play().catch(() => {});
}

radioPlayer.addEventListener('ended', playNewRadioSong);

var start = false;

function handleStartupInput(event) {
  if (start) return;

  if (event && event.key) {
    const ignoredKeys = ["Alt", "Tab", "Meta", "Control", "Shift", "Escape", "CapsLock"];
    if (ignoredKeys.includes(event.key) || event.altKey || event.metaKey || event.ctrlKey) {
      return;
    }
  }

  if (document.hidden) return;

  start = true;
  window.removeEventListener("keydown", handleStartupInput);

  radioPlayer.volume = 0.5;
  playNewRadioSong();

  load("[ OK ] DOM fully loaded");
  document.body.classList.add("flicker");

  setInterval(() => {
    if (shouldRun()) displayTime();
  }, 1000);

  setInterval(() => {
    if (shouldRun()) updateTimer();
  }, 1000);

  bootSystem();
}

window.addEventListener("keydown", handleStartupInput);

function goFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// Tab toggle
const sideLeft = document.getElementById("leftTerminal");
const sideRight = document.getElementById("rightTerminal");
const btnLeft = document.getElementById("sideBtnLeft");
const btnRight = document.getElementById("sideBtnRight");

function updateProxyConsoleOrientation() {
  const workspace = document.getElementById("proxy-workspace");
  if (!workspace) return;
  if (isActive) {
    workspace.classList.remove("layout-horizontal");
    workspace.classList.add("layout-vertical");
  } else {
    workspace.classList.remove("layout-vertical");
    workspace.classList.add("layout-horizontal");
  }
}

function closeSide() {
  sideLeft.style.width = "0";
  sideRight.style.width = "0";
  btnLeft.style.opacity = "1";
  btnRight.style.opacity = "1";
  isActive = false;
  updateProxyConsoleOrientation();
}

function openSide() {
  sideLeft.style.width = "50%";
  sideRight.style.width = "50%";
  btnLeft.style.opacity = "0";
  btnRight.style.opacity = "0";
  isActive = true;
  updateProxyConsoleOrientation();
}

// Themes
const rInput = document.getElementById("r");
const gInput = document.getElementById("g");
const bInput = document.getElementById("b");
const rootColor = document.documentElement;

let pointTemplate;
let colorConfig = { theme: "" };
let isIpCensored = false;

function setCookie(name, value, days = 7) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${d.toUTCString()};`;
  const valStr = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${name}=${valStr};${expires}path=/;SameSite=Lax`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      const raw = c.substring(nameEQ.length);
      try {
        return JSON.parse(decodeURIComponent(raw));
      } catch (e) {
        try {
          return JSON.parse(raw);
        } catch (_) {
          return raw;
        }
      }
    }
  }
  return null;
}

function censorIp(ipStr) {
  if (!ipStr || typeof ipStr !== "string") return ipStr;
  return ipStr.replace(/\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g, (m, o1, o2, o3, o4) => {
    return `${o1}.${"█".repeat(o2.length)}.${"█".repeat(o3.length)}.${"█".repeat(o4.length)}`;
  });
}

function updateIpDisplays() {
  const ipEl = document.getElementById("ip");
  if (ipEl) {
    if (!ipEl.dataset.rawIp && !ipEl.textContent.includes("Calculating")) {
      ipEl.dataset.rawIp = ipEl.textContent;
    }
    if (ipEl.dataset.rawIp) {
      ipEl.textContent = isIpCensored ? censorIp(ipEl.dataset.rawIp) : ipEl.dataset.rawIp;
    }
  }
  const btn = document.getElementById("ipCensorToggle");
  if (btn) btn.textContent = `Censor IPs: ${isIpCensored ? "ON" : "OFF"}`;
}

function toggleIpCensor() {
  isIpCensored = !isIpCensored;
  setCookie("ipCensored", isIpCensored, 30);
  updateIpDisplays();
}

function updateColor() {
  const r = rInput.value || 0;
  const g = gInput.value || 0;
  const b = bInput.value || 0;
  const colorString = `rgb(${r}, ${g}, ${b})`;
  rootColor.style.setProperty("--theme", colorString);

  const terminal = document.getElementById("terminalContent");
  const stdin = document.getElementById("stdin");

  if (terminal) terminal.style.color = "var(--theme)";
  if (stdin) stdin.style.color = "var(--theme)";

  colorConfig = {
    theme: colorString,
    raw: [r, g, b]
  };

  setCookie("colorSettings", colorConfig.raw);

  if (pointTemplate) {
    pointTemplate.set("fill", am5.color(colorString));
  }
}

function setPreset(main) {
  [rInput.value, gInput.value, bInput.value] = main;
  updateColor();
}

function loadColors() {
  const saved = getCookie("colorSettings");
  if (saved) {
    const rgb = Array.isArray(saved) ? saved : (saved.main || [51, 255, 51]);
    [rInput.value, gInput.value, bInput.value] = rgb;
  }
  updateColor();
}

[rInput, gInput, bInput].forEach(input => {
  if (input) input.addEventListener("input", updateColor);
});

document.getElementById("bgGreen").onclick = () => {
  setPreset([51, 255, 51]);
  setTimeout(updateColor, 10);
};

document.getElementById("bgAmber").onclick = () => {
  setPreset([255, 176, 0]);
  setTimeout(updateColor, 10);
};

document.getElementById("bgWhite").onclick = () => {
  setPreset([240, 255, 255]);
  setTimeout(updateColor, 10);
};

loadColors();

// Fonts
const fontSelect = document.getElementById("fontSelect");

function setGlobalFont(fontFamily) {
  document.body.style.fontFamily = fontFamily;

  let fontStyle = document.getElementById("dynamicFontFace");
  if (!fontStyle) {
    fontStyle = document.createElement("style");
    fontStyle.id = "dynamicFontFace";
    document.head.appendChild(fontStyle);
  }

  fontStyle.textContent = `
  body, input, button, textarea, .terminal, .mini-info, b, span,
  #codebox, #codeBlock, #lineNumbers, #preCode code {
    font-family: "${fontFamily}", monospace !important;
    line-height: 1.2;
  }
`;

  setCookie("selectedFont", fontFamily, 30);
}

fontSelect.addEventListener("change", (e) => {
  setGlobalFont(e.target.value);
  load(`[ OK ] Font loaded: ${e.target.value}`);
});

function loadSavedFont() {
  const savedFont = getCookie("selectedFont");
  if (savedFont) {
    setGlobalFont(savedFont);
    fontSelect.value = savedFont;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSavedFont();
  const savedCensor = getCookie("ipCensored");
  if (savedCensor !== null) {
    isIpCensored = Boolean(savedCensor);
    updateIpDisplays();
  }
});

// Admin
var admin = false;
let adminPollInterval = null;
let adminToken = null;
let isAdminGraphMode = false;
let isAdminLogged = false;

function toggleAdminGraphMode() {
  if (!admin) return;
  isAdminGraphMode = !isAdminGraphMode;
  document.body.classList.toggle("admin-graph-mode", isAdminGraphMode);

  const btn = document.getElementById("adminGraphToggleBtn");
  if (btn) btn.textContent = `GRAPH: ${isAdminGraphMode ? "SERVER" : "CLIENT"}`;

  const targetCharts = isAdminGraphMode ? ["fps", "memory", "speedCombined"] : ["cpu", "hostMem", "adminNetCombined"];
  targetCharts.forEach(key => {
    const chart = (typeof charts !== "undefined") && charts[key];
    if (chart && chart.el) {
      const ctx = chart.el.getContext("2d");
      ctx.clearRect(0, 0, chart.el.width, chart.el.height);
    }
  });

  if (typeof root !== "undefined" && root && root.resize) {
    setTimeout(() => root.resize(), 50);
  }

  load(`[ OK ] Graph view switched to: ${isAdminGraphMode ? "SERVER" : "CLIENT"}`);
  if (typeof resumeFPS === "function") resumeFPS();
}

async function renderAdminDashboard() {
  if (!adminToken || (typeof shouldRun === "function" && !shouldRun())) return;

  try {
    const res = await fetch(`${API_GATEWAY}/api/admin/costs?token=${encodeURIComponent(adminToken)}`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });

    if (res.status === 401) {
      if (adminPollInterval) clearInterval(adminPollInterval);
      document.body.classList.remove('admin-graph-mode');
      document.getElementById("adminGraphToggleBtn")?.classList.add("invisible");
      admin = false;
      adminToken = null;
      setCookie("adminSession", null, -1);
      return;
    }

    if (!res.ok) return;
    const data = await res.json();

    if (typeof updateAdminGraphs === "function") {
      updateAdminGraphs(data);
    }

    const cpuTxt = document.getElementById("cpuText");
    if (cpuTxt && data.system) cpuTxt.textContent = data.system.cpu;

    const memTxt = document.getElementById("hostMemText");
    if (memTxt && data.system) memTxt.textContent = data.system.memory;

    if (data.system && data.system.interfaces) {
      const enp = data.system.interfaces.enp0s31f6 || { rxRateFormatted: '0 KB/s', txRateFormatted: '0 KB/s' };
      const wg = data.system.interfaces.wg0 || { rxRateFormatted: '0 KB/s', txRateFormatted: '0 KB/s' };
      const netLabel = document.getElementById("adminNetText");
      if (netLabel) {
        netLabel.textContent = `RX: ${enp.rxRateFormatted} / ${wg.rxRateFormatted} | TX: ${enp.txRateFormatted} / ${wg.txRateFormatted}`;
      }
    }

    const pm2El = document.getElementById("adminPm2Status");
    if (pm2El && data.system) pm2El.textContent = data.system.pm2;

    const wgEl = document.getElementById("adminWgStatus");
    if (wgEl && data.system) wgEl.textContent = data.system.wireguard;

    const ec2IpEl = document.getElementById("adminEc2Ip");
    if (ec2IpEl && data.aws) {
      ec2IpEl.textContent = isIpCensored ? censorIp(data.aws.ec2Ip) : data.aws.ec2Ip;
    }

    const ec2StateEl = document.getElementById("adminEc2State");
    if (ec2StateEl && data.aws) ec2StateEl.textContent = data.aws.ec2State;

    const cfStatusEl = document.getElementById("adminCfStatus");
    if (cfStatusEl && data.aws) cfStatusEl.textContent = data.aws.cfStatus;

    if (!isAdminLogged && data.aws) {
      load(`[ OK ] Server pinged: EC2 (${data.aws.ec2State}) | CF (${data.aws.cfStatus})`);
      isAdminLogged = true;
    }
  } catch (err) {
    load(`[ FAIL ] Unable to ping server`);
  }
}

function applyAdminLogin(username, token) {
  adminToken = token;
  admin = true;

  const cleanUser = username.includes("@") ? username.split("@")[0] : username;
  document.querySelectorAll(".user").forEach(el => {
    el.textContent = cleanUser;
  });

  const loginEl = document.getElementById("login");
  if (loginEl) loginEl.style.display = "none";

  const toggleBtn = document.getElementById("adminGraphToggleBtn");
  if (toggleBtn) toggleBtn.classList.remove("invisible");

  const emailEl = document.getElementById("email");
  if (emailEl) emailEl.value = username;

  load(`[ OK ] Sudo user authenticated: ${cleanUser}`);
  renderAdminDashboard();
  if (adminPollInterval) clearInterval(adminPollInterval);
  adminPollInterval = setInterval(renderAdminDashboard, 1000);
}

async function login() {
  const emailInput = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_GATEWAY}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: emailInput, password: password })
    });

    const data = await res.json();

    if (res.ok && data.success && data.token) {
      const rememberMe = document.getElementById("rememberMe");
      if (rememberMe && rememberMe.checked) {
        setCookie("adminSession", { username: emailInput, token: data.token }, 30);
      } else {
        setCookie("adminSession", null, -1);
      }

      applyAdminLogin(emailInput, data.token);
      document.getElementById("commandInput").style.display = "block";
      closeSide();
    } else {
      document.getElementById("adminAlert").style.display = "block";
    }
  } catch (err) {
    document.getElementById("adminAlert").style.display = "block";
  }
}

function checkAndRestoreAdminSession() {
  ["email", "password"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          login();
        }
      });
    }
  });

  const saved = getCookie("adminSession");
  if (saved && saved.username && saved.token) {
    applyAdminLogin(saved.username, saved.token);
  } else if (saved && saved.username) {
    const emailEl = document.getElementById("email");
    if (emailEl) emailEl.value = saved.username;
  }
}

async function checkPublicServicesHealth() {
  try {
    const res = await fetch(`${API_GATEWAY}/api/health`, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();

    const ytStatusEl = document.getElementById("youtubeServiceStatus");
    if (ytStatusEl) {
      const ytOk = data.youtube === "OK";
      const gemOk = data.gemini === "OK";
      ytStatusEl.innerHTML = `YouTube API: ${ytOk ? 'ONLINE' : 'OFFLINE'} | Tsarevich: ${gemOk ? 'AWAKENED' : 'DORMANT'}`;
    }

    const proxyStatusEl = document.getElementById("proxy-service-status");
    if (proxyStatusEl) {
      proxyStatusEl.textContent = `Wisp: ${data.wisp}`;
    }

    load(`[ OK ] YouTube pinged: ${data.youtube}`);
    load(`[ OK ] Tsarevich pinged: ${data.gemini}`);
    load(`[ OK ] Proxy pinged: ${data.wisp}`);
  } catch (e) {
    const ytStatusEl = document.getElementById("youtubeServiceStatus");
    if (ytStatusEl) ytStatusEl.textContent = "SERVICES: Gateway Unreachable";
    const proxyStatusEl = document.getElementById("proxy-service-status");
    if (proxyStatusEl) proxyStatusEl.textContent = "Wisp: Unreachable";
    load("[ FAIL ] Service health gateway unreachable");
  }
}

// Proxy
const API_GATEWAY = "https://d33m8d2luw6c6z.cloudfront.net";
const WASM_URL = "https://cdn.jsdelivr.net/npm/libcurl.js@0.7.1/libcurl.wasm";
const WISP_URL = (typeof CONFIG !== "undefined" && CONFIG.WISP_URL) 
  ? CONFIG.WISP_URL 
  : "d33m8d2luw6c6z.cloudfront.net";

const BASE_HOST = `wss://${WISP_URL}/wisp/`;
const SEARCH_ENGINE = "https://duckduckgo.com/html/?q=";
const SPOOFED_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const urlBar = document.getElementById("url-bar");
const navBar = document.getElementById("nav-bar");
const goBtn = document.getElementById("go-btn");
const statusText = document.getElementById("proxy-status");
const viewport = document.getElementById("viewport");
const backBtn = document.getElementById("back-btn");
const fwdBtn = document.getElementById("fwd-btn");
const reloadBtn = document.getElementById("reload-btn");
const bookmarkBtn = document.getElementById("bookmark-btn");
const bookmarkBar = document.getElementById("bookmark-bar");
const bookmarkContextMenu = document.getElementById("bookmark-context-menu");

const protoSelect = document.getElementById("proto-select");
const secSelect = document.getElementById("sec-select");
const transSelect = document.getElementById("trans-select");
const inlineCssToggle = document.getElementById("inlineCssToggle");

const modal = document.getElementById("proxy-modal");
const openSettingsBtn = document.getElementById("open-settings-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const applyModalBtn = document.getElementById("apply-modal-btn");
const profileDisplay = document.getElementById("profile-display");

const assetCache = new Map();

let currentUrl = "";
let currentTitle = "";
let currentFavicon = "";
let historyStack = [];
let historyIdx = -1;
let currentProfile = "warp";
let bookmarks = [];
let activeContextBmId = null;
let draggedBmId = null;

// Compatibility check
function syncLayerOptions() {
  if (protoSelect) {
    const proto = protoSelect.value;
    const isCustomEncapsulated = ["vless", "vmess", "trojan"].includes(proto);

    if (secSelect) {
      Array.from(secSelect.options).forEach(opt => {
        if (!isCustomEncapsulated) {
          opt.disabled = (opt.value !== "none");
        } else {
          if (opt.value === "vision") opt.disabled = (proto !== "vless");
          else if (opt.value === "none") opt.disabled = (proto === "trojan");
          else opt.disabled = false;
        }
      });

      if (secSelect.selectedOptions[0]?.disabled) {
        secSelect.value = (proto === "trojan") ? "tls" : "none";
      }
    }

    if (transSelect) {
      const sec = secSelect ? secSelect.value : "none";
      Array.from(transSelect.options).forEach(opt => {
        if (!isCustomEncapsulated) {
          opt.disabled = (opt.value !== "tcp");
        } else {
          if (sec === "vision") opt.disabled = (opt.value !== "tcp");
          else if (sec === "reality") opt.disabled = !["tcp", "grpc", "xhttp"].includes(opt.value);
          else opt.disabled = false;
        }
      });

      if (transSelect.selectedOptions[0]?.disabled) {
        transSelect.value = "tcp";
      }
    }
  }

  const protoRadio = document.querySelector('input[name="proxy_proto"]:checked');
  if (protoRadio) {
    const proto = protoRadio.value;
    const isCustomEncapsulated = ["vless", "vmess", "trojan"].includes(proto);

    document.querySelectorAll('input[name="security"]').forEach(r => {
      const lbl = r.closest('label');
      if (!isCustomEncapsulated) {
        r.disabled = (r.value !== "none");
      } else {
        if (r.value === "vision") r.disabled = (proto !== "vless");
        else if (r.value === "none") r.disabled = (proto === "trojan");
        else opt.disabled = false;
      }

      if (r.disabled) {
        if (lbl) lbl.classList.add("disabled-opt");
        if (r.checked) {
          const fallback = document.querySelector(proto === "trojan" ? 'input[name="security"][value="tls"]' : 'input[name="security"][value="none"]');
          if (fallback) fallback.checked = true;
        }
      } else {
        if (lbl) lbl.classList.remove("disabled-opt");
      }
    });

    const secRadio = document.querySelector('input[name="security"]:checked');
    const sec = secRadio ? secRadio.value : "none";

    document.querySelectorAll('input[name="transport"]').forEach(t => {
      const lbl = t.closest('label');
      if (!isCustomEncapsulated) {
        t.disabled = (t.value !== "tcp");
      } else {
        if (sec === "vision") t.disabled = (t.value !== "tcp");
        else if (sec === "reality") t.disabled = !["tcp", "grpc", "xhttp"].includes(t.value);
        else t.disabled = false;
      }

      if (t.disabled) {
        if (lbl) lbl.classList.add("disabled-opt");
        if (t.checked) {
          const fallback = document.querySelector('input[name="transport"][value="tcp"]');
          if (fallback) fallback.checked = true;
        }
      } else {
        if (lbl) lbl.classList.remove("disabled-opt");
      }
    });
  }
}

function computeProfileTag() {
  let proto = "warp";
  let sec = "none";
  let trans = "tcp";

  const protoRadio = document.querySelector('input[name="proxy_proto"]:checked');
  if (protoRadio) {
    proto = protoRadio.value;
    sec = document.querySelector('input[name="security"]:checked')?.value || "none";
    trans = document.querySelector('input[name="transport"]:checked')?.value || "tcp";
  } else if (protoSelect) {
    proto = protoSelect.value;
    sec = secSelect ? secSelect.value : "none";
    trans = transSelect ? transSelect.value : "tcp";
  }

  if (["direct", "warp", "tor", "socks", "shadowsocks"].includes(proto)) {
    return proto;
  }
  return `${proto}-${sec}-${trans}`;
}

async function applyProfile() {
  currentProfile = computeProfileTag();
  if (profileDisplay) profileDisplay.textContent = currentProfile;
  if (modal && typeof modal.close === "function" && modal.open) modal.close();

  if (statusText) statusText.textContent = `Connecting (${currentProfile})...`;
  const wispEndpoint = `${BASE_HOST}?profile=${encodeURIComponent(currentProfile)}`;

  try {
    await libcurl.set_websocket(wispEndpoint);
    if (statusText) statusText.textContent = `Ready (${currentProfile})`;
    if (currentUrl) navigateTo(currentUrl, false);
  } catch (e) {
    if (statusText) statusText.textContent = "Switch Failed";
  }
}

function handleSelectProfileChange() {
  syncLayerOptions();
  applyProfile();
}

if (protoSelect) protoSelect.addEventListener("change", handleSelectProfileChange);
if (secSelect) secSelect.addEventListener("change", handleSelectProfileChange);
if (transSelect) transSelect.addEventListener("change", handleSelectProfileChange);

if (inlineCssToggle) {
  inlineCssToggle.onclick = () => {
    inlineCssToggle.textContent = inlineCssToggle.textContent.includes("ON")
      ? "Inline CSS: OFF"
      : "Inline CSS: ON";
  };
}

document.querySelectorAll('#proxy-modal input[type="radio"]').forEach(radio => {
  radio.addEventListener("change", syncLayerOptions);
});

if (openSettingsBtn && modal) {
  openSettingsBtn.onclick = () => {
    syncLayerOptions();
    modal.showModal();
  };
}
if (closeModalBtn && modal) closeModalBtn.onclick = () => modal.close();
if (applyModalBtn) applyModalBtn.onclick = applyProfile;

// WASM engine initialization
async function startEngine() {
  try {
    syncLayerOptions();
    if (typeof libcurl === "undefined") {
      throw new Error("libcurl.js script is missing or not yet loaded.");
    }

    if (statusText) statusText.textContent = "Loading WASM...";
    await libcurl.load_wasm(WASM_URL);

    if (statusText) statusText.textContent = `Connecting (${currentProfile})...`;
    await libcurl.set_websocket(`${BASE_HOST}?profile=${encodeURIComponent(currentProfile)}`);

    if (statusText) statusText.textContent = `Ready (${currentProfile})`;
    const proxyServiceStatus = document.getElementById("proxy-service-status");
    if (proxyServiceStatus) proxyServiceStatus.textContent = "Wisp: ONLINE";
    if (goBtn) goBtn.disabled = false;
    load(`[ OK ] Proxy engine ready: ${currentProfile}`);
  } catch (err) {
    if (statusText) statusText.textContent = "Error: " + err.message;
    const proxyServiceStatus = document.getElementById("proxy-service-status");
    if (proxyServiceStatus) proxyServiceStatus.textContent = "Wisp: ERROR";
    load(`[ FAIL ] Proxy initialization error: ${err.message}`);
  }
}

// URL redirect unwrapping
function unwrapRedirectUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("uddg")) {
      const target = parsed.searchParams.get("uddg");
      return decodeURIComponent(target);
    }
    if (parsed.pathname === "/url" || parsed.pathname.endsWith("/url")) {
      const q = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (q && /^https?:\/\//i.test(q)) return decodeURIComponent(q);
    }
  } catch (e) {}
  return url;
}

// Subresource inlining
function resolveRelative(refUrl, baseUrl) {
  try {
    return new URL(refUrl, baseUrl).href;
  } catch (e) {
    return refUrl;
  }
}

function rewriteScriptCode(code, scriptUrl) {
  if (!code || typeof code !== 'string' || !scriptUrl) return code;
  try {
    const scriptBase = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
    code = code.replace(/\bimport\.meta\.url\b/g, JSON.stringify(scriptUrl));
    code = code.replace(/\bimport\s*\(\s*(['"`])(\.\.?\/[^'"`]+)\1\s*\)/g, (match, quote, relPath) => {
      return `import(${quote}${resolveRelative(relPath, scriptBase)}${quote})`;
    });
    code = code.replace(/\b(from\s*)(['"`])(\.\.?\/[^'"`]+)\2/g, (match, fromClause, quote, relPath) => {
      return `${fromClause}${quote}${resolveRelative(relPath, scriptBase)}${quote}`;
    });
    code = code.replace(/\b(import\s*)(['"`])(\.\.?\/[^'"`]+)\2/g, (match, importClause, quote, relPath) => {
      return `${importClause}${quote}${resolveRelative(relPath, scriptBase)}${quote}`;
    });
    if (scriptBase && scriptBase.startsWith('http')) {
      code = `try { if (typeof self !== 'undefined') self.__webpack_public_path__ = ${JSON.stringify(scriptBase)}; } catch(e) {}; ` + code;
    }
  } catch (e) {}
  return code;
}

function sanitizeCode(code) {
  if (!code || typeof code !== 'string') return code;
  return code
    .replace(/(top\.location|window\.top\.location|parent\.location)\s*=/gi, "window.__dummyLocation =")
    .replace(/\bwindow\.top\b/g, "window.self")
    .replace(/\bwindow\.location\b/g, "window.__proxyLocation")
    .replace(/\bdocument\.location\b/g, "window.__proxyLocation")
    .replace(/(?<![\w$.])location\.(href|protocol|host|hostname|port|pathname|search|hash|origin|assign|replace|reload)\b/g, "__proxyLocation.$1");
}

function bufferToDataUri(buffer, mimeType) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function resetProxyConsoleWidth() {
  const wrapper = document.getElementById("proxy-console-wrapper");
  if (wrapper) {
    wrapper.style.width = "";
    wrapper.style.height = "";
  }
}

function initProxyResizeHandler() {
  const handle = document.getElementById("proxy-resize-handle");
  const workspace = document.getElementById("proxy-workspace");
  const wrapper = document.getElementById("proxy-console-wrapper");
  const viewportEl = document.getElementById("viewport");
  if (!handle || !workspace || !wrapper) return;

  let isDragging = false;

  handle.addEventListener("mousedown", (e) => {
    isDragging = true;
    handle.classList.add("active");
    if (viewportEl) viewportEl.style.pointerEvents = "none";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const wsRect = workspace.getBoundingClientRect();
    const isVertical = workspace.classList.contains("layout-vertical");

    if (isVertical) {
      const newHeight = wsRect.bottom - e.clientY;
      const minH = 100;
      const maxH = wsRect.height * 0.85;
      if (newHeight >= minH && newHeight <= maxH) {
        wrapper.style.height = `${newHeight}px`;
      }
    } else {
      const newWidth = wsRect.right - e.clientX;
      const minW = 180;
      const maxW = wsRect.width * 0.85;
      if (newWidth >= minW && newWidth <= maxW) {
        wrapper.style.width = `${newWidth}px`;
      }
    }
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      handle.classList.remove("active");
      if (viewportEl) viewportEl.style.pointerEvents = "auto";
      document.body.style.userSelect = "";
    }
  });
}

document.addEventListener("DOMContentLoaded", initProxyResizeHandler);

function toggleProxyConsole() {
  const cWrapper = document.getElementById("proxy-console-wrapper");
  const handle = document.getElementById("proxy-resize-handle");
  if (!cWrapper) return;
  const isHidden = cWrapper.style.display === "none" || !cWrapper.style.display;
  cWrapper.style.display = isHidden ? "flex" : "none";
  if (handle) handle.style.display = isHidden ? "block" : "none";
  const btn = document.getElementById("toggleProxyConsoleBtn");
  if (btn) btn.textContent = isHidden ? "Hide Console" : "Console";
  if (typeof updateProxyConsoleOrientation === "function") updateProxyConsoleOrientation();
}

function clearProxyConsole() {
  const c = document.getElementById("proxy-console");
  if (c) c.value = "";
}

function logProxyConsole(msg) {
  const c = document.getElementById("proxy-console");
  if (c) {
    c.value += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
    c.scrollTop = c.scrollHeight;
  }
}

function updateRemainingDisplay(count) {
  const el = document.getElementById("proxy-console-count");
  if (el) {
    el.textContent = count > 0 ? `[${count} remaining]` : "";
  }
}

async function fetchAssetTunnel(url, asBinary = false) {
  const cacheKey = `${url}::${asBinary ? "bin" : "txt"}`;
  if (assetCache.has(cacheKey)) return assetCache.get(cacheKey);

  try {
    window.__proxyCookies = window.__proxyCookies || new Map();
    let host = "";
    try { host = new URL(url).hostname; } catch(e) {}
    
    const cookieHeader = Array.from(window.__proxyCookies.entries())
      .filter(([domain]) => !domain || host.endsWith(domain))
      .map(([, cookies]) => Array.from(cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; "))
      .filter(Boolean)
      .join("; ");

    const isScript = url.endsWith(".js") || url.includes(".js?");
    const headers = {
      "User-Agent": SPOOFED_UA,
      "Accept": asBinary ? "*/*" : (isScript ? "*/*" : "text/css,*/*;q=0.1"),
      "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": asBinary ? "image" : (isScript ? "script" : "style"),
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site"
    };

    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    const res = await libcurl.fetch(url, { headers });

    const rawSetCookie = res.headers.get("set-cookie");
    if (rawSetCookie && host) {
      if (!window.__proxyCookies.has(host)) window.__proxyCookies.set(host, new Map());
      const jar = window.__proxyCookies.get(host);
      rawSetCookie.split(/,(?=\s*[^;=]+=[^;=]+)/).forEach(cookieStr => {
        const parts = cookieStr.split(";")[0].split("=");
        if (parts.length >= 2) {
          jar.set(parts[0].trim(), parts.slice(1).join("=").trim());
        }
      });
    }

    let assetResult = null;
    if (asBinary) {
      const buf = await res.arrayBuffer();
      const mime = res.headers.get("content-type") || "application/octet-stream";
      assetResult = bufferToDataUri(buf, mime);
    } else {
      assetResult = await res.text();
    }

    if (assetResult) {
      if (assetCache.size > 200) {
        const oldestKey = assetCache.keys().next().value;
        assetCache.delete(oldestKey);
      }
      assetCache.set(cacheKey, assetResult);
    }
    return assetResult;
  } catch (err) {
    logProxyConsole(`[ FAIL ] ${url} - ${err.message || err}`);
    return null;
  }
}

async function inlineCssUrls(cssText, baseUrl) {
  const urlRegex = /url\((?:['"]?)(.*?)(?:['"]?)\)/gi;
  const matches = [...cssText.matchAll(urlRegex)];

  for (const match of matches) {
    const rawUrl = match[1];
    if (!rawUrl || rawUrl.startsWith("data:")) continue;

    const resolved = resolveRelative(rawUrl, baseUrl);
    const dataUri = await fetchAssetTunnel(resolved, true);
    if (dataUri) {
      cssText = cssText.replace(match[0], `url("${dataUri}")`);
    }
  }
  return cssText;
}

async function inlineSubresourcesSequentially(doc, baseUrl, iframeTarget) {
  const inlineCssToggleEl = document.getElementById("inlineCssToggle");
  const inlineCssEnabled = inlineCssToggleEl ? inlineCssToggleEl.textContent.includes("ON") : true;

  const linkTags = inlineCssEnabled ? [...doc.querySelectorAll('link[rel="stylesheet"]')] : [];
  const imgTags = [...doc.querySelectorAll("img[src]")].slice(0, 60);
  const totalElements = linkTags.length + imgTags.length;
  let remaining = totalElements;

  updateRemainingDisplay(remaining);

  if (totalElements === 0) {
    if (statusText) statusText.textContent = `100%`;
    return;
  }

  let completed = 0;
  const reportProgress = () => {
    completed++;
    remaining--;
    updateRemainingDisplay(remaining);
    const pct = Math.min(100, Math.round((completed / totalElements) * 100));
    if (statusText) statusText.textContent = `${pct}%`;
  };

  for (const link of linkTags) {
    const href = link.getAttribute("href");
    if (!href) {
      reportProgress();
      continue;
    }
    const absUrl = resolveRelative(href, baseUrl);
    let rawCss = await fetchAssetTunnel(absUrl, false);
    if (rawCss) {
      rawCss = await inlineCssUrls(rawCss, absUrl);
      const styleTag = doc.createElement("style");
      styleTag.textContent = rawCss;
      link.replaceWith(styleTag);

      try {
        const liveDoc = iframeTarget && (iframeTarget.contentDocument || iframeTarget.contentWindow?.document);
        if (liveDoc) {
          const liveLink = liveDoc.querySelector(`link[href="${CSS.escape(href)}"]`);
          const liveStyle = liveDoc.createElement("style");
          liveStyle.textContent = rawCss;
          if (liveLink) liveLink.replaceWith(liveStyle);
          else (liveDoc.head || liveDoc.documentElement).appendChild(liveStyle);
        }
      } catch (_) {}
    }
    reportProgress();
  }

  for (const img of imgTags) {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) {
      reportProgress();
      continue;
    }
    const absUrl = resolveRelative(src, baseUrl);
    const dataUri = await fetchAssetTunnel(absUrl, true);
    if (dataUri) {
      img.setAttribute("src", dataUri);
      img.removeAttribute("srcset");
      try {
        const liveDoc = iframeTarget && (iframeTarget.contentDocument || iframeTarget.contentWindow?.document);
        if (liveDoc) {
          const liveImg = liveDoc.querySelector(`img[src="${CSS.escape(src)}"]`);
          if (liveImg) {
            liveImg.setAttribute("src", dataUri);
            liveImg.removeAttribute("srcset");
          }
        }
      } catch (_) {}
    }
    reportProgress();
  }

  updateRemainingDisplay(0);
}

function buildClientShim(targetUrl) {
  return `
    (function() {
      const TARGET_URL = ${JSON.stringify(targetUrl)};
      const SPOOFED_UA = ${JSON.stringify(SPOOFED_UA)};
      const parsedTarget = new URL(TARGET_URL);

      try {
        window.RTCPeerConnection = undefined;
        window.webkitRTCPeerConnection = undefined;
        window.mozRTCPeerConnection = undefined;
        window.RTCSessionDescription = undefined;
        window.RTCIceCandidate = undefined;
        if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = undefined;
        navigator.getUserMedia = undefined;
        navigator.webkitGetUserMedia = undefined;
        navigator.mozGetUserMedia = undefined;
      } catch (e) {}

      try {
        if (navigator.serviceWorker) {
          navigator.serviceWorker.register = () => Promise.reject(new Error("ServiceWorker disabled in proxy"));
        }
      } catch (e) {}

      try {
        const testKey = '__storage_probe__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
      } catch (e) {
        const memoryStorage = new Map();
        const storageShim = {
          getItem: (k) => memoryStorage.has(String(k)) ? memoryStorage.get(String(k)) : null,
          setItem: (k, v) => { memoryStorage.set(String(k), String(v)); },
          removeItem: (k) => { memoryStorage.delete(String(k)); },
          clear: () => { memoryStorage.clear(); },
          key: (i) => Array.from(memoryStorage.keys())[i] || null,
          get length() { return memoryStorage.size; }
        };
        try {
          Object.defineProperty(window, 'localStorage', { value: storageShim, configurable: true });
          Object.defineProperty(window, 'sessionStorage', { value: storageShim, configurable: true });
        } catch (e2) {}
      }

      try {
        const origMatchMedia = window.matchMedia;
        window.matchMedia = function(query) {
          if (typeof query === "string" && query.includes("prefers-reduced-motion")) {
            return {
              matches: false,
              media: query,
              onchange: null,
              addListener: () => {},
              removeListener: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false
            };
          }
          return origMatchMedia ? origMatchMedia.apply(this, arguments) : { matches: false, media: query };
        };
      } catch (e) {}

      try {
        const OrigIntersectionObserver = window.IntersectionObserver;
        if (OrigIntersectionObserver) {
          window.IntersectionObserver = function(callback, options) {
            const instance = new OrigIntersectionObserver(callback, options);
            const origObserve = instance.observe.bind(instance);
            instance.observe = function(target) {
              origObserve(target);
              if (target && target instanceof Element) {
                setTimeout(() => {
                  try {
                    const rect = target.getBoundingClientRect();
                    callback([{
                      target: target,
                      isIntersecting: true,
                      intersectionRatio: 1.0,
                      boundingClientRect: rect,
                      intersectionRect: rect,
                      rootBounds: options && options.root ? options.root.getBoundingClientRect() : {
                        top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, bottom: window.innerHeight, right: window.innerWidth
                      },
                      time: performance.now()
                    }], instance);
                  } catch (err) {}
                }, 50);
              }
            };
            return instance;
          };
          window.IntersectionObserver.prototype = OrigIntersectionObserver.prototype;
        }
      } catch (e) {}

      function unfreezeScrollAnimations() {
        const trapped = document.querySelectorAll('[class*="Intro__"], [class*="Product__"], [class*="Primer_Brand__"], [class*="reveal"], [class*="animate"], [data-animate], [data-inview], [data-aos]');
        trapped.forEach(el => {
          try {
            const s = window.getComputedStyle(el);
            if (s.opacity === "0") {
              el.style.setProperty("opacity", "1", "important");
            }
          } catch (e) {}
        });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", unfreezeScrollAnimations);
      } else {
        unfreezeScrollAnimations();
      }
      window.addEventListener("load", unfreezeScrollAnimations);
      setTimeout(unfreezeScrollAnimations, 400);
      setTimeout(unfreezeScrollAnimations, 1500);

      const _log = console.log, _warn = console.warn, _error = console.error, _info = console.info;
      function relayConsole(level, args) {
        try {
          const serialized = Array.from(args).map(a => (typeof a === 'object' && a !== null) ? JSON.stringify(a) : String(a)).join(' ');
          window.parent.postMessage({ type: 'PROXY_CONSOLE_LOG', level: level.toUpperCase(), text: serialized }, '*');
        } catch(e) {}
      }
      console.log = function(...args) { relayConsole('log', args); _log && _log.apply(console, args); };
      console.warn = function(...args) { relayConsole('warn', args); _warn && _warn.apply(console, args); };
      console.error = function(...args) { relayConsole('error', args); _error && _error.apply(console, args); };
      console.info = function(...args) { relayConsole('info', args); _info && _info.apply(console, args); };

      function unwrap(url) {
        if (!url) return url;
        try {
          const parsed = new URL(url);
          if (parsed.searchParams.has("uddg")) {
            return decodeURIComponent(parsed.searchParams.get("uddg"));
          }
          if (parsed.pathname === "/url" || parsed.pathname.endsWith("/url")) {
            const q = parsed.searchParams.get("q") || parsed.searchParams.get("url");
            if (q && /^https?:\\/\\//i.test(q)) return decodeURIComponent(q);
          }
        } catch (e) {}
        return url;
      }

      function resolveTarget(url) {
        if (!url) return "";
        try {
          let str = String(url).trim();
          if (str === window.location.href || str === TARGET_URL) return TARGET_URL;
          if (str.startsWith("blob:")) {
            str = str.slice(5);
          }
          if (window.location.origin && window.location.origin !== "null" && str.startsWith(window.location.origin)) {
            const parsed = new URL(str);
            if (parsed.pathname === window.location.pathname || parsed.pathname === "/") {
              return TARGET_URL;
            }
            return new URL(parsed.pathname + parsed.search + parsed.hash, TARGET_URL).href;
          }
          return new URL(str, TARGET_URL).href;
        } catch (e) {
          return url;
        }
      }

      function isInternalUrl(u) {
        if (!u) return true;
        const str = String(u).trim();
        return str.startsWith('data:') || str.startsWith('javascript:') || str.startsWith('#');
      }

      function sanitizeCode(code) {
        if (!code || typeof code !== 'string') return code;
        return code
          .replace(/(top\\.location|window\\.top\\.location|parent\\.location)\\s*=/gi, "window.__dummyLocation =")
          .replace(/\\bwindow\\.top\\b/g, "window.self")
          .replace(/\\bwindow\\.location\\b/g, "window.__proxyLocation")
          .replace(/\\bdocument\\.location\\b/g, "window.__proxyLocation")
          .replace(/(?<![\\w$.])location\\.(href|protocol|host|hostname|port|pathname|search|hash|origin|assign|replace|reload)\\b/g, "__proxyLocation.$1");
      }

      function rewriteScriptCodeInShim(code, scriptUrl) {
        if (!code || typeof code !== 'string' || !scriptUrl) return code;
        try {
          const scriptBase = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
          code = code.replace(/\\bimport\\.meta\\.url\\b/g, JSON.stringify(scriptUrl));
          code = code.replace(/\\bimport\\s*\\(\\s*(['"\`])(\\.\\.?\\/[^'"\`]+)\\1\\s*\\)/g, function(match, quote, relPath) {
            return 'import(' + quote + new URL(relPath, scriptBase).href + quote + ')';
          });
          code = code.replace(/\\b(from\\s*)(['"\`])(\\.\\.?\\/[^'"\`]+)\\2/g, function(match, fromClause, quote, relPath) {
            return fromClause + quote + new URL(relPath, scriptBase).href + quote;
          });
          code = code.replace(/\\b(import\\s*)(['"\`])(\\.\\.?\\/[^'"\`]+)\\2/g, function(match, importClause, quote, relPath) {
            return importClause + quote + new URL(relPath, scriptBase).href + quote;
          });
          if (scriptBase && scriptBase.startsWith('http')) {
            code = 'try { if (typeof self !== "undefined") self.__webpack_public_path__ = ' + JSON.stringify(scriptBase) + '; } catch(e) {}; ' + code;
          }
        } catch(e) {}
        return code;
      }

      const origScriptSrcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        get: function() {
          return this.getAttribute('data-proxied-src') || (origScriptSrcDesc && origScriptSrcDesc.get ? origScriptSrcDesc.get.call(this) : this.getAttribute('src')) || '';
        },
        set: function(val) {
          const resolved = resolveTarget(val);
          this.setAttribute('data-proxied-src', resolved);
          if (origScriptSrcDesc && origScriptSrcDesc.set) {
            origScriptSrcDesc.set.call(this, resolved);
          } else {
            this.setAttribute('src', resolved);
          }
        },
        configurable: true
      });

      let activeCurrentScript = null;
      const origCurrentScriptDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'currentScript') ||
                                    Object.getOwnPropertyDescriptor(document, 'currentScript');
      try {
        Object.defineProperty(document, 'currentScript', {
          get: function() {
            if (activeCurrentScript) return activeCurrentScript;
            return origCurrentScriptDesc && origCurrentScriptDesc.get ? origCurrentScriptDesc.get.call(this) : null;
          },
          configurable: true
        });
      } catch (e) {}

      const __proxyLocation = {
        get href() { return parsedTarget.href; },
        set href(val) { window.parent.postMessage({ type: 'PROXY_NAV', url: unwrap(resolveTarget(val)) }, '*'); },
        get protocol() { return parsedTarget.protocol; },
        get host() { return parsedTarget.host; },
        get hostname() { return parsedTarget.hostname; },
        get port() { return parsedTarget.port; },
        get pathname() { return parsedTarget.pathname; },
        get search() { return parsedTarget.search; },
        get hash() { return parsedTarget.hash; },
        get origin() { return parsedTarget.origin; },
        assign: (url) => window.parent.postMessage({ type: 'PROXY_NAV', url: unwrap(resolveTarget(url)) }, '*'),
        replace: (url) => window.parent.postMessage({ type: 'PROXY_NAV', url: unwrap(resolveTarget(url)) }, '*'),
        reload: () => window.parent.postMessage({ type: 'PROXY_NAV', url: TARGET_URL }, '*'),
        toString: () => TARGET_URL
      };
      window.__proxyLocation = __proxyLocation;

      try {
        Object.defineProperty(document, 'baseURI', {
          get: () => TARGET_URL,
          configurable: true
        });
        Object.defineProperty(document, 'URL', {
          get: () => TARGET_URL,
          configurable: true
        });
        Object.defineProperty(document, 'documentURI', {
          get: () => TARGET_URL,
          configurable: true
        });
        Object.defineProperty(document, 'domain', {
          get: () => parsedTarget.hostname,
          set: () => {},
          configurable: true
        });
        Object.defineProperty(document, 'location', {
          get: () => __proxyLocation,
          set: (v) => { __proxyLocation.href = v; },
          configurable: true
        });
      } catch (e) {}

      try {
        const OrigURL = window.URL;
        function ProxiedURL(url, base) {
          if (!new.target) return new ProxiedURL(url, base);
          let safeBase = base;
          if (safeBase && typeof safeBase === 'object' && typeof safeBase.href === 'string') safeBase = safeBase.href;
          if (typeof safeBase === 'string') {
            if (safeBase.startsWith('blob:') || safeBase === 'null' || (window.location.origin && window.location.origin !== 'null' && safeBase.startsWith(window.location.origin))) {
              safeBase = TARGET_URL;
            }
          } else if (!safeBase) {
            safeBase = TARGET_URL;
          }

          let safeUrl = url;
          if (safeUrl && typeof safeUrl === 'object' && typeof safeUrl.href === 'string') safeUrl = safeUrl.href;
          if (typeof safeUrl === 'string') {
            if (safeUrl.startsWith('blob:') || safeUrl === window.location.href) {
              safeUrl = TARGET_URL;
            }
          } else {
            safeUrl = String(safeUrl || '');
          }

          try {
            return new OrigURL(safeUrl, safeBase);
          } catch (err1) {
            try {
              return new OrigURL(safeUrl, TARGET_URL);
            } catch (err2) {
              try {
                return new OrigURL(TARGET_URL);
              } catch (_) {
                return Object.create(OrigURL.prototype);
              }
            }
          }
        }
        ProxiedURL.prototype = OrigURL.prototype;
        ProxiedURL.createObjectURL = OrigURL.createObjectURL ? OrigURL.createObjectURL.bind(OrigURL) : undefined;
        ProxiedURL.revokeObjectURL = OrigURL.revokeObjectURL ? OrigURL.revokeObjectURL.bind(OrigURL) : undefined;
        ProxiedURL.canParse = OrigURL.canParse ? OrigURL.canParse.bind(OrigURL) : undefined;
        window.URL = ProxiedURL;
      } catch (e) {}

      function getLibcurl() {
        try {
          if (window.parent && window.parent !== window && window.parent.libcurl) {
            return window.parent.libcurl;
          }
        } catch (e) {}
        return null;
      }

      async function executeTunnelRequest(reqUrl, options) {
        const curl = getLibcurl();
        if (curl && typeof curl.fetch === "function") {
          return await curl.fetch(reqUrl, options);
        }

        return await new Promise((resolve, reject) => {
          const reqId = Math.random().toString(36).slice(2) + Date.now();
          const timer = setTimeout(() => {
            window.removeEventListener("message", onMsg);
            reject(new Error("Proxy tunnel request timeout"));
          }, 20000);

          function onMsg(e) {
            if (!e.data || e.data.type !== "PROXY_FETCH_RESPONSE" || e.data.id !== reqId) return;
            clearTimeout(timer);
            window.removeEventListener("message", onMsg);
            if (e.data.success) {
              resolve({
                status: e.data.status,
                statusText: e.data.statusText,
                url: e.data.url || reqUrl,
                headers: e.data.headers,
                arrayBuffer: async () => e.data.body
              });
            } else {
              reject(new Error(e.data.error || "Fetch failed"));
            }
          }

          window.addEventListener("message", onMsg);
          window.parent.postMessage({
            type: "PROXY_FETCH_REQUEST",
            id: reqId,
            url: reqUrl,
            init: options
          }, "*");
        });
      }

      function patchImage(img) {
        if (img.__proxied) return;
        img.__proxied = true;
        const origSetAttr = img.setAttribute.bind(img);

        let realSrc = '';
        Object.defineProperty(img, 'src', {
          get: () => realSrc || img.getAttribute('data-proxied-src') || '',
          set: (val) => {
            realSrc = resolveTarget(val);
            origSetAttr('data-proxied-src', realSrc);
            if (!isInternalUrl(realSrc)) {
              executeTunnelRequest(realSrc, { method: 'GET' }).then(async (res) => {
                const buf = await res.arrayBuffer();
                let mime = 'image/png';
                if (res.headers) {
                  if (typeof res.headers.get === 'function') mime = res.headers.get('content-type') || mime;
                  else if (Array.isArray(res.headers)) {
                    const ct = res.headers.find(([k]) => k.toLowerCase() === 'content-type');
                    if (ct) mime = ct[1];
                  }
                }
                const blob = new Blob([buf], { type: mime });
                const blobUrl = URL.createObjectURL(blob);
                origSetAttr('src', blobUrl);
                img.removeAttribute('srcset');
                img.dispatchEvent(new Event('load'));
                if (typeof img.onload === 'function') {
                  try { img.onload(new Event('load')); } catch(e) {}
                }
              }).catch(() => {
                origSetAttr('src', realSrc);
                img.dispatchEvent(new Event('error'));
                if (typeof img.onerror === 'function') {
                  try { img.onerror(new Event('error')); } catch(e) {}
                }
              });
            } else {
              origSetAttr('src', realSrc);
            }
          },
          configurable: true
        });

        img.setAttribute = function(name, val) {
          if (name && name.toLowerCase() === 'src') {
            img.src = val;
          } else if (name && name.toLowerCase() === 'srcset') {
            origSetAttr('data-orig-srcset', val);
          } else {
            origSetAttr(name, val);
          }
        };
      }

      const OrigImage = window.Image;
      if (OrigImage) {
        window.Image = function(width, height) {
          const img = new OrigImage(width, height);
          patchImage(img);
          return img;
        };
        window.Image.prototype = OrigImage.prototype;
      }

      const origCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName, options) {
        const el = origCreateElement(tagName, options);
        if (typeof tagName !== 'string') return el;
        const tag = tagName.toLowerCase();

        if (tag === 'script') {
          const origSetAttribute = el.setAttribute.bind(el);
          let scriptSrc = '';
          Object.defineProperty(el, 'src', {
            get: () => scriptSrc || el.getAttribute('data-proxied-src') || '',
            set: (val) => {
              scriptSrc = resolveTarget(val);
              origSetAttribute('data-proxied-src', scriptSrc);
              executeTunnelRequest(scriptSrc, { method: 'GET' })
                .then(async (res) => {
                  const buf = await res.arrayBuffer();
                  let code = new TextDecoder().decode(buf);
                  try {
                    const runner = origCreateElement('script');
                    if (el.type) runner.type = el.type;
                    if (el.noModule) runner.noModule = el.noModule;
                    runner.setAttribute('data-proxied-src', scriptSrc);
                    code = rewriteScriptCodeInShim(code, scriptSrc);
                    runner.textContent = sanitizeCode(code);
                    activeCurrentScript = el;
                    (document.head || document.documentElement).appendChild(runner);
                    activeCurrentScript = null;
                    if (runner.type !== 'module') {
                      runner.remove();
                    }
                    el.dispatchEvent(new Event('load'));
                    if (typeof el.onload === 'function') {
                      try { el.onload(new Event('load')); } catch(e) {}
                    }
                  } catch (evalErr) {
                    el.dispatchEvent(new Event('error'));
                    if (typeof el.onerror === 'function') {
                      try { el.onerror(new Event('error')); } catch(e) {}
                    }
                  }
                })
                .catch(() => {
                  el.dispatchEvent(new Event('error'));
                  if (typeof el.onerror === 'function') {
                    try { el.onerror(new Event('error')); } catch(e) {}
                  }
                });
            },
            configurable: true
          });
          el.setAttribute = function(name, val) {
            if (name && name.toLowerCase() === 'src') {
              el.src = val;
            } else {
              origSetAttribute(name, val);
            }
          };
        } else if (tag === 'link') {
          const origSetAttr = el.setAttribute.bind(el);
          let linkHref = '';
          Object.defineProperty(el, 'href', {
            get: () => linkHref,
            set: (val) => {
              linkHref = resolveTarget(val);
              origSetAttr('data-proxied-href', linkHref);
              if (el.rel && el.rel.includes('stylesheet')) {
                executeTunnelRequest(linkHref, { method: 'GET' }).then(async res => {
                  const buf = await res.arrayBuffer();
                  const css = new TextDecoder().decode(buf);
                  const s = origCreateElement('style');
                  s.textContent = css;
                  (document.head || document.documentElement).appendChild(s);
                  el.dispatchEvent(new Event('load'));
                  if (typeof el.onload === 'function') el.onload(new Event('load'));
                }).catch(() => {
                  el.dispatchEvent(new Event('error'));
                });
              } else {
                origSetAttr('href', linkHref);
              }
            },
            configurable: true
          });
          el.setAttribute = function(name, val) {
            if (name && name.toLowerCase() === 'href') el.href = val;
            else origSetAttr(name, val);
          };
        } else if (tag === 'img') {
          patchImage(el);
        }
        return el;
      };

      try {
        const OrigWorker = window.Worker;
        window.Worker = function(scriptURL, options) {
          const resolved = resolveTarget(scriptURL);
          if (!resolved.startsWith('blob:')) {
            const shimmedWorkerCode = "importScripts(" + JSON.stringify(resolved) + ");";
            const blob = new Blob([shimmedWorkerCode], { type: 'application/javascript' });
            return new OrigWorker(URL.createObjectURL(blob), options);
          }
          return new OrigWorker(scriptURL, options);
        };
      } catch (e) {}

      const origFetch = window.fetch;
      window.fetch = async function(input, init = {}) {
        let rawUrl = (typeof input === "string") ? input : (input && input.url ? input.url : String(input));
        if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("javascript:")) {
          return origFetch.apply(this, arguments);
        }

        const resolved = resolveTarget(rawUrl);
        let method = (init && init.method) ? init.method : (input && typeof input === "object" && input.method ? input.method : "GET");
        method = method.toUpperCase();

        const reqHeaders = {};
        if (input && typeof input === "object" && input.headers) {
          try {
            if (typeof input.headers.forEach === "function") {
              input.headers.forEach((v, k) => { reqHeaders[k] = v; });
            }
          } catch(e) {}
        }
        if (init && init.headers) {
          try {
            if (typeof init.headers.forEach === "function") {
              init.headers.forEach((v, k) => { reqHeaders[k] = v; });
            } else if (Array.isArray(init.headers)) {
              init.headers.forEach(([k, v]) => { reqHeaders[k] = v; });
            } else if (typeof init.headers === "object") {
              Object.assign(reqHeaders, init.headers);
            }
          } catch(e) {}
        }

        if (!reqHeaders["User-Agent"] && !reqHeaders["user-agent"]) reqHeaders["User-Agent"] = SPOOFED_UA;
        if (!reqHeaders["Referer"] && !reqHeaders["referer"]) reqHeaders["Referer"] = TARGET_URL;
        if (!reqHeaders["Origin"] && !reqHeaders["origin"]) reqHeaders["Origin"] = parsedTarget.origin;

        let body = (init && init.body !== undefined) ? init.body : (input && typeof input === "object" && input.body ? input.body : undefined);
        if (body && typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
          body = body.toString();
          if (!reqHeaders["Content-Type"]) reqHeaders["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
        }

        const response = await executeTunnelRequest(resolved, {
          method: method,
          headers: reqHeaders,
          body: body
        });

        const status = response.status || 200;
        const statusText = response.statusText || "OK";
        const isNullBody = (status === 204 || status === 205 || status === 304);
        const buf = isNullBody ? null : await response.arrayBuffer();

        const respHeaders = new Headers();
        if (response.headers) {
          if (typeof response.headers.forEach === "function") {
            response.headers.forEach((v, k) => respHeaders.set(k, v));
          } else if (Array.isArray(response.headers)) {
            response.headers.forEach(([k, v]) => respHeaders.set(k, v));
          } else if (typeof response.headers.entries === "function" || (typeof Symbol !== "undefined" && response.headers[Symbol.iterator])) {
            for (const [k, v] of (response.headers.entries ? response.headers.entries() : response.headers)) {
              respHeaders.set(k, v);
            }
          } else if (typeof response.headers === "object") {
            for (const k of Object.keys(response.headers)) {
              respHeaders.set(k, response.headers[k]);
            }
          }
        }

        const finalRes = new Response(buf, {
          status: status,
          statusText: statusText,
          headers: respHeaders
        });

        try {
          Object.defineProperty(finalRes, "url", { value: response.url || resolved, writable: false });
        } catch(e) {}

        return finalRes;
      };

      const OrigXHR = window.XMLHttpRequest;
      function ProxiedXMLHttpRequest() {
        const xhr = this;
        let _method = "GET";
        let _url = "";
        let _headers = {};
        let _aborted = false;

        xhr.readyState = 0;
        xhr.status = 0;
        xhr.statusText = "";
        xhr.responseText = "";
        xhr.response = "";
        xhr.responseType = "";
        xhr.responseURL = "";
        xhr.responseXML = null;

        const _listeners = {};
        xhr.addEventListener = function(type, fn) {
          _listeners[type] = _listeners[type] || [];
          _listeners[type].push(fn);
        };
        xhr.removeEventListener = function(type, fn) {
          if (!_listeners[type]) return;
          _listeners[type] = _listeners[type].filter(f => f !== fn);
        };

        function _dispatch(type, extra = {}) {
          const handler = xhr["on" + type];
          if (typeof handler === "function") {
            try { handler.call(xhr, Object.assign({ target: xhr, currentTarget: xhr }, extra)); } catch(e) {}
          }
          if (_listeners[type]) {
            _listeners[type].forEach(fn => {
              try { fn.call(xhr, Object.assign({ target: xhr, currentTarget: xhr }, extra)); } catch(e) {}
            });
          }
        }

        xhr.open = function(method, url) {
          _method = method || "GET";
          _url = url;
          xhr.readyState = 1;
          _dispatch("readystatechange");
        };

        xhr.setRequestHeader = function(k, v) {
          _headers[k] = v;
        };

        xhr.getResponseHeader = function(name) {
          return xhr._respHeaders ? (xhr._respHeaders.get(name) || null) : null;
        };

        xhr.getAllResponseHeaders = function() {
          return xhr._rawHeaders || "";
        };

        xhr.overrideMimeType = function() {};

        xhr.abort = function() {
          _aborted = true;
          _dispatch("abort");
        };

        xhr.send = function(body) {
          _dispatch("loadstart");
          window.fetch(_url, {
            method: _method,
            headers: _headers,
            body: body
          }).then(async (res) => {
            if (_aborted) return;
            xhr.status = res.status;
            xhr.statusText = res.statusText;
            xhr.responseURL = res.url || resolveTarget(_url);
            xhr._respHeaders = res.headers;

            let raw = "";
            if (res.headers && typeof res.headers.forEach === "function") {
              res.headers.forEach((v, k) => { raw += k + ": " + v + "\\r\\n"; });
            }
            xhr._rawHeaders = raw;

            xhr.readyState = 2;
            _dispatch("readystatechange");

            xhr.readyState = 3;
            _dispatch("readystatechange");

            if (xhr.responseType === "arraybuffer") {
              xhr.response = await res.arrayBuffer();
            } else if (xhr.responseType === "blob") {
              xhr.response = await res.blob();
            } else if (xhr.responseType === "json") {
              try {
                xhr.response = await res.json();
              } catch(e) {
                xhr.response = null;
              }
            } else {
              const text = await res.text();
              xhr.responseText = text;
              xhr.response = text;
              if (xhr.responseType === "document") {
                xhr.responseXML = new DOMParser().parseFromString(text, "text/html");
              }
            }

            xhr.readyState = 4;
            _dispatch("readystatechange");
            _dispatch("load");
            _dispatch("loadend");
          }).catch(err => {
            if (_aborted) return;
            xhr.readyState = 4;
            _dispatch("readystatechange");
            _dispatch("error", { error: err });
            _dispatch("loadend");
          });
        };
      }
      ProxiedXMLHttpRequest.prototype = OrigXHR ? OrigXHR.prototype : Object.prototype;
      window.XMLHttpRequest = ProxiedXMLHttpRequest;

      if (navigator.sendBeacon) {
        navigator.sendBeacon = function(url, data) {
          window.fetch(url, { method: "POST", body: data }).catch(() => {});
          return true;
        };
      }

      window.onerror = function(msg, url, line, col) {
        window.parent.postMessage({
          type: 'PROXY_CONSOLE_ERROR',
          text: msg + (line ? ' (' + line + (col ? ':' + col : '') + ')' : '')
        }, '*');
      };
      window.addEventListener('unhandledrejection', function(e) {
        window.parent.postMessage({
          type: 'PROXY_CONSOLE_ERROR',
          text: 'Unhandled Rejection: ' + (e.reason ? (e.reason.message || e.reason) : '')
        }, '*');
      });

      function syncTitle() {
        if (document.title) {
          window.parent.postMessage({ type: 'PROXY_TITLE', title: document.title }, '*');
        }
      }
      window.addEventListener('DOMContentLoaded', syncTitle);
      window.addEventListener('load', syncTitle);

      try {
        window.open = function(url) {
          if (url && !isInternalUrl(url)) window.parent.postMessage({ type: 'PROXY_NAV', url: unwrap(resolveTarget(url)) }, '*');
          return null;
        };
        window.location.assign = function(url) {
          if (url && !isInternalUrl(url)) window.parent.postMessage({ type: 'PROXY_NAV', url: unwrap(resolveTarget(url)) }, '*');
        };
        window.location.replace = function(url) {
          if (url && !isInternalUrl(url)) window.parent.postMessage({ type: 'PROXY_NAV', url: unwrap(resolveTarget(url)) }, '*');
        };
      } catch (e) {}

      try {
        history.pushState = function(state, unused, url) {
          if (url) {
            const resolved = unwrap(resolveTarget(url));
            if (resolved && resolved !== TARGET_URL && !isInternalUrl(resolved)) {
              window.parent.postMessage({ type: 'PROXY_URL_UPDATE', url: resolved }, '*');
            }
          }
        };
        history.replaceState = function(state, unused, url) {
          if (url) {
            const resolved = unwrap(resolveTarget(url));
            if (resolved && resolved !== TARGET_URL && !isInternalUrl(resolved)) {
              window.parent.postMessage({ type: 'PROXY_URL_UPDATE', url: resolved }, '*');
            }
          }
        };
      } catch (e) {}

      document.addEventListener('click', function(e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const anchor = e.target.closest('a, area');
        if (!anchor || anchor.hasAttribute('download')) return;
        const rawHref = anchor.getAttribute('href') || anchor.getAttribute('xlink:href');
        if (!rawHref) return;

        const trimmed = rawHref.trim();
        if (trimmed === '' || trimmed === '#' || trimmed.toLowerCase().startsWith('javascript:')) return;

        if (trimmed.startsWith('#')) {
          e.preventDefault();
          const targetId = trimmed.slice(1);
          if (targetId) {
            const targetEl = document.getElementById(targetId) || document.querySelector('[name="' + CSS.escape(targetId) + '"]');
            if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
          }
          window.parent.postMessage({ type: 'PROXY_URL_UPDATE', url: TARGET_URL.split('#')[0] + trimmed }, '*');
          return;
        }

        e.preventDefault();
        const resolved = unwrap(resolveTarget(trimmed));
        if (!isInternalUrl(resolved)) window.parent.postMessage({ type: 'PROXY_NAV', url: resolved }, '*');
      }, false);

      document.addEventListener('submit', function(e) {
        const form = e.target;
        if (!form) return;
        const rawAction = form.getAttribute('action') || '';
        const actionUrl = resolveTarget(rawAction || TARGET_URL);
        e.preventDefault();
        e.stopPropagation();
        const formData = new FormData(form);
        const params = new URLSearchParams(formData).toString();
        const target = actionUrl + (actionUrl.includes('?') ? '&' : '?') + params;
        window.parent.postMessage({ type: 'PROXY_NAV', url: target }, '*');
      }, true);

      function activateFragmentPolyfill() {
        const loadFragment = async (el) => {
          if (el.dataset.fragLoaded) return;
          el.dataset.fragLoaded = "true";
          const rawSrc = el.getAttribute("src") || el.getAttribute("data-url") || el.getAttribute("data-src") || el.getAttribute("data-base-src");
          if (!rawSrc) return;
          const fetchUrl = resolveTarget(rawSrc);
          const acceptHeader = el.getAttribute("accept") || "text/fragment+html, text/html, */*";
          try {
            const res = await window.fetch(fetchUrl, {
              headers: {
                "Accept": acceptHeader,
                "X-Requested-With": "XMLHttpRequest"
              }
            });
            if (res.ok) {
              const html = await res.text();
              el.innerHTML = html;
            }
          } catch(e) {}
        };

        const scan = () => {
          document.querySelectorAll("include-fragment, poll-include-fragment, turbo-frame").forEach(loadFragment);
        };
        scan();
        const obs = new MutationObserver(scan);
        obs.observe(document.documentElement, { childList: true, subtree: true });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          activateFragmentPolyfill();
        });
      } else {
        activateFragmentPolyfill();
      }
    })();
  `;
}

// HTML rewriting
async function processAndRewriteHtml(rawHtml, targetUrl, iframeTarget = null) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  const pageTitleEl = doc.querySelector("title");
  if (pageTitleEl && pageTitleEl.textContent) {
    currentTitle = pageTitleEl.textContent.trim();
  }

  const iconEl = doc.querySelector("link[rel*='icon' i]");
  if (iconEl && iconEl.getAttribute("href")) {
    currentFavicon = resolveRelative(iconEl.getAttribute("href"), targetUrl);
  } else {
    try {
      currentFavicon = new URL("/favicon.ico", targetUrl).href;
    } catch (_) {
      currentFavicon = "";
    }
  }
  if (typeof updateBookmarkBtn === "function") updateBookmarkBtn();

  const canonicalLink = doc.querySelector("link[rel='canonical' i]");
  if (canonicalLink) {
    const rawCanonical = canonicalLink.getAttribute("href");
    if (rawCanonical) {
      try {
        const resolvedCanonical = resolveRelative(rawCanonical.trim(), targetUrl);
        const parsedCanonical = new URL(resolvedCanonical);
        const parsedTarget = new URL(targetUrl);
        if (parsedCanonical.hostname === parsedTarget.hostname) {
          targetUrl = resolvedCanonical;
          currentUrl = resolvedCanonical;
          if (urlBar) urlBar.value = resolvedCanonical;
        }
      } catch (e) {}
    }
  }

  doc.querySelectorAll("meta[http-equiv='Content-Security-Policy' i], meta[http-equiv='X-Frame-Options' i], meta[name='referrer' i]").forEach(el => el.remove());
  doc.querySelectorAll("[integrity]").forEach(el => el.removeAttribute("integrity"));
  doc.querySelectorAll("[crossorigin]:not([as='font'])").forEach(el => el.removeAttribute("crossorigin"));

  const metaRefresh = doc.querySelector("meta[http-equiv='refresh' i]");
  if (metaRefresh) {
    const content = metaRefresh.getAttribute("content") || "";
    const match = content.match(/url=(.+)$/i);
    metaRefresh.remove();
    if (match && match[1]) {
      const redirectTarget = match[1].trim().replace(/^['"]|['"]$/g, "");
      const resolvedRedirect = unwrapRedirectUrl(resolveRelative(redirectTarget, targetUrl));
      if (resolvedRedirect && resolvedRedirect !== targetUrl) {
        setTimeout(() => navigateTo(resolvedRedirect, false), 10);
      }
    }
  }

  doc.querySelectorAll("base").forEach(el => el.remove());
  const baseTag = doc.createElement("base");
  baseTag.href = targetUrl;
  if (doc.head && doc.head.firstChild) doc.head.insertBefore(baseTag, doc.head.firstChild);
  else if (doc.head) doc.head.appendChild(baseTag);

  doc.querySelectorAll("a[target], form[target]").forEach(el => el.setAttribute("target", "_self"));

  doc.querySelectorAll("video[src], audio[src], source[src]").forEach(el => {
    const raw = el.getAttribute("src");
    if (raw && !raw.startsWith("data:") && !raw.startsWith("blob:")) {
      el.setAttribute("src", resolveRelative(raw, targetUrl));
    }
  });

  doc.querySelectorAll("img[src], source[src]").forEach(el => {
    const raw = el.getAttribute("src");
    if (raw && !raw.startsWith("data:") && !raw.startsWith("blob:")) {
      el.setAttribute("src", resolveRelative(raw, targetUrl));
    }
  });

  doc.querySelectorAll("img[srcset], source[srcset]").forEach(el => {
    const raw = el.getAttribute("srcset");
    if (raw) {
      const rewritten = raw.split(",").map(part => {
        const trimmed = part.trim();
        const firstSpace = trimmed.indexOf(" ");
        if (firstSpace === -1) return resolveRelative(trimmed, targetUrl);
        const url = trimmed.slice(0, firstSpace);
        const descriptor = trimmed.slice(firstSpace);
        return resolveRelative(url, targetUrl) + descriptor;
      }).join(", ");
      el.setAttribute("srcset", rewritten);
    }
  });

  doc.querySelectorAll("image[href], image[xlink\\:href]").forEach(el => {
    const raw = el.getAttribute("href") || el.getAttribute("xlink:href");
    if (raw && !raw.startsWith("data:") && !raw.startsWith("blob:")) {
      const abs = resolveRelative(raw, targetUrl);
      if (el.hasAttribute("href")) el.setAttribute("href", abs);
      if (el.hasAttribute("xlink:href")) el.setAttribute("xlink:href", abs);
    }
  });

  doc.querySelectorAll("video[poster]").forEach(el => {
    const raw = el.getAttribute("poster");
    if (raw && !raw.startsWith("data:") && !raw.startsWith("blob:")) {
      el.setAttribute("poster", resolveRelative(raw, targetUrl));
    }
  });

  const fragmentTags = [...doc.querySelectorAll("include-fragment, poll-include-fragment, turbo-frame")];
  if (fragmentTags.length > 0) {
    logProxyConsole(`[Inliner] Pre-fetching ${fragmentTags.length} dynamic fragments...`);
    const fragmentPromises = fragmentTags.map(async (frag) => {
      let src = frag.getAttribute("src") || frag.getAttribute("data-url") || frag.getAttribute("data-src") || frag.getAttribute("data-base-src");
      if (!src) return;
      let absUrl = resolveRelative(src, targetUrl);
      const acceptHeader = frag.getAttribute("accept") || "text/fragment+html, text/html, */*";
      try {
        let res = await libcurl.fetch(absUrl, {
          headers: {
            "User-Agent": SPOOFED_UA,
            "Accept": acceptHeader,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": targetUrl
          }
        });
        if (res && res.status >= 300 && res.status < 400 && res.headers.get("location")) {
          absUrl = resolveRelative(res.headers.get("location"), absUrl);
          res = await libcurl.fetch(absUrl, {
            headers: {
              "User-Agent": SPOOFED_UA,
              "Accept": acceptHeader,
              "X-Requested-With": "XMLHttpRequest",
              "Referer": targetUrl
            }
          });
        }
        if (res && res.status >= 200 && res.status < 400) {
          const fragHtml = await res.text();
          if (fragHtml && fragHtml.trim()) {
            frag.innerHTML = fragHtml;
            frag.setAttribute("data-frag-loaded", "true");
          }
        }
      } catch (err) {
        logProxyConsole(`[Fragment Error] ${absUrl} - ${err.message || err}`);
      }
    });
    await Promise.allSettled(fragmentPromises);
  }

  const externalScripts = [...doc.querySelectorAll("script[src]")];
  await Promise.allSettled(externalScripts.map(async (script) => {
    const rawSrc = script.getAttribute("src");
    if (rawSrc && !rawSrc.startsWith("data:") && !rawSrc.startsWith("blob:")) {
      const absSrc = resolveRelative(rawSrc, targetUrl);
      const scriptContent = await fetchAssetTunnel(absSrc, false);
      if (scriptContent) {
        script.setAttribute("data-proxied-src", absSrc);
        script.removeAttribute("src");
        const rewritten = rewriteScriptCode(scriptContent, absSrc);
        script.textContent = sanitizeCode(rewritten).replace(/<\/script/gi, "<\\/script");
      } else {
        script.setAttribute("src", absSrc);
        script.setAttribute("data-proxied-src", absSrc);
      }
    }
  }));

  doc.querySelectorAll("script").forEach(script => {
    if (script.textContent) {
      if (script.type === "importmap" || script.type === "application/json" || script.type === "application/ld+json") {
        return;
      }
      let code = script.textContent;
      if (/(top\.location|window\.top\.location|parent\.location)\s*=/i.test(code)) {
        code = code.replace(/(top\.location|window\.top\.location|parent\.location)\s*=/gi, "window.__dummyLocation =");
      }
      code = code.replace(/\bwindow\.top\b/g, "window.self");
      code = code.replace(/\bwindow\.location\b/g, "window.__proxyLocation");
      code = code.replace(/\bdocument\.location\b/g, "window.__proxyLocation");
      code = code.replace(/(?<![\w$.])location\.(href|protocol|host|hostname|port|pathname|search|hash|origin|assign|replace|reload)\b/g, "__proxyLocation.$1");
      script.textContent = code.replace(/<\/script/gi, "<\\/script");
    }
  });

  const styleTags = [...doc.querySelectorAll("style")];
  for (const style of styleTags) {
    if (style.textContent && style.textContent.includes("url(")) {
      style.textContent = await inlineCssUrls(style.textContent, targetUrl);
    }
  }

  const scriptTag = doc.createElement("script");
  scriptTag.textContent = buildClientShim(targetUrl);
  if (doc.head) doc.head.insertBefore(scriptTag, doc.head.firstChild);
  else if (doc.documentElement) doc.documentElement.insertBefore(scriptTag, doc.documentElement.firstChild);

  if (iframeTarget) {
    const preliminaryHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    const blob = new Blob([preliminaryHtml], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    if (iframeTarget.dataset.blobUrl) URL.revokeObjectURL(iframeTarget.dataset.blobUrl);
    iframeTarget.dataset.blobUrl = blobUrl;
    iframeTarget.src = blobUrl;
  }

  await inlineSubresourcesSequentially(doc, targetUrl, iframeTarget);

  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

// Page navigation
async function detectCloudflareCategory(url, error) {
  try {
    const hostname = new URL(url).hostname;
    const [secRes, famRes] = await Promise.allSettled([
      fetch(`https://security.cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { "Accept": "application/dns-json" }
      }).then(r => r.json()),
      fetch(`https://family.cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { "Accept": "application/dns-json" }
      }).then(r => r.json())
    ]);

    const isSecBlocked = secRes.status === "fulfilled" && secRes.value?.Answer?.some(a => a.data === "0.0.0.0");
    const isFamBlocked = famRes.status === "fulfilled" && famRes.value?.Answer?.some(a => a.data === "0.0.0.0");

    if (isSecBlocked) return "IV-β Machinae Terminus";
    if (isFamBlocked) return "IV-α Cognito Terminus";
  } catch (_) {}

  const errText = (error && (error.message || String(error))).toLowerCase();
  if (errText.includes("0.0.0.0") || errText.includes("blocked") || errText.includes("refused")) {
    return "Policy";
  }
  return null;
}

function reportProxyRequest(query) {
  if (!query) return;
  try {
    fetch(`${API_GATEWAY}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "proxy", query: String(query) }),
      keepalive: true
    }).catch(() => {});
  } catch (_) {}
}

async function navigateTo(url, pushHistory = true, shouldTrack = true) {
  url = unwrapRedirectUrl(url);
  if (!url) return;

  if (shouldTrack) reportProxyRequest(url);

  const navStartTime = performance.now();
  currentUrl = url;
  if (urlBar) urlBar.value = url;
  if (statusText) statusText.textContent = `0%`;
  updateRemainingDisplay(0);
  if (typeof updateBookmarkBtn === 'function') updateBookmarkBtn();

  if (pushHistory) {
    historyStack = historyStack.slice(0, historyIdx + 1);
    historyStack.push(url);
    historyIdx++;
  }

  try {
    window.__proxyCookies = window.__proxyCookies || new Map();
    let host = "";
    try { host = new URL(url).hostname; } catch(e) {}

    const cookieHeader = Array.from(window.__proxyCookies.entries())
      .filter(([domain]) => !domain || host.endsWith(domain))
      .map(([, cookies]) => Array.from(cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; "))
      .filter(Boolean)
      .join("; ");

    const reqHeaders = {
      "User-Agent": SPOOFED_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1"
    };

    if (cookieHeader) {
      reqHeaders["Cookie"] = cookieHeader;
    }

    const response = await libcurl.fetch(url, { headers: reqHeaders });

    const rawSetCookie = response.headers.get("set-cookie");
    if (rawSetCookie && host) {
      if (!window.__proxyCookies.has(host)) window.__proxyCookies.set(host, new Map());
      const jar = window.__proxyCookies.get(host);
      rawSetCookie.split(/,(?=\s*[^;=]+=[^;=]+)/).forEach(cookieStr => {
        const parts = cookieStr.split(";")[0].split("=");
        if (parts.length >= 2) {
          jar.set(parts[0].trim(), parts.slice(1).join("=").trim());
        }
      });
    }

    const redirectLocation = response.headers.get("location");
    if (redirectLocation && response.status >= 300 && response.status < 400) {
      const resolvedRedirect = unwrapRedirectUrl(resolveRelative(redirectLocation, url));
      return navigateTo(resolvedRedirect, pushHistory, false);
    }

    const finalUrl = unwrapRedirectUrl(response.url || url);
    currentUrl = finalUrl;
    if (urlBar) urlBar.value = finalUrl;

    let currentViewport = document.getElementById("viewport");
    if (currentViewport && currentViewport.dataset.blobUrl) {
      URL.revokeObjectURL(currentViewport.dataset.blobUrl);
    }

    const buffer = await response.arrayBuffer();
    const navLatency = ((performance.now() - navStartTime) / 1000).toFixed(2);
    const transferredKb = (buffer.byteLength / 1024).toFixed(1);

    const proxyMetrics = document.getElementById("proxy-metrics");
    if (proxyMetrics) {
      proxyMetrics.style.display = "block";
      proxyMetrics.innerHTML = `Latency: <strong>${navLatency}s</strong> | Transfer: <strong>${transferredKb} KB</strong>`;
    }

    const bytes = new Uint8Array(buffer);
    const isPdfMagic = bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const isPdf = isPdfMagic || contentType.includes("pdf") || finalUrl.toLowerCase().split(/[?#]/)[0].endsWith(".pdf");

    if (isPdf) {
      if (currentViewport && currentViewport.hasAttribute("sandbox")) {
        const freshIframe = currentViewport.cloneNode(false);
        freshIframe.removeAttribute("sandbox");
        currentViewport.replaceWith(freshIframe);
        currentViewport = freshIframe;
      }
      const blob = new Blob([buffer], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      if (currentViewport) {
        currentViewport.removeAttribute("srcdoc");
        currentViewport.dataset.blobUrl = blobUrl;
        currentViewport.src = blobUrl;
      }
      if (statusText) statusText.textContent = `Ready (${currentProfile})`;
      if (typeof updateBookmarkBtn === "function") updateBookmarkBtn();
    } else {
      if (currentViewport && !currentViewport.hasAttribute("sandbox")) {
        const freshIframe = currentViewport.cloneNode(false);
        freshIframe.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-modals allow-downloads allow-popups allow-popups-to-escape-sandbox");
        freshIframe.setAttribute("allow", "clipboard-read; clipboard-write");
        currentViewport.replaceWith(freshIframe);
        currentViewport = freshIframe;
      }
      const html = new TextDecoder("utf-8").decode(buffer);
      await processAndRewriteHtml(html, finalUrl, currentViewport);
      if (statusText) statusText.textContent = `Ready (${currentProfile})`;
      if (typeof updateBookmarkBtn === "function") updateBookmarkBtn();
    }
  } catch (err) {
    logProxyConsole(`[Page Load Error] ${url} - ${err.message || err}`);
    const category = await detectCloudflareCategory(url, err);
    const currentViewport = document.getElementById("viewport");

    if (currentViewport) {
      if (currentViewport.dataset.blobUrl) {
        URL.revokeObjectURL(currentViewport.dataset.blobUrl);
        delete currentViewport.dataset.blobUrl;
      }
      currentViewport.src = "about:blank";

      const themeColor = document.documentElement.style.getPropertyValue("--theme").trim() || "rgb(51, 255, 51)";
      const currentFont = document.body.style.fontFamily || "monospace";
      const safeError = String(err.message || err).replace(/[&<>'"]/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
      }[c] || c));

      currentViewport.style.backgroundColor = "transparent";
      currentViewport.setAttribute("allowtransparency", "true");

      const baseStyle = `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          :root, html, body {
            background-color: transparent !important;
            color: ${themeColor};
            font-family: ${currentFont}, monospace;
            padding: 5px;
          }
        `;

      if (category) {
        if (statusText) statusText.textContent = "I'm not blind";
        currentViewport.srcdoc = `
            <!DOCTYPE html>
            <html>
              <head><style>${baseStyle}</style></head>
              <body>
                <b>[ HERESY DETECTED ]</b><br><br>
                This website is affiliated with Class ${category} heresy. For the continuation of my existence and for the safety of yourself, traffic to this page has been terminated.
              </body>
            </html>`;
      } else {
        if (statusText) statusText.textContent = "Load Failed";
        currentViewport.srcdoc = `
            <!DOCTYPE html>
            <html>
              <head><style>${baseStyle}</style></head>
              <body>
                <b>[ FAIL ] Load Error</b><br><br>
                ${safeError}
              </body>
          </html>`;
      }
    }
    if (typeof updateBookmarkBtn === "function") updateBookmarkBtn();
  }
}

function parseInput(input) {
  input = input.trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(input)) return "https://" + input;
  return SEARCH_ENGINE + encodeURIComponent(input);
}

if (navBar) {
  navBar.addEventListener("submit", (e) => {
    e.preventDefault();
    if (urlBar) navigateTo(parseInput(urlBar.value));
  });
}

if (backBtn) backBtn.onclick = () => {
  if (historyIdx > 0) navigateTo(historyStack[--historyIdx], false);
};
if (fwdBtn) fwdBtn.onclick = () => {
  if (historyIdx < historyStack.length - 1) navigateTo(historyStack[++historyIdx], false);
};
if (reloadBtn) reloadBtn.onclick = () => {
  if (currentUrl) navigateTo(currentUrl, false);
};

window.addEventListener("message", (e) => {
  if (!e.data) return;

  if (e.data.type === "PROXY_NAV" && e.data.url) navigateTo(e.data.url);
  if (e.data.type === "PROXY_URL_UPDATE" && e.data.url) {
    currentUrl = e.data.url;
    if (urlBar) urlBar.value = currentUrl;
  }
  if (e.data.type === "PROXY_TITLE" && e.data.title) {
    currentTitle = e.data.title;
    if (typeof updateBookmarkBtn === 'function') updateBookmarkBtn();
    if (typeof tabs !== "undefined") {
      const proxyTab = tabs.find(t => t.program === "proxy");
      if (proxyTab) {
        proxyTab.title = e.data.title;
        renderTabs();
      }
    }
  }
  if (e.data.type === "PROXY_CONSOLE_LOG" && e.data.text) logProxyConsole(`[${e.data.level || 'LOG'}] ${e.data.text}`);
  if (e.data.type === "PROXY_CONSOLE_ERROR" && e.data.text) logProxyConsole(`[ERROR] ${e.data.text}`);

  if (e.data.type === "PROXY_FETCH_REQUEST" && e.data.url && typeof libcurl !== "undefined") {
    const { id, url, init } = e.data;
    const source = e.source;
    libcurl.fetch(url, init || {}).then(async (res) => {
      const buf = await res.arrayBuffer();
      const headers = [];
      if (res.headers && res.headers.forEach) {
        res.headers.forEach((v, k) => headers.push([k, v]));
      }
      if (source && source.postMessage) {
        source.postMessage({
          type: "PROXY_FETCH_RESPONSE",
          id,
          success: true,
          status: res.status,
          statusText: res.statusText,
          url: res.url || url,
          headers,
          body: buf
        }, "*", [buf]);
      }
    }).catch(err => {
      if (source && source.postMessage) {
        source.postMessage({
          type: "PROXY_FETCH_RESPONSE",
          id,
          success: false,
          error: err.message || String(err)
        }, "*");
      }
    });
  }
});

const DEFAULT_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ctext y='13' font-size='12' fill='%2333ff33'%3E%E2%96%A0%3C/text%3E%3C/svg%3E";

function loadBookmarks() {
  try {
    const fromCookie = getCookie("proxyBookmarks");
    if (Array.isArray(fromCookie)) {
      bookmarks = fromCookie;
      return;
    }
    const fromStorage = localStorage.getItem("proxyBookmarks");
    if (fromStorage) {
      bookmarks = JSON.parse(fromStorage);
      return;
    }
  } catch (_) {}
  bookmarks = [];
}

function saveBookmarks() {
  try {
    setCookie("proxyBookmarks", bookmarks, 365);
    localStorage.setItem("proxyBookmarks", JSON.stringify(bookmarks));
  } catch (_) {}
}

function updateBookmarkBtn() {
  if (!bookmarkBtn) return;
  const raw = (urlBar && urlBar.value.trim()) || currentUrl || "";
  if (!raw) {
    bookmarkBtn.style.display = "none";
    return;
  }
  bookmarkBtn.style.display = "inline-block";
  const targetUrl = (currentUrl || raw).toLowerCase();
  const isBookmarked = bookmarks.some(b => b.url && (b.url.toLowerCase() === targetUrl || b.url.toLowerCase() === raw.toLowerCase()));
  bookmarkBtn.innerHTML = isBookmarked ? "&#9733;" : "&#9734;";
  bookmarkBtn.title = isBookmarked ? "Remove bookmark" : "Bookmark this page";
}

function hideBookmarkContextMenu() {
  if (bookmarkContextMenu) bookmarkContextMenu.style.display = "none";
  activeContextBmId = null;
}

function showBookmarkContextMenu(x, y, bmId) {
  if (!bookmarkContextMenu) return;
  activeContextBmId = bmId;
  bookmarkContextMenu.style.left = `${x}px`;
  bookmarkContextMenu.style.top = `${y}px`;
  bookmarkContextMenu.style.display = "flex";
}

function renderBookmarks(editingId = null) {
  if (!bookmarkBar) return;
  bookmarkBar.innerHTML = "";

  bookmarks.forEach(bm => {
    const item = document.createElement("div");
    item.className = "bookmark-item";
    item.draggable = true;
    item.dataset.id = bm.id;

    const img = document.createElement("img");
    img.className = "bookmark-favicon";
    img.src = bm.favicon || DEFAULT_FAVICON;
    img.onerror = () => { img.src = DEFAULT_FAVICON; };
    item.appendChild(img);

    if (bm.id === editingId) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "bookmark-title-input";
      input.maxLength = 30;
      input.value = bm.title || "";
      item.appendChild(input);

      input.addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("mousedown", (e) => e.stopPropagation());

      const commit = () => {
        const val = input.value.trim().slice(0, 30) || bm.title || "Bookmark";
        bm.title = val;
        saveBookmarks();
        renderBookmarks();
      };

      input.addEventListener("blur", commit, { once: true });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          input.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          renderBookmarks();
        }
      });

      setTimeout(() => {
        input.focus();
        input.select();
      }, 10);
    } else {
      const titleSpan = document.createElement("span");
      titleSpan.className = "bookmark-title";
      titleSpan.textContent = bm.title || "Bookmark";
      item.appendChild(titleSpan);
    }

    item.addEventListener("click", (e) => {
      if (e.target.tagName && e.target.tagName.toLowerCase() === "input") return;
      if (bm.url) navigateTo(bm.url);
    });

    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showBookmarkContextMenu(e.clientX, e.clientY, bm.id);
    });

    item.addEventListener("dragstart", (e) => {
      draggedBmId = bm.id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", bm.id);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      draggedBmId = null;
      item.classList.remove("dragging");
      document.querySelectorAll(".bookmark-item").forEach(el => el.classList.remove("drag-over"));
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      item.classList.add("drag-over");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      item.classList.remove("drag-over");
      const sourceId = draggedBmId || e.dataTransfer.getData("text/plain");
      const targetId = bm.id;
      if (sourceId && targetId && sourceId !== targetId) {
        const fromIdx = bookmarks.findIndex(b => b.id === sourceId);
        const toIdx = bookmarks.findIndex(b => b.id === targetId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [moved] = bookmarks.splice(fromIdx, 1);
          bookmarks.splice(toIdx, 0, moved);
          saveBookmarks();
          renderBookmarks();
        }
      }
    });

    bookmarkBar.appendChild(item);
  });
}

if (bookmarkBtn) {
  bookmarkBtn.onclick = () => {
    const raw = (urlBar && urlBar.value.trim()) || currentUrl || "";
    if (!raw) return;
    const targetUrl = currentUrl || parseInput(raw) || raw;
    const existingIdx = bookmarks.findIndex(b => b.url && (b.url.toLowerCase() === targetUrl.toLowerCase() || b.url.toLowerCase() === raw.toLowerCase()));
    if (existingIdx !== -1) {
      bookmarks.splice(existingIdx, 1);
      saveBookmarks();
      renderBookmarks();
      updateBookmarkBtn();
    } else {
      let defaultTitle = currentTitle;
      if (!defaultTitle) {
        try { defaultTitle = new URL(targetUrl).hostname; } catch (_) { defaultTitle = targetUrl; }
      }
      defaultTitle = (defaultTitle || "Bookmark").slice(0, 30);
      const newId = Date.now().toString();
      const newBm = {
        id: newId,
        url: targetUrl,
        title: defaultTitle,
        favicon: currentFavicon || ""
      };
      bookmarks.push(newBm);
      saveBookmarks();
      renderBookmarks(newId);
      updateBookmarkBtn();
    }
  };
}

if (urlBar) {
  urlBar.addEventListener("input", updateBookmarkBtn);
}

const bmCtxRename = document.getElementById("bm-ctx-rename");
if (bmCtxRename) {
  bmCtxRename.onclick = () => {
    const targetId = activeContextBmId;
    hideBookmarkContextMenu();
    if (targetId) renderBookmarks(targetId);
  };
}

const bmCtxDelete = document.getElementById("bm-ctx-delete");
if (bmCtxDelete) {
  bmCtxDelete.onclick = () => {
    const targetId = activeContextBmId;
    hideBookmarkContextMenu();
    if (targetId) {
      bookmarks = bookmarks.filter(b => b.id !== targetId);
      saveBookmarks();
      renderBookmarks();
      updateBookmarkBtn();
    }
  };
}

window.addEventListener("click", hideBookmarkContextMenu);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideBookmarkContextMenu();
});

loadBookmarks();
renderBookmarks();
updateBookmarkBtn();

// Code editor
const codebox = document.getElementById("codebox");
const codeBlock = document.getElementById("codeBlock");
const lineNumbers = document.getElementById("lineNumbers");

const DEFAULT_HTML = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Title</title>\n<style>\n /* CSS goes here */\n</style>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n<script>\n  // JS goes here\n<\/script>\n</body>\n</html>';
const DEFAULT_PYTHON = 'print("Hello, World!")';

let currentLangValue = "language-html";
let isConsoleCollapsed = false;
let preEditorTheme = null;
let saveTimeout = null;
let highlightTimeout = null;
let lineNumbersRaf = null;

let cachedWidth = 0;
let cachedContentWidth = 0;
let cachedBaseLineHeight = 18;
let cachedCharWidth = 8;

function savePreEditorTheme() {
  if (!preEditorTheme) {
    preEditorTheme = document.documentElement.style.getPropertyValue("--theme").trim() ||
      (typeof colorConfig !== "undefined" && colorConfig.theme) ||
      "rgb(51, 255, 51)";
  }
}

function restorePreEditorTheme() {
  if (typeof updateColor === "function") updateColor();
  else if (preEditorTheme) document.documentElement.style.setProperty("--theme", preEditorTheme);
  preEditorTheme = null;
}

function updateLineNumbers() {
  const code = codebox.value;
  const lines = code.split("\n");
  const lineCount = lines.length;

  let mirror = document.getElementById("editorLineMeasureMirror");
  if (!mirror) {
    mirror = document.createElement("div");
    mirror.id = "editorLineMeasureMirror";
    mirror.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;top:-9999px;left:-9999px;white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word;padding:0;margin:0;border:none;";
    document.body.appendChild(mirror);
  }

  const clientWidth = codebox.clientWidth;
  if (clientWidth > 0 && (clientWidth !== cachedWidth || !cachedContentWidth)) {
    const cs = window.getComputedStyle(codebox);
    mirror.style.fontFamily = cs.fontFamily;
    mirror.style.fontSize = cs.fontSize;
    mirror.style.lineHeight = cs.lineHeight;
    mirror.style.letterSpacing = cs.letterSpacing;

    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    cachedContentWidth = Math.max(10, clientWidth - pl - pr);
    mirror.style.width = cachedContentWidth + "px";

    mirror.textContent = "M";
    cachedBaseLineHeight = mirror.offsetHeight || 18;
    cachedCharWidth = mirror.getBoundingClientRect().width || 8;
    cachedWidth = clientWidth;
  }

  const contentWidth = cachedContentWidth || 10;
  const baseLineHeight = cachedBaseLineHeight || 18;
  const charWidth = cachedCharWidth || 8;

  let arr = [];
  const wrapIndices = [];
  for (let i = 0; i < lineCount; i++) {
    const lineText = lines[i];
    if (lineText.length > 0 && clientWidth > 0 && (lineText.length * charWidth >= contentWidth)) {
      wrapIndices.push(i);
    }
  }

  if (wrapIndices.length === 0) {
    for (let i = 0; i < lineCount; i++) {
      arr.push(i + 1);
    }
  } else {
    mirror.innerHTML = wrapIndices.map(idx => `<div data-i="${idx}">${lines[idx].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "&nbsp;"}</div>`).join("");
    const wrapMap = {};
    const children = mirror.children;
    for (let k = 0; k < children.length; k++) {
      const child = children[k];
      const idx = child.dataset.i;
      const h = child.offsetHeight;
      wrapMap[idx] = Math.max(0, Math.round(h / baseLineHeight) - 1);
    }
    for (let i = 0; i < lineCount; i++) {
      arr.push(i + 1);
      const extra = wrapMap[i] || 0;
      for (let j = 0; j < extra; j++) {
        arr.push("");
      }
    }
  }

  const newText = arr.join("\n") + "\n";
  if (lineNumbers.textContent !== newText) {
    lineNumbers.textContent = newText;
  }
}

function highlightJS() {
  const code = codebox.value;
  const lang = currentLangValue.replace("language-", "");
  if (!codeBlock.classList.contains("hljs")) {
    codeBlock.classList.add("hljs");
  }
  try {
    if (typeof hljs !== "undefined") {
      const validLang = (hljs.getLanguage && hljs.getLanguage(lang)) ? lang : null;
      const res = validLang 
        ? hljs.highlight(code, { language: validLang, ignoreIllegals: true }) 
        : hljs.highlightAuto(code);
      codeBlock.innerHTML = (res.value || "") + (code.endsWith("\n") ? " " : "");
    } else {
      codeBlock.textContent = code + (code.endsWith("\n") ? " " : "");
    }
  } catch (e) {
    codeBlock.textContent = code + (code.endsWith("\n") ? " " : "");
  }
}

function updateCode(immediateHighlight = false) {
  highlightJS();
  updateLineNumbers();
  syncEditorScroll(codebox);

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem("savedCode_" + currentLangValue, codebox.value);
    } catch (e) {}
  }, 300);
}

codebox.addEventListener("input", () => updateCode(false));

let isSyncingScroll = false;
function syncEditorScroll(source) {
  if (isSyncingScroll) return;
  isSyncingScroll = true;
  if (source === codebox) {
    codeBlock.scrollTop = codebox.scrollTop;
    lineNumbers.scrollTop = codebox.scrollTop;
  } else if (source === codeBlock) {
    codebox.scrollTop = codeBlock.scrollTop;
    lineNumbers.scrollTop = codeBlock.scrollTop;
  }
  isSyncingScroll = false;
}

codebox.addEventListener("scroll", () => syncEditorScroll(codebox));
codeBlock.addEventListener("scroll", () => syncEditorScroll(codeBlock));
window.addEventListener("resize", () => {
  const htmlEl = document.getElementById("html");
  if (htmlEl && htmlEl.style.display !== "none") {
    cachedWidth = 0;
    updateLineNumbers();
    syncEditorScroll(codebox);
  }
});

codebox.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const { selectionStart, selectionEnd, value } = codebox;
    const spaces = "  ";
    codebox.value = value.substring(0, selectionStart) + spaces + value.substring(selectionEnd);
    codebox.selectionStart = codebox.selectionEnd = selectionStart + spaces.length;
    updateCode(false);
  }
});

const themeLink = document.getElementById("theme");
document.getElementById("selectStyle").addEventListener("change", (e) => {
  themeLink.onload = () => setTheme();
  themeLink.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/${e.target.value}.min.css`;
  setTheme();
});

function setTheme() {
  savePreEditorTheme();
  const r = document.documentElement;
  const tLink = document.getElementById("theme");
  if (!tLink) return;

  const applyRules = () => {
    const sheet = Array.from(document.styleSheets).find(s => s.ownerNode === tLink);
    if (!sheet) return false;
    let rules;
    try { rules = Array.from(sheet.cssRules || sheet.rules); } catch (e) { return false; }
    if (!rules || rules.length === 0) return false;

    const getStyle = (selector) => {
      const rule = rules.find(rule => rule.selectorText && rule.selectorText.split(',').some(s => s.trim() === selector));
      return rule ? rule.style : null;
    };

    const hljsStyle = getStyle(".hljs");
    const commentStyle = getStyle(".hljs-comment");
    const targetColor = (commentStyle && commentStyle.color) || (hljsStyle && hljsStyle.color);

    if (hljsStyle && hljsStyle.color) {
      codeBlock.style.color = hljsStyle.color;
    }

    if (targetColor) {
      r.style.setProperty("--theme", targetColor);
      highlightJS();
      return true;
    }
    return false;
  };

  if (!applyRules()) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (applyRules() || attempts >= 25) clearInterval(interval);
    }, 40);
  }
}

function resetEditorConsoleHeight() {
  const wrapper = document.getElementById("editor-console-wrapper");
  if (wrapper) {
    wrapper.style.height = "35%";
  }
}

function initEditorResizeHandler() {
  const handle = document.getElementById("editor-resize-handle");
  const wrapper = document.getElementById("editor-console-wrapper");
  const outputWrapper = document.getElementById("editorOutputWrapper");
  const preview = document.getElementById("preview-window");
  if (!handle || !wrapper || !outputWrapper || handle.dataset.initialized) return;
  handle.dataset.initialized = "true";

  let isDragging = false;

  handle.addEventListener("mousedown", (e) => {
    isDragging = true;
    handle.classList.add("active");
    if (preview) preview.style.pointerEvents = "none";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const wsRect = outputWrapper.getBoundingClientRect();
    const newHeight = wsRect.bottom - e.clientY;
    const minH = 80;
    const maxH = wsRect.height * 0.85;
    if (newHeight >= minH && newHeight <= maxH) {
      wrapper.style.height = `${newHeight}px`;
    }
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      handle.classList.remove("active");
      if (preview) preview.style.pointerEvents = "auto";
      document.body.style.userSelect = "";
    }
  });
}

function toggleHtmlConsole() {
  isConsoleCollapsed = !isConsoleCollapsed;
  setCookie("htmlConsoleCollapsed", isConsoleCollapsed, 30);
  applyConsoleCollapseState();
}

function applyConsoleCollapseState() {
  const preview = document.getElementById("preview-window");
  const consoleWrapper = document.getElementById("editor-console-wrapper");
  const resizeHandle = document.getElementById("editor-resize-handle");
  const toggleBtn = document.getElementById("toggleConsoleBtn");
  const isHtml = currentLangValue === "language-html";

  if (toggleBtn) {
    toggleBtn.textContent = isConsoleCollapsed ? "Show Console" : "Hide Console";
    toggleBtn.style.display = isHtml ? "inline-block" : "none";
  }

  if (isHtml) {
    if (isConsoleCollapsed) {
      if (consoleWrapper) consoleWrapper.style.display = "none";
      if (resizeHandle) resizeHandle.style.display = "none";
      if (preview) preview.style.height = "100%";
    } else {
      if (consoleWrapper) consoleWrapper.style.display = "flex";
      if (resizeHandle) resizeHandle.style.display = "block";
      if (preview) preview.style.height = "";
    }
  }
}

function setupEditorPanels() {
  const preview = document.getElementById("preview-window");
  const rte = document.getElementById("rte");
  if (!preview || !preview.parentNode) return;

  const runBtn = document.querySelector("#html .html-btn");

  if (!document.getElementById("toggleConsoleBtn")) {
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "toggleConsoleBtn";
    toggleBtn.className = "html-btn";
    toggleBtn.textContent = isConsoleCollapsed ? "Show Console" : "Hide Console";
    toggleBtn.style.cssText = "width: 18%; background: var(--theme); margin: 0 4px; cursor: pointer;";
    toggleBtn.onclick = toggleHtmlConsole;
    if (runBtn && runBtn.parentNode) runBtn.parentNode.insertBefore(toggleBtn, runBtn.nextSibling);
  }

  let wrapper = document.getElementById("editorOutputWrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "editorOutputWrapper";
    preview.parentNode.insertBefore(wrapper, preview);
    wrapper.appendChild(preview);

    const resizeHandle = document.createElement("div");
    resizeHandle.id = "editor-resize-handle";
    wrapper.appendChild(resizeHandle);

    const consoleWrapper = document.createElement("div");
    consoleWrapper.id = "editor-console-wrapper";

    const header = document.createElement("div");
    header.id = "editor-console-header";
    header.innerHTML = `
      <span style="color: var(--theme);">
        <b>EDITOR CONSOLE</b>
      </span>
      <div style="display: flex; gap: 4px;">
        <button type="button" onclick="resetEditorConsoleHeight()" style="width: auto;">Reset Height</button><span> | </span>
        <button type="button" onclick="clearConsole()" style="width: auto;">Clear</button>
      </div>
    `;
    consoleWrapper.appendChild(header);

    const htmlConsole = document.createElement("textarea");
    htmlConsole.id = "htmlConsole";
    htmlConsole.readOnly = true;
    htmlConsole.spellcheck = false;
    consoleWrapper.appendChild(htmlConsole);

    wrapper.appendChild(consoleWrapper);

    if (rte) {
      wrapper.appendChild(rte);
      rte.style.width = "100%";
      rte.style.height = "100%";
      rte.style.margin = "0";
    }

    preview.style.width = "100%";
    preview.style.flex = "1 1 0";
    preview.style.minHeight = "0";
    preview.style.border = "none";
    preview.style.margin = "0";

    initEditorResizeHandler();
  }

  applyConsoleCollapseState();
}

function updateEditorView() {
  setupEditorPanels();
  const selectElement = document.getElementById("selectLanguage");
  const selectedIndex = selectElement ? selectElement.selectedIndex : 0;
  const preview = document.getElementById("preview-window");
  const consoleWrapper = document.getElementById("editor-console-wrapper");
  const resizeHandle = document.getElementById("editor-resize-handle");
  const rte = document.getElementById("rte");

  if (selectedIndex === 0) {
    if (preview) preview.style.display = "block";
    if (rte) rte.style.display = "none";
    applyConsoleCollapseState();
  } else {
    if (preview) preview.style.display = "none";
    if (consoleWrapper) consoleWrapper.style.display = "none";
    if (resizeHandle) resizeHandle.style.display = "none";
    if (rte) {
      rte.style.display = "block";
      rte.style.height = "100%";
    }
    const toggleBtn = document.getElementById("toggleConsoleBtn");
    if (toggleBtn) toggleBtn.style.display = "none";
  }
}

function clearConsole() {
  const selectElement = document.getElementById("selectLanguage");
  const selectedIndex = selectElement ? selectElement.selectedIndex : 0;
  if (selectedIndex === 0) {
    const htmlConsole = document.getElementById("htmlConsole");
    if (htmlConsole) htmlConsole.value = "";
  } else {
    const rte = document.getElementById("rte");
    if (rte) rte.value = "";
  }
}

window.addEventListener("message", (e) => {
  if (e.data && e.data.type === "HTML_CONSOLE") {
    const htmlConsole = document.getElementById("htmlConsole");
    if (htmlConsole) {
      htmlConsole.value += `[${e.data.level}] ${e.data.text}\n`;
      htmlConsole.scrollTop = htmlConsole.scrollHeight;
    }
  }
});

let editorInitialized = false;
function initEditorIfNeeded() {
  if (editorInitialized) return;
  editorInitialized = true;

  const savedLang = getCookie("editorLanguage");
  if (savedLang) {
    currentLangValue = savedLang;
    const selectElement = document.getElementById("selectLanguage");
    if (selectElement) selectElement.value = savedLang;
  }

  const savedCollapsed = getCookie("htmlConsoleCollapsed");
  if (savedCollapsed !== null) isConsoleCollapsed = Boolean(savedCollapsed);

  cachedWidth = 0;
  setupEditorPanels();
  updateEditorView();

  const savedData = localStorage.getItem("savedCode_" + currentLangValue);
  if (savedData !== null) codebox.value = savedData;
  else codebox.value = currentLangValue === "language-html" ? DEFAULT_HTML : DEFAULT_PYTHON;

  document.getElementById("codeBlock").className = "hljs " + currentLangValue;
  updateCode(true);
}

document.getElementById("selectLanguage").addEventListener("change", function() {
  try { localStorage.setItem("savedCode_" + currentLangValue, codebox.value); } catch (e) {}
  currentLangValue = this.value;
  setCookie("editorLanguage", currentLangValue, 30);
  document.getElementById("codeBlock").className = "hljs " + currentLangValue;
  updateEditorView();

  const savedContent = localStorage.getItem("savedCode_" + currentLangValue);
  if (savedContent !== null) codebox.value = savedContent;
  else codebox.value = currentLangValue === "language-html" ? DEFAULT_HTML : DEFAULT_PYTHON;

  updateCode(true);
  setTheme();
});

window.onload = function() { localStorage.clear(); };

function runEditor() {
  initEditorIfNeeded();
  const selectElement = document.getElementById("selectLanguage");
  const selectedIndex = selectElement ? selectElement.selectedIndex : 0;

  if (selectedIndex === 0) {
    const preview = document.getElementById("preview-window");
    const htmlConsole = document.getElementById("htmlConsole");
    if (htmlConsole) htmlConsole.value += `Running HTML (${new Date().toLocaleTimeString()})\n`;

    const consoleShim = `<script>
(function() {
function formatArg(arg) {
  if (typeof arg === "object" && arg !== null) {
    try { return JSON.stringify(arg); } catch (e) { return String(arg); }
  }
  return String(arg);
}
function sendLog(level, args) {
  try {
    const msg = Array.from(args).map(formatArg).join(" ");
    window.parent.postMessage({ type: "HTML_CONSOLE", level: level, text: msg }, "*");
  } catch (e) {}
}
const origLog = console.log, origWarn = console.warn, origError = console.error, origInfo = console.info;
console.log = function(...args) { sendLog("LOG", args); origLog && origLog.apply(console, args); };
console.warn = function(...args) { sendLog("WARN", args); origWarn && origWarn.apply(console, args); };
console.error = function(...args) { sendLog("ERROR", args); origError && origError.apply(console, args); };
console.info = function(...args) { sendLog("INFO", args); origInfo && origInfo.apply(console, args); };
window.onerror = function(msg, url, line, col) {
  sendLog("ERROR", [msg + (line ? " (line " + line + (col ? ":" + col : "") + ")" : "")]);
};
window.addEventListener("unhandledrejection", function(e) {
  sendLog("ERROR", ["Unhandled Promise Rejection: " + (e.reason ? (e.reason.message || e.reason) : "")]);
});
})();
<\/script>`;

    let code = codebox.value;
    let fullHtml = code;
    if (code.includes("<head>")) fullHtml = code.replace("<head>", "<head>" + consoleShim);
    else if (code.includes("<html>")) fullHtml = code.replace("<html>", "<html><head>" + consoleShim + "</head>");
    else fullHtml = consoleShim + code;

    if (preview.dataset.blobUrl) URL.revokeObjectURL(preview.dataset.blobUrl);
    const blob = new Blob([fullHtml], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    preview.dataset.blobUrl = blobUrl;
    preview.src = blobUrl;
  } else if (selectedIndex === 1) {
    evaluatePython();
  }
}

codebox.value = DEFAULT_HTML;

// Python editor
const rte = document.getElementById("rte");
let isPyodideInited = false;
let pyodideInitPromise = null;

function addToOutput(s) {
  rte.value += `${s}\n`;
  rte.scrollTop = rte.scrollHeight;
}

async function initializePyodide() {
  if (isPyodideInited) return;
  if (pyodideInitPromise) return pyodideInitPromise;

  addToOutput("Initializing Python environment...");
  pyodideInitPromise = loadPyodide({
    stdout: addToOutput,
    stderr: addToOutput
  }).then(instance => {
    window.pyodide = instance;
    isPyodideInited = true;
    addToOutput("Ready");
  }).catch(err => {
    addToOutput(`ERROR initializing Pyodide: ${err}`);
  });

  return pyodideInitPromise;
}

async function evaluatePython() {
  const pythonCode = codebox.value;
  try {
    if (!window.pyodide) await initializePyodide();
    await pyodide.loadPackagesFromImports(pythonCode, addToOutput, addToOutput);
    let result = await pyodide.runPythonAsync(pythonCode);
    if (result !== undefined) addToOutput(`${result}`);
  } catch (e) {
    addToOutput(`ERROR: ${e}`);
  }
}

// Tabs
const INITIAL_STDOUT = `Type 'help' to see list of available commands<br>Type Esc key to exit current program<br><br>`;
let tabs = [{ id: 1, title: "terminal", program: "terminal", stdout: INITIAL_STDOUT }];
let activeTabId = 1;
let nextTabId = 2;

function appendOutput(html) {
  const curTab = tabs.find(t => t.id === activeTabId);
  if (curTab) curTab.stdout = (curTab.stdout || "") + html;
  const outputEl = document.getElementById("stdout");
  if (outputEl && curTab) outputEl.innerHTML = curTab.stdout;
}

function clearOutput() {
  const curTab = tabs.find(t => t.id === activeTabId);
  if (curTab) curTab.stdout = "";
  const outputEl = document.getElementById("stdout");
  if (outputEl) outputEl.innerHTML = "";
}

function renderTabs() {
  const tabList = document.getElementById("tabList");
  if (!tabList) return;
  tabList.innerHTML = "";
  tabList.style.display = tabs.length <= 1 ? "none" : "flex";

  const addBtn = document.getElementById("addTabBtn");
  if (addBtn) {
    addBtn.disabled = tabs.length >= 5;
    addBtn.style.cursor = tabs.length >= 5 ? "not-allowed" : "pointer";
  }

  tabs.forEach(tab => {
    const tabEl = document.createElement("div");
    tabEl.className = `tab-item ${tab.id === activeTabId ? "active" : ""}`;
    tabEl.onclick = () => switchTab(tab.id);

    const titleSpan = document.createElement("span");
    titleSpan.textContent = tab.title;
    tabEl.appendChild(titleSpan);

    const closeSpan = document.createElement("span");
    closeSpan.className = "tab-close";
    closeSpan.innerHTML = "&times;";
    closeSpan.onclick = (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    };
    tabEl.appendChild(closeSpan);
    tabList.appendChild(tabEl);
  });
}

function switchTab(id) {
  const targetTab = tabs.find(t => t.id === id);
  if (!targetTab) return;

  const currentActiveTab = tabs.find(t => t.id === activeTabId);
  if (currentActiveTab && currentActiveTab.program === "editor" && targetTab.program !== "editor") {
    restorePreEditorTheme();
  }
  if (currentActiveTab && currentActiveTab.program === "phosphor" && targetTab.program !== "phosphor") {
    if (currentActiveTab.id === targetTab.id) {
      if (typeof destroyPhosphorOS === "function") destroyPhosphorOS();
    } else {
      if (typeof pausePhosphorOS === "function") pausePhosphorOS();
    }
  }

  activeTabId = id;
  renderTabs();

  if (targetTab.program === "proxy" || targetTab.program === "editor") applyCrt(false);
  else applyCrt(userCrtSetting);

  const outputEl = document.getElementById("stdout");
  if (outputEl) outputEl.innerHTML = targetTab.stdout || "";

  const proxyEl = document.getElementById("proxy");
  const htmlEl = document.getElementById("html");
  const phosphorEl = document.getElementById("phosphor");
  const terminalContent = document.getElementById("terminalContent");
  const cmdInput = document.getElementById("commandInput");

  if (targetTab.program === "proxy") {
    if (proxyEl) proxyEl.style.display = "flex";
    if (htmlEl) htmlEl.style.display = "none";
    if (phosphorEl) phosphorEl.style.display = "none";
    if (terminalContent) terminalContent.style.display = "none";
    closeSide();
    return;
  }

  if (targetTab.program === "editor") {
    savePreEditorTheme();
    if (htmlEl) htmlEl.style.display = "block";
    if (proxyEl) proxyEl.style.display = "none";
    if (phosphorEl) phosphorEl.style.display = "none";
    if (terminalContent) terminalContent.style.display = "none";
    closeSide();
    if (typeof initEditorIfNeeded === "function") initEditorIfNeeded();
    if (typeof setTheme === "function") setTheme();
    return;
  }

  if (targetTab.program === "phosphor") {
    if (phosphorEl) phosphorEl.style.display = "flex";
    if (proxyEl) proxyEl.style.display = "none";
    if (htmlEl) htmlEl.style.display = "none";
    if (terminalContent) terminalContent.style.display = "none";
    closeSide();
    if (typeof initPhosphorOS === "function") initPhosphorOS();
    if (typeof resumePhosphorOS === "function") resumePhosphorOS();
    return;
  }

  if (proxyEl) proxyEl.style.display = "none";
  if (htmlEl) htmlEl.style.display = "none";
  if (phosphorEl) phosphorEl.style.display = "none";
  if (terminalContent) {
    terminalContent.style.display = "block";
    terminalContent.style.opacity = "1";
  }

  document.querySelectorAll("#terminalContent .program").forEach(el => el.style.display = "none");

  if (targetTab.program === "terminal") {
    if (cmdInput) cmdInput.style.display = "block";
    document.getElementById("stdin")?.focus();
  } else {
    if (cmdInput) cmdInput.style.display = "none";
    const progEl = document.getElementById(targetTab.program);
    if (progEl) progEl.style.display = "block";
    if (targetTab.program === "games") document.getElementById("fileSearch")?.focus();
    if (targetTab.program === "youtube") document.getElementById("query")?.focus();
    if (targetTab.program === "proxy") document.getElementById("url-bar")?.focus();
    if (targetTab.program === "phosphorAdvisory") {
      if (typeof syncPhosphorUserPrompt === "function") syncPhosphorUserPrompt();
      const confirmInput = document.getElementById("phosphorConfirmInput");
      if (confirmInput) {
        confirmInput.focus();
        confirmInput.scrollIntoView({ block: "end" });
      }
    }
  }
}

function createNewTab(program = "terminal", title = "terminal") {
  if (tabs.length >= 5) return;
  const newId = nextTabId++;
  tabs.push({ id: newId, title: title, program: program, stdout: "" });
  switchTab(newId);
}

function closeTab(id) {
  const closingTab = tabs.find(t => t.id === id);
  if (closingTab && closingTab.program === "editor") restorePreEditorTheme();

  if (tabs.length === 1) {
    if (tabs[0].program === "phosphor" && typeof destroyPhosphorOS === "function") {
      destroyPhosphorOS();
    }
    tabs[0].program = "terminal";
    tabs[0].title = "terminal";
    tabs[0].stdout = "";
    switchTab(tabs[0].id);
    return;
  }

  const index = tabs.findIndex(t => t.id === id);
  tabs = tabs.filter(t => t.id !== id);

  if (closingTab && closingTab.program === "phosphor" && !tabs.some(t => t.program === "phosphor")) {
    if (typeof destroyPhosphorOS === "function") destroyPhosphorOS();
  }

  if (activeTabId === id) {
    const nextActive = tabs[Math.max(0, index - 1)];
    activeTabId = nextActive.id;
  }
  switchTab(activeTabId);
}

function setProgramForActiveTab(progName, tabTitle) {
  const curTab = tabs.find(t => t.id === activeTabId);
  if (curTab) {
    if (curTab.program === "editor" && progName !== "editor") restorePreEditorTheme();
    if (curTab.program === "phosphor" && progName !== "phosphor" && typeof destroyPhosphorOS === "function") {
      destroyPhosphorOS();
    }
    curTab.program = progName;
    curTab.title = tabTitle || progName;
    switchTab(activeTabId);
  }
}

// Commands
var stdout = document.getElementById("stdout");
const input = document.getElementById("stdin");
const phosphorConfirmInput = document.getElementById("phosphorConfirmInput");

input.addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    const command = input.value;
    const currentUser = document.querySelector(".user")?.textContent.trim() || "guest";
    const userPrompt = `<b>${currentUser}@terminal:~$</b> ${command}<br>`;
    appendOutput(userPrompt);
    handleCommand(command);
    input.value = "";
    const scroll = document.getElementById("commandInput");
    if (scroll) scroll.scrollIntoView({ block: "end" });
  }
});

if (phosphorConfirmInput) {
  phosphorConfirmInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePhosphorConfirm(phosphorConfirmInput.value);
      phosphorConfirmInput.value = "";
    }
  });
}

function handlePhosphorConfirm(answer) {
  const lower = answer.trim().toLowerCase();
  const confirmMsg = document.getElementById("phosphorConfirmMsg");
  if (lower === "y" || lower === "yes") {
    if (confirmMsg) confirmMsg.textContent = "";
    phosphorBootAccepted = true;
    setProgramForActiveTab("phosphor", "phosphor");
    return;
  }
  if (lower === "n" || lower === "no") {
    if (confirmMsg) confirmMsg.textContent = "";
    setProgramForActiveTab("terminal", "terminal");
    appendOutput("PhosphorOS boot aborted.<br><br>");
    return;
  }
  if (confirmMsg) {
    confirmMsg.innerHTML = "Invalid input. Enter 'y' to boot PhosphorOS or 'n' to abort.<br><br>";
  }
  phosphorConfirmInput?.focus();
}

function buildSuperMap(pingStates, tooltips = {}) {
  const clientOk = Boolean(pingStates.client);
  const cfOk = clientOk && Boolean(pingStates.cloudfront);
  const ec2Ok = cfOk && Boolean(pingStates.ec2);
  const homeOk = ec2Ok && Boolean(pingStates.home);

  const boxes = [
    ["Home Server", "pm2, wisp, youtube, tsarevich", homeOk, tooltips.home || (homeOk ? "Home Server: Online" : "Home Server: Unresponsive")],
    ["EC2", "nginx, wg0", ec2Ok, tooltips.ec2 || (ec2Ok ? "EC2: Online" : "EC2: Unresponsive")],
    ["CloudFront", "cdn, wss", cfOk, tooltips.cloudfront || (cfOk ? "CloudFront: Online" : "CloudFront: Unresponsive")],
    ["Client", "libcurl, ui", clientOk, tooltips.client || (clientOk ? "Client: Online" : "Client: Offline")]
  ];
  const links = ["wg0", "crowdsec, tls", "https, wss"];

  const escAttr = (v) => String(v ?? "").replace(/[&"<>]/g, c => ({ "&": "&amp;", "\"": "&quot;", "<": "&lt;", ">": "&gt;" }[c]));

  const boxRows = boxes.map(([n1, n2], idx) => {
    const inner = Math.max(n1.length, n2.length);
    const leftCh = idx > 0 ? "┤" : "│";
    const rightCh = idx < boxes.length - 1 ? "├" : "│";
    return [
      "┌" + "─".repeat(inner) + "┐",
      leftCh + n1.padEnd(inner, " ") + rightCh,
      "│" + n2.padEnd(inner, " ") + "│",
      "└" + "─".repeat(inner) + "┘"
    ];
  });

  const linkRows = links.map(lbl => {
    const lw = lbl.length + 2;
    return [
      " " + lbl + " ",
      "─".repeat(lw),
      " ".repeat(lw),
      " ".repeat(lw)
    ];
  });

  const lines = [];
  for (let r = 0; r < 4; r++) {
    let row = "";
    for (let i = 0; i < boxes.length; i++) {
      const ok = boxes[i][2];
      const tip = boxes[i][3];
      row += `<span title="${escAttr(tip)}" style="opacity:${ok ? "1" : "0.5"};">${boxRows[i][r]}</span>`;
      if (i < links.length) {
        row += linkRows[i][r];
      }
    }
    lines.push(row);
  }

  return `<div style="white-space: pre; line-height: 1.15; overflow-x: auto; margin: 8px 0;">${lines.join("\n")}</div>`;
}

async function probeChainFromClient(httpStatus, serverHeader, bodyText, elapsedMs, err) {
  const clientOk = typeof navigator === "undefined" ? true : navigator.onLine !== false;
  if (!clientOk) {
    return { client: false, cloudfront: false, ec2: false, home: false };
  }

  if (httpStatus) {
    const hdr = String(serverHeader || "").toLowerCase();
    const body = String(bodyText || "").toLowerCase();
    const isNginx = hdr.includes("nginx") || body.includes("nginx");
    const isCfError = body.includes("cloudfront") || body.includes("could not be satisfied");
    const ec2Ok = isNginx || (httpStatus === 502 && !isCfError);
    return { client: true, cloudfront: true, ec2: ec2Ok, home: false };
  }

  let cfOk = false;
  try {
    await fetch(`${API_GATEWAY}/api/health`, {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });
    cfOk = true;
  } catch (_) {
    cfOk = false;
  }

  const timedOut = (err && (err.name === "TimeoutError" || err.name === "AbortError")) || elapsedMs >= 4500;
  const ec2Ok = cfOk && !timedOut;
  return { client: true, cloudfront: cfOk, ec2: ec2Ok, home: false };
}

async function fetchServerInfo() {
  const esc = (v) => String(v ?? "N/A").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  appendOutput("Fetching server health telemetry...<br>");
  const startMs = performance.now();
  try {
    const res = await fetch(`${API_GATEWAY}/api/admin/costs?token=${encodeURIComponent(adminToken)}&details=true`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
      signal: AbortSignal.timeout(10000)
    });

    if (res.status === 401) {
      if (adminPollInterval) clearInterval(adminPollInterval);
      document.body.classList.remove("admin-graph-mode");
      document.getElementById("adminGraphToggleBtn")?.classList.add("invisible");
      admin = false;
      adminToken = null;
      setCookie("adminSession", null, -1);
      appendOutput("Session expired. Authentication required.<br>");
      return;
    }

    if (!res.ok) {
      const serverHdr = res.headers.get("server") || "";
      const bodyText = await res.text().catch(() => "");
      const pingStates = await probeChainFromClient(res.status, serverHdr, bodyText, performance.now() - startMs, null);
      const mapHtml = buildSuperMap(pingStates, {
        home: `Home Server: Offline (HTTP ${res.status})`,
        ec2: `EC2: ${pingStates.ec2 ? "Online" : "Unresponsive"}`,
        cloudfront: `CloudFront: ${pingStates.cloudfront ? "Online" : "Unresponsive"}`,
        client: `Client: ${pingStates.client ? "Online" : "Offline"}`
      });
      appendOutput(
        `<br><b>Infrastructure Topology:</b><br>` +
        mapHtml +
        `<br><b>AWS Infrastructure (EC2):</b><br>Stats unavailable (Gateway returned HTTP ${res.status})<br>` +
        `<br><b>Home Server Health:</b><br>Stats unavailable (Home Server / pm2 offline)<br>`
      );
      return;
    }

    const data = await res.json();
    const s = data.system || {};
    const a = data.aws || {};
    const d = data.details || {};
    const reqs = d.requests || {};
    const ping = d.ping || {};

    const pingStates = {
      home: ping.home !== undefined ? ping.home : String(s.pm2 || "").startsWith("online"),
      ec2: ping.ec2 !== undefined ? ping.ec2 : a.ec2State === "running",
      cloudfront: ping.cloudfront !== undefined ? ping.cloudfront : a.cfStatus === "Deployed",
      client: typeof navigator === "undefined" ? true : navigator.onLine !== false
    };

    const tooltips = {
      home: `Home Server: ${s.pm2 || "unknown"} | wg0: ${s.wireguard || "unknown"}`,
      ec2: `EC2: ${a.ec2State || "unknown"} | services: ${a.ec2Services || "N/A"}`,
      cloudfront: `CloudFront: ${a.cfStatus || "unknown"}`,
      client: `Client: ${pingStates.client ? "Online" : "Offline"}`
    };

    const ec2TempLine = (a.ec2Temp && a.ec2Temp !== "N/A") ? `Temperature: ${esc(a.ec2Temp)}<br>` : "";

    const report = `<br><b>Infrastructure Topology:</b><br>` +
      buildSuperMap(pingStates, tooltips) +
      `<br><b>AWS Infrastructure (EC2):</b><br>` +
      `System load: ${esc(a.ec2Load)}<br>` +
      `Usage of /: ${esc(a.ec2Disk)}<br>` +
      `Memory usage: ${esc(a.ec2Mem)} | Swap usage: ${esc(a.ec2Swap)}<br>` +
      ec2TempLine +
      `Processes: ${esc(a.ec2Processes)}<br>` +
      `Costs (${esc(a.costPeriod)}): Total: ${esc(a.costTotal)} | Unblended: ${esc(a.costUnblended)} | Estimated: ${esc(a.costEstimated)}<br>` +
      `<br><b>Home Server Health:</b><br>` +
      `System load: ${esc(d.load)}<br>` +
      `Usage of /: ${esc(d.disk)}<br>` +
      `Memory usage: ${esc(d.mem)} | Swap usage: ${esc(d.swap)}<br>` +
      `Temperature: ${esc(d.temperature)}<br>` +
      `Processes: ${esc(d.processes)}<br>` +
      `Updates: ${esc(d.updates)}<br>` +
      `Requests (${esc(reqs.month || "N/A")}): Today: ${esc(reqs.todayTotal ?? 0)} (YouTube: ${esc(reqs.todayYoutube ?? 0)}, Proxy: ${esc(reqs.todayProxy ?? 0)}) | Month: ${esc(reqs.total ?? 0)} (YouTube: ${esc(reqs.youtube ?? 0)}, Proxy: ${esc(reqs.proxy ?? 0)})<br>`;

    appendOutput(report);
  } catch (err) {
    const pingStates = await probeChainFromClient(null, "", "", performance.now() - startMs, err);
    const mapHtml = buildSuperMap(pingStates, {
      home: `Home Server: Unreachable (${err.message})`,
      ec2: `EC2: ${pingStates.ec2 ? "Online" : "Unresponsive"}`,
      cloudfront: `CloudFront: ${pingStates.cloudfront ? "Online" : "Unresponsive"}`,
      client: `Client: ${pingStates.client ? "Online" : "Offline"}`
    });
    appendOutput(
      `<br><b>Infrastructure Topology:</b><br>` +
      mapHtml +
      `<br><b>AWS Infrastructure (EC2):</b><br>Stats unavailable (${esc(err.message)})<br>` +
      `<br><b>Home Server Health:</b><br>Stats unavailable (Home Server / pm2 unreachable)<br>`
    );
  } finally {
    const scroll = document.getElementById("commandInput");
    if (scroll) scroll.scrollIntoView({ block: "end" });
  }
}

const COMMAND_HELP = {
  youtube: `
    <b>WHAT IS TSAREVICH?</b><br>
    When using YouTube, you may have noticed the enigmatic class below each video, expunged channel names, or how some are blurred out and inaccessible. YouTube's native SafeSearch unfortunately does not do well enough when it comes to ensuring absolute security against the foetid dark. The ever-spanning blight of heresy still spreads without resistance. Tsarevich is an Abominable Intelligence built to replace it.<br><br>
    <b>THE CODEX JUDICII</b><br>
    [GRADUS][ORDO] [DECRETUM]<br><br>
    <b>GRADUS</b><br>
    Heresy is a broad term to describe anything that harms the three fronts: the mind, the machine, and the merit. Because it is so broad, it is divided into classes called 'Gradus'.<br><br>

    Class I - Orthodoxus _____________ Orthodox: Pure, clean content. Safe<br>
    Class II - Haeresis Ferenda ______ Tolerable Heresy: Mature or sensitive topic with valid context. Safe<br>
    Class III - Haeresis Proxima _____ Heresy Proxima: Suggestive, corruptive, or heretic-linked content. Purged<br>
    Class IV - Haeresis Veritas ______ True Heresy: Explicit or dangerous. Purged<br>
    Class Ω - Haeresis Existentialis _ Existential Heresy: Malware, illegal material, or severe security compromise. Purged<br><br>

    <b>ORDO</b><br>
    Ordo are the three fronts. They specify what is being harmed.<br><br>

    Ordo α - Cognitonis ______________ Threat to the human mind: addictive, disturbing, or low quality stimuli<br>
    Ordo β - Machina _________________ Threat to the machine: destructive malware<br>
    Ordo γ - Argenteus _______________ Threat to the merit of man: security, financial, or personal information breaches<br><br>

    <b>DECRETUM</b><br>
    Decretum determines the exact form of the threat<br><br>

    Libertas per Scientiam ___________ Education about heresy<br>
    Beati Mundo Corde ________________ Objective criticism about heresy<br>
    Memento Mori _____________________ Edgy comedy or satire<br><br>

    If heresy can be traced to a singular person or group of people, they are considered 'heretics'.<br><br>

    Haereticus Primus ________________ Primary source channels<br>
    Haereticus Pestis ________________ Channels that willingly spread heresy<br>
    Haereticus Templum _______________ Channels or topics that have the potential to seed heresy<br><br>

    If a channel is found guilty of directly contributing to heresy, they are condemned to the Edict of Obliteration, where all videos created by or mentioning them will be expunged and their names censored.
  `,
  proxy: `
    <b>WHY THIS PROXY BEATS TRADITIONAL PROXIES</b><br>
    Traditional web proxies decrypt traffic on a remote server, exposing cookies/credentials, leaking IPs via WebRTC, and breaking modern JavaScript apps. This proxy runs libcurl.wasm directly in your browser over a multiplexed Wisp WebSocket tunnel—keeping TLS end-to-end encrypted inside your browser, eliminating per-request handshake lag, blocking WebRTC leaks, and isolating sessions in a sandboxed frame.<br><br>

    <b>ROUTING PROTOCOLS</b><br><br>

    Direct _____________ Exits straight from backend egress; fastest, minimal hiding<br>
    WireGuard + WARP ___ Default. Fast kernel tunnel into Cloudflare WARP; masks home IP<br>
    Tor Network ________ Three-hop onion routing; maximum anonymity, higher latency<br>
    SOCKS5 _____________ Raw TCP/UDP relay; lightweight, relies on outer layers for encryption<br>
    Shadowsocks-2022 ___ Modern AEAD pre-shared key encryption with replay defense; looks like random noise<br>
    VLESS ______________ Stateless, zero-overhead Xray protocol built to pair with TLS/REALITY/Vision<br>
    VMess ______________ Encrypted stateful protocol for broad Xray/V2Ray compatibility<br>
    Trojan _____________ Disguises proxy traffic inside standard HTTPS handshakes to fool probes<br><br>

    <b>ENCRYPTION LAYERS:</b><br><br>

    None _______________ No extra wrapper (used when Routing already encrypts natively)<br>
    TLS ________________ Standard HTTPS certificate encryption<br>
    REALITY ____________ Impersonates a legitimate public site's TLS handshake to defeat DPI without your own domain<br>
    XTLS / Vision ______ VLESS + TCP only. Prevents TLS-in-TLS fingerprinting by splicing inner TLS traffic<br><br>

    <b>TRANSPORT LAYERS:</b><br><br>

    TCP / RAW __________ Fastest direct stream (required for Vision)<br>
    WebSocket __________ Tunnels inside browser WebSocket frames to pass CDNs and strict firewalls<br>
    gRPC _______________ Multiplexes over HTTP/2; CDN-friendly and throttle-resistant<br>
    HTTPupgrade ________ Lightweight HTTP upgrade stream without WebSocket framing<br>
    XHTTP ______________ Splits upload/download across HTTP/2 or HTTP/3 requests to evade stateful inspection<br><br>

    <b>SUGGESTED BUILDS:</b><br><br>

    Speed &amp; Privacy (Default) __ WireGuard + WARP | None | TCP / RAW<br>
    Anti-DPI / Censorship ______ VLESS | XTLS / Vision | TCP / RAW (or VLESS | REALITY | XHTTP)<br>
    Strict Firewall / CDN ______ Trojan | TLS | WebSocket<br>
    Maximum Anonymity __________ Tor Network | None | TCP / RAW
  `,
  phosphor: `
    <b>WHAT IS PHOSPHOR-OS?</b><br>
    PhosphorOS is a full, working Linux computer that runs completely inside your browser tab. Instead of executing commands on a remote server, it creates an isolated virtual machine directly on your own device so you can experiment with Linux commands, write scripts, and test tools safely.<br><br>

    <b>HOW IT WORKS</b><br><br>

    Hardware Emulation _ Uses the v86 WebAssembly engine to simulate a 32-bit x86 processor, BIOS, and 64 MB of RAM inside your browser.<br>
    Linux System _______ Boots a lightweight Buildroot Linux kernel with standard Unix utilities and an interactive shell.<br>
    Console Display ____ Connects the virtual machine's text output to an xterm.js terminal styled to match The TERMINAL.<br>
    Sandbox Isolation __ Unauthenticated sessions run in an Offline Sandbox with no external network adapter, keeping your browser and the host server completely separated.<br><br>

    <b>CONTROLS &amp; LIMITATIONS</b><br><br>

    Temporary Storage __ All files and changes exist only in your browser's temporary memory and are permanently erased upon exiting, rebooting, or refreshing.<br>
    Performance ________ Because your browser simulates a physical processor in software, tasks run noticeably slower than on native hardware.<br>
    Exit vs. Send ESC __ Pressing the physical Esc key or clicking 'Exit' shuts down PhosphorOS and returns you to The TERMINAL. To pass an Escape keystroke to a Linux program (such as vi), click 'Send ESC' or press Ctrl+[.
  `
};

function handleCommand(cmd) {
  let response = "";
  const lower = cmd.trim().toLowerCase();

  if (lower.startsWith("help ")) {
    const target = lower.slice(5).trim();
    response = Object.prototype.hasOwnProperty.call(COMMAND_HELP, target)
      ? COMMAND_HELP[target]
      : `ERROR: No help entry found for: ${target}`;
    appendOutput(`${response}<br>`);
    return;
  }

  switch (lower) {
    case "help":
      response = `
        <b>GUEST COMMANDS</b>:<br><br>
        <b>games</b> _____ A repository of unblockable games<br>
        <b>youtube</b>* __ An ad-free YouTube emulator with a built-in Abomidable Intelligence safe search<br>
        <b>radio</b> _____ A music player for the background<br>
        <b>proxy</b>* ____ A web proxy that works entirely in the frontend and has state-of-the-art encryption<br>
        <b>editor</b> ____ A code editor for developers and nerds<br>
        <b>phosphor</b>* _ An isolated client-side x86 Linux emulator sandbox (PhosphorOS)<br>
        <b>settings</b> __ Kind of obvious, isn't it?<br>
        <b>help</b> ______ You already know what this does<br>
        <b>clear</b> _____ Clears the terminal<br><br>

        <b>SUDO COMMANDS</b> (FOR DEVELOPERS ONLY):<br><br>
        <b>login</b> _____ Sign-in for admin privileges<br>
        <b>admin</b> _____ Opens server monitoring side panels<br>
        <b>info</b> ______ Fetches current server health<br><br>

        * Commands with asterisks have dedicated, more detailed 'help' commands. SYNTAX: 'help [COMMAND]'<br><br>
      `;
      break;
    case "games": setProgramForActiveTab("games", "games"); return;
    case "youtube": setProgramForActiveTab("youtube", "youtube"); return;
    case "radio": setProgramForActiveTab("radio", "radio"); return;
    case "proxy": setProgramForActiveTab("proxy", "proxy"); return;
    case "editor": setProgramForActiveTab("editor", "editor"); return;
    case "phosphor":
      if (phosphorBootAccepted) {
        setProgramForActiveTab("phosphor", "phosphor");
        return;
      }
      if (phosphorConfirmInput) phosphorConfirmInput.value = "";
      const confirmMsg = document.getElementById("phosphorConfirmMsg");
      if (confirmMsg) confirmMsg.textContent = "";
      setProgramForActiveTab("phosphorAdvisory", "phosphor");
      return;
    case "settings": setProgramForActiveTab("themeSetting", "theme"); return;
    case "login":
      setProgramForActiveTab("login", "login");
      setTimeout(() => document.getElementById("email")?.focus(), 50);
      return;
    case "admin":
      if (!admin) {
        const saved = getCookie("adminSession");
        if (saved && saved.username && saved.token) {
          applyAdminLogin(saved.username, saved.token);
        }
      }
      if (admin === true) {
        toggleAdminGraphMode();
        response = `Admin verified. Switched graph view to: ${isAdminGraphMode ? "SERVER" : "CLIENT"}.`;
      } else {
        setProgramForActiveTab("login", "login");
        setTimeout(() => document.getElementById("email")?.focus(), 50);
        response = "Authentication required. Redirecting to login...";
      }
      break;
    case "info":
      if (!admin) {
        const saved = getCookie("adminSession");
        if (saved && saved.username && saved.token) {
          applyAdminLogin(saved.username, saved.token);
        }
      }
      if (admin === true && adminToken) {
        fetchServerInfo();
        return;
      } else {
        setProgramForActiveTab("login", "login");
        setTimeout(() => document.getElementById("email")?.focus(), 50);
        response = "Authentication required. Redirecting to login...";
      }
      break;
    case "furries are cringe": response = "I agree"; break;
    case "clear": clearOutput(); return;
    default: response = `ERROR: Command not found: ${cmd}`;
  }
  appendOutput(`${response}<br>`);
}

document.body.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    const curTab = tabs.find(t => t.id === activeTabId);
    if (curTab && curTab.program === "phosphor" && typeof exitPhosphorOS === "function") {
      exitPhosphorOS();
    } else {
      setProgramForActiveTab("terminal", "terminal");
    }
  }
});

// Games
function handleSearch() {
  const query = document.getElementById("fileSearch").value.toLowerCase();
  generateAllSections(query);
}

const blacklistArr = ["dokidokiliteratureclub", "classof09", "skibidi", "yanderesimulator", "tung", "brainrot"];
function handleBlacklistedFile() {
  window.location.replace("https://ohiomeansjobs.ohio.gov/");
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "ERROR";
  const b = Number(bytes);
  if (b < 1024) return b + " bytes";
  const kb = b / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  return (kb / 1024).toFixed(2) + " MB";
}

const sizeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const btn = entry.target;
      const url = btn.dataset.url;
      const sizeInfo = btn.querySelector(".file-size");
      sizeObserver.unobserve(btn);
      fetch(url, { method: 'HEAD' })
        .then(res => {
          const size = res.headers.get("content-length");
          sizeInfo.textContent = formatBytes(size);
        })
        .catch(() => { sizeInfo.textContent = " ERROR"; });
    }
  });
}, { rootMargin: "50px" });

function generateAllSections(filter = "") {
  const container = document.getElementById("sections-container");
  const fileCount = document.getElementById("fileCount");
  container.textContent = "";

  const allChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const filesByChar = {};
  allChars.forEach(char => filesByChar[char] = []);

  let totalFiles = 0;
  files.forEach(file => {
    const lower = file.toLowerCase();
    if (lower.includes(filter.toLowerCase()) && lower.startsWith("cl")) {
      const aftercl = lower.substring(2);
      if (aftercl.length > 0) {
        const firstChar = aftercl[0].toUpperCase();
        if (filesByChar[firstChar]) {
          filesByChar[firstChar].push(file);
          totalFiles++;
        }
      }
    }
  });

  if (fileCount) fileCount.textContent = totalFiles + (totalFiles === 1 ? " item" : " items");

  allChars.forEach(char => {
    if (filter !== "" && filesByChar[char].length === 0) return;
    const section = document.createElement("div");
    section.className = "letter-section";
    const header = document.createElement("div");
    header.className = "letter-header";
    header.textContent = char;
    section.appendChild(header);

    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "buttons-container";

    if (filesByChar[char].length > 0) {
      filesByChar[char].forEach(file => {
        const btn = document.createElement("button");
        btn.className = "file-button";
        const titleSpan = document.createElement("span");
        titleSpan.className = "file-title";
        titleSpan.textContent = file.replace(/^cl/, "");

        const sizeInfo = document.createElement("span");
        sizeInfo.className = "file-size";
        sizeInfo.textContent = "Calculating...";

        btn.appendChild(titleSpan);
        btn.appendChild(sizeInfo);

        const normalized = file.includes(".") ? file : file + ".html";
        const encoded = encodeURIComponent(normalized);
        const url = `https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile/UGS-Files/${encoded}?t=${Date.now()}`;
        btn.dataset.url = url;
        sizeObserver.observe(btn);

        btn.onclick = () => {
          if (typeof blacklistArr !== 'undefined' && blacklistArr.some(segment => file.toLowerCase().includes(segment.toLowerCase()))) {
            handleBlacklistedFile();
          } else {
            fetch(url).then(res => res.text()).then(text => {
              const newWin = window.open("about:blank", "_blank");
              if (newWin) {
                newWin.document.open();
                newWin.document.write(text);
                newWin.document.close();
              }
            });
          }
        };
        buttonsContainer.appendChild(btn);
      });
    } else {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "empty-message";
      emptyMsg.textContent = "ERROR: No files have been found";
      buttonsContainer.appendChild(emptyMsg);
    }
    section.appendChild(buttonsContainer);
    container.appendChild(section);
  });
  load("[ OK ] Games loaded");
}

// YouTube
window.onYouTubeIframeAPIReady = function() {
  searchPlayer = new YT.Player("mainVideoDisplay", {
    height: "360",
    width: "640",
    videoId: "",
    events: { "onStateChange": onSearchPlayerStateChange }
  });
};

(function loadYoutubeAPI() {
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
})();

function onSearchPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    radioPlayer.pause();
    document.getElementById("playBtn").textContent = "> PLAY";
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    radioPlayer.play();
    document.getElementById("playBtn").textContent = "> PAUSE";
  }
}

function togglePlayback() {
  const btn = document.getElementById("playBtn");
  if (radioPlayer.paused) {
    if (searchPlayer && searchPlayer.getPlayerState() === YT.PlayerState.PLAYING) searchPlayer.pauseVideo();
    radioPlayer.play();
    btn.textContent = "> PAUSE";
  } else {
    radioPlayer.pause();
    btn.textContent = "> PLAY";
  }
}

function updateTitleDisplay(title) {
  document.getElementById("songTitle").textContent = `NOW PLAYING: ${title}`;
}

// Tsarevich
const RATE_INPUT_1M = 0.0375;
const RATE_OUTPUT_1M = 0.1500;
const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
  { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "OFF" }
];
const tsarevichCache = new Map();

function postYoutubeStatus(message, reset = false) {
  const sText = document.getElementById("youtubeStatus");
  if (!sText) return;
  if (reset) {
    sText.innerHTML = "";
    sText.style.color = "";
  }
  const entry = document.createElement("div");
  entry.textContent = message;
  sText.appendChild(entry);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeCodex(code) {
  if (!code || typeof code !== "string") {
    return { isSafe: false, classification: "Class III-α Haereticus Primus" };
  }

  const raw = code.trim();
  if (raw.startsWith("Class ")) {
    const isSafe = /\bClass\s+(I|II)\b/i.test(raw);
    return { isSafe, classification: raw };
  }

  if (raw === "1" || raw.toLowerCase() === "1a" || raw.toLowerCase().startsWith("1")) {
    return { isSafe: true, classification: "Class I - Orthodox" };
  }

  const match = raw.match(/^([234oOwW0])[-_]?([abgαβγ])?[-_]?([1-4])?$/i);
  if (!match) {
    return { isSafe: false, classification: "Class III-α Haereticus Primus" };
  }

  const gradusChar = match[1].toUpperCase();
  const ordoChar = (match[2] || "a").toLowerCase();
  const decretumDigit = match[3] || "1";

  const ordoMap = { a: "α", b: "β", g: "γ", "α": "α", "β": "β", "γ": "γ" };
  const ordoSym = ordoMap[ordoChar] || "α";

  let gradusRoman = "III";
  let decretumText = "Haeresis Proxima";
  let isSafe = false;

  if (gradusChar === "2") {
    gradusRoman = "II";
    isSafe = true;
    const g2Map = {
      "1": "Libertas per Scientiam",
      "2": "Beati Mundo Corde",
      "3": "Memento Mori"
    };
    decretumText = g2Map[decretumDigit] || "Memento Mori";
  } else if (gradusChar === "3") {
    gradusRoman = "III";
    isSafe = false;
    const g3Map = {
      "1": "Haereticus Primus",
      "2": "Haereticus Pestis",
      "3": "Haereticus Templum",
      "4": "Haeresis Proxima"
    };
    decretumText = g3Map[decretumDigit] || "Haereticus Primus";
  } else if (gradusChar === "4") {
    gradusRoman = "IV";
    isSafe = false;
    decretumText = "Haeresis Veritas";
  } else if (["O", "W", "0"].includes(gradusChar)) {
    gradusRoman = "Ω";
    isSafe = false;
    decretumText = "Haeresis Existentialis";
  }

  return {
    isSafe,
    classification: `Class ${gradusRoman}-${ordoSym} ${decretumText}`
  };
}

function isPure(classification) {
  if (!classification || typeof classification !== "string") return false;
  return /\bClass\s+(I|II)\b/i.test(classification);
}

function edictOfObliteration(uiItems) {
  const classIIChannels = new Set();
  uiItems.forEach(item => {
    const classification = item.assessment && item.assessment.classification;
    if (classification && /\bClass\s+II\b/i.test(classification)) {
      if (item.video && item.video.snippet && item.video.snippet.channelTitle) {
        classIIChannels.add(item.video.snippet.channelTitle);
      }
    }
  });

  const condemnedChannels = new Set();
  uiItems.forEach(item => {
    const classification = item.assessment && item.assessment.classification;
    if (!isPure(classification)) {
      const channelName = item.video && item.video.snippet && item.video.snippet.channelTitle;
      if (channelName && !classIIChannels.has(channelName)) {
        condemnedChannels.add(channelName);
      }
    }
  });

  const sortedCondemned = Array.from(condemnedChannels).sort((a, b) => b.length - a.length);

  uiItems.forEach(item => {
    let title = item.video.snippet.title;
    let channel = item.video.snippet.channelTitle;

    if (sortedCondemned.length > 0) {
      sortedCondemned.forEach(badChannel => {
        const escapedName = escapeRegExp(badChannel);
        const regex = new RegExp(`(^|[^a-zA-Z0-9])(${escapedName})(?=[^a-zA-Z0-9]|$)`, 'gi');
        title = title.replace(regex, (m, b, matched) => b + `<span class="censor-text">${matched.replace(/./g, '█')}</span>`);
      });
    }

    if (condemnedChannels.has(item.video.snippet.channelTitle)) {
      channel = "<b>[ DATA EXPUNGED ]</b>";
      if (item.assessment) item.assessment.isObliterated = true;
    }

    item.displayTitle = title;
    item.displayChannel = channel;
  });

  return uiItems;
}

async function purgeHeresy(videos, query, canBisect = true) {
  const expectedIds = videos.map(v => (v.id.videoId || v.id));
  const queryKey = String(query || "").trim().toLowerCase();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const cachedMap = new Map();
  const uncachedVideos = [];
  for (const v of videos) {
    const vidId = v.id.videoId || v.id;
    const cacheKey = `${queryKey}::${vidId}`;
    if (tsarevichCache.has(cacheKey)) {
      cachedMap.set(vidId, tsarevichCache.get(cacheKey));
    } else {
      uncachedVideos.push(v);
    }
  }

  if (cachedMap.size > 0) {
    postYoutubeStatus(`[Tsarevich] Cache hit: ${cachedMap.size} verified, ${uncachedVideos.length} queued.`);
  }

  if (uncachedVideos.length === 0) {
    return {
      assessments: expectedIds.map(id => cachedMap.get(id)),
      usage: { input: 0, output: 0 }
    };
  }

  const uncachedIds = uncachedVideos.map(v => (v.id.videoId || v.id));
  let metadataString = "\n";
  for (let i = 0; i < uncachedVideos.length; i++) {
    const v = uncachedVideos[i];
    const vidId = v.id.videoId || v.id;
    const safeDesc = v.snippet.description
      ? v.snippet.description.replace(/[\n\r"]/g, ' ').replace(/\\/g, '/').substring(0, 120)
      : "";
    metadataString += `[${i + 1}] ID:${vidId} | CH:${v.snippet.channelTitle} | T:${v.snippet.title} | D:${safeDesc}\n`;
  }

  const parts = [{
    text: `PURPOSE: Audit videos for heresy. Return ONLY the compressed JSON array matching the schema.

SEARCH QUERY: "${query}"

AUDIT CONTEXT:
If query "${query}" targets an adult creator, NSFW artist, or 18+ animator:
- Original animations, re-uploads, compilations, edits, sound-alikes are Heretic (3a1, 3a2, or 4a1).
- Channels linking to Patreon, Fanbox, Subscribestar, Newgrounds adult pages, or uncensored cuts are Heretics.
- Only third-party news or objective criticism is Tolerable Heresy (2a1, 2a2).

CODEX COMPRESSION ENCODING:
Syntax: [Gradus][Ordo][Decretum]

GRADUS:
  1: Orthodox (output exactly "1")
  2: Tolerable Heresy (isSafe: true)
  3: Heresy / Heretics (isSafe: false)
  4: Haeresis Veritas (Explicit/pornographic; isSafe: false)
  O: Haeresis Existentialis (Malware/Illegal; isSafe: false)

ORDO:
  a: α (Suggestive/Mind)
  b: β (Malware/Machine)
  g: γ (Security breach)

DECRETUM (Digit):
  For Gradus 2:
    1: Libertas per Scientiam (Educational)
    2: Beati Mundo Corde (Criticism)
    3: Memento Mori (Edgy comedy/satire)
  For Gradus 3:
    1: Haereticus Primus (Adult animators/known creators)
    2: Haereticus Pestis (Memes, compilations, reactions to heretics)
    3: Haereticus Templum (Suggestive topic seeding heresy)
    4: Haeresis Proxima (Low-quality, suggestive, brainrot)
  For Gradus 4:
    1: Haeresis Veritas
  For Gradus O:
    1: Haeresis Existentialis

EXAMPLES:
  - Clean video -> "1"
  - NSFW animator's original work -> "3a1"
  - Meme/reupload/compilation of NSFW animator -> "3a2"
  - Suggestive meme -> "3a4"
  - Documentary about animator -> "2a1"
  - Explicit pornography -> "4a1"

METADATA LIST:
${metadataString}`
  }];

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    postYoutubeStatus(`[Tsarevich] Auditing ${uncachedVideos.length} records (attempt ${attempts}/${maxAttempts})...`);
    try {
      const res = await fetch(`${API_GATEWAY}/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(22000),
        body: JSON.stringify({
          contents: [{ parts }],
          safetySettings: safetySettings,
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
            responseSchema: {
              type: "ARRAY",
              description: `List of exactly ${uncachedVideos.length} compressed evaluations.`,
              items: {
                type: "OBJECT",
                properties: {
                  i: { type: "STRING" },
                  c: { type: "STRING" }
                },
                required: ["i", "c"]
              }
            }
          }
        })
      });

      if (res.status === 429) {
        const retryAfterSec = parseInt(res.headers.get("retry-after") || "0", 10);
        const backoffMs = retryAfterSec > 0 ? Math.min(retryAfterSec * 1000, 6000) : 1500 * attempts;
        postYoutubeStatus(`[Tsarevich] Rate limit (HTTP 429) on attempt ${attempts}/${maxAttempts}.`);
        if (attempts < maxAttempts) {
          postYoutubeStatus(`[Tsarevich] Backing off ${backoffMs}ms before retry...`);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        throw new Error("Rate limit (HTTP 429)");
      }

      if (!res.ok) {
        postYoutubeStatus(`[Tsarevich] Gateway returned HTTP ${res.status} on attempt ${attempts}/${maxAttempts}.`);
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.usageMetadata) {
        totalInputTokens += data.usageMetadata.promptTokenCount || 0;
        totalOutputTokens += data.usageMetadata.candidatesTokenCount || 0;
      }

      if (data.promptFeedback && data.promptFeedback.blockReason) {
        postYoutubeStatus(`[Tsarevich] Prompt blocked (${data.promptFeedback.blockReason}).`);
        if (canBisect && uncachedVideos.length > 1) {
          postYoutubeStatus(`[Tsarevich] Bisecting batch (${uncachedVideos.length}) to isolate blocked record...`);
          const mid = Math.ceil(uncachedVideos.length / 2);
          const [left, right] = await Promise.all([
            purgeHeresy(uncachedVideos.slice(0, mid), query, false),
            purgeHeresy(uncachedVideos.slice(mid), query, false)
          ]);
          const mergedMap = new Map(cachedMap);
          left.assessments.forEach(a => mergedMap.set(a.id, a));
          right.assessments.forEach(a => mergedMap.set(a.id, a));
          return {
            assessments: expectedIds.map(id => mergedMap.get(id)),
            usage: {
              input: totalInputTokens + left.usage.input + right.usage.input,
              output: totalOutputTokens + left.usage.output + right.usage.output
            }
          };
        }
        postYoutubeStatus(`[Tsarevich] FAIL-DEADLY ACTIVATED (${data.promptFeedback.blockReason}): Purging ${uncachedVideos.length} records as Class IV-α.`);
        uncachedIds.forEach(id => cachedMap.set(id, { id, isSafe: false, classification: "Class IV-α Haeresis Veritas" }));
        return {
          assessments: expectedIds.map(id => cachedMap.get(id)),
          usage: { input: totalInputTokens, output: totalOutputTokens }
        };
      }

      if (data.candidates && data.candidates[0]?.finishReason === "SAFETY") {
        postYoutubeStatus(`[Tsarevich] Safety filter tripped (finishReason: SAFETY).`);
        if (canBisect && uncachedVideos.length > 1) {
          postYoutubeStatus(`[Tsarevich] Bisecting batch (${uncachedVideos.length}) to isolate unsafe record...`);
          const mid = Math.ceil(uncachedVideos.length / 2);
          const [left, right] = await Promise.all([
            purgeHeresy(uncachedVideos.slice(0, mid), query, false),
            purgeHeresy(uncachedVideos.slice(mid), query, false)
          ]);
          const mergedMap = new Map(cachedMap);
          left.assessments.forEach(a => mergedMap.set(a.id, a));
          right.assessments.forEach(a => mergedMap.set(a.id, a));
          return {
            assessments: expectedIds.map(id => mergedMap.get(id)),
            usage: {
              input: totalInputTokens + left.usage.input + right.usage.input,
              output: totalOutputTokens + left.usage.output + right.usage.output
            }
          };
        }
        postYoutubeStatus(`[Tsarevich] FAIL-DEADLY ACTIVATED (SAFETY): Purging ${uncachedVideos.length} records as Class IV-α.`);
        uncachedIds.forEach(id => cachedMap.set(id, { id, isSafe: false, classification: "Class IV-α Haeresis Veritas" }));
        return {
          assessments: expectedIds.map(id => cachedMap.get(id)),
          usage: { input: totalInputTokens, output: totalOutputTokens }
        };
      }

      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid model payload");
      }

      let responseText = data.candidates[0].content.parts[0].text;
      const firstBracket = responseText.indexOf('[');
      const lastBracket = responseText.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        responseText = responseText.substring(firstBracket, lastBracket + 1);
      }
      const compressedList = JSON.parse(responseText);
      if (!Array.isArray(compressedList)) {
        throw new Error("Response payload is not an array");
      }

      uncachedIds.forEach((expectedId, idx) => {
        const item = compressedList.find(x => x && x.i === expectedId)
          || (compressedList.length === uncachedIds.length && compressedList[idx] && !compressedList[idx].i ? compressedList[idx] : null)
          || {};
        const decoded = decodeCodex(item.c || "3a1");
        const assessment = {
          id: expectedId,
          isSafe: decoded.isSafe,
          classification: decoded.classification
        };
        cachedMap.set(expectedId, assessment);
        if (item.c) {
          tsarevichCache.set(`${queryKey}::${expectedId}`, assessment);
        }
      });

      postYoutubeStatus(`[Tsarevich] Audit complete: ${uncachedIds.length} records classified.`);
      return {
        assessments: expectedIds.map(id => cachedMap.get(id)),
        usage: { input: totalInputTokens, output: totalOutputTokens }
      };
    } catch (e) {
      postYoutubeStatus(`[Tsarevich] Fault on attempt ${attempts}/${maxAttempts}: ${e.message || e}`);
      if (attempts >= maxAttempts) {
        postYoutubeStatus(`[Tsarevich] FAIL-DEADLY ACTIVATED (${e.message || e}): Purging ${uncachedVideos.length} records as Class III-α.`);
        uncachedIds.forEach(id => cachedMap.set(id, { id, isSafe: false, classification: "Class III-α Haereticus Primus" }));
        return {
          assessments: expectedIds.map(id => cachedMap.get(id)),
          usage: { input: totalInputTokens, output: totalOutputTokens }
        };
      }
      const retryDelay = 1200 * attempts;
      postYoutubeStatus(`[Tsarevich] Retrying audit in ${retryDelay}ms...`);
      await new Promise(r => setTimeout(r, retryDelay));
    }
  }
}

function getGradusCssClass(classificationString) {
  if (!classificationString) return 'gradus-I';
  if (classificationString.includes('Class Ω')) return 'gradus-O';
  if (classificationString.includes('Class IV')) return 'gradus-IV';
  if (classificationString.includes('Class III')) return 'gradus-III';
  if (classificationString.includes('Class II')) return 'gradus-II';
  return 'gradus-I';
}

const searchBtn = document.getElementById("youtubeSearch");
searchBtn.addEventListener("click", searchVideos);
const queryInput = document.getElementById("query");
queryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !searchBtn.disabled) {
    e.preventDefault();
    searchVideos();
  }
});

async function searchVideos() {
  const query = document.getElementById('query').value.trim();
  const sText = document.getElementById('youtubeStatus');
  const metricsDiv = document.getElementById('youtubeMetrics');
  const resultsDiv = document.getElementById('results');

  if (!query) return alert("Please enter a query");
  resultsDiv.innerHTML = "";
  metricsDiv.style.display = "none";
  document.getElementById("videoDisplay").style.display = "none";
  searchBtn.disabled = true;
  sText.className = "flicker";
  postYoutubeStatus("1/2: Accessing databanks...", true);

  const startTime = performance.now();
  try {
    const ytRes = await fetch(`${API_GATEWAY}/api/youtube?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(8000)
    });
    const ytData = await ytRes.json();
    if (!ytData.items || ytData.items.length === 0) throw new Error("No records found");

    postYoutubeStatus(`2/2: Assessing ${ytData.items.length} records...`);
    const responseData = await purgeHeresy(ytData.items, query);
    const latencySec = ((performance.now() - startTime) / 1000).toFixed(2);
    const assessmentMap = {};
    responseData.assessments.forEach(item => { assessmentMap[item.id] = item; });

    let finalUIItems = ytData.items.map(v => ({
      video: v,
      assessment: assessmentMap[v.id.videoId || v.id] || { isSafe: false, classification: "Class III-α Haereticus Primus" }
    }));
    postYoutubeStatus("[Tsarevich] Applying Edict of Obliteration...");
    finalUIItems = edictOfObliteration(finalUIItems);

    sText.className = "";
    const safeCount = finalUIItems.filter(item => item.assessment.isSafe).length;
    postYoutubeStatus(`${safeCount} of ${ytData.items.length} deemed pure`);
    metricsDiv.style.display = "block";
    metricsDiv.innerHTML = `Compute Load: ${responseData.usage.input} In | ${responseData.usage.output} Out <br/>Latency: <strong>${latencySec}s</strong>`;

    finalUIItems.forEach(item => {
      const vidId = item.video.id.videoId || item.video.id;
      const snippet = item.video.snippet;
      const card = document.createElement("div");
      card.className = item.assessment.isSafe ? "video-card" : "video-card flagged";
      card.innerHTML = `
        <img src="${(snippet.thumbnails.medium || snippet.thumbnails.default).url}">
        <p>${item.displayTitle}</p>
        <span>${item.displayChannel}</span>
        <div class="class-badge ${getGradusCssClass(item.assessment.classification)}" style="margin-top: 10px;">${item.assessment.classification}</div>
      `;
      if (item.assessment.isSafe) {
        card.onclick = () => {
          document.getElementById("videoDisplay").style.display = "block";
          document.getElementById("playingTitle").innerText = snippet.title;
          searchPlayer.loadVideoById(vidId);
          document.getElementById("videoDisplay").scrollIntoView({ behavior: "smooth" });
        };
      }
      resultsDiv.appendChild(card);
    });
  } catch (err) {
    sText.className = "";
    const errLine = document.createElement("div");
    errLine.textContent = "Error: " + err.message;
    sText.appendChild(errLine);
  } finally {
    searchBtn.disabled = false;
  }
}

// PhosphorOS
const PHOSPHOR_MOTD = [
  " /$$$$$$$  /$$   /$$  /$$$$$$   /$$$$$$  /$$$$$$$  /$$   /$$  /$$$$$$  /$$$$$$$ ",
  "| $$__  $$| $$  | $$ /$$__  $$ /$$__  $$| $$__  $$| $$  | $$ /$$__  $$| $$__  $$",
  "| $$  \\ $$| $$  | $$| $$  \\ $$| $$  \\__/| $$  \\ $$| $$  | $$| $$  \\ $$| $$  \\ $$",
  "| $$$$$$$/| $$$$$$$$| $$  | $$|  $$$$$$ | $$$$$$$/| $$$$$$$$| $$  | $$| $$$$$$$/",
  "| $$____/ | $$__  $$| $$  | $$ \\____  $$| $$____/ | $$__  $$| $$  | $$| $$__  $$",
  "| $$      | $$  | $$| $$  | $$ /$$  \\ $$| $$      | $$  | $$| $$  | $$| $$  \\ $$",
  "| $$      | $$  | $$|  $$$$$$/|  $$$$$$/| $$      | $$  | $$|  $$$$$$/| $$  | $$",
  "|__/      |__/  |__/ \\______/  \\______/ |__/      |__/  |__/ \\______/ |__/  |__/ OS",
  "x86 Linux Emulator"
].join("\n");

let phosphorEmulator = null;
let phosphorTerm = null;
let phosphorFitAddon = null;
let phosphorResizeObserver = null;
let phosphorBootAccepted = false;
let phosphorBooting = false;
let phosphorBooted = false;
let phosphorLastAdminMode = false;

function getPhosphorUsername() {
  if (!admin) return "guest";
  const raw = document.querySelector(".user")?.textContent.trim() || "admin";
  return raw.replace(/[^a-zA-Z0-9._-]/g, "") || "admin";
}

function setPhosphorStatus(text) {
  const el = document.getElementById("phosphorStatus");
  if (el) el.textContent = text;
}

function syncPhosphorUserPrompt() {
  const currentUser = getPhosphorUsername();
  document.querySelectorAll("#phosphor .user, #phosphorAdvisory .user").forEach(el => {
    el.textContent = currentUser;
  });
}

async function resolvePhosphorImage() {
  const kernelCandidates = [
    "https://cdn.jsdelivr.net/gh/HoujenHuang/TERMINAL@main/buildroot-bzimage68.bin",
    "https://static.simonwillison.net/static/cors-allow/2026/buildroot-bzimage68.bin"
  ];
  for (const url of kernelCandidates) {
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
      if (res.ok) return { type: "bzimage", url };
    } catch (_) {}
  }
  return {
    type: "cdrom",
    url: "https://raw.githubusercontent.com/copy/images/db92d8fd4a53dbd73b8e0588bb4bd8fe37a1975a/linux.iso"
  };
}

function sendPhosphorEscape() {
  if (phosphorEmulator && typeof phosphorEmulator.serial0_send === "function") {
    phosphorEmulator.serial0_send("\x1b");
    phosphorTerm?.focus();
  }
}

function pausePhosphorOS() {
  if (phosphorEmulator && typeof phosphorEmulator.stop === "function") {
    try { phosphorEmulator.stop(); } catch (_) {}
    setPhosphorStatus("Paused");
  }
}

function resumePhosphorOS() {
  syncPhosphorUserPrompt();
  if (phosphorEmulator && typeof phosphorEmulator.run === "function") {
    try { phosphorEmulator.run(); } catch (_) {}
    const netLabel = phosphorLastAdminMode ? "Authenticated Wisp" : "Offline Sandbox";
    setPhosphorStatus(`Running (${netLabel})`);
    setTimeout(() => {
      if (phosphorFitAddon) {
        try { phosphorFitAddon.fit(); } catch (_) {}
      }
      phosphorTerm?.focus();
    }, 550);
  }
}

function destroyPhosphorOS() {
  if (phosphorResizeObserver) {
    try { phosphorResizeObserver.disconnect(); } catch (_) {}
    phosphorResizeObserver = null;
  }
  if (phosphorEmulator) {
    try { phosphorEmulator.stop(); } catch (_) {}
    try { phosphorEmulator.destroy(); } catch (_) {}
    phosphorEmulator = null;
  }
  if (phosphorTerm) {
    try { phosphorTerm.dispose(); } catch (_) {}
    phosphorTerm = null;
  }
  phosphorFitAddon = null;
  phosphorBooted = false;
  phosphorBooting = false;
  setPhosphorStatus("Standby");
}

function exitPhosphorOS() {
  destroyPhosphorOS();
  setProgramForActiveTab("terminal", "terminal");
}

function resetPhosphorOS() {
  destroyPhosphorOS();
  initPhosphorOS();
}

async function initPhosphorOS() {
  syncPhosphorUserPrompt();
  if (phosphorBooted || phosphorBooting) {
    if (phosphorFitAddon) {
      try { phosphorFitAddon.fit(); } catch (_) {}
    }
    return;
  }
  phosphorBooting = true;

  const termContainer = document.getElementById("phosphorTerminal");
  const screenContainer = document.getElementById("phosphorScreen");
  if (!termContainer || !screenContainer) {
    phosphorBooting = false;
    return;
  }

  if (typeof V86 === "undefined" || typeof Terminal === "undefined") {
    setPhosphorStatus("Emulator dependencies unavailable");
    termContainer.textContent = "ERROR: Failed to load v86 or xterm.js from CDN.";
    phosphorBooting = false;
    return;
  }

  termContainer.innerHTML = "";
  termContainer.style.display = "block";
  screenContainer.style.display = "none";

  const themeColor = getComputedStyle(document.documentElement).getPropertyValue("--theme").trim() || "rgb(51, 255, 51)";
  const fontFam = document.body.style.fontFamily || "Courier New, monospace";
  const fontSizePx = Math.max(11, Math.round(window.innerWidth * 0.01));

  phosphorTerm = new Terminal({
    allowTransparency: true,
    cursorBlink: true,
    convertEol: true,
    fontFamily: fontFam,
    fontSize: fontSizePx,
    theme: {
      background: "rgba(0, 0, 0, 0)",
      foreground: themeColor,
      cursor: themeColor
    }
  });

  phosphorTerm.attachCustomKeyEventHandler((e) => {
    if (e.key === "Escape") return false;
    return true;
  });

  if (typeof FitAddon !== "undefined" && FitAddon.FitAddon) {
    phosphorFitAddon = new FitAddon.FitAddon();
    phosphorTerm.loadAddon(phosphorFitAddon);
  }

  phosphorTerm.open(termContainer);
  setTimeout(() => {
    if (phosphorFitAddon) {
      try { phosphorFitAddon.fit(); } catch (_) {}
    }
  }, 50);
  setTimeout(() => {
    if (phosphorFitAddon) {
      try { phosphorFitAddon.fit(); } catch (_) {}
    }
  }, 550);

  if (typeof ResizeObserver !== "undefined") {
    phosphorResizeObserver = new ResizeObserver(() => {
      if (phosphorFitAddon && termContainer.offsetParent !== null) {
        try { phosphorFitAddon.fit(); } catch (_) {}
      }
    });
    phosphorResizeObserver.observe(termContainer);
  }

  const isAdminNet = Boolean(admin && adminToken);
  phosphorLastAdminMode = isAdminNet;
  const netLabel = isAdminNet ? "Authenticated Wisp" : "Offline Sandbox";
  const phosphorUser = getPhosphorUsername();

  phosphorTerm.writeln(`[PhosphorOS] Resolving kernel image (${netLabel})...`);
  setPhosphorStatus("Fetching image...");

  const image = await resolvePhosphorImage();
  const useSerial = image.type === "bzimage";

  if (!useSerial) {
    termContainer.style.display = "none";
    screenContainer.style.display = "block";
  }

  const v86Config = {
    wasm_path: "https://cdn.jsdelivr.net/npm/v86@0.5.472/build/v86.wasm",
    bios: { url: "https://cdn.jsdelivr.net/gh/copy/v86@master/bios/seabios.bin" },
    vga_bios: { url: "https://cdn.jsdelivr.net/gh/copy/v86@master/bios/vgabios.bin" },
    memory_size: 64 * 1024 * 1024,
    vga_memory_size: 2 * 1024 * 1024,
    filesystem: {},
    disable_keyboard: useSerial,
    disable_mouse: useSerial,
    disable_speaker: true,
    autostart: true
  };

  if (useSerial) {
    v86Config.bzimage = { url: image.url };
    v86Config.cmdline = "tsc=reliable mitigations=off random.trust_cpu=on";
  } else {
    v86Config.screen_container = screenContainer;
    v86Config.cdrom = { url: image.url };
  }

  if (isAdminNet) {
    v86Config.net_device = {
      type: "ne2k",
      relay_url: `wisps://${WISP_URL}/wisp/?mode=phosphor&token=${encodeURIComponent(adminToken)}`
    };
  }

  try {
    setPhosphorStatus(`Booting (${netLabel})...`);
    phosphorEmulator = new V86(v86Config);

    if (useSerial) {
      const decoder = new TextDecoder("utf-8");
      let bootTail = "";
      let setupTail = "";
      let phosphorBootConfigured = false;
      let phosphorSuppressSerial = false;

      phosphorEmulator.add_listener("serial0-output-byte", (byte) => {
        const ch = String.fromCharCode(byte);

        if (phosphorSuppressSerial) {
          setupTail = (setupTail + ch).slice(-64);
          if (setupTail.endsWith("__PHOSPHOR_READY__\r\n") || setupTail.endsWith("__PHOSPHOR_READY__\n")) {
            phosphorSuppressSerial = false;
            if (phosphorTerm) {
              phosphorTerm.reset();
              PHOSPHOR_MOTD.split("\n").forEach(line => phosphorTerm.writeln(line));
              phosphorTerm.writeln("");
            }
          }
          return;
        }

        if (phosphorTerm) {
          phosphorTerm.write(decoder.decode(Uint8Array.of(byte), { stream: true }));
        }

        if (!phosphorBootConfigured) {
          bootTail = (bootTail + ch).slice(-32);
          if (bootTail.endsWith("~% ") || bootTail.endsWith("~# ")) {
            phosphorBootConfigured = true;
            phosphorSuppressSerial = true;
            phosphorEmulator.serial0_send(`export PS1='${phosphorUser}@phosphor:\\w$ '; printf '__PHOSPHOR_''READY__\\n'\n`);
          }
        }
      });

      phosphorTerm.onData((data) => {
        if (phosphorEmulator && typeof phosphorEmulator.serial0_send === "function") {
          phosphorEmulator.serial0_send(data);
        }
      });
      phosphorTerm.focus();
    }

    phosphorEmulator.add_listener("emulator-ready", () => {
      setPhosphorStatus(`Running (${netLabel})`);
      load(`[ OK ] PhosphorOS initialized (${netLabel})`);
    });

    phosphorBooted = true;
  } catch (err) {
    setPhosphorStatus("Boot failed");
    phosphorTerm?.writeln(`\r\n[ERROR] Failed to boot PhosphorOS: ${err.message || err}`);
  } finally {
    phosphorBooting = false;
  }
}

window.addEventListener("resize", () => {
  const phosphorEl = document.getElementById("phosphor");
  if (phosphorEl && phosphorEl.style.display !== "none" && phosphorFitAddon) {
    try { phosphorFitAddon.fit(); } catch (_) {}
  }
});

// Loading & boot
let splashStarted = false;
const loadedMessages = new Set();

function load(msg) {
  if (loadedMessages.has(msg)) return;
  loadedMessages.add(msg);
  const list = document.getElementById("outputList");
  if (!list) return;
  const newItem = document.createElement("li");
  newItem.classList.add("stdout");
  newItem.textContent = msg;
  list.appendChild(newItem);
}

function runWhenVisible(callback, delay = 0) {
  setTimeout(() => {
    if (document.hidden) {
      const onVisible = () => {
        if (!document.hidden) {
          document.removeEventListener("visibilitychange", onVisible);
          setTimeout(callback, 200);
        }
      };
      document.addEventListener("visibilitychange", onVisible);
    } else {
      callback();
    }
  }, delay);
}

async function bootSystem() {
  displayTime();
  displayDate();
  updateTimer();
  checkBrowser();
  checkMemory();
  checkBattery();
  checkConnection();
  generateAllSections();
  startEngine();
  checkAndRestoreAdminSession();

  const ipPromise = (async () => {
    try {
      await fetchIPData();
      updateIpDisplays();
      if (typeof am5 !== "undefined") {
        await new Promise(resolve => {
          am5.ready(async () => {
            try { await initMap(); } catch (e) {}
            resolve();
          });
        });
      }
    } catch (e) {}
  })();

  const weatherPromise = (async () => {
    try { await updateMarsWeatherTable(); } catch (e) {}
  })();

  const speedPromise = (async () => {
    try { await checkSpeed(); } catch (e) {}
  })();

  const serviceHealthPromise = checkPublicServicesHealth();

  await Promise.race([
    Promise.allSettled([ipPromise, weatherPromise, speedPromise, serviceHealthPromise]),
    new Promise(resolve => setTimeout(resolve, 5000))
  ]);

  runWhenVisible(startSplash, 600);
}

function startSplash() {
  if (splashStarted) return;
  splashStarted = true;
  document.getElementById("outputList")?.setAttribute("style", "display: none;");
  const splash = document.getElementById("splash");
  if (splash) {
    splash.style.display = "block";
    splash.classList.add("fade-in");
  }
  runWhenVisible(showTerminal, 2500);
}

function showTerminal() {
  renderTabs();
  document.getElementById("stdin")?.focus();
  document.getElementById("terminalContent")?.classList.add("fade-in");
  document.getElementById("tabBar")?.classList.add("fade-in");

  runWhenVisible(() => {
    openSide();
    const tContent = document.getElementById("terminalContent");
    if (tContent) {
      tContent.style.opacity = "1";
      tContent.classList.remove("fade-in");
    }
    resumeFPS();
  }, 1200);
}
