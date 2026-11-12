// Radio
const songData = [
  { filename: "resurrection.mp3", title: "ППК - Воскрешение" },
  { filename: "dont_leave.mp3", title: "Gummy Boy - Don't Leave" },
  { filename: "zagadka.mp3", title: "PRNRML - Загадка 1" },
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

    load(`[ OK ] YouTube pinged (${data.youtube})`);
    load(`[ OK ] Tsarevich pinged (${data.gemini})`);
    load(`[ OK ] Proxy pinged (${data.wisp})`);
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
let historyStack = [];
let historyIdx = -1;
let currentProfile = "warp";

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

    const headers = {
      "User-Agent": SPOOFED_UA,
      "Accept": asBinary ? "*/*" : "text/css,*/*;q=0.1",
      "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": asBinary ? "image" : "style",
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
  const imgTags = [...doc.querySelectorAll("img[src]")].slice(0, 40);
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
      try {
        const liveDoc = iframeTarget && (iframeTarget.contentDocument || iframeTarget.contentWindow?.document);
        if (liveDoc) {
          const liveImg = liveDoc.querySelector(`img[src="${CSS.escape(src)}"]`);
          if (liveImg) liveImg.setAttribute("src", dataUri);
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
          } else if (!safeBase && typeof url === 'string' && !url.includes('://') && !url.startsWith('data:') && !url.startsWith('blob:')) {
            safeBase = TARGET_URL;
          }

          let safeUrl = url;
          if (safeUrl && typeof safeUrl === 'object' && typeof safeUrl.href === 'string') safeUrl = safeUrl.href;
          if (typeof safeUrl === 'string' && (safeUrl.startsWith('blob:') || safeUrl === window.location.href)) {
            safeUrl = TARGET_URL;
          }

          try {
            return new OrigURL(safeUrl, safeBase);
          } catch (err) {
            return new OrigURL(safeUrl, TARGET_URL);
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

      const origCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName, options) {
        const el = origCreateElement(tagName, options);
        if (typeof tagName !== 'string') return el;
        const tag = tagName.toLowerCase();

        if (tag === 'script') {
          const origSetAttribute = el.setAttribute.bind(el);
          let scriptSrc = '';
          Object.defineProperty(el, 'src', {
            get: () => scriptSrc,
            set: (val) => {
              scriptSrc = resolveTarget(val);
              origSetAttribute('data-proxied-src', scriptSrc);
              executeTunnelRequest(scriptSrc, { method: 'GET' })
                .then(async (res) => {
                  const buf = await res.arrayBuffer();
                  const code = new TextDecoder().decode(buf);
                  try {
                    const runner = origCreateElement('script');
                    if (el.type) runner.type = el.type;
                    if (el.noModule) runner.noModule = el.noModule;
                    runner.textContent = sanitizeCode(code);
                    (document.head || document.documentElement).appendChild(runner);
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
          const origSetAttr = el.setAttribute.bind(el);
          let imgSrc = '';
          Object.defineProperty(el, 'src', {
            get: () => imgSrc,
            set: (val) => {
              imgSrc = resolveTarget(val);
              if (!isInternalUrl(imgSrc)) {
                executeTunnelRequest(imgSrc, { method: 'GET' }).then(async res => {
                  const buf = await res.arrayBuffer();
                  const blob = new Blob([buf], { type: 'image/png' });
                  origSetAttr('src', URL.createObjectURL(blob));
                }).catch(() => origSetAttr('src', imgSrc));
              } else {
                origSetAttr('src', imgSrc);
              }
            },
            configurable: true
          });
        }
        return el;
      };

      try {
        const OrigWorker = window.Worker;
        window.Worker = function(scriptURL, options) {
          const resolved = resolveTarget(scriptURL);
          if (!resolved.startsWith('blob:')) {
            const shimmedWorkerCode = \`importScripts(\${JSON.stringify(resolved)});\`;
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
  doc.querySelectorAll("[crossorigin]").forEach(el => el.removeAttribute("crossorigin"));

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
        script.removeAttribute("src");
        script.textContent = scriptContent.replace(/<\/script/gi, "<\\/script");
      } else {
        script.setAttribute("src", absSrc);
      }
    }
  }));

  doc.querySelectorAll("script").forEach(script => {
    if (script.textContent) {
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

async function navigateTo(url, pushHistory = true) {
  url = unwrapRedirectUrl(url);
  if (!url) return;

  const navStartTime = performance.now();
  currentUrl = url;
  if (urlBar) urlBar.value = url;
  if (statusText) statusText.textContent = `0%`;
  updateRemainingDisplay(0);

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
      return navigateTo(resolvedRedirect, pushHistory);
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

async function navigateTo(url, pushHistory = true) {
  url = unwrapRedirectUrl(url);
  if (!url) return;

  const navStartTime = performance.now();
  currentUrl = url;
  if (urlBar) urlBar.value = url;
  if (statusText) statusText.textContent = `Fetching (${currentProfile})...`;

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
      return navigateTo(resolvedRedirect, pushHistory);
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
    } else {
      if (currentViewport && !currentViewport.hasAttribute("sandbox")) {
        const freshIframe = currentViewport.cloneNode(false);
        freshIframe.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-modals allow-downloads allow-popups allow-popups-to-escape-sandbox");
        freshIframe.setAttribute("allow", "clipboard-read; clipboard-write");
        currentViewport.replaceWith(freshIframe);
        currentViewport = freshIframe;
      }
      const html = new TextDecoder("utf-8").decode(buffer);
      const rewrittenHtml = await processAndRewriteHtml(html, finalUrl);
      const blob = new Blob([rewrittenHtml], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      if (currentViewport) {
        currentViewport.removeAttribute("srcdoc");
        currentViewport.dataset.blobUrl = blobUrl;
        currentViewport.src = blobUrl;
      }
    }

    if (statusText) statusText.textContent = `Ready (${currentProfile})`;
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

// Code editor
const codebox = document.getElementById("codebox");
const codeBlock = document.getElementById("codeBlock");
const lineNumbers = document.getElementById("lineNumbers");

const DEFAULT_HTML = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Title</title>\n<style>\n /* CSS goes here */\n</style>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n<script>\n  // JS goes here\n<\/script>\n</body>\n</html>';
const DEFAULT_PYTHON = 'print("Hello, World!")';

let currentLangValue = "language-html";
let isConsoleCollapsed = false;
let preEditorTheme = null;
let highlightTimeout = null;
let saveTimeout = null;
let lastLineCount = -1;

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
  const lineCount = codebox.value.split("\n").length;
  if (lineCount === lastLineCount) return;
  lastLineCount = lineCount;
  let arr = [];
  for (let i = 1; i <= lineCount; i++) arr.push(i);
  lineNumbers.textContent = arr.join("\n") + "\n";
}

function highlightJS() {
  document.querySelectorAll("#preCode code").forEach((el) => {
    hljs.highlightElement(el);
  });
}

function updateCode(immediateHighlight = false) {
  codeBlock.textContent = codebox.value;
  updateLineNumbers();

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem("savedCode_" + currentLangValue, codebox.value);
    } catch (e) {}
  }, 300);

  clearTimeout(highlightTimeout);
  if (immediateHighlight) highlightJS();
  else highlightTimeout = setTimeout(highlightJS, 150);
}

codebox.addEventListener("input", () => updateCode(false));

let isSyncingScroll = false;
codebox.addEventListener("scroll", () => {
  if (isSyncingScroll) return;
  isSyncingScroll = true;
  codeBlock.scrollTop = codebox.scrollTop;
  codeBlock.scrollLeft = codebox.scrollLeft;
  lineNumbers.scrollTop = codebox.scrollTop;
  requestAnimationFrame(() => { isSyncingScroll = false; });
});

codeBlock.addEventListener("scroll", () => {
  if (isSyncingScroll) return;
  isSyncingScroll = true;
  codebox.scrollTop = codeBlock.scrollTop;
  codebox.scrollLeft = codeBlock.scrollLeft;
  lineNumbers.scrollTop = codeBlock.scrollTop;
  requestAnimationFrame(() => { isSyncingScroll = false; });
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

function toggleHtmlConsole() {
  isConsoleCollapsed = !isConsoleCollapsed;
  setCookie("htmlConsoleCollapsed", isConsoleCollapsed, 30);
  applyConsoleCollapseState();
}

function applyConsoleCollapseState() {
  const preview = document.getElementById("preview-window");
  const htmlConsole = document.getElementById("htmlConsole");
  const toggleBtn = document.getElementById("toggleConsoleBtn");
  const isHtml = currentLangValue === "language-html";

  if (toggleBtn) {
    toggleBtn.textContent = isConsoleCollapsed ? "Show Console" : "Hide Console";
    toggleBtn.style.display = isHtml ? "inline-block" : "none";
  }

  if (isHtml) {
    if (isConsoleCollapsed) {
      if (htmlConsole) htmlConsole.style.display = "none";
      if (preview) preview.style.height = "100%";
    } else {
      if (htmlConsole) htmlConsole.style.display = "block";
      if (preview) preview.style.height = "calc(65% - 5px)";
    }
  }
}

function setupEditorPanels() {
  const preview = document.getElementById("preview-window");
  const rte = document.getElementById("rte");
  if (!preview || !preview.parentNode) return;

  const runBtn = document.querySelector("#html .html-btn");

  if (!document.getElementById("clearConsoleBtn")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearConsoleBtn";
    clearBtn.className = "html-btn";
    clearBtn.textContent = "Clear Console";
    clearBtn.style.cssText = "width: 18%; background: var(--theme); margin: 0 4px; cursor: pointer;";
    clearBtn.onclick = clearConsole;
    if (runBtn && runBtn.parentNode) runBtn.parentNode.insertBefore(clearBtn, runBtn.nextSibling);
  }

  if (!document.getElementById("toggleConsoleBtn")) {
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "toggleConsoleBtn";
    toggleBtn.className = "html-btn";
    toggleBtn.textContent = isConsoleCollapsed ? "Show Console" : "Hide Console";
    toggleBtn.style.cssText = "width: 18%; background: var(--theme); margin: 0 4px; cursor: pointer;";
    toggleBtn.onclick = toggleHtmlConsole;
    const clearBtn = document.getElementById("clearConsoleBtn");
    if (clearBtn && clearBtn.parentNode) clearBtn.parentNode.insertBefore(toggleBtn, clearBtn.nextSibling);
  }

  let wrapper = document.getElementById("editorOutputWrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "editorOutputWrapper";
    wrapper.style.cssText = "display: flex; flex-direction: column; width: calc(50% - 5px); height: 100%; margin-left: 5px; box-sizing: border-box;";
    preview.parentNode.insertBefore(wrapper, preview);
    wrapper.appendChild(preview);

    const htmlConsole = document.createElement("textarea");
    htmlConsole.id = "htmlConsole";
    htmlConsole.placeholder = "HTML Console output...";
    htmlConsole.readOnly = true;
    htmlConsole.spellcheck = false;
    htmlConsole.style.cssText = "display: block; width: 100%; height: 35%; margin-top: 5px; background: transparent; color: var(--theme); border: 2px solid var(--theme); font-family: inherit; font-size: 1vw; padding: 10px; outline: none; resize: none; overflow-y: auto; box-sizing: border-box;";
    wrapper.appendChild(htmlConsole);

    if (rte) {
      wrapper.appendChild(rte);
      rte.style.width = "100%";
      rte.style.height = "100%";
      rte.style.margin = "0";
    }

    preview.style.width = "100%";
    preview.style.height = "calc(65% - 5px)";
    preview.style.margin = "0";
  }

  applyConsoleCollapseState();
}

function updateEditorView() {
  setupEditorPanels();
  const selectElement = document.getElementById("selectLanguage");
  const selectedIndex = selectElement ? selectElement.selectedIndex : 0;
  const preview = document.getElementById("preview-window");
  const htmlConsole = document.getElementById("htmlConsole");
  const rte = document.getElementById("rte");

  if (selectedIndex === 0) {
    if (preview) preview.style.display = "block";
    if (rte) rte.style.display = "none";
    applyConsoleCollapseState();
  } else {
    if (preview) preview.style.display = "none";
    if (htmlConsole) htmlConsole.style.display = "none";
    if (rte) rte.style.display = "block";
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

  setupEditorPanels();
  updateEditorView();

  const savedData = localStorage.getItem("savedCode_" + currentLangValue);
  if (savedData !== null) codebox.value = savedData;
  else codebox.value = currentLangValue === "language-html" ? DEFAULT_HTML : DEFAULT_PYTHON;

  document.getElementById("codeBlock").className = currentLangValue;
  updateCode(true);
}

document.getElementById("selectLanguage").addEventListener("change", function() {
  try { localStorage.setItem("savedCode_" + currentLangValue, codebox.value); } catch (e) {}
  currentLangValue = this.value;
  setCookie("editorLanguage", currentLangValue, 30);
  document.getElementById("codeBlock").className = currentLangValue;
  updateEditorView();

  const savedContent = localStorage.getItem("savedCode_" + currentLangValue);
  if (savedContent !== null) codebox.value = savedContent;
  else codebox.value = currentLangValue === "language-html" ? DEFAULT_HTML : DEFAULT_PYTHON;

  lastLineCount = -1;
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

  activeTabId = id;
  renderTabs();

  if (targetTab.program === "proxy" || targetTab.program === "editor") applyCrt(false);
  else applyCrt(userCrtSetting);

  const outputEl = document.getElementById("stdout");
  if (outputEl) outputEl.innerHTML = targetTab.stdout || "";

  const proxyEl = document.getElementById("proxy");
  const htmlEl = document.getElementById("html");
  const terminalContent = document.getElementById("terminalContent");
  const cmdInput = document.getElementById("commandInput");

  if (targetTab.program === "proxy") {
    if (proxyEl) proxyEl.style.display = "flex";
    if (htmlEl) htmlEl.style.display = "none";
    if (terminalContent) terminalContent.style.display = "none";
    closeSide();
    return;
  }

  if (targetTab.program === "editor") {
    savePreEditorTheme();
    if (htmlEl) htmlEl.style.display = "block";
    if (proxyEl) proxyEl.style.display = "none";
    if (terminalContent) terminalContent.style.display = "none";
    closeSide();
    if (typeof initEditorIfNeeded === "function") initEditorIfNeeded();
    if (typeof setTheme === "function") setTheme();
    return;
  }

  if (proxyEl) proxyEl.style.display = "none";
  if (htmlEl) htmlEl.style.display = "none";
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
    tabs[0].program = "terminal";
    tabs[0].title = "terminal";
    tabs[0].stdout = "";
    switchTab(tabs[0].id);
    return;
  }

  const index = tabs.findIndex(t => t.id === id);
  tabs = tabs.filter(t => t.id !== id);

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
    curTab.program = progName;
    curTab.title = tabTitle || progName;
    switchTab(activeTabId);
  }
}

// Commands
var stdout = document.getElementById("stdout");
const input = document.getElementById("stdin");

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

function handleCommand(cmd) {
  let response = "";
  switch (cmd.toLowerCase()) {
    case "help":
      response = "List of available commands: games, youtube, radio, proxy, editor, theme, about, help, clear";
      break;
    case "about":
      response = `The TERMINAL is a repository of free games, proxies, and unblocked tools. All resources have been checked for malware.<br><br>
      Special thanks to the <a href="https://docs.google.com/document/d/1_FmH3BlSBQI7FGgAQL59-ZPe8eCxs35wel6JUyVaG8Q/edit?tab=t.0">Ultimate Game Stash</a> for providing the game files. All rights go to their respective owners.`;
      break;
    case "games": setProgramForActiveTab("games", "games"); return;
    case "youtube": setProgramForActiveTab("youtube", "youtube"); return;
    case "radio": setProgramForActiveTab("radio", "radio"); return;
    case "proxy": setProgramForActiveTab("proxy", "proxy"); return;
    case "editor": setProgramForActiveTab("editor", "editor"); return;
    case "theme": setProgramForActiveTab("themeSetting", "theme"); return;
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
    case "furries are cringe": response = "I agree"; break;
    case "clear": clearOutput(); return;
    default: response = `ERROR: Command not found: ${cmd}`;
  }
  appendOutput(`${response}<br>`);
}

document.body.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    setProgramForActiveTab("terminal", "terminal");
  }
});

function handleSearch() {
  const query = document.getElementById("fileSearch").value.toLowerCase();
  generateAllSections(query);
}

// Games
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
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

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

async function purgeHeresy(videos, query) {
  const expectedIds = videos.map(v => (v.id.videoId || v.id));
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  let templateStr = "[\n";
  for (let i = 0; i < videos.length; i++) {
    const vidId = videos[i].id.videoId || videos[i].id;
    templateStr += `  {"i":"${vidId}","c":"code"}${i < videos.length - 1 ? ',' : ''}\n`;
  }
  templateStr += "]";

  let metadataString = "\n";
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const vidId = v.id.videoId || v.id;
    const safeDesc = v.snippet.description 
      ? v.snippet.description.replace(/[\n\r"]/g, ' ').replace(/\\/g, '/').substring(0, 220) 
      : "";
    metadataString += `[${i + 1}] ID:${vidId} | CH:${v.snippet.channelTitle} | T:${v.snippet.title} | D:${safeDesc}\n`;
  }

  const parts = [{
    text: `PURPOSE: Audit videos for heresy. Return ONLY the compressed JSON code for each video.

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

TEMPLATE:
${templateStr}

METADATA LIST:
${metadataString}`
  }];

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const res = await fetch(`${API_GATEWAY}/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          contents: [{ parts }],
          safetySettings: safetySettings,
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
            responseSchema: {
              type: "ARRAY",
              description: `List of exactly ${videos.length} compressed evaluations.`,
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
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 1200));
          continue;
        }
        throw new Error("Rate limit");
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.usageMetadata) {
        totalInputTokens += data.usageMetadata.promptTokenCount || 0;
        totalOutputTokens += data.usageMetadata.candidatesTokenCount || 0;
      }

      if (data.candidates && data.candidates[0].finishReason === "SAFETY") {
        return {
          assessments: videos.map(v => ({ id: v.id.videoId || v.id, isSafe: false, classification: "Class IV-α Haeresis Veritas" })),
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

      const decodedAssessments = expectedIds.map((expectedId, idx) => {
        const item = compressedList.find(x => x.i === expectedId) || compressedList[idx] || {};
        const decoded = decodeCodex(item.c || "3a1");
        return {
          id: expectedId,
          isSafe: decoded.isSafe,
          classification: decoded.classification
        };
      });

      return { assessments: decodedAssessments, usage: { input: totalInputTokens, output: totalOutputTokens } };
    } catch (e) {
      if (attempts >= maxAttempts) {
        console.warn("Tsarevich batch failed, executing safe purge fallback:", e.message || e);
        return {
          assessments: videos.map(v => ({ id: v.id.videoId || v.id, isSafe: false, classification: "Class III-α Haereticus Primus" })),
          usage: { input: totalInputTokens, output: totalOutputTokens }
        };
      }
      await new Promise(r => setTimeout(r, 1000));
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
  sText.innerText = "1/2: Accessing databanks...";

  const startTime = performance.now();
  try {
    const ytRes = await fetch(`${API_GATEWAY}/api/youtube?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(8000)
    });
    const ytData = await ytRes.json();
    if (!ytData.items || ytData.items.length === 0) throw new Error("No records found");

    sText.innerText = `2/2: Assessing ${ytData.items.length} records...`;
    const responseData = await purgeHeresy(ytData.items, query);
    const latencySec = ((performance.now() - startTime) / 1000).toFixed(2);
    const assessmentMap = {};
    responseData.assessments.forEach(item => { assessmentMap[item.id] = item; });

    let finalUIItems = ytData.items.map(v => ({
      video: v,
      assessment: assessmentMap[v.id.videoId || v.id] || { isSafe: false, classification: "Class III-α Haereticus Primus" }
    }));
    finalUIItems = edictOfObliteration(finalUIItems);

    sText.className = "";
    const safeCount = finalUIItems.filter(item => item.assessment.isSafe).length;
    sText.innerText = `${safeCount} of ${ytData.items.length} deemed pure`;
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
    sText.style.color = "#ff4a4a";
    sText.innerText = "Error: " + err.message;
  } finally {
    searchBtn.disabled = false;
  }
}

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
  document.getElementById("fileSearch")?.focus();
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
