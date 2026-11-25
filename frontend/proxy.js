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
    await Promise.all([
      libcurl.load_wasm(WASM_URL),
      window.configReady || Promise.resolve()
    ]);

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
  const imgTags = [...doc.querySelectorAll("img[src]")].slice(0, 60);
  const totalElements = linkTags.length + preInlinedStyles.length + imgTags.length;
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
        const liveDoc = await waitForIframeDocument(iframeTarget, expectedBlobUrl);
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
                return { href: safeUrl, origin: '', protocol: '', host: '', hostname: '', port: '', pathname: safeUrl, search: '', hash: '', searchParams: new URLSearchParams(), toString: () => safeUrl, toJSON: () => safeUrl };
              }
            }
          }
        }
        ProxiedURL.prototype = OrigURL.prototype;
        ProxiedURL.createObjectURL = OrigURL.createObjectURL ? OrigURL.createObjectURL.bind(OrigURL) : undefined;
        ProxiedURL.revokeObjectURL = OrigURL.revokeObjectURL ? OrigURL.revokeObjectURL.bind(OrigURL) : undefined;
        ProxiedURL.canParse = OrigURL.canParse ? OrigURL.canParse.bind(OrigURL) : undefined;
        ProxiedURL.parse = OrigURL.parse ? OrigURL.parse.bind(OrigURL) : undefined;
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

      async function loadModuleCodeAsBlob(rawCode, moduleUrl, isJson, rawBuf, cycleOwnerUrl) {
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
            return loadModuleAsBlob(depUrl, cycleOwnerUrl);
          }));
        }
        let rewritten = "";
        for (let idx = 0; idx < scanned.chunks.length; idx++) {
          const part = scanned.chunks[idx];
          if (typeof part === "string") {
            rewritten += sanitizeCode(part);
          } else {
            rewritten += JSON.stringify(depUrls[part.depIdx]);
          }
        }
        const modBlob = new Blob([rewritten], { type: "application/javascript" });
        return URL.createObjectURL(modBlob);
      }

      async function loadModuleAsBlob(moduleUrl, waiterUrl) {
        if (moduleUrl.startsWith("blob:") || moduleUrl.startsWith("data:")) return moduleUrl;
        if (moduleBlobCache.has(moduleUrl)) return moduleBlobCache.get(moduleUrl);
        if (inFlightBlobs.has(moduleUrl) && !wouldDeadlock(waiterUrl, moduleUrl)) {
          return await inFlightBlobs.get(moduleUrl);
        }
        const buildPromise = (async () => {
          const resource = await fetchModuleResource(moduleUrl);
          const finalUrl = resource.url || moduleUrl;
          if (finalUrl !== moduleUrl && moduleBlobCache.has(finalUrl)) {
            const cached = moduleBlobCache.get(finalUrl);
            moduleBlobCache.set(moduleUrl, cached);
            return cached;
          }
          const blobUrl = await loadModuleCodeAsBlob(resource.code, finalUrl, resource.isJson, resource.buf, moduleUrl);
          moduleBlobCache.set(moduleUrl, blobUrl);
          moduleBlobCache.set(finalUrl, blobUrl);
          return blobUrl;
        })();
        if (!inFlightBlobs.has(moduleUrl)) {
          inFlightBlobs.set(moduleUrl, buildPromise);
        }
        try {
          return await buildPromise;
        } finally {
          if (inFlightBlobs.get(moduleUrl) === buildPromise) inFlightBlobs.delete(moduleUrl);
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
                const css = rewriteCssRelativeUrls(new TextDecoder().decode(buf), res.url || linkHref);
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

  doc.querySelectorAll('link[rel~="modulepreload" i], link[rel~="prefetch" i], link[rel~="dns-prefetch" i], link[rel~="preconnect" i], link[rel~="preload" i][as="script" i], link[rel~="preload" i][as="style" i]').forEach(el => {
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
