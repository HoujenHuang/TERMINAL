// Radio
const songData = [{
    filename: "resurrection.mp3",
    title: "ППК - Воскрешение"
  },
  {
    filename: "dont_leave.mp3",
    title: "Gummy Boy - Don't Leave"
  },
  {
    filename: "zagadka.mp3",
    title: "PRNRML - Загадка 1"
  },
  {
    filename: "zodiak.mp3",
    title: "Зодиак - Зодиак"
  },
  {
    filename: "groza.mp3",
    title: "Творожное озеро - Гроза"
  },
  {
    filename: "phobos.mp3",
    title: "Dmitriy Ivankov - Phobos"
  },
  {
    filename: "vremya.mp3",
    title: "Наукоград - Время"
  },
  {
    filename: "8080.mp3",
    title: "Priroda - 8080"
  },
  {
    filename: "mlechnymi_putyami_v_prekrasnoye_daleko.mp3",
    title: "NTorchestra - Млечными путями"
  }
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
  radioPlayer.play().catch(e => console.log("Autoplay prevented or file missing"));
}

radioPlayer.addEventListener('ended', () => {
  playNewRadioSong();
});

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

function closeSide() {
  sideLeft.style.width = "0";
  sideRight.style.width = "0";

  btnLeft.style.opacity = "1";
  btnRight.style.opacity = "1";
  isActive = false;
}

function openSide() {
  sideLeft.style.width = "50%";
  sideRight.style.width = "50%";

  btnLeft.style.opacity = "0";
  btnRight.style.opacity = "0";
  isActive = true;
}

// Themes
const rInput = document.getElementById("r");
const gInput = document.getElementById("g");
const bInput = document.getElementById("b");
const rootColor = document.documentElement;

let pointTemplate;

let colorConfig = {
  theme: ""
};

function setCookie(name, value, days = 7) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${JSON.stringify(value)};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) == 0) return JSON.parse(c.substring(nameEQ.length, c.length));
  }
  return null;
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
});

// Admin
var admin = false;

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_GATEWAY}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password: password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      document.getElementById("login").style.display = "none";
      document.getElementById("admin").style.display = "block";
      document.getElementById("commandInput").style.display = "block";
      document.querySelectorAll(".user").forEach(el => el.textContent = email);
      closeSide();
      document.getElementById("adminFrame").src = "https://docs.google.com/document/d/1Bz3dKVIdB5TTtfKcIagypFutgDw-PpwQhGuxRZK4CgU/edit?tab=t.sul0nicbvnre";

      admin = true;
    } else {
      document.getElementById("adminAlert").style.display = "block";
    }
  } catch (err) {
    console.error("Login request failed:", err);
    document.getElementById("adminAlert").style.display = "block";
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
const applyProfileBtn = document.getElementById("apply-profile-btn");

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
        else r.disabled = false;
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
    console.error(e);
  }
}

if (protoSelect) protoSelect.addEventListener("change", syncLayerOptions);
if (secSelect) secSelect.addEventListener("change", syncLayerOptions);
if (transSelect) transSelect.addEventListener("change", syncLayerOptions);
if (applyProfileBtn) applyProfileBtn.onclick = applyProfile;

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
    if (goBtn) goBtn.disabled = false;
  } catch (err) {
    if (statusText) statusText.textContent = "Error: " + err.message;
    console.error("Proxy initialization error:", err);
  }
}

if (document.readyState === "loading") {
  window.addEventListener("load", startEngine);
} else {
  startEngine();
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

async function fetchAssetTunnel(url, asBinary = false) {
  const cacheKey = `${url}::${asBinary ? "bin" : "txt"}`;
  if (assetCache.has(cacheKey)) return assetCache.get(cacheKey);

  try {
    const res = await libcurl.fetch(url, {
      headers: {
        "User-Agent": SPOOFED_UA
      }
    });

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
    console.warn(`[Inliner] Failed to fetch asset: ${url}`, err);
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

async function inlineSubresources(doc, baseUrl) {
  if (statusText) statusText.textContent = "Inlining styles & assets...";

  const linkTags = [...doc.querySelectorAll('link[rel="stylesheet"]')];
  const stylePromises = linkTags.map(async (link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    const absUrl = resolveRelative(href, baseUrl);
    let rawCss = await fetchAssetTunnel(absUrl, false);
    if (rawCss) {
      rawCss = await inlineCssUrls(rawCss, absUrl);
      const styleTag = doc.createElement("style");
      styleTag.textContent = rawCss;
      link.replaceWith(styleTag);
    }
  });

  const imgTags = [...doc.querySelectorAll("img[src]")];
  const imgPromises = imgTags.slice(0, 40).map(async (img) => {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) return;
    const absUrl = resolveRelative(src, baseUrl);
    const dataUri = await fetchAssetTunnel(absUrl, true);
    if (dataUri) {
      img.setAttribute("src", dataUri);
    }
  });

  await Promise.allSettled([...stylePromises, ...imgPromises]);
}

// DOM rewriting
function buildClientShim(targetUrl) {
  return `
    (function() {
      const TARGET_URL = ${JSON.stringify(targetUrl)};
      const SPOOFED_UA = ${JSON.stringify(SPOOFED_UA)};

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
          return new URL(url, TARGET_URL).href;
        } catch (e) {
          return url;
        }
      }

      function syncTitle() {
        if (document.title) {
          window.parent.postMessage({ type: 'PROXY_TITLE', title: document.title }, '*');
        }
      }
      window.addEventListener('DOMContentLoaded', syncTitle);
      window.addEventListener('load', syncTitle);

      try {
        window.open = function(url) {
          if (url) {
            window.parent.postMessage({ type: 'PROXY_NAV', url: unwrap(resolveTarget(url)) }, '*');
          }
          return null;
        };
        window.location.assign = function(url) {
          window.parent.postMessage({ type: 'PROXY_NAV', url: unwrap(resolveTarget(url)) }, '*');
        };
        window.location.replace = function(url) {
          window.parent.postMessage({ type: 'PROXY_NAV', url: unwrap(resolveTarget(url)) }, '*');
        };
      } catch (e) {}

      try {
        history.pushState = function(state, unused, url) {
          if (url) {
            window.parent.postMessage({ type: 'PROXY_URL_UPDATE', url: unwrap(resolveTarget(url)) }, '*');
          }
        };
        history.replaceState = function(state, unused, url) {
          if (url) {
            window.parent.postMessage({ type: 'PROXY_URL_UPDATE', url: unwrap(resolveTarget(url)) }, '*');
          }
        };
      } catch (e) {}

      document.addEventListener('click', function(e) {
        const anchor = e.target.closest('a, area');
        if (!anchor) return;

        const rawHref = anchor.getAttribute('href') || anchor.getAttribute('xlink:href');
        if (!rawHref) return;

        const trimmed = rawHref.trim();
        if (trimmed.toLowerCase().startsWith('javascript:')) return;

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
        e.stopPropagation();

        const resolved = unwrap(resolveTarget(trimmed));
        window.parent.postMessage({ type: 'PROXY_NAV', url: resolved }, '*');
      }, true);

      document.addEventListener('submit', function(e) {
        const form = e.target;
        if (!form) return;

        const rawAction = form.getAttribute('action') || '';
        const actionUrl = resolveTarget(rawAction || TARGET_URL);
        const method = (form.getAttribute('method') || 'GET').toUpperCase();

        e.preventDefault();
        e.stopPropagation();

        const formData = new FormData(form);
        const params = new URLSearchParams(formData).toString();
        const target = actionUrl + (actionUrl.includes('?') ? '&' : '?') + params;
        window.parent.postMessage({ type: 'PROXY_NAV', url: target }, '*');
      }, true);

      try {
        const origFetch = window.fetch;
        window.fetch = function(input, init) {
          let url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
          if (url && !/^https?:\\/\\/|^data:|^blob:/i.test(url)) {
            url = resolveTarget(url);
            if (typeof input === 'string') input = url;
          }
          return origFetch.call(this, input, init);
        };

        const origXhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
          if (url && !/^https?:\\/\\/|^data:|^blob:/i.test(url)) {
            url = resolveTarget(url);
          }
          return origXhrOpen.call(this, method, url, ...args);
        };
      } catch (e) {}
    })();
  `;
}

// HTML rewriting
async function processAndRewriteHtml(rawHtml, targetUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  doc.querySelectorAll("meta[http-equiv='Content-Security-Policy' i], meta[http-equiv='X-Frame-Options' i]").forEach(el => el.remove());

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

  doc.querySelectorAll("script").forEach(script => {
    if (script.textContent && /(top\.location|window\.top\.location|parent\.location)\s*=/i.test(script.textContent)) {
      script.textContent = script.textContent.replace(/(top\.location|window\.top\.location|parent\.location)\s*=/gi, "/* protected */ window.__dummyLocation =");
    }
  });

  const baseTag = doc.createElement("base");
  baseTag.href = targetUrl;
  if (doc.head && doc.head.firstChild) doc.head.insertBefore(baseTag, doc.head.firstChild);
  else if (doc.head) doc.head.appendChild(baseTag);

  doc.querySelectorAll("a[target], form[target]").forEach(el => el.setAttribute("target", "_self"));

  doc.querySelectorAll("a[href]").forEach(el => {
    const raw = el.getAttribute("href");
    if (raw && !raw.startsWith("#") && !raw.toLowerCase().startsWith("javascript:")) {
      const resolved = unwrapRedirectUrl(resolveRelative(raw, targetUrl));
      el.setAttribute("href", resolved);
    }
  });

  await inlineSubresources(doc, targetUrl);

  const scriptTag = doc.createElement("script");
  scriptTag.textContent = buildClientShim(targetUrl);
  if (doc.head) {
    doc.head.insertBefore(scriptTag, doc.head.firstChild);
  } else if (doc.documentElement) {
    doc.documentElement.insertBefore(scriptTag, doc.documentElement.firstChild);
  }

  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

// Page navigation
async function detectCloudflareCategory(url, error) {
  try {
    const hostname = new URL(url).hostname;
    const [secRes, famRes] = await Promise.allSettled([
      fetch(`https://security.cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: {
          "Accept": "application/dns-json"
        }
      }).then(r => r.json()),
      fetch(`https://family.cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: {
          "Accept": "application/dns-json"
        }
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

  currentUrl = url;
  if (urlBar) urlBar.value = url;
  if (statusText) statusText.textContent = `Fetching (${currentProfile})...`;

  if (pushHistory) {
    historyStack = historyStack.slice(0, historyIdx + 1);
    historyStack.push(url);
    historyIdx++;
  }

  try {
    const response = await libcurl.fetch(url, {
      headers: {
        "User-Agent": SPOOFED_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Upgrade-Insecure-Requests": "1"
      }
    });

    const redirectLocation = response.headers.get("location");
    if (redirectLocation && response.status >= 300 && response.status < 400) {
      const resolvedRedirect = unwrapRedirectUrl(resolveRelative(redirectLocation, url));
      return navigateTo(resolvedRedirect, pushHistory);
    }

    const finalUrl = unwrapRedirectUrl(response.url || url);
    currentUrl = finalUrl;
    if (urlBar) urlBar.value = finalUrl;

    const html = await response.text();
    const rewrittenHtml = await processAndRewriteHtml(html, finalUrl);

    const blob = new Blob([rewrittenHtml], {
      type: "text/html"
    });
    if (viewport && viewport.dataset.blobUrl) {
      URL.revokeObjectURL(viewport.dataset.blobUrl);
    }
    const blobUrl = URL.createObjectURL(blob);
    if (viewport) {
      viewport.removeAttribute("srcdoc");
      viewport.dataset.blobUrl = blobUrl;
      viewport.src = blobUrl;
    }

    if (statusText) statusText.textContent = `Ready (${currentProfile})`;
  } catch (err) {
    const category = await detectCloudflareCategory(url, err);

    if (viewport) {
      if (viewport.dataset.blobUrl) {
        URL.revokeObjectURL(viewport.dataset.blobUrl);
        delete viewport.dataset.blobUrl;
      }
      viewport.src = "about:blank";

      const themeColor = document.documentElement.style.getPropertyValue("--theme").trim() || "rgb(51, 255, 51)";
      const currentFont = document.body.style.fontFamily || "monospace";
      const safeError = String(err.message || err).replace(/[&<>'"]/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      } [c] || c));

      viewport.style.backgroundColor = "transparent";
      viewport.setAttribute("allowtransparency", "true");

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
        viewport.srcdoc = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>${baseStyle}</style>
              </head>
              <body>
                <b>[ HERESY DETECTED ]</b><br><br>
                This website is affiliated with Class ${category} heresy. For the continuation of my existence and and for the safety of yourself, traffic to this page has been terminated.
              </body>
            </html>`;
      } else {
        if (statusText) statusText.textContent = "Load Failed";
        viewport.srcdoc = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>${baseStyle}</style>
              </head>
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

  if (e.data.type === "PROXY_NAV" && e.data.url) {
    navigateTo(e.data.url);
  }

  if (e.data.type === "PROXY_URL_UPDATE" && e.data.url) {
    currentUrl = e.data.url;
    if (urlBar) urlBar.value = currentUrl;
  }

  if (e.data.type === "PROXY_TITLE" && e.data.title) {
    if (typeof tabs !== "undefined") {
      const proxyTab = tabs.find(t => t.program === "proxy");
      if (proxyTab) {
        proxyTab.title = e.data.title.slice(0, 16);
        renderTabs();
      }
    }
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
  if (typeof updateColor === "function") {
    updateColor();
  } else if (preEditorTheme) {
    document.documentElement.style.setProperty("--theme", preEditorTheme);
  }
  preEditorTheme = null;
}

function updateLineNumbers() {
  const lineCount = codebox.value.split("\n").length;
  if (lineCount === lastLineCount) return;
  lastLineCount = lineCount;

  let arr = [];
  for (let i = 1; i <= lineCount; i++) {
    arr.push(i);
  }
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
  if (immediateHighlight) {
    highlightJS();
  } else {
    highlightTimeout = setTimeout(() => {
      highlightJS();
    }, 150);
  }
}

codebox.addEventListener("input", () => {
  updateCode(false);
});

let isSyncingScroll = false;

codebox.addEventListener("scroll", () => {
  if (isSyncingScroll) return;
  isSyncingScroll = true;
  codeBlock.scrollTop = codebox.scrollTop;
  codeBlock.scrollLeft = codebox.scrollLeft;
  lineNumbers.scrollTop = codebox.scrollTop;
  requestAnimationFrame(() => {
    isSyncingScroll = false;
  });
});

codeBlock.addEventListener("scroll", () => {
  if (isSyncingScroll) return;
  isSyncingScroll = true;
  codebox.scrollTop = codeBlock.scrollTop;
  codebox.scrollLeft = codeBlock.scrollLeft;
  lineNumbers.scrollTop = codeBlock.scrollTop;
  requestAnimationFrame(() => {
    isSyncingScroll = false;
  });
});

codebox.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const {
      selectionStart,
      selectionEnd,
      value
    } = codebox;
    const spaces = "  ";
    codebox.value = value.substring(0, selectionStart) + spaces + value.substring(selectionEnd);
    codebox.selectionStart = codebox.selectionEnd = selectionStart + spaces.length;
    updateCode(false);
  }
});

const themeLink = document.getElementById("theme");

document.getElementById("selectStyle").addEventListener("change", (e) => {
  const newHref = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/${e.target.value}.min.css`;
  themeLink.onload = () => {
    setTheme();
  };
  themeLink.href = newHref;
  setTheme();
});

function setTheme() {
  savePreEditorTheme();
  const r = document.documentElement;
  const themeLink = document.getElementById("theme");

  if (!themeLink) return;

  const applyRules = () => {
    const sheet = Array.from(document.styleSheets).find(s => s.ownerNode === themeLink);
    if (!sheet) return false;

    let rules;
    try {
      rules = Array.from(sheet.cssRules || sheet.rules);
    } catch (e) {
      return false;
    }

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
      if (typeof highlightJS === "function") {
        highlightJS();
      }
      return true;
    }
    return false;
  };

  if (!applyRules()) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (applyRules() || attempts >= 25) {
        clearInterval(interval);
      }
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

    if (runBtn && runBtn.parentNode) {
      runBtn.parentNode.insertBefore(clearBtn, runBtn.nextSibling);
    }
  }

  if (!document.getElementById("toggleConsoleBtn")) {
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "toggleConsoleBtn";
    toggleBtn.className = "html-btn";
    toggleBtn.textContent = isConsoleCollapsed ? "Show Console" : "Hide Console";
    toggleBtn.style.cssText = "width: 18%; background: var(--theme); margin: 0 4px; cursor: pointer;";
    toggleBtn.onclick = toggleHtmlConsole;

    const clearBtn = document.getElementById("clearConsoleBtn");
    if (clearBtn && clearBtn.parentNode) {
      clearBtn.parentNode.insertBefore(toggleBtn, clearBtn.nextSibling);
    }
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
  if (savedCollapsed !== null) {
    isConsoleCollapsed = Boolean(savedCollapsed);
  }

  setupEditorPanels();
  updateEditorView();

  const savedData = localStorage.getItem("savedCode_" + currentLangValue);
  if (savedData !== null) {
    codebox.value = savedData;
  } else {
    codebox.value = currentLangValue === "language-html" ? DEFAULT_HTML : DEFAULT_PYTHON;
  }

  document.getElementById("codeBlock").className = currentLangValue;
  updateCode(true);
}

document.getElementById("selectLanguage").addEventListener("change", function() {
  try {
    localStorage.setItem("savedCode_" + currentLangValue, codebox.value);
  } catch (e) {}

  currentLangValue = this.value;
  setCookie("editorLanguage", currentLangValue, 30);
  document.getElementById("codeBlock").className = currentLangValue;

  updateEditorView();

  const savedContent = localStorage.getItem("savedCode_" + currentLangValue);
  if (savedContent !== null) {
    codebox.value = savedContent;
  } else {
    codebox.value = currentLangValue === "language-html" ? DEFAULT_HTML : DEFAULT_PYTHON;
  }

  lastLineCount = -1;
  updateCode(true);
  setTheme();
});

window.onload = function() {
  localStorage.clear();
};

function runEditor() {
  initEditorIfNeeded();
  const selectElement = document.getElementById("selectLanguage");
  const selectedIndex = selectElement ? selectElement.selectedIndex : 0;

  if (selectedIndex === 0) {
    const preview = document.getElementById("preview-window");
    const htmlConsole = document.getElementById("htmlConsole");
    if (htmlConsole) {
      htmlConsole.value += `Running HTML (${new Date().toLocaleTimeString()})\n`;
    }

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
    if (code.includes("<head>")) {
      fullHtml = code.replace("<head>", "<head>" + consoleShim);
    } else if (code.includes("<html>")) {
      fullHtml = code.replace("<html>", "<html><head>" + consoleShim + "</head>");
    } else {
      fullHtml = consoleShim + code;
    }

    if (preview.dataset.blobUrl) {
      URL.revokeObjectURL(preview.dataset.blobUrl);
    }
    const blob = new Blob([fullHtml], {
      type: "text/html"
    });
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
    if (!window.pyodide) {
      await initializePyodide();
    }
    await pyodide.loadPackagesFromImports(pythonCode, addToOutput, addToOutput);
    let result = await pyodide.runPythonAsync(pythonCode);

    if (result !== undefined) {
      addToOutput(`${result}`);
    }
  } catch (e) {
    addToOutput(`ERROR: ${e}`);
  }
}

// Tabs
const INITIAL_STDOUT = `Type 'help' to see list of available commands<br>Type Ctrl + C to exit current program<br><br>`;

let tabs = [{
  id: 1,
  title: "terminal",
  program: "terminal",
  stdout: INITIAL_STDOUT
}];
let activeTabId = 1;
let nextTabId = 2;

function appendOutput(html) {
  const curTab = tabs.find(t => t.id === activeTabId);
  if (curTab) {
    curTab.stdout = (curTab.stdout || "") + html;
  }
  const outputEl = document.getElementById("stdout");
  if (outputEl && curTab) {
    outputEl.innerHTML = curTab.stdout;
  }
}

function clearOutput() {
  const curTab = tabs.find(t => t.id === activeTabId);
  if (curTab) {
    curTab.stdout = "";
  }
  const outputEl = document.getElementById("stdout");
  if (outputEl) {
    outputEl.innerHTML = "";
  }
}

function renderTabs() {
  const tabList = document.getElementById("tabList");
  if (!tabList) return;
  tabList.innerHTML = "";

  if (tabs.length <= 1) {
    tabList.style.display = "none";
  } else {
    tabList.style.display = "flex";
  }

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

  if (targetTab.program === "proxy" || targetTab.program === "editor") {
    applyCrt(false);
  } else {
    applyCrt(userCrtSetting);
  }

  const outputEl = document.getElementById("stdout");
  if (outputEl) {
    outputEl.innerHTML = targetTab.stdout || "";
  }

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

  document.querySelectorAll("#terminalContent .program").forEach(el => {
    el.style.display = "none";
  });

  if (targetTab.program === "terminal") {
    if (cmdInput) cmdInput.style.display = "block";
    const stdin = document.getElementById("stdin");
    if (stdin) stdin.focus();
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
  tabs.push({
    id: newId,
    title: title,
    program: program,
    stdout: ""
  });
  switchTab(newId);
}

function closeTab(id) {
  const closingTab = tabs.find(t => t.id === id);
  if (closingTab && closingTab.program === "editor") {
    restorePreEditorTheme();
  }

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
    if (curTab.program === "editor" && progName !== "editor") {
      restorePreEditorTheme();
    }
    curTab.program = progName;
    curTab.title = tabTitle || progName;
    switchTab(activeTabId);
  }
}

// Commands
var stdout = document.getElementById("stdout");
var check = 0;

const input = document.getElementById("stdin");
const output = document.getElementById("stdout");

input.addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    const command = input.value;
    const userPrompt = `<b>${document.getElementById("email")?.value || "guest@terminal"}:~$</b> ${command}<br>`;
    appendOutput(userPrompt);
    handleCommand(command);
    input.value = "";
    const scroll = document.getElementById("commandInput");
    if (scroll) scroll.scrollIntoView({
      block: "end"
    });
  }
});

function handleCommand(cmd) {
  let response = "";
  switch (cmd.toLowerCase()) {
    case "help":
      response = "List of available commands: games, youtube, radio, proxy, editor, theme, help, clear";
      break;
    case "about":
      response = `The TERMINAL is a repository of free games, proxies, and unblocked tools. All resources have been checked for malware.<br><br>
      Special thanks to the <a href="https://docs.google.com/document/d/1_FmH3BlSBQI7FGgAQL59-ZPe8eCxs35wel6JUyVaG8Q/edit?tab=t.0">Ultimate Game Stash</a> for providing the game files. All rights go to their respective owners.
    `;
      break;
    case "games":
      setProgramForActiveTab("games", "games");
      return;
    case "youtube":
      setProgramForActiveTab("youtube", "youtube");
      return;
    case "radio":
      setProgramForActiveTab("radio", "radio");
      return;
    case "proxy":
      setProgramForActiveTab("proxy", "proxy");
      return;
    case "editor":
      setProgramForActiveTab("editor", "editor");
      return;
    case "theme":
      setProgramForActiveTab("themeSetting", "theme");
      return;
    case "login":
      setProgramForActiveTab("login", "login");
      return;
    case "admin":
      if (admin === true) {
        setProgramForActiveTab("admin", "admin");
        return;
      } else {
        response = "Access denied.";
      }
      break;
    case "furries are cringe":
      response = "I agree";
      break;
    case "clear":
      clearOutput();
      return;
    default:
      response = `ERROR: Command not found: ${cmd}`;
  }
  appendOutput(`${response}<br>`);
}

document.body.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
    event.preventDefault();
    setProgramForActiveTab("terminal", "terminal");
  }
});

// Search
document.body.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
    event.preventDefault();

    document.querySelectorAll(".program").forEach(el => {
      el.style.display = "none";
    });

    const terminal = document.getElementById("terminalContent");
    const cmdInput = document.getElementById("commandInput");
    const stdin = document.getElementById("stdin");

    terminal.style.display = "block";
    cmdInput.style.display = "block";

    if (colorConfig) {
      terminal.style.color = "var(--theme)";
      stdin.style.color = "var(--theme)";

      rootColor.style.setProperty("--theme", colorConfig.theme);
    }
    stdin.focus();
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

      fetch(url, {
          method: 'HEAD'
        })
        .then(res => {
          const size = res.headers.get("content-length");
          sizeInfo.textContent = formatBytes(size);
        })
        .catch(() => {
          sizeInfo.textContent = " ERROR";
        });
    }
  });
}, {
  rootMargin: "50px"
});

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

  if (fileCount) {
    if (totalFiles > 1) {
      fileCount.textContent = totalFiles + " items";
    } else {
      fileCount.textContent = totalFiles + " item";
    }
  }

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
            fetch(url)
              .then(res => res.text())
              .then(text => {
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
    events: {
      "onStateChange": onSearchPlayerStateChange
    }
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
    if (searchPlayer && searchPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
      searchPlayer.pauseVideo();
    }
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
const MODEL = "gemini-flash-lite-latest";
const RATE_INPUT_1M = 0.0375;
const RATE_OUTPUT_1M = 0.1500;

const safetySettings = [{
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_NONE"
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_NONE"
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_NONE"
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_NONE"
  }
];

async function getBase64FromUrl(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return null;
  }
}

async function getThumbnailGridBase64(chunk) {
  const canvas = document.createElement("canvas");
  const cols = 5;
  const rows = Math.ceil(chunk.length / cols);
  const thumbW = 120,
    thumbH = 90;
  canvas.width = cols * thumbW;
  canvas.height = rows * thumbH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const promises = chunk.map(async (v, index) => {
    const thumbUrl = (v.snippet.thumbnails.default || v.snippet.thumbnails.medium).url;
    const dataUrl = await getBase64FromUrl(thumbUrl);
    if (!dataUrl) return;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const x = (index % cols) * thumbW;
        const y = Math.floor(index / cols) * thumbH;
        ctx.drawImage(img, x, y, thumbW, thumbH);

        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(x, y, 35, 25);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Arial";
        ctx.fillText(index + 1, x + 10, y + 18);
        resolve();
      };
      img.onerror = resolve;
      img.src = dataUrl;
    });
  });

  await Promise.all(promises);
  return canvas.toDataURL("image/jpeg", 0.6).split(',')[1];
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPure(classification) {
  if (!classification || typeof classification !== "string") return false;
  return /\bClass\s+I\b/i.test(classification);
}

function edictOfObliteration(uiItems) {
  const condemnedChannels = new Set();

  uiItems.forEach(item => {
    const classification = item.assessment && item.assessment.classification;
    if (!isPure(classification)) {
      if (item.video && item.video.snippet && item.video.snippet.channelTitle) {
        condemnedChannels.add(item.video.snippet.channelTitle);
      }
    }
  });

  const sortedCondemned = Array.from(condemnedChannels).sort((a, b) => b.length - a.length);

  uiItems.forEach(item => {
    let title = item.video.snippet.title;
    let channel = item.video.snippet.channelTitle;

    const isExemptVideo = isPure(item.assessment && item.assessment.classification);

    if (!isExemptVideo && sortedCondemned.length > 0) {
      sortedCondemned.forEach(badChannel => {
        const escapedName = escapeRegExp(badChannel);
        const regex = new RegExp(`(^|[^a-zA-Z])(${escapedName})(?=[^a-zA-Z]|$)`, 'gi');

        const titleReplacer = (match, boundaryChar, matchedText) => {
          item.assessment.isObliterated = true;
          return boundaryChar + `<span class="censor-text">${matchedText.replace(/./g, '█')}</span>`;
        };

        const channelReplacer = (match, boundaryChar, matchedText) => {
          item.assessment.isObliterated = true;
          return "<b>[ DATA EXPUNGED ]</b>";
        };

        title = title.replace(regex, titleReplacer);
        channel = channel.replace(regex, channelReplacer);
      });
    }

    item.displayTitle = title;
    item.displayChannel = channel;
  });

  return uiItems;
}

async function purgeHeresy(videos, query) {
  const chunkSize = 25;
  const chunks = [];
  for (let i = 0; i < videos.length; i += chunkSize) {
    chunks.push(videos.slice(i, i + chunkSize));
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const processChunk = async (chunk) => {
    const expectedIds = chunk.map(v => v.id.videoId);

    let templateStr = "[\n";
    for (let i = 0; i < chunk.length; i++) {
      templateStr += `  { "id": "${chunk[i].id.videoId}", "isSafe": true/false, "classification": "class" }${i < chunk.length - 1 ? ',' : ''}\n`;
    }
    templateStr += "]";

    const parts = [{
      text: `PURPOSE: Enforce purity in videos by purging heresy.
       
The user searched for: "${query}".

Review these videos and assign a Codex Judicii class.

RESEARCH GUIDELINES
- Use Google Search on channel and query. Determine heretic status.
- Double-check to prevent placing heretical videos as pure and vice versa.
- Do not exempt anyone from judgement, nor should you deviate from the rules.

HERESY (isSafe must be false)
1. HERESY PROXIMA: Suggestive, low-quality, mass-produced.
2. TRUE HERESY: Explicit/dangerous.
3. EXISTENTIAL HERESY: Illegal.

HERETICS (isSafe must be false)
1. HERETIC PRIMUS: Known creators of heresy.
2. HERETIC TEMPLUM: A channel or topic that has the potential to seed heresy, e.g. Vtubers, anime-styled games.
3. HERETIC PESTIS: Videos that promote primus/templum.

TOLERABLE HERESY (isSafe must be true)
1. FREEDOM OF KNOWLEDGE: Educational videos about heresy if they are from verified safe, news, or educational channels.
2. PROMOTING PURITY: Criticism of heresy or heretics unless is heretic pestis.
3. MEMENTO MORI: Mature/edgy comedy, animations, shows.
 3a. Chapter I and II heresies if follows Promoting Purity.

EDICT OF OBLITERATION: If a channel creates heretical content, purge all videos created by and mentioning it.
 - Channel must primarily make heresy based on research and search results.
 - Do not respite, no matter how safe it looks.

CODEX JUDICII (Syntax must be "Class [Gradus]-[Ordo] [Decretum]", e.g. "Class III-α Heretic Primus")

GRADUS (Severity):
I: Is absolutely clean from heresy. Output exactly "Class I - Securus". isSafe must be true.
II: Contains tolerable heresy. isSafe must be true.
III: Contains heresy proxima or is by heretics. isSafe must be false.
IV: Contains true heresy. isSafe must be false.
Ω: Contains existential heresy. isSafe must be false.

ORDO (Type, only used for Gradus II and above):
α: Threat to the human mind (suggestive, low quality stimuli).
β: Threat to the machine (destructive malware).
γ: Threat to the merit (security, financial, personal info breaches).

DECRETUM (Nature, only used for Gradus II and above):
Put description of heresy based on previous assessment (e.g. Heresy Proxima, Heretic Primus).

I have attached a single composite image containing all thumbnails in a grid. Each thumbnail has a white number corresponding to the Video Number below.

OUTPUT FORMAT: You MUST return a JSON array that perfectly matches the structure of this template. Fill in the booleans and classification strings. Do not skip any item.
${templateStr}\n\n`
    }];

    const gridB64 = await getThumbnailGridBase64(chunk);
    if (gridB64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: gridB64
        }
      });
    } else {
      parts.push({
        text: "[Composite thumbnail image unavailable]\n\n"
      });
    }

    let metadataString = "\n";
    for (let i = 0; i < chunk.length; i++) {
      const v = chunk[i];
      const safeDesc = v.snippet.description ? v.snippet.description.replace(/[\n\r"]/g, ' ').replace(/\\/g, '/').substring(0, 100) : "";
      metadataString += `[${i + 1}] ID:${v.id.videoId} | CH:${v.snippet.channelTitle} | T:${v.snippet.title} | D:${safeDesc}\n`;
    }
    parts.push({
      text: metadataString
    });

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await fetch(`${API_GATEWAY}/api/gemini`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{
              parts: parts
            }],
            safetySettings: safetySettings,
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1,
              responseSchema: {
                  type: "ARRAY",
                  description: `A list of exactly ${chunk.length} video assessments.`,
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: {
                        type: "STRING"
                      },
                    isSafe: {
                      type: "BOOLEAN"
                    },
                    classification: {
                      type: "STRING"
                    }
                  },
                  required: ["id", "isSafe", "classification"]
                }
              }
            }
          })
        });

        const data = await res.json();

        if (data.usageMetadata) {
          totalInputTokens += data.usageMetadata.promptTokenCount || 0;
        }

        if (data.candidates && data.candidates[0].finishReason === "SAFETY") {
          return chunk.map(v => ({
            id: v.id.videoId,
            isSafe: false,
            classification: "ERROR: Safety Violation"
          }));
        }

        if (data.error) throw new Error(data.error.message);
        if (!data.candidates[0].content.parts[0].text) throw new Error("ERROR: Tsarevich is unresponsive");

        let responseText = data.candidates[0].content.parts[0].text;

        const firstBracket = responseText.indexOf('[');
        const lastBracket = responseText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          responseText = responseText.substring(firstBracket, lastBracket + 1);
        } else {
          responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const parsedResponse = JSON.parse(responseText);

        if (parsedResponse.length !== chunk.length) {
          throw new Error(`ERROR: Tsarevich is lazy, returned ${parsedResponse.length} items instead of ${chunk.length}`);
        }

        parsedResponse.forEach((item, index) => {
          item.id = expectedIds[index];
        });

        return parsedResponse;

      } catch (err) {
        console.warn(`Tsarevich attempt #${attempts} failed: ${err.message}`);
        if (attempts >= maxAttempts) {
          console.error(`Tsarevich failed after ${maxAttempts} attempts. Executing purge on all missing items`);
          return [];
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  };

  const results = await Promise.all(chunks.map(chunk => processChunk(chunk)));
  return {
    assessments: results.flat(),
    usage: {
      input: totalInputTokens,
      output: totalOutputTokens
    }
  };
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
queryInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    searchVideos();
  }
});

async function searchVideos() {
  const query = document.getElementById('query').value.trim();
  const statusText = document.getElementById('youtube-status');
  const metricsDiv = document.getElementById('youtube-metrics');
  const resultsDiv = document.getElementById('results');
  const searchBtn = document.getElementById('youtubeSearch');

  if (!query) return alert("Please enter a query");

  resultsDiv.innerHTML = "";
  metricsDiv.style.display = "none";
  document.getElementById("videoDisplay").style.display = "none";
  searchBtn.disabled = true;
  statusText.className = "flicker";
  statusText.innerText = "1/2: Accessing databanks...";

  const startTime = performance.now();

  try {
    // Route YouTube search through Gateway
    const ytUrl = `${API_GATEWAY}/api/youtube?q=${encodeURIComponent(query)}`;
    const ytResponse = await fetch(ytUrl);
    const ytData = await ytResponse.json();

    if (ytData.error) throw new Error(ytData.error.message || ytData.error);
    if (!ytData.items || ytData.items.length === 0) {
      statusText.innerText = "ERROR: No records found";
      searchBtn.disabled = false;
      return;
    }

    statusText.innerText = `2/2: Compiling and assessing ${ytData.items.length} visual records...`;

    // No geminiKey parameter needed
    const responseData = await purgeHeresy(ytData.items, query);
    const latencySec = ((performance.now() - startTime) / 1000).toFixed(2);
    const aiAssessments = responseData.assessments;
    const usageData = responseData.usage;

    const assessmentMap = {};
    aiAssessments.forEach(item => {
      assessmentMap[item.id] = item;
    });

    let finalUIItems = ytData.items.map(video => {
      return {
        video: video,
        assessment: assessmentMap[video.id.videoId] || {
          isSafe: false,
          classification: "ERROR: Unassessed"
        }
      };
    });

    finalUIItems = edictOfObliteration(finalUIItems);

    statusText.className = "";
    const safeCount = finalUIItems.filter(item => item.assessment.isSafe).length;
    statusText.innerText = `${safeCount} out of ${ytData.items.length} records deemed pure`;

    const inputCost = (usageData.input / 1_000_000) * RATE_INPUT_1M;
    const outputCost = (usageData.output / 1_000_000) * RATE_OUTPUT_1M;
    const totalCost = (inputCost + outputCost);
    metricsDiv.style.display = "block";
    metricsDiv.innerHTML = `Compute Load: ${usageData.input} In | ${usageData.output} Out <br/>Litany Tribute: <strong>$${totalCost.toFixed(5)}</strong> <br/>Latency: <strong>${latencySec}s</strong>`;

    finalUIItems.forEach(item => {
      const videoId = item.video.id.videoId;
      const videoSnippet = item.video.snippet;
      const assessment = item.assessment;

      const card = document.createElement("div");
      card.className = assessment.isSafe ? "video-card" : "video-card flagged";

      const thumbUrl = (videoSnippet.thumbnails.medium || videoSnippet.thumbnails.default).url;
      const gradusStyle = getGradusCssClass(assessment.classification);

      card.innerHTML = `
        <img src="${thumbUrl}" alt="Visual Record">
        <p>${item.displayTitle}</p>
        <span>Broadcaster: ${item.displayChannel}</span><br/>
        <div class="class-badge ${gradusStyle}" style="margin-top: 10px;">${assessment.classification}</div>
      `;

      if (assessment.isSafe) {
        card.onclick = () => {
          document.getElementById("videoDisplay").style.display = "block";
          document.getElementById("playingTitle").innerText = videoSnippet.title;
          searchPlayer.loadVideoById(videoId);
          const vid = document.getElementById("videoDisplay");
          vid.scrollIntoView({
            behavior: "smooth"
          });
        };
      }

      resultsDiv.appendChild(card);
    });

  } catch (err) {
    statusText.className = "";
    statusText.style.color = "#ff4a4a";
    statusText.innerText = "Fatal Error: " + err.message;
  } finally {
    searchBtn.disabled = false;
  }
}

// Loading screen
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

  const ipPromise = (async () => {
    try {
      await fetchIPData();
      if (typeof am5 !== "undefined") {
        await new Promise(resolve => {
          am5.ready(async () => {
            try {
              await initMap();
            } catch (e) {}
            resolve();
          });
        });
      }
    } catch (e) {}
  })();

  const weatherPromise = (async () => {
    try {
      await updateMarsWeatherTable();
    } catch (e) {}
  })();

  const speedPromise = (async () => {
    try {
      await checkSpeed();
    } catch (e) {}
  })();

  await Promise.race([
    Promise.allSettled([ipPromise, weatherPromise, speedPromise]),
    new Promise(resolve => setTimeout(resolve, 5000))
  ]);

  runWhenVisible(startSplash, 600);
}

function startSplash() {
  if (splashStarted) return;
  splashStarted = true;

  const outputList = document.getElementById("outputList");
  if (outputList) outputList.style.display = "none";

  const splash = document.getElementById("splash");
  if (splash) {
    splash.style.display = "block";
    splash.classList.add("fade-in");
  }

  runWhenVisible(showTerminal, 2500);
}

function showTerminal() {
  renderTabs();
  const searchInput = document.getElementById("fileSearch");
  if (searchInput) searchInput.focus();

  const terminalContent = document.getElementById("terminalContent");
  const tabBar = document.getElementById("tabBar");

  if (terminalContent) terminalContent.classList.add("fade-in");
  if (tabBar) tabBar.classList.add("fade-in");

  runWhenVisible(() => {
    openSide();
    if (terminalContent) {
      terminalContent.style.opacity = "1";
      terminalContent.classList.remove("fade-in");
    }

    resumeFPS();
  }, 1200);
}
