// Proxy
const WASM_URL = "https://cdn.jsdelivr.net/npm/libcurl.js@0.7.1/libcurl.wasm";

const SEARCH_ENGINE = "https://duckduckgo.com/html/?q=";
const SPOOFED_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function getWispHost() {
  const raw = (typeof window !== "undefined" && (window.WISP_URL || window.config?.API_GATEWAY || window.API_GATEWAY)) || "";
  return String(raw).trim().replace(/^(https?|wss?|wisps?):\/\//i, "").replace(/\/.*$/, "");
}

function getWispBaseHost() {
  const host = getWispHost();
  return host ? `wss://${host}/wisp/` : "";
}

function getApiGatewayUrl() {
  const raw = (typeof window !== "undefined" && (window.API_GATEWAY || window.config?.API_GATEWAY)) || "";
  const trimmed = String(raw).trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

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
const assetStatusCache = new Map();
const proxySources = new Map();

let activeProxyConsoleTab = "console";
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
  if (window.configReady) await window.configReady;

  const baseHost = getWispBaseHost();
  if (!baseHost) {
    if (statusText) statusText.textContent = "Config Unavailable";
    return;
  }
  const wispEndpoint = `${baseHost}?profile=${encodeURIComponent(currentProfile)}`;

  try {
    await libcurl.set_websocket(wispEndpoint);
    if (statusText) statusText.textContent = `Ready (${currentProfile})`;
    if (currentUrl) {
      clearProxySources();
      navigateTo(currentUrl, false);
    }
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
function hookLibcurlFetch() {
  if (typeof libcurl === "undefined" || typeof libcurl.fetch !== "function" || libcurl.__proxySourceHooked) return;
  const origFetch = libcurl.fetch.bind(libcurl);
  libcurl.fetch = async function(url, options) {
    try {
      const res = await origFetch(url, options);
      if (typeof recordProxySource === "function") {
        recordProxySource(url, res && typeof res.status === "number" ? res.status : "ERR");
      }
      return res;
    } catch (err) {
      if (typeof recordProxySource === "function") {
        recordProxySource(url, "ERR");
      }
      throw err;
    }
  };
  libcurl.__proxySourceHooked = true;
}

async function startEngine() {
  try {
    syncLayerOptions();
    if (typeof libcurl === "undefined") {
      throw new Error("libcurl.js script is missing or not yet loaded.");
    }

    if (statusText) statusText.textContent = "Loading WASM...";
    await Promise.all([
      libcurl.load_wasm(WASM_URL),
      window.configReady || Promise.resolve()
    ]);

    hookLibcurlFetch();

    const baseHost = getWispBaseHost();
    if (!baseHost) {
      throw new Error("Gateway configuration unavailable.");
    }

    if (statusText) statusText.textContent = `Connecting (${currentProfile})...`;
    await libcurl.set_websocket(`${baseHost}?profile=${encodeURIComponent(currentProfile)}`);

    if (statusText) statusText.textContent = `Ready (${currentProfile})`;
    const proxyServiceStatus = document.getElementById("proxy-service-status");
    if (proxyServiceStatus) proxyServiceStatus.textContent = "Wisp: ONLINE";
    if (goBtn) goBtn.disabled = false;
    if (typeof load === "function") load(`[ OK ] Proxy engine ready: ${currentProfile}`);
  } catch (err) {
    if (statusText) statusText.textContent = "Error: " + err.message;
    const proxyServiceStatus = document.getElementById("proxy-service-status");
    if (proxyServiceStatus) proxyServiceStatus.textContent = "Wisp: ERROR";
    if (typeof load === "function") load(`[ FAIL ] Proxy initialization error: ${err.message}`);
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

function unescapeJsStringLiteral(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    i++;
    if (i >= raw.length) break;
    const esc = raw[i];
    if (esc === "n") out += "\n";
    else if (esc === "r") out += "\r";
    else if (esc === "t") out += "\t";
    else if (esc === "b") out += "\b";
    else if (esc === "f") out += "\f";
    else if (esc === "v") out += "\v";
    else if (esc === "0" && (i + 1 >= raw.length || raw[i + 1] < "0" || raw[i + 1] > "9")) out += "\0";
    else if (esc === "x" && /^[0-9a-fA-F]{2}/.test(raw.slice(i + 1, i + 3))) {
      out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 3), 16));
      i += 2;
    } else if (esc === "u") {
      if (raw[i + 1] === "{") {
        const endBrace = raw.indexOf("}", i + 2);
        if (endBrace !== -1) {
          out += String.fromCodePoint(parseInt(raw.slice(i + 2, endBrace), 16));
          i = endBrace;
        } else {
          out += esc;
        }
      } else if (/^[0-9a-fA-F]{4}/.test(raw.slice(i + 1, i + 5))) {
        out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 5), 16));
        i += 4;
      } else {
        out += esc;
      }
    } else if (esc === "\r") {
      if (raw[i + 1] === "\n") i++;
    } else if (esc === "\n") {
      // line continuation
    } else {
      out += esc;
    }
  }
  return out;
}

function scanProxyScript(code, scriptUrl, resolveStatic = false) {
  if (!code || typeof code !== "string") return { chunks: [code || ""], deps: [] };
  const n = code.length;
  let i = 0;
  let lastCopy = 0;
  const chunks = [];
  const deps = [];
  const templateStack = [];
  const parenStack = [];
  let braceDepth = 0;
  let canStartRegex = true;
  let prevWord = "";

  const REGEX_PRE_WORDS = new Set([
    "return", "throw", "case", "delete", "void", "typeof",
    "in", "instanceof", "new", "await", "yield", "else", "do", "of"
  ]);
  const CONTROL_PAREN_WORDS = new Set(["if", "while", "for", "with"]);

  const isIdentStart = (c) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";
  const isIdentPart = (c) => isIdentStart(c) || (c >= "0" && c <= "9");

  function skipWsAndComments(pos) {
    while (pos < n) {
      const c = code[pos];
      if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === "\f" || c === "\v") {
        pos++;
      } else if (c === "/" && code[pos + 1] === "/") {
        pos += 2;
        while (pos < n && code[pos] !== "\r" && code[pos] !== "\n") pos++;
      } else if (c === "/" && code[pos + 1] === "*") {
        pos += 2;
        while (pos + 1 < n && !(code[pos] === "*" && code[pos + 1] === "/")) pos++;
        pos = pos + 1 < n ? pos + 2 : n;
      } else {
        break;
      }
    }
    return pos;
  }

  function readStringLiteral(pos) {
    const q = code[pos];
    let p = pos + 1;
    while (p < n) {
      const c = code[p];
      if (c === "\\") {
        p += (p + 1 < n && code[p + 1] === "\r" && code[p + 2] === "\n") ? 3 : 2;
      } else if (c === q) {
        return { end: p + 1, value: unescapeJsStringLiteral(code.slice(pos + 1, p)) };
      } else if (c === "\r" || c === "\n") {
        return null;
      } else {
        p++;
      }
    }
    return null;
  }

  function consumeTemplateTail(startPos) {
    let p = startPos;
    while (p < n) {
      const c = code[p];
      if (c === "\\") {
        p += 2;
      } else if (c === "`") {
        p++;
        canStartRegex = false;
        prevWord = "";
        return p;
      } else if (c === "$" && code[p + 1] === "{") {
        templateStack.push(braceDepth);
        braceDepth++;
        p += 2;
        canStartRegex = true;
        prevWord = "";
        return p;
      } else {
        p++;
      }
    }
    return n;
  }

  while (i < n) {
    const ch = code[i];

    if (ch === "/" && code[i + 1] === "/") {
      i += 2;
      while (i < n && code[i] !== "\r" && code[i] !== "\n") i++;
      continue;
    }

    if (ch === "/" && code[i + 1] === "*") {
      i += 2;
      while (i + 1 < n && !(code[i] === "*" && code[i + 1] === "/")) i++;
      i = i + 1 < n ? i + 2 : n;
      continue;
    }

    if (ch === "'" || ch === '"') {
      const q = ch;
      i++;
      while (i < n) {
        if (code[i] === "\\") i += 2;
        else if (code[i] === q) { i++; break; }
        else i++;
      }
      canStartRegex = false;
      prevWord = "";
      continue;
    }

    if (ch === "`") {
      i = consumeTemplateTail(i + 1);
      continue;
    }

    if (ch === "/" && canStartRegex) {
      i++;
      let inClass = false;
      while (i < n) {
        const rc = code[i];
        if (rc === "\\") {
          i += 2;
        } else if (rc === "[") {
          inClass = true;
          i++;
        } else if (rc === "]" && inClass) {
          inClass = false;
          i++;
        } else if (rc === "/" && !inClass) {
          i++;
          while (i < n && isIdentPart(code[i])) i++;
          break;
        } else if (rc === "\r" || rc === "\n") {
          break;
        } else {
          i++;
        }
      }
      canStartRegex = false;
      prevWord = "";
      continue;
    }

    if (ch === "}") {
      braceDepth--;
      if (templateStack.length > 0 && braceDepth === templateStack[templateStack.length - 1]) {
        templateStack.pop();
        i = consumeTemplateTail(i + 1);
        continue;
      }
      i++;
      canStartRegex = true;
      prevWord = "";
      continue;
    }

    if (ch === "{") {
      braceDepth++;
      i++;
      canStartRegex = true;
      prevWord = "";
      continue;
    }

    if (isIdentStart(ch)) {
      const startPos = i;
      let p = startPos - 1;
      while (p >= 0 && (code[p] === " " || code[p] === "\t" || code[p] === "\r" || code[p] === "\n")) p--;
      const afterDot = p >= 0 && code[p] === ".";

      i++;
      while (i < n && isIdentPart(code[i])) i++;
      const word = code.slice(startPos, i);

      if (!afterDot && scriptUrl) {
        if (word === "import") {
          const afterWs = skipWsAndComments(i);
          if (code[afterWs] === ".") {
            const p2 = skipWsAndComments(afterWs + 1);
            if (code.slice(p2, p2 + 4) === "meta" && !isIdentPart(code[p2 + 4] || "")) {
              const p3 = skipWsAndComments(p2 + 4);
              if (code[p3] === ".") {
                const p4 = skipWsAndComments(p3 + 1);
                if (code.slice(p4, p4 + 3) === "url" && !isIdentPart(code[p4 + 3] || "")) {
                  chunks.push(code.slice(lastCopy, startPos), JSON.stringify(scriptUrl));
                  i = p4 + 3;
                  lastCopy = i;
                  canStartRegex = false;
                  prevWord = "";
                  continue;
                }
                if (code.slice(p4, p4 + 7) === "resolve" && !isIdentPart(code[p4 + 7] || "")) {
                  const p5 = skipWsAndComments(p4 + 7);
                  if (code[p5] === "(") {
                    chunks.push(code.slice(lastCopy, startPos), "window.__proxyResolveModule(" + JSON.stringify(scriptUrl) + ",");
                    parenStack.push(false);
                    i = p5 + 1;
                    lastCopy = i;
                    canStartRegex = true;
                    prevWord = "";
                    continue;
                  }
                }
              }
            }
          } else if (code[afterWs] === "(") {
            let depth = 1;
            let scan = afterWs + 1;
            while (scan < n && depth > 0) {
              const sc = code[scan];
              if (sc === "'" || sc === '"') {
                scan++;
                while (scan < n) {
                  if (code[scan] === "\\") scan += 2;
                  else if (code[scan] === sc) { scan++; break; }
                  else scan++;
                }
              } else if (sc === "`") {
                scan++;
                let tplDepth = 0;
                while (scan < n) {
                  if (code[scan] === "\\") scan += 2;
                  else if (code[scan] === "$" && code[scan + 1] === "{") { tplDepth++; scan += 2; }
                  else if (code[scan] === "}" && tplDepth > 0) { tplDepth--; scan++; }
                  else if (code[scan] === "`" && tplDepth === 0) { scan++; break; }
                  else scan++;
                }
              } else if (sc === "(") {
                depth++;
                scan++;
              } else if (sc === ")") {
                depth--;
                scan++;
              } else {
                scan++;
              }
            }
            const afterParen = depth === 0 ? skipWsAndComments(scan) : n;
            if (code[afterParen] !== "{") {
              chunks.push(code.slice(lastCopy, startPos), "window.__proxyImport(" + JSON.stringify(scriptUrl) + ",");
              parenStack.push(false);
              i = afterWs + 1;
              lastCopy = i;
              canStartRegex = true;
              prevWord = "";
              continue;
            }
          } else if (resolveStatic && braceDepth === 0 && parenStack.length === 0 && (code[afterWs] === "'" || code[afterWs] === '"')) {
            const strInfo = readStringLiteral(afterWs);
            if (strInfo) {
              chunks.push(code.slice(lastCopy, afterWs), { depIdx: deps.length });
              deps.push(strInfo.value);
              i = strInfo.end;
              lastCopy = i;
              canStartRegex = false;
              prevWord = "";
              continue;
            }
          }
        } else if (resolveStatic && word === "from" && braceDepth === 0 && parenStack.length === 0) {
          const afterWs = skipWsAndComments(i);
          if (code[afterWs] === "'" || code[afterWs] === '"') {
            const strInfo = readStringLiteral(afterWs);
            if (strInfo) {
              chunks.push(code.slice(lastCopy, afterWs), { depIdx: deps.length });
              deps.push(strInfo.value);
              i = strInfo.end;
              lastCopy = i;
              canStartRegex = false;
              prevWord = "";
              continue;
            }
          }
        }
      }

      canStartRegex = !afterDot && REGEX_PRE_WORDS.has(word);
      prevWord = word;
      continue;
    }

    if (ch >= "0" && ch <= "9") {
      while (i < n && (isIdentPart(code[i]) || code[i] === ".")) i++;
      canStartRegex = false;
      prevWord = "";
      continue;
    }

    if (ch === "(") {
      parenStack.push(CONTROL_PAREN_WORDS.has(prevWord));
      canStartRegex = true;
      prevWord = "";
      i++;
      continue;
    }

    if (ch === ")") {
      canStartRegex = parenStack.length > 0 ? Boolean(parenStack.pop()) : false;
      prevWord = "";
      i++;
      continue;
    }

    if (ch === "]") {
      canStartRegex = false;
      prevWord = "";
      i++;
      continue;
    }

    if ((ch === "+" || ch === "-") && code[i + 1] === ch) {
      canStartRegex = false;
      prevWord = "";
      i += 2;
      continue;
    }

    if (";,[:?=!~+-*%<>&|^".includes(ch)) {
      canStartRegex = true;
      prevWord = "";
      i++;
      continue;
    }

    if (ch !== " " && ch !== "\t" && ch !== "\r" && ch !== "\n") {
      prevWord = "";
    }
    i++;
  }

  chunks.push(code.slice(lastCopy));
  return { chunks, deps };
}

function rewriteScriptCode(code, scriptUrl) {
  if (!code || typeof code !== 'string' || !scriptUrl) return code;
  try {
    const scriptBase = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
    const scanned = scanProxyScript(code, scriptUrl, false);
    code = scanned.chunks.join('');
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

// Subresource inlining
function switchProxyConsoleTab(tab) {
  activeProxyConsoleTab = tab === "sources" ? "sources" : "console";
  const consoleEl = document.getElementById("proxy-console");
  const sourcesEl = document.getElementById("proxy-sources");
  const consoleTab = document.getElementById("proxy-tab-console");
  const sourcesTab = document.getElementById("proxy-tab-sources");

  if (consoleEl) consoleEl.style.display = activeProxyConsoleTab === "console" ? "" : "none";
  if (sourcesEl) {
    sourcesEl.classList.toggle("invisible", activeProxyConsoleTab !== "sources");
    sourcesEl.style.display = activeProxyConsoleTab === "sources" ? "block" : "none";
  }
  if (consoleTab) consoleTab.classList.toggle("active", activeProxyConsoleTab === "console");
  if (sourcesTab) sourcesTab.classList.toggle("active", activeProxyConsoleTab === "sources");
}

function clearProxySources() {
  proxySources.clear();
  const sourcesEl = document.getElementById("proxy-sources");
  if (sourcesEl) sourcesEl.innerHTML = "";
}

function recordProxySource(url, status) {
  const urlStr = typeof url === "string" ? url : (url && url.url ? url.url : String(url || ""));
  if (!urlStr || urlStr.startsWith("data:") || /^blob:[^/]+\/\/[^/]+\/[0-9a-f-]{36}$/i.test(urlStr)) return;

  const statusTextVal = status === undefined || status === null || status === "" ? "ERR" : String(status);
  const sourcesEl = document.getElementById("proxy-sources");
  const existing = proxySources.get(urlStr);

  if (existing) {
    existing.status = statusTextVal;
    if (existing.statusEl) existing.statusEl.textContent = statusTextVal;
    return;
  }

  const entry = { status: statusTextVal, statusEl: null };
  proxySources.set(urlStr, entry);

  if (sourcesEl) {
    const row = document.createElement("div");
    row.className = "proxy-source-item";

    const statusSpan = document.createElement("span");
    statusSpan.className = "proxy-source-status";
    statusSpan.textContent = statusTextVal;

    const urlSpan = document.createElement("span");
    urlSpan.className = "proxy-source-url";
    urlSpan.textContent = urlStr;
    urlSpan.title = urlStr;

    row.appendChild(statusSpan);
    row.appendChild(urlSpan);
    sourcesEl.appendChild(row);
    entry.statusEl = statusSpan;
  }
}

function attachIframeSourceTracking() {
  if (!viewport) return;
  let win = null;
  let doc = null;
  try {
    win = viewport.contentWindow;
    doc = viewport.contentDocument || (win ? win.document : null);
  } catch (_) {
    return;
  }
  if (!win || !doc) return;

  const perfStatusMap = new Map();
  try {
    if (win.performance && typeof win.performance.getEntriesByType === "function") {
      const entries = win.performance.getEntriesByType("resource");
      for (const entry of entries) {
        if (!entry || !entry.name) continue;
        perfStatusMap.set(entry.name, entry.responseStatus || 0);
        if (entry.responseStatus > 0) {
          recordProxySource(entry.name, entry.responseStatus);
        }
      }
    }
  } catch (_) {}

  const normalizeResourceUrl = (rawAttr, resolved) => {
    if (!rawAttr || rawAttr.startsWith("data:") || rawAttr.startsWith("blob:")) return "";
    if (resolved && !resolved.startsWith("data:") && !resolved.startsWith("blob:")) return resolved;
    return currentUrl ? resolveRelative(rawAttr, currentUrl) : (resolved || rawAttr);
  };

  try {
    const resourceEls = doc.querySelectorAll("img[src], script[src], link[href], video[src], audio[src], source[src]");
    for (const el of resourceEls) {
      const tag = el.tagName.toUpperCase();
      const rawAttr = tag === "LINK" ? el.getAttribute("href") : el.getAttribute("src");
      const rawResolved = el.currentSrc || el.src || el.href || rawAttr;
      const resUrl = normalizeResourceUrl(rawAttr, rawResolved);
      if (!resUrl) continue;
      const perfStatus = perfStatusMap.get(rawResolved) || perfStatusMap.get(resUrl) || 0;
      if (tag === "IMG") {
        if (el.complete) {
          if (el.naturalWidth === 0) {
            recordProxySource(resUrl, perfStatus > 0 ? perfStatus : "ERR");
          } else {
            recordProxySource(resUrl, perfStatus > 0 ? perfStatus : 200);
          }
        }
      } else if (perfStatus > 0) {
        recordProxySource(resUrl, perfStatus);
      }
    }
  } catch (_) {}

  if (!doc.__proxySourceTracked) {
    doc.__proxySourceTracked = true;
    const getPerfStatus = (targetUrl) => {
      try {
        const matches = win.performance?.getEntriesByName?.(targetUrl, "resource");
        const last = matches && matches.length ? matches[matches.length - 1] : null;
        return last && last.responseStatus > 0 ? last.responseStatus : 0;
      } catch (_) {
        return 0;
      }
    };
    const onResourceEvent = (isError) => (ev) => {
      const t = ev.target;
      if (!t || !t.tagName) return;
      const tag = t.tagName.toUpperCase();
      if (!["IMG", "SCRIPT", "LINK", "VIDEO", "AUDIO", "SOURCE", "IFRAME"].includes(tag)) return;
      const rawAttr = tag === "LINK" ? t.getAttribute("href") : t.getAttribute("src");
      const rawResolved = t.currentSrc || t.src || t.href || rawAttr;
      const resUrl = normalizeResourceUrl(rawAttr, rawResolved);
      if (!resUrl) return;
      const perfStatus = getPerfStatus(rawResolved) || getPerfStatus(resUrl);
      if (isError) {
        recordProxySource(resUrl, perfStatus > 0 ? perfStatus : "ERR");
      } else {
        recordProxySource(resUrl, perfStatus > 0 ? perfStatus : 200);
      }
    };
    doc.addEventListener("load", onResourceEvent(false), true);
    doc.addEventListener("error", onResourceEvent(true), true);
  }

  if (!win.__proxyPerfObserved && typeof win.PerformanceObserver === "function") {
    try {
      win.__proxyPerfObserved = true;
      const obs = new win.PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry && entry.name && entry.responseStatus > 0) {
            recordProxySource(entry.name, entry.responseStatus);
          }
        }
      });
      obs.observe({ type: "resource", buffered: true });
    } catch (_) {}
  }
}

function initProxySourcesTracking() {
  if (navBar) {
    navBar.addEventListener("submit", clearProxySources);
  }
  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => {
      if (currentUrl) clearProxySources();
    });
  }
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (historyIdx > 0) clearProxySources();
    });
  }
  if (fwdBtn) {
    fwdBtn.addEventListener("click", () => {
      if (historyIdx < historyStack.length - 1) clearProxySources();
    });
  }
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "PROXY_NAV" && e.data.url) {
      clearProxySources();
    }
  });
  if (viewport) {
    viewport.addEventListener("load", attachIframeSourceTracking);
    const srcObserver = new MutationObserver(() => {
      waitForIframeDocument(viewport, viewport.dataset?.blobUrl || "").then(() => {
        attachIframeSourceTracking();
      });
    });
    srcObserver.observe(viewport, { attributes: true, attributeFilter: ["src"] });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProxySourcesTracking);
} else {
  initProxySourcesTracking();
}

function clearProxyConsole() {
  if (activeProxyConsoleTab === "sources") {
    clearProxySources();
    return;
  }
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
  if (assetCache.has(cacheKey)) {
    recordProxySource(url, assetStatusCache.get(cacheKey) ?? 200);
    return assetCache.get(cacheKey);
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
    if (res && typeof res.status === "number") {
      assetStatusCache.set(cacheKey, res.status);
    }

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

function rewriteCssRelativeUrls(cssText, baseUrl) {
  if (!cssText || typeof cssText !== "string") return cssText;
  return cssText.replace(/url\(\s*(?:'([^']*)'|"([^"]*)"|([^)'"\s]+))\s*\)/gi, (full, q1, q2, q3) => {
    const rawUrl = (q1 !== undefined ? q1 : (q2 !== undefined ? q2 : q3)) || "";
    if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:") || rawUrl.startsWith("#")) {
      return full;
    }
    return `url("${resolveRelative(rawUrl, baseUrl)}")`;
  });
}

async function resolveCssImports(cssText, baseUrl, depth = 0, seen = new Set()) {
  if (!cssText || depth > 3) return cssText;
  const importRegex = /@import\s+(?:url\(\s*(?:'([^']*)'|"([^"]*)"|([^)'"\s]+))\s*\)|'([^']*)'|"([^"]*)")\s*([^;]*);/gi;
  const matches = [...cssText.matchAll(importRegex)];
  if (matches.length === 0) return rewriteCssRelativeUrls(cssText, baseUrl);

  const replacements = await Promise.all(matches.map(async (m) => {
    const rawHref = m[1] || m[2] || m[3] || m[4] || m[5] || "";
    const mediaQuery = (m[6] || "").trim();
    if (!rawHref || rawHref.startsWith("data:")) return { full: m[0], replacement: m[0] };
    const absUrl = resolveRelative(rawHref, baseUrl);
    if (seen.has(absUrl)) return { full: m[0], replacement: "" };
    seen.add(absUrl);
    const importedCss = await fetchAssetTunnel(absUrl, false);
    if (!importedCss) return { full: m[0], replacement: m[0] };
    const resolvedInner = await resolveCssImports(importedCss, absUrl, depth + 1, seen);
    return {
      full: m[0],
      replacement: mediaQuery ? `@media ${mediaQuery} {\n${resolvedInner}\n}` : resolvedInner
    };
  }));

  for (const item of replacements) {
    cssText = cssText.replace(item.full, item.replacement);
  }
  return rewriteCssRelativeUrls(cssText, baseUrl);
}

async function inlineCssUrls(cssText, baseUrl) {
  if (!cssText || typeof cssText !== "string") return cssText;
  const urlRegex = /url\(\s*(?:'([^']*)'|"([^"]*)"|([^)'"\s]+))\s*\)/gi;
  const matches = [...cssText.matchAll(urlRegex)];
  const uniqueUrls = new Set();

  for (const match of matches) {
    const rawUrl = (match[1] !== undefined ? match[1] : (match[2] !== undefined ? match[2] : match[3])) || "";
    if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:") || rawUrl.startsWith("#")) continue;
    uniqueUrls.add(rawUrl);
  }

  if (uniqueUrls.size === 0) return cssText;

  const urlList = [...uniqueUrls];
  const resolvedMap = new Map();
  const CONCURRENCY = 6;
  let idx = 0;

  async function worker() {
    while (idx < urlList.length) {
      const rawUrl = urlList[idx++];
      const resolved = resolveRelative(rawUrl, baseUrl);
      const dataUri = await fetchAssetTunnel(resolved, true);
      if (dataUri) resolvedMap.set(rawUrl, dataUri);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urlList.length) }, worker));

  return cssText.replace(urlRegex, (full, q1, q2, q3) => {
    const rawUrl = (q1 !== undefined ? q1 : (q2 !== undefined ? q2 : q3)) || "";
    const dataUri = resolvedMap.get(rawUrl);
    return dataUri ? `url("${dataUri}")` : full;
  });
}

async function waitForIframeDocument(iframeTarget, expectedBlobUrl) {
  if (!iframeTarget) return null;
  for (let i = 0; i < 60; i++) {
    try {
      const win = iframeTarget.contentWindow;
      const liveDoc = iframeTarget.contentDocument || win?.document;
      if (liveDoc && liveDoc.readyState !== "uninitialized" && (!expectedBlobUrl || win?.location?.href === expectedBlobUrl)) {
        return liveDoc;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 25));
  }
  try {
    return iframeTarget.contentDocument || iframeTarget.contentWindow?.document || null;
  } catch (_) {
    return null;
  }
}

async function inlineSubresourcesSequentially(doc, baseUrl, iframeTarget) {
  const inlineCssToggleEl = document.getElementById("inlineCssToggle");
  const inlineCssEnabled = inlineCssToggleEl ? inlineCssToggleEl.textContent.includes("ON") : true;

  const linkTags = inlineCssEnabled ? [...doc.querySelectorAll('link[rel~="stylesheet" i]')] : [];
  const preInlinedStyles = inlineCssEnabled ? [...doc.querySelectorAll('style[data-proxy-style-id]')] : [];
  const imgTags = [...doc.querySelectorAll("img[src]")];
  const styledEls = inlineCssEnabled ? [...doc.querySelectorAll("[style]")].filter(el => /url\(/i.test(el.getAttribute("style") || "")) : [];
  const totalElements = linkTags.length + preInlinedStyles.length + imgTags.length + styledEls.length;
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

  const expectedBlobUrl = iframeTarget?.dataset?.blobUrl || "";

  for (const styleEl of preInlinedStyles) {
    const cssBase = styleEl.getAttribute("data-proxy-css-base") || baseUrl;
    const styleId = styleEl.getAttribute("data-proxy-style-id");
    const updatedCss = await inlineCssUrls(styleEl.textContent || "", cssBase);
    if (updatedCss && updatedCss !== styleEl.textContent) {
      styleEl.textContent = updatedCss;
      try {
        const liveDoc = await waitForIframeDocument(iframeTarget, expectedBlobUrl);
        if (liveDoc) {
          const liveStyle = liveDoc.querySelector(`style[data-proxy-style-id="${CSS.escape(styleId)}"]`);
          if (liveStyle) liveStyle.textContent = updatedCss;
        }
      } catch (_) {}
    }
    reportProgress();
  }

  for (const link of linkTags) {
    const href = link.getAttribute("href");
    if (!href) {
      reportProgress();
      continue;
    }
    const absUrl = resolveRelative(href, baseUrl);
    let rawCss = await fetchAssetTunnel(absUrl, false);
    if (rawCss) {
      rawCss = await resolveCssImports(rawCss, absUrl);
      rawCss = await inlineCssUrls(rawCss, absUrl);
      const styleTag = doc.createElement("style");
      styleTag.textContent = rawCss;
      link.replaceWith(styleTag);

      try {
        const liveDoc = await waitForIframeDocument(iframeTarget, expectedBlobUrl);
        if (liveDoc) {
          const liveLink = liveDoc.querySelector(`link[href="${CSS.escape(href)}"]`);
          const liveStyle = liveDoc.createElement("style");
          liveStyle.textContent = rawCss;
          if (liveLink) liveLink.replaceWith(liveStyle);
          else if (liveDoc.head || liveDoc.documentElement) (liveDoc.head || liveDoc.documentElement).appendChild(liveStyle);
        }
      } catch (_) {}
    }
    reportProgress();
  }

  let imgIdx = 0;
  const IMG_CONCURRENCY = 6;
  async function imgWorker() {
    while (imgIdx < imgTags.length) {
      const img = imgTags[imgIdx++];
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
        reportProgress();
        continue;
      }
      const absUrl = resolveRelative(src, baseUrl);
      const dataUri = await fetchAssetTunnel(absUrl, true);
      if (dataUri) {
        img.setAttribute("src", dataUri);
        img.removeAttribute("srcset");
        try {
          const liveDoc = await waitForIframeDocument(iframeTarget, expectedBlobUrl);
          if (liveDoc) {
            const liveImg = liveDoc.querySelector(`img[src="${CSS.escape(src)}"], img[data-proxied-src="${CSS.escape(absUrl)}"]`);
            if (liveImg) {
              liveImg.setAttribute("src", dataUri);
              liveImg.removeAttribute("srcset");
            }
          }
        } catch (_) {}
      }
      reportProgress();
    }
  }
  if (imgTags.length > 0) {
    await Promise.all(Array.from({ length: Math.min(IMG_CONCURRENCY, imgTags.length) }, imgWorker));
  }

  let styleIdx = 0;
  async function styleAttrWorker() {
    while (styleIdx < styledEls.length) {
      const el = styledEls[styleIdx++];
      const rawStyle = el.getAttribute("style") || "";
      const inlinedStyle = await inlineCssUrls(rawStyle, baseUrl);
      if (inlinedStyle && inlinedStyle !== rawStyle) {
        el.setAttribute("style", inlinedStyle);
        try {
          const liveDoc = await waitForIframeDocument(iframeTarget, expectedBlobUrl);
          if (liveDoc) {
            const liveEl = liveDoc.querySelector(`[style="${CSS.escape(rawStyle)}"]`);
            if (liveEl) liveEl.setAttribute("style", inlinedStyle);
          }
        } catch (_) {}
      }
      reportProgress();
    }
  }
  if (styledEls.length > 0) {
    await Promise.all(Array.from({ length: Math.min(IMG_CONCURRENCY, styledEls.length) }, styleAttrWorker));
  }

  updateRemainingDisplay(0);
}

function buildClientShim(targetUrl) {
  return `
    (function() {
      const TARGET_URL = ${JSON.stringify(targetUrl)};
      const SPOOFED_UA = ${JSON.stringify(SPOOFED_UA)};
      let parsedTarget = new URL(TARGET_URL);
      let currentTargetUrl = TARGET_URL;

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
        const memCaches = new Map();
        const makeCache = () => {
          const store = new Map();
          return {
            match: async (req) => {
              const k = typeof req === 'string' ? resolveTarget(req) : (req && req.url ? resolveTarget(req.url) : String(req));
              const hit = store.get(k);
              return hit ? hit.clone() : undefined;
            },
            put: async (req, res) => {
              const k = typeof req === 'string' ? resolveTarget(req) : (req && req.url ? resolveTarget(req.url) : String(req));
              if (res && typeof res.clone === 'function') store.set(k, res.clone());
            },
            add: async (req) => {
              const r = await window.fetch(req);
              const k = typeof req === 'string' ? resolveTarget(req) : (req && req.url ? resolveTarget(req.url) : String(req));
              store.set(k, r.clone());
            },
            addAll: async (reqs) => {
              const c = makeCache();
              return Promise.all(Array.from(reqs || []).map(r => c.add(r)));
            },
            delete: async (req) => {
              const k = typeof req === 'string' ? resolveTarget(req) : (req && req.url ? resolveTarget(req.url) : String(req));
              return store.delete(k);
            },
            keys: async () => Array.from(store.keys())
          };
        };
        const cacheStorageShim = {
          open: async (name) => {
            if (!memCaches.has(name)) memCaches.set(name, makeCache());
            return memCaches.get(name);
          },
          match: async (req) => {
            for (const c of memCaches.values()) {
              const m = await c.match(req);
              if (m) return m;
            }
            return undefined;
          },
          has: async (name) => memCaches.has(name),
          delete: async (name) => memCaches.delete(name),
          keys: async () => Array.from(memCaches.keys())
        };
        Object.defineProperty(window, 'caches', { value: cacheStorageShim, configurable: true });
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
          return origMatchMedia ? origMatchMedia.apply(window, arguments) : { matches: false, media: query };
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

      const __proxyCreatedBlobs = new Set();

      function isBlobObjectUrl(u) {
        if (!u) return false;
        const s = String(u).trim();
        return __proxyCreatedBlobs.has(s) || /^blob:(?:https?:\\/\\/[^/]+|null)\\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      }

      function resolveTarget(url) {
        if (!url) return "";
        try {
          let str = String(url).trim();
          if (str === window.location.href || str === TARGET_URL) return TARGET_URL;
          if (isBlobObjectUrl(str)) return str;
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
        return str.startsWith('data:') || str.startsWith('javascript:') || str.startsWith('#') || isBlobObjectUrl(str);
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

      ${unescapeJsStringLiteral.toString().replace(/<\/script/gi, "<\\/script")}
      ${scanProxyScript.toString().replace(/<\/script/gi, "<\\/script")}
      ${rewriteCssRelativeUrls.toString().replace(/<\/script/gi, "<\\/script")}

      function rewriteScriptCodeInShim(code, scriptUrl) {
        if (!code || typeof code !== 'string' || !scriptUrl) return code;
        try {
          const scriptBase = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
          const scanned = scanProxyScript(code, scriptUrl, false);
          code = scanned.chunks.join('');
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

      function updateVirtualLocation(nextUrl, fireHashChange) {
        try {
          const oldUrl = currentTargetUrl;
          const prevHash = parsedTarget.hash;
          const nextParsed = new URL(nextUrl, currentTargetUrl);
          parsedTarget = nextParsed;
          currentTargetUrl = nextParsed.href;
          window.parent.postMessage({ type: 'PROXY_URL_UPDATE', url: currentTargetUrl }, '*');
          if (fireHashChange && prevHash !== nextParsed.hash && typeof HashChangeEvent === 'function') {
            window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: oldUrl, newURL: currentTargetUrl }));
          }
        } catch (e) {}
      }

      const __proxyLocation = {
        get href() { return parsedTarget.href; },
        set href(val) {
          const resolved = unwrap(resolveTarget(val));
          if (resolved && resolved.split('#')[0] === currentTargetUrl.split('#')[0] && resolved.includes('#')) {
            updateVirtualLocation(resolved, true);
            return;
          }
          window.parent.postMessage({ type: 'PROXY_NAV', url: resolved }, '*');
        },
        get protocol() { return parsedTarget.protocol; },
        get host() { return parsedTarget.host; },
        get hostname() { return parsedTarget.hostname; },
        get port() { return parsedTarget.port; },
        get pathname() { return parsedTarget.pathname; },
        set pathname(val) {
          try {
            const u = new URL(currentTargetUrl);
            u.pathname = String(val || '');
            window.parent.postMessage({ type: 'PROXY_NAV', url: u.href }, '*');
          } catch (e) {}
        },
        get search() { return parsedTarget.search; },
        set search(val) {
          try {
            const u = new URL(currentTargetUrl);
            u.search = String(val || '');
            window.parent.postMessage({ type: 'PROXY_NAV', url: u.href }, '*');
          } catch (e) {}
        },
        get hash() { return parsedTarget.hash; },
        set hash(val) {
          try {
            const h = String(val || '');
            const u = new URL(currentTargetUrl);
            u.hash = h.startsWith('#') ? h : ('#' + h);
            updateVirtualLocation(u.href, true);
          } catch (e) {}
        },
        get origin() { return parsedTarget.origin; },
        assign: (url) => { __proxyLocation.href = url; },
        replace: (url) => { __proxyLocation.href = url; },
        reload: () => window.parent.postMessage({ type: 'PROXY_NAV', url: currentTargetUrl }, '*'),
        toString: () => currentTargetUrl
      };
      window.__proxyLocation = __proxyLocation;

      try {
        Object.defineProperty(document, 'baseURI', {
          get: () => TARGET_URL,
          configurable: true
        });
        Object.defineProperty(document, 'URL', {
          get: () => currentTargetUrl,
          configurable: true
        });
        Object.defineProperty(document, 'documentURI', {
          get: () => currentTargetUrl,
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

      const __proxyBlobMap = new Map();

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
            if ((safeUrl.startsWith('blob:') && !isBlobObjectUrl(safeUrl)) || safeUrl === window.location.href) {
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
                return { href: safeUrl, origin: '', protocol: '', host: '', hostname: '', port: '', pathname: safeUrl, search: '', hash: '', searchParams: new URLSearchParams(), toString: () => safeUrl, toJSON: () => safeUrl };
              }
            }
          }
        }
        ProxiedURL.prototype = OrigURL.prototype;

        ProxiedURL.createObjectURL = OrigURL.createObjectURL ? function(obj) {
          const b = OrigURL.createObjectURL.call(OrigURL, obj);
          __proxyCreatedBlobs.add(b);
          if (obj && typeof obj.text === 'function') {
            __proxyBlobMap.set(b, obj);
          }
          return b;
        } : undefined;
        ProxiedURL.revokeObjectURL = OrigURL.revokeObjectURL ? function(u) {
          const key = String(u || '');
          __proxyCreatedBlobs.delete(key);
          __proxyBlobMap.delete(key);
          return OrigURL.revokeObjectURL.call(OrigURL, u);
        } : undefined;

        ProxiedURL.canParse = OrigURL.canParse ? OrigURL.canParse.bind(OrigURL) : undefined;
        ProxiedURL.parse = OrigURL.parse ? OrigURL.parse.bind(OrigURL) : undefined;
        window.URL = ProxiedURL;
      } catch (e) {}

      try {
        const OrigRequest = window.Request;
        if (OrigRequest) {
          window.Request = function(input, init) {
            let nextInput = input;
            if (typeof nextInput === 'string' && !isInternalUrl(nextInput)) {
              nextInput = resolveTarget(nextInput);
            } else if (nextInput && typeof URL !== 'undefined' && nextInput instanceof URL) {
              nextInput = resolveTarget(nextInput.href);
            }
            if (init && typeof init === 'object' && init.referrer && /^https?:/i.test(String(init.referrer))) {
              const safeInit = Object.assign({}, init);
              delete safeInit.referrer;
              return new OrigRequest(nextInput, safeInit);
            }
            return new OrigRequest(nextInput, init);
          };
          window.Request.prototype = OrigRequest.prototype;
        }
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

      const moduleBlobCache = new Map();
      const inFlightTextFetches = new Map();
      const inFlightBlobs = new Map();
      const inFlightDeps = new Map();
      let cachedImportMap = null;

      function getImportMap() {
        if (cachedImportMap) return cachedImportMap;
        const merged = { imports: {}, scopes: {} };
        try {
          document.querySelectorAll('script[type="importmap"]').forEach(el => {
            if (!el.textContent) return;
            const parsed = JSON.parse(el.textContent);
            if (parsed && parsed.imports) Object.assign(merged.imports, parsed.imports);
            if (parsed && parsed.scopes) {
              Object.keys(parsed.scopes).forEach(scopeKey => {
                merged.scopes[scopeKey] = Object.assign(merged.scopes[scopeKey] || {}, parsed.scopes[scopeKey]);
              });
            }
          });
        } catch (e) {}
        cachedImportMap = merged;
        return merged;
      }

      function matchImportMapTable(specifier, table) {
        if (!table) return null;
        if (Object.prototype.hasOwnProperty.call(table, specifier)) {
          return table[specifier];
        }
        let bestPrefix = "";
        for (const key in table) {
          if (key.endsWith("/") && specifier.startsWith(key) && key.length > bestPrefix.length) {
            bestPrefix = key;
          }
        }
        if (bestPrefix) {
          return table[bestPrefix] + specifier.slice(bestPrefix.length);
        }
        return null;
      }

      function resolveModuleSpecifier(specifier, baseUrl) {
        const spec = String(specifier || "").trim();
        if (!spec) return baseUrl || TARGET_URL;
        if (spec.startsWith("blob:") || spec.startsWith("data:")) return spec;
        const base = baseUrl || TARGET_URL;
        try {
          const im = getImportMap();
          if (im.scopes) {
            let bestScope = "";
            for (const sKey in im.scopes) {
              const absScope = new URL(sKey, TARGET_URL).href;
              if (base.startsWith(absScope) && absScope.length > bestScope.length) {
                bestScope = absScope;
                const mapped = matchImportMapTable(spec, im.scopes[sKey]);
                if (mapped) return new URL(mapped, TARGET_URL).href;
              }
            }
          }
          const topMapped = matchImportMapTable(spec, im.imports);
          if (topMapped) return new URL(topMapped, TARGET_URL).href;
        } catch (e) {}
        try {
          return new URL(spec, base).href;
        } catch (e) {
          return resolveTarget(spec);
        }
      }

      function getHeaderVal(headers, name) {
        if (!headers) return "";
        const lower = name.toLowerCase();
        if (typeof headers.get === "function") return headers.get(name) || headers.get(lower) || "";
        if (Array.isArray(headers)) {
          const found = headers.find(([k]) => String(k).toLowerCase() === lower);
          return found ? found[1] : "";
        }
        if (typeof headers === "object") {
          for (const k of Object.keys(headers)) {
            if (k.toLowerCase() === lower) return headers[k];
          }
        }
        return "";
      }

      function fetchModuleResource(reqUrl) {
        if (inFlightTextFetches.has(reqUrl)) return inFlightTextFetches.get(reqUrl);
        const promise = (async () => {
          let curUrl = reqUrl;
          for (let hop = 0; hop < 6; hop++) {
            const res = await executeTunnelRequest(curUrl, {
              method: "GET",
              headers: {
                "User-Agent": SPOOFED_UA,
                "Accept": "*/*",
                "Referer": TARGET_URL
              }
            });
            const status = res && typeof res.status === "number" ? res.status : 200;
            if (status >= 300 && status < 400) {
              const loc = getHeaderVal(res.headers, "location");
              if (loc) {
                curUrl = new URL(loc, curUrl).href;
                continue;
              }
            }
            if (status >= 400) {
              throw new Error("Failed to fetch module: " + curUrl + " (HTTP " + status + ")");
            }
            const buf = await res.arrayBuffer();
            const contentType = getHeaderVal(res.headers, "content-type").toLowerCase();
            const finalUrl = res.url || curUrl;
            const isJson = contentType.includes("json") || finalUrl.split(/[?#]/)[0].toLowerCase().endsWith(".json");
            const code = isJson ? "" : new TextDecoder("utf-8").decode(buf);
            return { url: finalUrl, buf, code, isJson };
          }
          throw new Error("Too many redirects fetching module: " + reqUrl);
        })();
        inFlightTextFetches.set(reqUrl, promise);
        promise.finally(() => { inFlightTextFetches.delete(reqUrl); });
        return promise;
      }

      function wouldDeadlock(fromUrl, toUrl) {
        if (!fromUrl) return false;
        if (fromUrl === toUrl) return true;
        const visited = new Set();
        const queue = [toUrl];
        while (queue.length > 0) {
          const cur = queue.shift();
          if (cur === fromUrl) return true;
          if (visited.has(cur)) continue;
          visited.add(cur);
          const deps = inFlightDeps.get(cur);
          if (deps) deps.forEach(d => queue.push(d));
        }
        return false;
      }

      const workerModuleBlobCache = new Map();
      const workerInFlightBlobs = new Map();

      function buildWorkerShimHeader(workerUrl) {
        const wUrl = workerUrl || TARGET_URL;
        let wParsed = parsedTarget;
        try { wParsed = new URL(wUrl); } catch (_) {}
        return [
          'if (!self.__proxyWorkerShimmed) {',
          '  self.__proxyWorkerShimmed = true;',
          '  try { self.__webpack_public_path__ = ' + JSON.stringify(wUrl.substring(0, wUrl.lastIndexOf('/') + 1)) + '; } catch(e) {}',
          '  var __wUrl = ' + JSON.stringify(wUrl) + ';',
          '  self.__proxyLocation = {',
          '    href: __wUrl,',
          '    origin: ' + JSON.stringify(wParsed.origin) + ',',
          '    protocol: ' + JSON.stringify(wParsed.protocol) + ',',
          '    host: ' + JSON.stringify(wParsed.host) + ',',
          '    hostname: ' + JSON.stringify(wParsed.hostname) + ',',
          '    port: ' + JSON.stringify(wParsed.port) + ',',
          '    pathname: ' + JSON.stringify(wParsed.pathname) + ',',
          '    search: ' + JSON.stringify(wParsed.search) + ',',
          '    hash: ' + JSON.stringify(wParsed.hash) + ',',
          '    toString: function() { return __wUrl; }',
          '  };',
          '  var _OrigWURL = self.URL;',
          '  self.URL = function ProxiedWURL(u, b) {',
          '    if (!(this instanceof ProxiedWURL)) return new ProxiedWURL(u, b);',
          '    var sb = (typeof b === "string" && b.indexOf("blob:") === 0) ? __wUrl : (b || __wUrl);',
          '    var su = (typeof u === "string" && u.indexOf("blob:") === 0 && !new RegExp("^blob:(?:https?://[^/]+|null)/[0-9a-f-]{36}$", "i").test(u)) ? __wUrl : u;',
          '    try { return new _OrigWURL(su, sb); } catch (e1) { return new _OrigWURL(su, __wUrl); }',
          '  };',
          '  self.URL.prototype = _OrigWURL.prototype;',
          '  self.URL.createObjectURL = _OrigWURL.createObjectURL ? _OrigWURL.createObjectURL.bind(_OrigWURL) : undefined;',
          '  self.URL.revokeObjectURL = _OrigWURL.revokeObjectURL ? _OrigWURL.revokeObjectURL.bind(_OrigWURL) : undefined;',
          '  var _origWFetch = self.fetch;',
          '  var _pendingWFetch = new Map();',
          '  var _pendingWImport = new Map();',
          '  self.addEventListener("message", function(ev) {',
          '    if (!ev.data) return;',
          '    if (ev.data.__proxyWorkerFetchRes) {',
          '      ev.stopImmediatePropagation();',
          '      var pf = _pendingWFetch.get(ev.data.__proxyWorkerFetchRes);',
          '      if (pf) {',
          '        _pendingWFetch.delete(ev.data.__proxyWorkerFetchRes);',
          '        if (ev.data.error) pf.reject(new Error(ev.data.error));',
          '        else pf.resolve(new Response(ev.data.buf, { status: ev.data.status, statusText: ev.data.statusText, headers: new Headers(ev.data.headers || []) }));',
          '      }',
          '    } else if (ev.data.__proxyWorkerImportRes) {',
          '      ev.stopImmediatePropagation();',
          '      var pi = _pendingWImport.get(ev.data.__proxyWorkerImportRes);',
          '      if (pi) {',
          '        _pendingWImport.delete(ev.data.__proxyWorkerImportRes);',
          '        if (ev.data.error) pi.reject(new Error(ev.data.error));',
          '        else pi.resolve(ev.data.blobUrl);',
          '      }',
          '    }',
          '  }, true);',
          '  self.fetch = function(input, init) {',
          '    var u = typeof input === "string" ? input : (input && input.url ? input.url : String(input || ""));',
          '    if (!u || u.indexOf("data:") === 0 || u.indexOf("blob:") === 0) return _origWFetch.apply(self, arguments);',
          '    var abs = u;',
          '    try { abs = new _OrigWURL(u, __wUrl).href; } catch(e) {}',
          '    var id = Math.random().toString(36).slice(2) + Date.now();',
          '    return new Promise(function(resolve, reject) {',
          '      _pendingWFetch.set(id, { resolve: resolve, reject: reject });',
          '      self.postMessage({ __proxyWorkerFetch: id, url: abs, init: init ? { method: init.method, headers: init.headers, body: init.body } : {} });',
          '    });',
          '  };',
          '  if (self.Request) {',
          '    var _OrigWReq = self.Request;',
          '    self.Request = function(input, init) {',
          '      var nu = input;',
          '      if (typeof nu === "string" && nu.indexOf("data:") !== 0 && nu.indexOf("blob:") !== 0) {',
          '        try { nu = new _OrigWURL(nu, __wUrl).href; } catch(e) {}',
          '      }',
          '      if (init && typeof init === "object" && init.referrer && /^https?:/i.test(String(init.referrer))) {',
          '        var si = Object.assign({}, init); delete si.referrer;',
          '        return new _OrigWReq(nu, si);',
          '      }',
          '      return new _OrigWReq(nu, init);',
          '    };',
          '    self.Request.prototype = _OrigWReq.prototype;',
          '  }',
          '  self.__proxyResolveModule = function(baseUrl, spec) {',
          '    try { return new _OrigWURL(String(spec || ""), baseUrl || __wUrl).href; } catch(e) { return String(spec || ""); }',
          '  };',
          '  self.__proxyImport = function(baseUrl, spec, options) {',
          '    var resolved = self.__proxyResolveModule(baseUrl, spec);',
          '    if (resolved.indexOf("blob:") === 0 || resolved.indexOf("data:") === 0) {',
          '      return options !== undefined ? import(resolved, options) : import(resolved);',
          '    }',
          '    var id = Math.random().toString(36).slice(2) + Date.now();',
          '    return new Promise(function(resolve, reject) {',
          '      _pendingWImport.set(id, { resolve: resolve, reject: reject });',
          '      self.postMessage({ __proxyWorkerImport: id, url: resolved });',
          '    }).then(function(blobUrl) {',
          '      return options !== undefined ? import(blobUrl, options) : import(blobUrl);',
          '    });',
          '  };',
          '  self.addEventListener("error", function(ev) {',
          '    try { self.postMessage({ __proxyWorkerError: ev.message || (ev.error && ev.error.message) || "Worker error" }); } catch(e) {}',
          '  });',
          '  self.addEventListener("unhandledrejection", function(ev) {',
          '    try { self.postMessage({ __proxyWorkerError: "Unhandled rejection: " + (ev.reason ? (ev.reason.message || ev.reason) : "") }); } catch(e) {}',
          '  });',
          '}'
        ].join('\\n') + '\\n';
      }

      async function loadModuleCodeAsBlob(rawCode, moduleUrl, isJson, rawBuf, cycleOwnerUrl, isWorker = false) {
        if (isJson) {
          const jsonBlob = new Blob([rawBuf], { type: "application/json" });
          return URL.createObjectURL(jsonBlob);
        }
        const scanned = scanProxyScript(rawCode, moduleUrl, true);
        let depUrls = [];
        if (scanned.deps.length > 0) {
          const resolvedDeps = scanned.deps.map(spec => resolveModuleSpecifier(spec, moduleUrl));
          if (cycleOwnerUrl) {
            let depSet = inFlightDeps.get(cycleOwnerUrl);
            if (!depSet) {
              depSet = new Set();
              inFlightDeps.set(cycleOwnerUrl, depSet);
            }
            resolvedDeps.forEach(d => depSet.add(d));
          }
          depUrls = await Promise.all(resolvedDeps.map(depUrl => {
            if (depUrl.startsWith("blob:") || depUrl.startsWith("data:")) return Promise.resolve(depUrl);
            if (cycleOwnerUrl && wouldDeadlock(cycleOwnerUrl, depUrl)) {
              return Promise.resolve(depUrl);
            }
            return loadModuleAsBlob(depUrl, cycleOwnerUrl, isWorker);
          }));
        }
        let rewritten = isWorker ? buildWorkerShimHeader(moduleUrl) : "";
        for (let idx = 0; idx < scanned.chunks.length; idx++) {
          const part = scanned.chunks[idx];
          if (typeof part === "string") {
            let cleanPart = sanitizeCode(part);
            if (isWorker) {
              cleanPart = cleanPart
                .replace(/\\bwindow\\.__proxyImport\\(/g, "self.__proxyImport(")
                .replace(/\\bwindow\\.__proxyResolveModule\\(/g, "self.__proxyResolveModule(");
            }
            rewritten += cleanPart;
          } else {
            rewritten += JSON.stringify(depUrls[part.depIdx]);
          }
        }
        const modBlob = new Blob([rewritten], { type: "application/javascript" });
        return URL.createObjectURL(modBlob);
      }

      async function loadModuleAsBlob(moduleUrl, waiterUrl, isWorker = false) {
        if (moduleUrl.startsWith("blob:") || moduleUrl.startsWith("data:")) return moduleUrl;
        const cache = isWorker ? workerModuleBlobCache : moduleBlobCache;
        const flight = isWorker ? workerInFlightBlobs : inFlightBlobs;
        if (cache.has(moduleUrl)) return cache.get(moduleUrl);
        if (flight.has(moduleUrl) && !wouldDeadlock(waiterUrl, moduleUrl)) {
          return await flight.get(moduleUrl);
        }
        const buildPromise = (async () => {
          const resource = await fetchModuleResource(moduleUrl);
          const finalUrl = resource.url || moduleUrl;
          if (finalUrl !== moduleUrl && cache.has(finalUrl)) {
            const cached = cache.get(finalUrl);
            cache.set(moduleUrl, cached);
            return cached;
          }
          const blobUrl = await loadModuleCodeAsBlob(resource.code, finalUrl, resource.isJson, resource.buf, moduleUrl, isWorker);
          cache.set(moduleUrl, blobUrl);
          cache.set(finalUrl, blobUrl);
          return blobUrl;
        })();
        if (!flight.has(moduleUrl)) {
          flight.set(moduleUrl, buildPromise);
        }
        try {
          return await buildPromise;
        } finally {
          if (flight.get(moduleUrl) === buildPromise) flight.delete(moduleUrl);
          inFlightDeps.delete(moduleUrl);
        }
      }

      window.__proxyResolveModule = resolveModuleSpecifier;
      window.__proxyImport = async function(baseUrl, specifier, options) {
        const resolved = resolveModuleSpecifier(specifier, baseUrl);
        if (resolved.startsWith("blob:") || resolved.startsWith("data:")) {
          return options !== undefined ? import(resolved, options) : import(resolved);
        }
        const blobUrl = await loadModuleAsBlob(resolved, null);
        return options !== undefined ? import(blobUrl, options) : import(blobUrl);
      };
      window.__proxyRunModule = async function(rawCode, moduleUrl) {
        const blobUrl = await loadModuleCodeAsBlob(rawCode, moduleUrl || TARGET_URL, false, null, null);
        return import(blobUrl);
      };
      window.__proxyPreloadModule = function(url) {
        if (!url || url.startsWith("blob:") || url.startsWith("data:")) return Promise.resolve();
        return loadModuleAsBlob(url, null).catch(() => {});
      };

      const __proxyAssetBlobCache = new Map();

      function inferAssetMime(url, contentType) {
        const ct = String(contentType || '').split(';')[0].trim().toLowerCase();
        if (ct && ct !== 'application/octet-stream' && ct !== 'binary/octet-stream') return ct;
        const clean = String(url || '').split(/[?#]/)[0].toLowerCase();
        if (clean.endsWith('.webp')) return 'image/webp';
        if (clean.endsWith('.png')) return 'image/png';
        if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
        if (clean.endsWith('.gif')) return 'image/gif';
        if (clean.endsWith('.svg')) return 'image/svg+xml';
        if (clean.endsWith('.avif')) return 'image/avif';
        if (clean.endsWith('.ico')) return 'image/x-icon';
        if (clean.endsWith('.bmp')) return 'image/bmp';
        if (clean.endsWith('.woff2')) return 'font/woff2';
        if (clean.endsWith('.woff')) return 'font/woff';
        if (clean.endsWith('.ttf')) return 'font/ttf';
        if (clean.endsWith('.otf')) return 'font/otf';
        return 'application/octet-stream';
      }

      function fetchAssetAsBlobUrl(absUrl) {
        const key = String(absUrl || '').trim();
        if (!key) return Promise.reject(new Error('Empty asset URL'));
        if (__proxyAssetBlobCache.has(key)) return __proxyAssetBlobCache.get(key);

        const p = (async () => {
          let curUrl = key;
          for (let hop = 0; hop < 6; hop++) {
            const res = await executeTunnelRequest(curUrl, {
              method: 'GET',
              headers: {
                'User-Agent': SPOOFED_UA,
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': TARGET_URL
              }
            });
            const status = res && typeof res.status === 'number' ? res.status : 200;
            if (status >= 300 && status < 400) {
              const loc = getHeaderVal(res.headers, 'location');
              if (loc) {
                curUrl = resolveTarget(new URL(loc, curUrl).href);
                continue;
              }
            }
            if (status >= 400) {
              throw new Error('Asset HTTP ' + status + ': ' + curUrl);
            }
            const buf = await res.arrayBuffer();
            const mime = inferAssetMime(res.url || curUrl, getHeaderVal(res.headers, 'content-type'));
            const blob = new Blob([buf], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            __proxyCreatedBlobs.add(blobUrl);
            return blobUrl;
          }
          throw new Error('Too many redirects: ' + key);
        })().catch((err) => {
          __proxyAssetBlobCache.delete(key);
          throw err;
        });

        __proxyAssetBlobCache.set(key, p);
        return p;
      }

      const CSS_URL_RE = /url\\(\\s*(?:'([^']*)'|"([^"]*)"|([^)'"\\s]+))\\s*\\)/gi;

      function hasExternalCssUrl(text) {
        if (!text || typeof text !== 'string' || !text.includes('url(')) return false;
        CSS_URL_RE.lastIndex = 0;
        let m;
        while ((m = CSS_URL_RE.exec(text)) !== null) {
          const raw = (m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3])) || '';
          if (raw && !isInternalUrl(raw)) return true;
        }
        return false;
      }

      function neutralizeExternalCssUrls(text) {
        if (!text || typeof text !== 'string') return text;
        return text.replace(CSS_URL_RE, (full, q1, q2, q3) => {
          const raw = (q1 !== undefined ? q1 : (q2 !== undefined ? q2 : q3)) || '';
          if (!raw || isInternalUrl(raw)) return full;
          return 'url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")';
        });
      }

      async function inlineCssUrlsInShim(cssText, baseUrl) {
        if (!cssText || typeof cssText !== 'string' || !cssText.includes('url(')) return cssText;
        const matches = [...cssText.matchAll(CSS_URL_RE)];
        const uniqueMap = new Map();
        const resolveBase = baseUrl || TARGET_URL;

        for (const m of matches) {
          const raw = (m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3])) || '';
          if (!raw || isInternalUrl(raw) || uniqueMap.has(raw)) continue;
          let absUrl = '';
          try {
            absUrl = new URL(raw, resolveBase).href;
          } catch (_) {
            absUrl = resolveTarget(raw);
          }
          uniqueMap.set(raw, absUrl);
        }

        if (uniqueMap.size === 0) return cssText;

        const blobMap = new Map();
        await Promise.allSettled([...uniqueMap.entries()].map(async ([raw, absUrl]) => {
          const blobUrl = await fetchAssetAsBlobUrl(absUrl);
          if (blobUrl) blobMap.set(raw, blobUrl);
        }));

        return cssText.replace(CSS_URL_RE, (full, q1, q2, q3) => {
          const raw = (q1 !== undefined ? q1 : (q2 !== undefined ? q2 : q3)) || '';
          const blobUrl = blobMap.get(raw);
          return blobUrl ? 'url("' + blobUrl + '")' : full;
        });
      }

      function parseSrcsetCandidates(srcsetStr) {
        const out = [];
        const parts = String(srcsetStr || '').split(/,(?=\\s*\\S+(?:\\s+[^,]+)?$)|,(?=\\s*(?:https?:|data:|blob:|\\/|\\.))/i);
        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;
          const sp = trimmed.search(/\\s/);
          if (sp === -1) out.push({ url: trimmed, desc: '' });
          else out.push({ url: trimmed.slice(0, sp), desc: trimmed.slice(sp) });
        }
        return out;
      }

      async function rewriteSrcsetInShim(srcsetStr, baseUrl) {
        const candidates = parseSrcsetCandidates(srcsetStr);
        if (candidates.length === 0) return srcsetStr;
        const resolved = await Promise.all(candidates.map(async (c) => {
          if (!c.url || isInternalUrl(c.url)) return c.url + c.desc;
          let absUrl = '';
          try {
            absUrl = new URL(c.url, baseUrl || TARGET_URL).href;
          } catch (_) {
            absUrl = resolveTarget(c.url);
          }
          try {
            const blobUrl = await fetchAssetAsBlobUrl(absUrl);
            return blobUrl + c.desc;
          } catch (_) {
            return '';
          }
        }));
        return resolved.filter(Boolean).join(', ');
      }

      const origCreateElement = document.createElement.bind(document);
      const origSetAttribute = Element.prototype.setAttribute;
      const origSetAttributeNS = Element.prototype.setAttributeNS;
      const origGetAttribute = Element.prototype.getAttribute;
      const origRemoveAttribute = Element.prototype.removeAttribute;

      const origImgSrcDesc = typeof HTMLImageElement !== 'undefined' ? Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src') : null;
      const origImgSrcsetDesc = typeof HTMLImageElement !== 'undefined' ? Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'srcset') : null;
      const origSourceSrcsetDesc = typeof HTMLSourceElement !== 'undefined' ? Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype, 'srcset') : null;
      const origSourceSrcDesc = typeof HTMLSourceElement !== 'undefined' ? Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype, 'src') : null;

      const __proxyImgPendingPromise = new WeakMap();
      const origImgCompleteDesc = typeof HTMLImageElement !== 'undefined' ? Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete') : null;
      const origImgDecode = typeof HTMLImageElement !== 'undefined' ? HTMLImageElement.prototype.decode : null;

      function loadProxiedImgSrc(img, val) {
        if (!origImgSrcDesc || !origImgSrcDesc.set) return;
        const str = val === null || val === undefined ? '' : String(val).trim();
        if (!str) {
          __proxyImgPendingPromise.delete(img);
          origRemoveAttribute.call(img, 'data-proxied-src');
          origImgSrcDesc.set.call(img, '');
          return;
        }
        if (isInternalUrl(str)) {
          __proxyImgPendingPromise.delete(img);
          origRemoveAttribute.call(img, 'data-proxied-src');
          origImgSrcDesc.set.call(img, str);
          return;
        }
        const realSrc = resolveTarget(str);
        origSetAttribute.call(img, 'data-proxied-src', realSrc);
        origRemoveAttribute.call(img, 'src');
        const tok = (img.__imgReqToken = (img.__imgReqToken || 0) + 1);
        const pendingP = fetchAssetAsBlobUrl(realSrc).then((blobUrl) => {
          if (img.__imgReqToken !== tok) return;
          __proxyImgPendingPromise.delete(img);
          origImgSrcDesc.set.call(img, blobUrl);
          origSetAttribute.call(img, 'data-proxied-loaded', '1');
          origRemoveAttribute.call(img, 'srcset');
        }).catch(() => {
          if (img.__imgReqToken !== tok) return;
          __proxyImgPendingPromise.delete(img);
          img.dispatchEvent(new Event('error'));
          if (typeof img.onerror === 'function') {
            try { img.onerror(new Event('error')); } catch (_) {}
          }
        });
        __proxyImgPendingPromise.set(img, pendingP);
      }

      function loadProxiedImgSrcset(img, val) {
        if (!val) {
          if (origImgSrcsetDesc && origImgSrcsetDesc.set) origImgSrcsetDesc.set.call(img, val || '');
          return;
        }
        const str = String(val).trim();
        if (isInternalUrl(str)) {
          if (origImgSrcsetDesc && origImgSrcsetDesc.set) origImgSrcsetDesc.set.call(img, str);
          return;
        }
        origSetAttribute.call(img, 'data-orig-srcset', str);
        const candidates = parseSrcsetCandidates(str);
        if (candidates.length > 0 && !origGetAttribute.call(img, 'data-proxied-src') && !origGetAttribute.call(img, 'src')) {
          loadProxiedImgSrc(img, candidates[0].url);
          return;
        }
        const tok = (img.__srcsetReqToken = (img.__srcsetReqToken || 0) + 1);
        rewriteSrcsetInShim(str, TARGET_URL).then((rewritten) => {
          if (img.__srcsetReqToken !== tok || !rewritten) return;
          if (origImgSrcsetDesc && origImgSrcsetDesc.set) origImgSrcsetDesc.set.call(img, rewritten);
        }).catch(() => {});
      }

      function loadProxiedSourceEl(sourceEl, prop, val) {
        const str = val === null || val === undefined ? '' : String(val).trim();
        if (!str || isInternalUrl(str)) {
          if (prop === 'srcset' && origSourceSrcsetDesc && origSourceSrcsetDesc.set) origSourceSrcsetDesc.set.call(sourceEl, str);
          else if (prop === 'src' && origSourceSrcDesc && origSourceSrcDesc.set) origSourceSrcDesc.set.call(sourceEl, str);
          return;
        }
        if (prop === 'srcset') {
          origSetAttribute.call(sourceEl, 'data-orig-srcset', str);
          const tok = (sourceEl.__srcsetReqToken = (sourceEl.__srcsetReqToken || 0) + 1);
          rewriteSrcsetInShim(str, TARGET_URL).then((rewritten) => {
            if (sourceEl.__srcsetReqToken !== tok || !rewritten) return;
            if (origSourceSrcsetDesc && origSourceSrcsetDesc.set) origSourceSrcsetDesc.set.call(sourceEl, rewritten);
          }).catch(() => {});
        } else if (prop === 'src') {
          const realSrc = resolveTarget(str);
          origSetAttribute.call(sourceEl, 'data-proxied-src', realSrc);
          const tok = (sourceEl.__srcReqToken = (sourceEl.__srcReqToken || 0) + 1);
          fetchAssetAsBlobUrl(realSrc).then((blobUrl) => {
            if (sourceEl.__srcReqToken !== tok) return;
            if (origSourceSrcDesc && origSourceSrcDesc.set) origSourceSrcDesc.set.call(sourceEl, blobUrl);
          }).catch(() => {});
        }
      }

      function loadProxiedSvgImage(svgImg, attrName, val, ns) {
        const str = val === null || val === undefined ? '' : String(val).trim();
        if (!str || isInternalUrl(str)) {
          if (ns) origSetAttributeNS.call(svgImg, ns, attrName, str);
          else origSetAttribute.call(svgImg, attrName, str);
          return;
        }
        const realHref = resolveTarget(str);
        origSetAttribute.call(svgImg, 'data-proxied-href', realHref);
        const tok = (svgImg.__svgImgToken = (svgImg.__svgImgToken || 0) + 1);
        fetchAssetAsBlobUrl(realHref).then((blobUrl) => {
          if (svgImg.__svgImgToken !== tok) return;
          if (ns) origSetAttributeNS.call(svgImg, ns, attrName, blobUrl);
          else origSetAttribute.call(svgImg, attrName, blobUrl);
        }).catch(() => {
          if (svgImg.__svgImgToken !== tok) return;
          svgImg.dispatchEvent(new Event('error'));
        });
      }

      function splitCssDeclsWithUrls(styleStr) {
        const out = [];
        let cur = '';
        let paren = 0;
        let quote = null;
        for (let i = 0; i < styleStr.length; i++) {
          const ch = styleStr[i];
          if (quote) {
            cur += ch;
            if (ch === '\\\\' && i + 1 < styleStr.length) {
              i++;
              cur += styleStr[i];
            } else if (ch === quote) {
              quote = null;
            }
          } else if (ch === "'" || ch === '"') {
            quote = ch;
            cur += ch;
          } else if (ch === '(') {
            paren++;
            cur += ch;
          } else if (ch === ')' && paren > 0) {
            paren--;
            cur += ch;
          } else if (ch === ';' && paren === 0) {
            const d = cur.trim();
            if (d) out.push(d);
            cur = '';
          } else {
            cur += ch;
          }
        }
        const tail = cur.trim();
        if (tail) out.push(tail);
        return out;
      }

      const styleTokenCounter = new WeakMap();
      const origCssSetProperty = CSSStyleDeclaration.prototype.setProperty;

      function applyStyleWithTunnel(styleDecl, propKey, rawVal, applyFn) {
        const valStr = rawVal === null || rawVal === undefined ? '' : String(rawVal);
        if (!hasExternalCssUrl(valStr)) {
          applyFn(valStr);
          return;
        }
        let tokMap = styleTokenCounter.get(styleDecl);
        if (!tokMap) {
          tokMap = new Map();
          styleTokenCounter.set(styleDecl, tokMap);
        }
        const tok = (tokMap.get(propKey) || 0) + 1;
        tokMap.set(propKey, tok);
        applyFn(neutralizeExternalCssUrls(valStr));
        inlineCssUrlsInShim(valStr, TARGET_URL).then((inlined) => {
          if (tokMap.get(propKey) !== tok) return;
          applyFn(inlined);
        }).catch(() => {});
      }

      function patchStyleUrlsOnly(styleDecl, rawStyleStr) {
        const decls = splitCssDeclsWithUrls(rawStyleStr);
        for (const decl of decls) {
          const colonIdx = decl.indexOf(':');
          if (colonIdx <= 0) continue;
          const rawProp = decl.slice(0, colonIdx).trim();
          const prop = rawProp.startsWith('--') ? rawProp : rawProp.toLowerCase();
          const valRaw = decl.slice(colonIdx + 1).trim();
          if (!hasExternalCssUrl(valRaw)) continue;
          const isImp = /\\s*!important\\s*$/i.test(valRaw);
          const cleanVal = isImp ? valRaw.replace(/\\s*!important\\s*$/i, '').trim() : valRaw;
          const priority = isImp ? 'important' : '';
          applyStyleWithTunnel(styleDecl, prop, cleanVal, (v) => {
            origCssSetProperty.call(styleDecl, prop, v, priority);
          });
        }
      }

      function applyInlineStyleTextProxied(el, styleStr) {
        if (!hasExternalCssUrl(styleStr)) {
          origSetAttribute.call(el, 'style', styleStr);
          return;
        }
        origSetAttribute.call(el, 'style', neutralizeExternalCssUrls(styleStr));
        patchStyleUrlsOnly(el.style, styleStr);
      }

      if (origImgSrcDesc && origImgSrcDesc.configurable !== false) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
          get: function() {
            return origGetAttribute.call(this, 'data-proxied-src') || (origImgSrcDesc.get ? origImgSrcDesc.get.call(this) : '');
          },
          set: function(val) {
            loadProxiedImgSrc(this, val);
          },
          configurable: true
        });
      }

      if (origImgCompleteDesc && origImgCompleteDesc.configurable !== false) {
        Object.defineProperty(HTMLImageElement.prototype, 'complete', {
          get: function() {
            if (__proxyImgPendingPromise.has(this)) return false;
            return origImgCompleteDesc.get ? origImgCompleteDesc.get.call(this) : true;
          },
          configurable: true
        });
      }

      if (origImgDecode) {
        HTMLImageElement.prototype.decode = async function() {
          const pending = __proxyImgPendingPromise.get(this);
          if (pending) {
            await pending.catch(() => {});
          }
          return await origImgDecode.call(this);
        };
      }

      Element.prototype.getAttribute = function(name) {
        const lname = name ? String(name).toLowerCase() : '';
        if (typeof HTMLImageElement !== 'undefined' && this instanceof HTMLImageElement && lname === 'src') {
          const real = origGetAttribute.call(this, 'src');
          if (real) return real;
          const proxied = origGetAttribute.call(this, 'data-proxied-src');
          if (proxied) return proxied;
        }
        return origGetAttribute.call(this, name);
      };

      const origHasAttribute = Element.prototype.hasAttribute;
      Element.prototype.hasAttribute = function(name) {
        const lname = name ? String(name).toLowerCase() : '';
        if (typeof HTMLImageElement !== 'undefined' && this instanceof HTMLImageElement && lname === 'src') {
          if (origHasAttribute.call(this, 'src') || origHasAttribute.call(this, 'data-proxied-src')) return true;
        }
        return origHasAttribute.call(this, name);
      };

      if (origImgSrcsetDesc && origImgSrcsetDesc.configurable !== false) {
        Object.defineProperty(HTMLImageElement.prototype, 'srcset', {
          get: function() {
            return origGetAttribute.call(this, 'data-orig-srcset') || (origImgSrcsetDesc.get ? origImgSrcsetDesc.get.call(this) : '');
          },
          set: function(val) {
            loadProxiedImgSrcset(this, val);
          },
          configurable: true
        });
      }

      if (origSourceSrcsetDesc && origSourceSrcsetDesc.configurable !== false) {
        Object.defineProperty(HTMLSourceElement.prototype, 'srcset', {
          get: function() {
            return origGetAttribute.call(this, 'data-orig-srcset') || (origSourceSrcsetDesc.get ? origSourceSrcsetDesc.get.call(this) : '');
          },
          set: function(val) {
            loadProxiedSourceEl(this, 'srcset', val);
          },
          configurable: true
        });
      }

      if (origSourceSrcDesc && origSourceSrcDesc.configurable !== false) {
        Object.defineProperty(HTMLSourceElement.prototype, 'src', {
          get: function() {
            return origGetAttribute.call(this, 'data-proxied-src') || (origSourceSrcDesc.get ? origSourceSrcDesc.get.call(this) : '');
          },
          set: function(val) {
            loadProxiedSourceEl(this, 'src', val);
          },
          configurable: true
        });
      }

      Element.prototype.setAttribute = function(name, val) {
        const lname = name ? String(name).toLowerCase() : '';
        if (typeof HTMLImageElement !== 'undefined' && this instanceof HTMLImageElement) {
          if (lname === 'src') { loadProxiedImgSrc(this, val); return; }
          if (lname === 'srcset') { loadProxiedImgSrcset(this, val); return; }
        } else if (typeof HTMLSourceElement !== 'undefined' && this instanceof HTMLSourceElement) {
          if (lname === 'srcset') { loadProxiedSourceEl(this, 'srcset', val); return; }
          if (lname === 'src') { loadProxiedSourceEl(this, 'src', val); return; }
        } else if (typeof SVGImageElement !== 'undefined' && this instanceof SVGImageElement) {
          if (lname === 'href' || lname === 'xlink:href') { loadProxiedSvgImage(this, name, val, null); return; }
        }
        if (lname === 'style' && typeof val === 'string' && hasExternalCssUrl(val)) {
          applyInlineStyleTextProxied(this, val);
          return;
        }
        origSetAttribute.call(this, name, val);
      };

      Element.prototype.setAttributeNS = function(ns, name, val) {
        const lname = name ? String(name).toLowerCase() : '';
        if (typeof SVGImageElement !== 'undefined' && this instanceof SVGImageElement) {
          if (lname === 'href' || lname.endsWith(':href')) {
            loadProxiedSvgImage(this, name, val, ns);
            return;
          }
        }
        origSetAttributeNS.call(this, ns, name, val);
      };

      try {
        const styleProto = CSSStyleDeclaration.prototype;
        const origCssTextDesc = Object.getOwnPropertyDescriptor(styleProto, 'cssText');

        styleProto.setProperty = function(prop, val, priority) {
          applyStyleWithTunnel(this, String(prop || '').toLowerCase(), val, (v) => {
            origCssSetProperty.call(this, prop, v, priority);
          });
        };

        if (origCssTextDesc && origCssTextDesc.configurable !== false) {
          Object.defineProperty(styleProto, 'cssText', {
            get: function() { return origCssTextDesc.get.call(this); },
            set: function(val) {
              const valStr = val === null || val === undefined ? '' : String(val);
              if (!hasExternalCssUrl(valStr)) {
                origCssTextDesc.set.call(this, valStr);
                return;
              }
              origCssTextDesc.set.call(this, neutralizeExternalCssUrls(valStr));
              patchStyleUrlsOnly(this, valStr);
            },
            configurable: true
          });
        }

        ['backgroundImage', 'background', 'maskImage', 'webkitMaskImage', 'borderImageSource', 'listStyleImage'].forEach((propName) => {
          const desc = Object.getOwnPropertyDescriptor(styleProto, propName);
          if (!desc || desc.configurable === false || !desc.set) return;
          const cssProp = propName.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
          Object.defineProperty(styleProto, propName, {
            get: function() { return desc.get.call(this); },
            set: function(val) {
              applyStyleWithTunnel(this, cssProp, val, (v) => {
                desc.set.call(this, v);
              });
            },
            configurable: true
          });
        });
      } catch (_) {}

      try {
        if (typeof CSSStyleSheet !== 'undefined') {
          const origInsertRule = CSSStyleSheet.prototype.insertRule;
          const origReplaceSync = CSSStyleSheet.prototype.replaceSync;
          const origReplace = CSSStyleSheet.prototype.replace;
          if (origInsertRule) {
            CSSStyleSheet.prototype.insertRule = function(rule, index) {
              if (typeof rule === 'string' && hasExternalCssUrl(rule)) {
                const idx = origInsertRule.call(this, neutralizeExternalCssUrls(rule), index);
                inlineCssUrlsInShim(rule, TARGET_URL).then((inlined) => {
                  try {
                    if (this.cssRules && idx >= 0 && idx < this.cssRules.length) {
                      this.deleteRule(idx);
                      origInsertRule.call(this, inlined, idx);
                    }
                  } catch (_) {}
                }).catch(() => {});
                return idx;
              }
              return origInsertRule.call(this, rule, index);
            };
          }
          if (origReplaceSync) {
            CSSStyleSheet.prototype.replaceSync = function(text) {
              if (typeof text === 'string' && hasExternalCssUrl(text)) {
                origReplaceSync.call(this, neutralizeExternalCssUrls(text));
                inlineCssUrlsInShim(text, TARGET_URL).then((inlined) => {
                  try { origReplaceSync.call(this, inlined); } catch (_) {}
                }).catch(() => {});
                return;
              }
              return origReplaceSync.call(this, text);
            };
          }
          if (origReplace) {
            CSSStyleSheet.prototype.replace = async function(text) {
              const finalCss = (typeof text === 'string' && hasExternalCssUrl(text))
                ? await inlineCssUrlsInShim(text, TARGET_URL)
                : text;
              return origReplace.call(this, finalCss);
            };
          }
        }
      } catch (_) {}

      const innerHTMLProto = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML') ? Element.prototype : HTMLElement.prototype;
      const origInnerHTMLDesc = Object.getOwnPropertyDescriptor(innerHTMLProto, 'innerHTML');
      const outerHTMLProto = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML') ? Element.prototype : HTMLElement.prototype;
      const origOuterHTMLDesc = Object.getOwnPropertyDescriptor(outerHTMLProto, 'outerHTML');
      const origInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
      const origCloneNode = Node.prototype.cloneNode;

      function stripPendingExternalAssets(root) {
        if (!root || typeof root.querySelectorAll !== 'function') return 0;
        let count = 0;
        const targets = [];
        if (root.nodeType === 1) targets.push(root);
        root.querySelectorAll('img, source, image, style, link, [style]').forEach((el) => targets.push(el));

        for (const el of targets) {
          const tag = el.tagName ? el.tagName.toUpperCase() : '';
          if (tag === 'IMG') {
            const rawSrc = origGetAttribute.call(el, 'src');
            if (rawSrc && !isInternalUrl(rawSrc)) {
              origSetAttribute.call(el, 'data-proxied-pending-src', resolveTarget(rawSrc));
              origRemoveAttribute.call(el, 'src');
              count++;
            }
            const rawSrcset = origGetAttribute.call(el, 'srcset');
            if (rawSrcset && !isInternalUrl(rawSrcset)) {
              origSetAttribute.call(el, 'data-proxied-pending-srcset', rawSrcset);
              origRemoveAttribute.call(el, 'srcset');
              count++;
            }
          } else if (tag === 'SOURCE') {
            const rawSrc = origGetAttribute.call(el, 'src');
            if (rawSrc && !isInternalUrl(rawSrc)) {
              origSetAttribute.call(el, 'data-proxied-pending-src', resolveTarget(rawSrc));
              origRemoveAttribute.call(el, 'src');
              count++;
            }
            const rawSrcset = origGetAttribute.call(el, 'srcset');
            if (rawSrcset && !isInternalUrl(rawSrcset)) {
              origSetAttribute.call(el, 'data-proxied-pending-srcset', rawSrcset);
              origRemoveAttribute.call(el, 'srcset');
              count++;
            }
          } else if (tag === 'IMAGE') {
            const rawHref = origGetAttribute.call(el, 'href') || origGetAttribute.call(el, 'xlink:href');
            if (rawHref && !isInternalUrl(rawHref)) {
              origSetAttribute.call(el, 'data-proxied-pending-href', resolveTarget(rawHref));
              origRemoveAttribute.call(el, 'href');
              origRemoveAttribute.call(el, 'xlink:href');
              count++;
            }
          } else if (tag === 'LINK') {
            const rel = (origGetAttribute.call(el, 'rel') || '').toLowerCase();
            const href = origGetAttribute.call(el, 'href');
            if (rel.includes('stylesheet') && href && !isInternalUrl(href)) {
              origSetAttribute.call(el, 'data-proxied-pending-stylesheet', resolveTarget(href));
              origRemoveAttribute.call(el, 'href');
              count++;
            }
          } else if (tag === 'STYLE') {
            const css = el.textContent || '';
            if (hasExternalCssUrl(css)) {
              origSetAttribute.call(el, 'data-proxied-pending-css', css);
              el.textContent = neutralizeExternalCssUrls(css);
              count++;
            }
          }
          const st = origGetAttribute.call(el, 'style');
          if (st && hasExternalCssUrl(st)) {
            origSetAttribute.call(el, 'data-proxied-pending-style', st);
            origSetAttribute.call(el, 'style', neutralizeExternalCssUrls(st));
            count++;
          }
        }
        return count;
      }

      function hydrateProxiedTree(root) {
        if (!root || typeof root.querySelectorAll !== 'function') return;
        const nodes = [];
        if (root.nodeType === 1) nodes.push(root);
        root.querySelectorAll('img, source, image, style, link, [data-proxied-pending-src], [data-proxied-pending-srcset], [data-proxied-pending-href], [data-proxied-pending-style], [data-proxied-pending-css], [data-proxied-pending-stylesheet], [style]').forEach((el) => nodes.push(el));

        for (const el of nodes) {
          const tag = el.tagName ? el.tagName.toUpperCase() : '';

          const pendingSrc = origGetAttribute.call(el, 'data-proxied-pending-src');
          if (pendingSrc) {
            origRemoveAttribute.call(el, 'data-proxied-pending-src');
            if (tag === 'IMG') loadProxiedImgSrc(el, pendingSrc);
            else if (tag === 'SOURCE') loadProxiedSourceEl(el, 'src', pendingSrc);
          } else if (tag === 'IMG') {
            const rawSrc = origGetAttribute.call(el, 'src');
            if (rawSrc && !isInternalUrl(rawSrc) && origGetAttribute.call(el, 'data-proxied-src') !== resolveTarget(rawSrc)) {
              loadProxiedImgSrc(el, rawSrc);
            }
          } else if (tag === 'SOURCE') {
            const rawSrc = origGetAttribute.call(el, 'src');
            if (rawSrc && !isInternalUrl(rawSrc) && origGetAttribute.call(el, 'data-proxied-src') !== resolveTarget(rawSrc)) {
              loadProxiedSourceEl(el, 'src', rawSrc);
            }
          }

          const pendingSrcset = origGetAttribute.call(el, 'data-proxied-pending-srcset');
          if (pendingSrcset) {
            origRemoveAttribute.call(el, 'data-proxied-pending-srcset');
            if (tag === 'IMG') loadProxiedImgSrcset(el, pendingSrcset);
            else if (tag === 'SOURCE') loadProxiedSourceEl(el, 'srcset', pendingSrcset);
          } else if (tag === 'IMG') {
            const rawSrcset = origGetAttribute.call(el, 'srcset');
            if (rawSrcset && !isInternalUrl(rawSrcset)) {
              origRemoveAttribute.call(el, 'srcset');
              loadProxiedImgSrcset(el, rawSrcset);
            }
          } else if (tag === 'SOURCE') {
            const rawSrcset = origGetAttribute.call(el, 'srcset');
            if (rawSrcset && !isInternalUrl(rawSrcset)) {
              origRemoveAttribute.call(el, 'srcset');
              loadProxiedSourceEl(el, 'srcset', rawSrcset);
            }
          }

          const pendingHref = origGetAttribute.call(el, 'data-proxied-pending-href');
          if (pendingHref) {
            origRemoveAttribute.call(el, 'data-proxied-pending-href');
            if (tag === 'IMAGE') loadProxiedSvgImage(el, 'href', pendingHref, null);
          } else if (tag === 'IMAGE') {
            const rawHref = origGetAttribute.call(el, 'href') || origGetAttribute.call(el, 'xlink:href');
            if (rawHref && !isInternalUrl(rawHref) && origGetAttribute.call(el, 'data-proxied-href') !== resolveTarget(rawHref)) {
              loadProxiedSvgImage(el, origGetAttribute.call(el, 'href') ? 'href' : 'xlink:href', rawHref, null);
            }
          }

          const pendingStyle = origGetAttribute.call(el, 'data-proxied-pending-style');
          if (pendingStyle) {
            origRemoveAttribute.call(el, 'data-proxied-pending-style');
            applyInlineStyleTextProxied(el, pendingStyle);
          } else {
            const st = origGetAttribute.call(el, 'style');
            if (st && hasExternalCssUrl(st)) {
              applyInlineStyleTextProxied(el, st);
            }
          }

          const pendingCss = origGetAttribute.call(el, 'data-proxied-pending-css');
          if (pendingCss) {
            origRemoveAttribute.call(el, 'data-proxied-pending-css');
            const tok = (el.__styleCssToken = (el.__styleCssToken || 0) + 1);
            inlineCssUrlsInShim(pendingCss, TARGET_URL).then((inlined) => {
              if (el.__styleCssToken !== tok) return;
              el.textContent = inlined;
            }).catch(() => {});
          } else if (tag === 'STYLE') {
            const css = el.textContent || '';
            if (hasExternalCssUrl(css)) {
              const cssBase = origGetAttribute.call(el, 'data-proxy-css-base') || TARGET_URL;
              const tok = (el.__styleCssToken = (el.__styleCssToken || 0) + 1);
              el.textContent = neutralizeExternalCssUrls(css);
              inlineCssUrlsInShim(css, cssBase).then((inlined) => {
                if (el.__styleCssToken !== tok) return;
                el.textContent = inlined;
              }).catch(() => {});
            }
          }

          const pendingSheet = origGetAttribute.call(el, 'data-proxied-pending-stylesheet');
          if (pendingSheet && tag === 'LINK') {
            origRemoveAttribute.call(el, 'data-proxied-pending-stylesheet');
            el.href = pendingSheet;
          }
        }
      }

      function sanitizeHtmlFragment(htmlStr, isSvgCtx) {
        const str = String(htmlStr === null || htmlStr === undefined ? '' : htmlStr);
        if (!/\\b(?:src|srcset|xlink:href|href)\\s*=|url\\s*\\(/i.test(str)) {
          return { html: str, touched: false };
        }
        const tpl = origCreateElement('template');
        origInnerHTMLDesc.set.call(tpl, isSvgCtx ? '<svg xmlns="http://www.w3.org/2000/svg">' + str + '</svg>' : str);
        const root = isSvgCtx && tpl.content.firstElementChild ? tpl.content.firstElementChild : tpl.content;
        const stripped = stripPendingExternalAssets(root);
        if (!stripped) {
          return { html: str, touched: false };
        }
        return {
          html: isSvgCtx ? origInnerHTMLDesc.get.call(root) : origInnerHTMLDesc.get.call(tpl),
          touched: true
        };
      }

      if (origInnerHTMLDesc && origInnerHTMLDesc.configurable !== false) {
        Object.defineProperty(innerHTMLProto, 'innerHTML', {
          get: function() { return origInnerHTMLDesc.get.call(this); },
          set: function(val) {
            const tag = this.tagName ? this.tagName.toUpperCase() : '';
            if (tag === 'STYLE') {
              const css = String(val === null || val === undefined ? '' : val);
              if (hasExternalCssUrl(css)) {
                const tok = (this.__styleCssToken = (this.__styleCssToken || 0) + 1);
                origInnerHTMLDesc.set.call(this, neutralizeExternalCssUrls(css));
                inlineCssUrlsInShim(css, TARGET_URL).then((inlined) => {
                  if (this.__styleCssToken !== tok) return;
                  origInnerHTMLDesc.set.call(this, inlined);
                }).catch(() => {});
                return;
              }
              origInnerHTMLDesc.set.call(this, css);
              return;
            }
            if (tag === 'SCRIPT' || tag === 'TEXTAREA' || tag === 'TITLE') {
              origInnerHTMLDesc.set.call(this, val);
              return;
            }
            const isSvgCtx = typeof SVGElement !== 'undefined' && this instanceof SVGElement && tag !== 'FOREIGNOBJECT';
            const res = sanitizeHtmlFragment(val, isSvgCtx);
            origInnerHTMLDesc.set.call(this, res.html);
            if (res.touched && tag !== 'TEMPLATE') hydrateProxiedTree(this);
          },
          configurable: true
        });
      }

      if (origOuterHTMLDesc && origOuterHTMLDesc.configurable !== false) {
        Object.defineProperty(outerHTMLProto, 'outerHTML', {
          get: function() { return origOuterHTMLDesc.get.call(this); },
          set: function(val) {
            const parent = this.parentNode;
            const isSvgCtx = typeof SVGElement !== 'undefined' && parent instanceof SVGElement;
            const res = sanitizeHtmlFragment(val, isSvgCtx);
            origOuterHTMLDesc.set.call(this, res.html);
            if (res.touched && parent) hydrateProxiedTree(parent);
          },
          configurable: true
        });
      }

      if (origInsertAdjacentHTML) {
        Element.prototype.insertAdjacentHTML = function(position, text) {
          const pos = String(position || '').toLowerCase();
          const targetParent = (pos === 'beforebegin' || pos === 'afterend') ? (this.parentNode || this) : this;
          const isSvgCtx = typeof SVGElement !== 'undefined' && targetParent instanceof SVGElement && targetParent.tagName.toUpperCase() !== 'FOREIGNOBJECT';
          const res = sanitizeHtmlFragment(text, isSvgCtx);
          origInsertAdjacentHTML.call(this, position, res.html);
          if (res.touched) hydrateProxiedTree(targetParent);
        };
      }

      Node.prototype.cloneNode = function(deep) {
        const cloned = origCloneNode.call(this, deep);
        if (cloned && (cloned.nodeType === 1 || cloned.nodeType === 11)) {
          stripPendingExternalAssets(cloned);
        }
        return cloned;
      };

      if (typeof Range !== 'undefined' && Range.prototype.createContextualFragment) {
        const origCreateContextualFragment = Range.prototype.createContextualFragment;
        Range.prototype.createContextualFragment = function(htmlStr) {
          const parent = this.startContainer && this.startContainer.nodeType === 1 ? this.startContainer : this.startContainer?.parentElement;
          const isSvgCtx = typeof SVGElement !== 'undefined' && parent instanceof SVGElement && parent.tagName.toUpperCase() !== 'FOREIGNOBJECT';
          const res = sanitizeHtmlFragment(htmlStr, isSvgCtx);
          return origCreateContextualFragment.call(this, res.html);
        };
      }

      const __proxyDomObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'childList') {
            for (const node of m.addedNodes) {
              if (node && (node.nodeType === 1 || node.nodeType === 11)) {
                hydrateProxiedTree(node);
              }
            }
          } else if (m.type === 'attributes' && m.target && m.target.nodeType === 1) {
            hydrateProxiedTree(m.target);
          }
        }
      });

      function startProxyDomObserver() {
        const root = document.documentElement || document;
        if (!root) return;
        __proxyDomObserver.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['src', 'srcset', 'style', 'href', 'xlink:href']
        });
        hydrateProxiedTree(root);
      }

      if (document.documentElement) {
        startProxyDomObserver();
      } else {
        document.addEventListener('DOMContentLoaded', startProxyDomObserver, { once: true });
      }

      const origAttachShadow = Element.prototype.attachShadow;
      if (origAttachShadow) {
        Element.prototype.attachShadow = function(init) {
          const shadow = origAttachShadow.call(this, init);
          try {
            __proxyDomObserver.observe(shadow, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['src', 'srcset', 'style', 'href', 'xlink:href']
            });
          } catch (_) {}
          return shadow;
        };
      }

      if (typeof ShadowRoot !== 'undefined') {
        const origShadowInnerHTMLDesc = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'innerHTML');
        if (origShadowInnerHTMLDesc && origShadowInnerHTMLDesc.configurable !== false) {
          Object.defineProperty(ShadowRoot.prototype, 'innerHTML', {
            get: function() { return origShadowInnerHTMLDesc.get.call(this); },
            set: function(val) {
              const res = sanitizeHtmlFragment(val, false);
              origShadowInnerHTMLDesc.set.call(this, res.html);
              if (res.touched) hydrateProxiedTree(this);
            },
            configurable: true
          });
        }
      }

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
              if ((el.type || '').toLowerCase() === 'module') {
                loadModuleAsBlob(scriptSrc, null)
                  .then((blobUrl) => import(blobUrl))
                  .then(() => {
                    el.dispatchEvent(new Event('load'));
                    if (typeof el.onload === 'function') {
                      try { el.onload(new Event('load')); } catch(e) {}
                    }
                  })
                  .catch(() => {
                    el.dispatchEvent(new Event('error'));
                    if (typeof el.onerror === 'function') {
                      try { el.onerror(new Event('error')); } catch(e) {}
                    }
                  });
                return;
              }
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
          const origRelDesc = typeof HTMLLinkElement !== 'undefined' ? Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'rel') : null;
          let linkHref = '';
          let linkProcessed = false;
          function handleLinkActivation() {
            if (!linkHref || linkProcessed) return;
            const relVal = (el.getAttribute('rel') || (origRelDesc && origRelDesc.get ? origRelDesc.get.call(el) : '') || '').toLowerCase();
            const relTokens = relVal.split(/\\s+/).filter(Boolean);
            if (relTokens.length === 0) return;
            linkProcessed = true;
            if (relTokens.includes('stylesheet')) {
              executeTunnelRequest(linkHref, { method: 'GET' }).then(async res => {
                const buf = await res.arrayBuffer();
                const rawCss = rewriteCssRelativeUrls(new TextDecoder().decode(buf), res.url || linkHref);
                const css = await inlineCssUrlsInShim(rawCss, res.url || linkHref);
                const s = origCreateElement('style');
                s.textContent = css;
                (document.head || document.documentElement).appendChild(s);
                el.dispatchEvent(new Event('load'));
                if (typeof el.onload === 'function') el.onload(new Event('load'));
              }).catch(() => {
                el.dispatchEvent(new Event('error'));
                if (typeof el.onerror === 'function') el.onerror(new Event('error'));
              });
            } else if (relTokens.includes('modulepreload') || (relTokens.includes('preload') && (el.getAttribute('as') || '').toLowerCase() === 'script')) {
              window.__proxyPreloadModule(linkHref).finally(() => {
                el.dispatchEvent(new Event('load'));
                if (typeof el.onload === 'function') el.onload(new Event('load'));
              });
            } else if (relTokens.includes('preload') || relTokens.includes('prefetch') || relTokens.includes('dns-prefetch') || relTokens.includes('preconnect')) {
              el.dispatchEvent(new Event('load'));
              if (typeof el.onload === 'function') el.onload(new Event('load'));
            } else {
              origSetAttr('href', linkHref);
            }
          }
          if (origRelDesc && origRelDesc.configurable !== false) {
            Object.defineProperty(el, 'rel', {
              get: () => origRelDesc.get ? origRelDesc.get.call(el) : (el.getAttribute('rel') || ''),
              set: (val) => {
                if (origRelDesc.set) origRelDesc.set.call(el, val);
                else origSetAttr('rel', val);
                const tokens = String(val || '').toLowerCase().split(/\\s+/).filter(Boolean);
                if (tokens.includes('stylesheet')) linkProcessed = false;
                if (linkHref) handleLinkActivation();
              },
              configurable: true
            });
          }
          Object.defineProperty(el, 'href', {
            get: () => linkHref,
            set: (val) => {
              linkHref = resolveTarget(val);
              linkProcessed = false;
              origSetAttr('data-proxied-href', linkHref);
              if (el.getAttribute('rel') || (origRelDesc && origRelDesc.get && origRelDesc.get.call(el))) {
                handleLinkActivation();
              } else {
                queueMicrotask(() => {
                  if (!linkProcessed && linkHref) {
                    if (el.getAttribute('rel') || (origRelDesc && origRelDesc.get && origRelDesc.get.call(el))) handleLinkActivation();
                    else {
                      linkProcessed = true;
                      origSetAttr('href', linkHref);
                    }
                  }
                });
              }
            },
            configurable: true
          });
          el.setAttribute = function(name, val) {
            const lname = name ? name.toLowerCase() : '';
            if (lname === 'href') {
              el.href = val;
            } else {
              origSetAttr(name, val);
              if (lname === 'rel') {
                const tokens = String(val || '').toLowerCase().split(/\\s+/).filter(Boolean);
                if (tokens.includes('stylesheet')) linkProcessed = false;
                if (linkHref) handleLinkActivation();
              }
            }
          };
        }
        return el;
      };

      try {
        const OrigWorker = window.Worker;
        if (OrigWorker) {
          window.Worker = function(scriptURL, options) {
            const rawUrl = (scriptURL && typeof scriptURL === 'object' && typeof scriptURL.href === 'string') ? scriptURL.href : String(scriptURL || '');
            if (rawUrl.startsWith('data:')) {
              return new OrigWorker(rawUrl, options);
            }
            const blobObj = isBlobObjectUrl(rawUrl) ? __proxyBlobMap.get(rawUrl) : null;
            const resolved = isBlobObjectUrl(rawUrl) ? rawUrl : resolveTarget(rawUrl);
            const isModule = options && String(options.type || '').toLowerCase() === 'module';
            const pendingMsgs = [];
            const listeners = {};
            const wrappedListenerMap = new WeakMap();
            let realWorker = null;
            let terminated = false;
            let _onmessage = null;
            let _onerror = null;
            let _onmessageerror = null;

            const wrapHandler = (fn) => {
              if (typeof fn !== 'function') return null;
              if (wrappedListenerMap.has(fn)) return wrappedListenerMap.get(fn);
              const w = function(e) {
                if (e && e.data && (e.data.__proxyWorkerFetch || e.data.__proxyWorkerFetchRes || e.data.__proxyWorkerImport || e.data.__proxyWorkerImportRes || e.data.__proxyWorkerError)) return;
                return fn.call(proxyWorker, e);
              };
              wrappedListenerMap.set(fn, w);
              return w;
            };

            const proxyWorker = {
              postMessage: function() {
                const args = Array.from(arguments);
                if (realWorker) realWorker.postMessage.apply(realWorker, args);
                else if (!terminated) pendingMsgs.push(args);
              },
              terminate: function() {
                terminated = true;
                pendingMsgs.length = 0;
                if (realWorker) realWorker.terminate();
              },
              addEventListener: function(type, fn, opts) {
                const targetFn = (type === 'message') ? wrapHandler(fn) : fn;
                if (realWorker) {
                  realWorker.addEventListener(type, targetFn, opts);
                } else {
                  listeners[type] = listeners[type] || [];
                  listeners[type].push({ fn: targetFn, opts });
                }
              },
              removeEventListener: function(type, fn, opts) {
                const targetFn = (type === 'message' && wrappedListenerMap.has(fn)) ? wrappedListenerMap.get(fn) : fn;
                if (realWorker) {
                  realWorker.removeEventListener(type, targetFn, opts);
                } else if (listeners[type]) {
                  listeners[type] = listeners[type].filter(item => item.fn !== targetFn);
                }
              },
              dispatchEvent: function(ev) {
                return realWorker ? realWorker.dispatchEvent(ev) : false;
              }
            };

            Object.defineProperties(proxyWorker, {
              onmessage: { get: () => _onmessage, set: (v) => { _onmessage = v; if (realWorker) realWorker.onmessage = wrapHandler(v); } },
              onerror: { get: () => _onerror, set: (v) => { _onerror = v; if (realWorker) realWorker.onerror = v; } },
              onmessageerror: { get: () => _onmessageerror, set: (v) => { _onmessageerror = v; if (realWorker) realWorker.onmessageerror = v; } }
            });

            const buildWorkerPromise = (async () => {
              if (blobObj) {
                const code = await blobObj.text();
                if (isModule) {
                  return await loadModuleCodeAsBlob(code, TARGET_URL, false, null, null, true);
                }
                const wb = new Blob([buildWorkerShimHeader(TARGET_URL) + sanitizeCode(code)], { type: 'application/javascript' });
                const wbUrl = URL.createObjectURL(wb);
                __proxyCreatedBlobs.add(wbUrl);
                return wbUrl;
              }
              if (isBlobObjectUrl(rawUrl)) {
                return rawUrl;
              }
              if (isModule) {
                return await loadModuleAsBlob(resolved, null, true);
              }
              const res = await fetchModuleResource(resolved);
              const wb = new Blob([buildWorkerShimHeader(res.url || resolved) + sanitizeCode(res.code)], { type: 'application/javascript' });
              const wbUrl = URL.createObjectURL(wb);
              __proxyCreatedBlobs.add(wbUrl);
              return wbUrl;
            })();

            buildWorkerPromise.then((blobUrl) => {
              if (terminated) return;
              realWorker = new OrigWorker(blobUrl, options);
              realWorker.addEventListener('message', (e) => {
                if (!e.data) return;
                if (e.data.__proxyWorkerFetch) {
                  e.stopImmediatePropagation();
                  const { __proxyWorkerFetch: fid, url: furl, init: finit } = e.data;
                  window.fetch(furl, finit || {}).then(async (r) => {
                    const buf = await r.arrayBuffer();
                    const hdrs = [];
                    if (r.headers && r.headers.forEach) r.headers.forEach((v, k) => hdrs.push([k, v]));
                    realWorker.postMessage({ __proxyWorkerFetchRes: fid, status: r.status, statusText: r.statusText, headers: hdrs, buf }, [buf]);
                  }).catch((err) => {
                    realWorker.postMessage({ __proxyWorkerFetchRes: fid, error: err.message || String(err) });
                  });
                } else if (e.data.__proxyWorkerImport) {
                  e.stopImmediatePropagation();
                  const { __proxyWorkerImport: iid, url: iurl } = e.data;
                  loadModuleAsBlob(resolveTarget(iurl), null, true).then((bUrl) => {
                    realWorker.postMessage({ __proxyWorkerImportRes: iid, blobUrl: bUrl });
                  }).catch((err) => {
                    realWorker.postMessage({ __proxyWorkerImportRes: iid, error: err.message || String(err) });
                  });
                } else if (e.data.__proxyWorkerError) {
                  e.stopImmediatePropagation();
                  window.parent.postMessage({ type: 'PROXY_CONSOLE_ERROR', text: '[Worker] ' + e.data.__proxyWorkerError }, '*');
                }
              }, true);
              realWorker.addEventListener('error', (errEv) => {
                window.parent.postMessage({
                  type: 'PROXY_CONSOLE_ERROR',
                  text: '[Worker Error] ' + (errEv && errEv.message ? errEv.message : 'Worker failed to execute')
                }, '*');
              });
              if (_onmessage) realWorker.onmessage = wrapHandler(_onmessage);
              if (_onerror) realWorker.onerror = _onerror;
              if (_onmessageerror) realWorker.onmessageerror = _onmessageerror;
              Object.keys(listeners).forEach((t) => {
                listeners[t].forEach(({ fn, opts }) => realWorker.addEventListener(t, fn, opts));
              });
              while (pendingMsgs.length > 0) {
                const args = pendingMsgs.shift();
                realWorker.postMessage.apply(realWorker, args);
              }
            }).catch((err) => {
              window.parent.postMessage({
                type: 'PROXY_CONSOLE_ERROR',
                text: '[Worker Init Error] ' + (err && err.message ? err.message : String(err))
              }, '*');
              if (typeof _onerror === 'function') {
                try { _onerror.call(proxyWorker, new ErrorEvent('error', { error: err, message: err.message || String(err) })); } catch (_) {}
              }
            });

            return proxyWorker;
          };
          window.Worker.prototype = OrigWorker.prototype;
        }
      } catch (e) {}

      const origFetch = window.fetch;
      window.fetch = async function(input, init = {}) {
        let rawUrl = (typeof input === "string") ? input : (input && input.url ? input.url : String(input));
        if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("javascript:") || isBlobObjectUrl(rawUrl)) {
          return origFetch.apply(window, arguments);
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

        let curUrl = resolved;
        let response = null;
        for (let hop = 0; hop < 6; hop++) {
          response = await executeTunnelRequest(curUrl, {
            method: method,
            headers: reqHeaders,
            body: body
          });
          const st = response && typeof response.status === "number" ? response.status : 200;
          if (st >= 300 && st < 400) {
            const loc = getHeaderVal(response.headers, "location");
            if (loc) {
              curUrl = resolveTarget(new URL(loc, curUrl).href);
              if (st === 301 || st === 302 || st === 303) {
                method = "GET";
                body = undefined;
              }
              continue;
            }
          }
          break;
        }

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
          Object.defineProperty(finalRes, "url", { value: response.url || curUrl, writable: false });
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
        xhr.withCredentials = false;
        xhr.timeout = 0;
        xhr.upload = {
          addEventListener: function() {},
          removeEventListener: function() {},
          onprogress: null,
          onload: null,
          onerror: null,
          onabort: null,
          onloadstart: null,
          onloadend: null,
          ontimeout: null
        };
        xhr.ontimeout = null;
        xhr.onprogress = null;
        xhr.onloadstart = null;
        xhr.onloadend = null;
        xhr.onload = null;
        xhr.onerror = null;
        xhr.onabort = null;
        xhr.onreadystatechange = null;

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
      ProxiedXMLHttpRequest.UNSENT = 0;
      ProxiedXMLHttpRequest.OPENED = 1;
      ProxiedXMLHttpRequest.HEADERS_RECEIVED = 2;
      ProxiedXMLHttpRequest.LOADING = 3;
      ProxiedXMLHttpRequest.DONE = 4;
      ProxiedXMLHttpRequest.prototype = { UNSENT: 0, OPENED: 1, HEADERS_RECEIVED: 2, LOADING: 3, DONE: 4 };
      window.XMLHttpRequest = ProxiedXMLHttpRequest;

      if (navigator.sendBeacon) {
        navigator.sendBeacon = function(url, data) {
          window.fetch(url, { method: "POST", body: data }).catch(() => {});
          return true;
        };
      }

      window.onerror = function(msg, url, line, col) {
        const srcTag = url ? ' @ ' + String(url).split('/').slice(-1)[0] : '';
        window.parent.postMessage({
          type: 'PROXY_CONSOLE_ERROR',
          text: msg + (line ? ' (' + line + (col ? ':' + col : '') + ')' : '') + srcTag
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
            if (resolved && !isInternalUrl(resolved)) {
              updateVirtualLocation(resolved, false);
            }
          }
        };
        history.replaceState = function(state, unused, url) {
          if (url) {
            const resolved = unwrap(resolveTarget(url));
            if (resolved && !isInternalUrl(resolved)) {
              updateVirtualLocation(resolved, false);
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
          updateVirtualLocation(currentTargetUrl.split('#')[0] + trimmed, true);
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

  doc.querySelectorAll("[style]").forEach(el => {
    const rawStyle = el.getAttribute("style");
    if (rawStyle && /url\(/i.test(rawStyle)) {
      el.setAttribute("style", rewriteCssRelativeUrls(rawStyle, targetUrl));
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

  const inlineCssToggleEl = document.getElementById("inlineCssToggle");
  const inlineCssEnabled = inlineCssToggleEl ? inlineCssToggleEl.textContent.includes("ON") : true;

  if (inlineCssEnabled) {
    const stylesheetLinks = [...doc.querySelectorAll('link[rel~="stylesheet" i], link[rel~="preload" i][as="style" i]')];
    let styleCounter = 0;
    await Promise.allSettled(stylesheetLinks.map(async (link) => {
      const relLower = (link.getAttribute("rel") || "").toLowerCase();
      const isPreloadStyle = !relLower.includes("stylesheet") && link.hasAttribute("onload");
      if (!relLower.includes("stylesheet") && !isPreloadStyle) return;
      const href = link.getAttribute("href");
      if (!href) return;
      const absUrl = resolveRelative(href, targetUrl);
      let rawCss = await fetchAssetTunnel(absUrl, false);
      if (rawCss) {
        rawCss = await resolveCssImports(rawCss, absUrl);
        const styleTag = doc.createElement("style");
        styleTag.setAttribute("data-proxy-style-id", String(++styleCounter));
        styleTag.setAttribute("data-proxy-css-base", absUrl);
        const media = link.getAttribute("media");
        if (media && media !== "all" && !(media === "print" && link.hasAttribute("onload"))) {
          styleTag.setAttribute("media", media);
        }
        styleTag.textContent = rawCss;
        link.replaceWith(styleTag);
      } else {
        link.setAttribute("href", absUrl);
      }
    }));
  }

  doc.querySelectorAll('link[rel~="modulepreload" i], link[rel~="prefetch" i], link[rel~="dns-prefetch" i], link[rel~="preconnect" i], link[rel~="preload" i]').forEach(el => {
    const href = el.getAttribute("href");
    if (href) {
      el.setAttribute("data-proxied-href", resolveRelative(href, targetUrl));
      el.removeAttribute("href");
    }
  });

  const isJsScriptType = (typeStr) => {
    if (!typeStr) return true;
    const mime = typeStr.trim().toLowerCase().split(";")[0].trim();
    return !mime || ["text/javascript", "application/javascript", "application/ecmascript", "text/ecmascript", "text/jscript", "module"].includes(mime);
  };
  const safeScriptJson = (val) => JSON.stringify(val).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

  const externalScripts = [...doc.querySelectorAll("script[src]")];
  await Promise.allSettled(externalScripts.map(async (script) => {
    const rawSrc = script.getAttribute("src");
    if (rawSrc && !rawSrc.startsWith("data:") && !rawSrc.startsWith("blob:")) {
      const absSrc = resolveRelative(rawSrc, targetUrl);
      const scriptContent = await fetchAssetTunnel(absSrc, false);
      if (scriptContent) {
        script.setAttribute("data-proxied-src", absSrc);
        script.removeAttribute("src");
        const isModule = (script.type || "").trim().toLowerCase() === "module";
        if (isModule && scanProxyScript(scriptContent, absSrc, true).deps.length > 0) {
          script.textContent = "await window.__proxyRunModule(" + safeScriptJson(scriptContent) + "," + safeScriptJson(absSrc) + ");";
          script.setAttribute("data-proxy-module-wrapped", "1");
        } else {
          const rewritten = rewriteScriptCode(scriptContent, absSrc);
          script.textContent = sanitizeCode(rewritten).replace(/<\/script/gi, "<\\/script");
          script.setAttribute("data-proxy-rewritten", "1");
        }
      } else {
        script.setAttribute("src", absSrc);
        script.setAttribute("data-proxied-src", absSrc);
      }
    }
  }));

  doc.querySelectorAll("script").forEach(script => {
    if (script.textContent) {
      if (script.hasAttribute("data-proxy-module-wrapped")) {
        script.removeAttribute("data-proxy-module-wrapped");
        return;
      }
      if (!isJsScriptType(script.type)) {
        return;
      }
      if (script.hasAttribute("data-proxy-rewritten")) {
        script.removeAttribute("data-proxy-rewritten");
        return;
      }
      const rawCode = script.textContent;
      const isModule = (script.type || "").trim().toLowerCase() === "module";
      if (isModule && scanProxyScript(rawCode, targetUrl, true).deps.length > 0) {
        script.textContent = "await window.__proxyRunModule(" + safeScriptJson(rawCode) + "," + safeScriptJson(targetUrl) + ");";
        return;
      }
      const rewritten = rewriteScriptCode(rawCode, targetUrl);
      script.textContent = sanitizeCode(rewritten).replace(/<\/script/gi, "<\\/script");
    }
  });

  const styleTags = [...doc.querySelectorAll("style")];
  await Promise.allSettled(styleTags.map(async (style) => {
    if (style.textContent) {
      const cssBase = style.getAttribute("data-proxy-css-base") || targetUrl;
      style.textContent = await resolveCssImports(style.textContent, cssBase);
      if (!style.hasAttribute("data-proxy-style-id") && style.textContent.includes("url(")) {
        style.textContent = await inlineCssUrls(style.textContent, cssBase);
      }
    }
  }));

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

async function reportProxyRequest(query) {
  if (!query) return;
  try {
    if (window.configReady) await window.configReady;
    const gateway = getApiGatewayUrl();
    if (!gateway) return;
    fetch(`${gateway}/api/track`, {
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
        if (typeof renderTabs === "function") renderTabs();
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
    if (typeof getCookie === "function") {
      const fromCookie = getCookie("proxyBookmarks");
      if (Array.isArray(fromCookie)) {
        bookmarks = fromCookie;
        return;
      }
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
    if (typeof setCookie === "function") {
      setCookie("proxyBookmarks", bookmarks, 365);
    }
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
