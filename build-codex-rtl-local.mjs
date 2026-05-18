import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_ROOT = process.env.CODEX_RTL_LOCAL_ROOT
  ? path.resolve(process.env.CODEX_RTL_LOCAL_ROOT)
  : path.join(REPO_ROOT, "_codex_rtl_app");
const LOCAL_APP = path.join(LOCAL_ROOT, "app");
const TARGET = "/webview/index.html";
const HEAD_BOOTSTRAP_MARKER = "    <script type=\"module\"";
const SOURCE_VERSION = process.env.CODEX_RTL_SOURCE_VERSION || (
  process.env.CODEX_RTL_SOURCE_APP?.match(/OpenAI\.Codex_([^\\\/]+?)(?:_[^\\\/]+)?[\\\/]app$/)?.[1] ?? "unknown"
);

const RTL_BOOT_INJECTION = String.raw`
    <script id="codex-rtl-boot-script">
      (() => {
        const sourceVersion = ${JSON.stringify(SOURCE_VERSION)};
        const applyCodexRtl = () => {
          document.documentElement.setAttribute("dir", "rtl");
          document.documentElement.setAttribute("lang", "ar");
        };
        const setImportant = (element, property, value) => {
          element.style.setProperty(property, value, "important");
        };
        const enforceCodexRtlPanelLayout = () => {
          let applied = false;
          const targets = Array.from(document.querySelectorAll([
            ".app-shell-main-content-viewport",
            ".app-shell-main-content-frame",
            '[data-app-shell-main-content-layout]',
            '[data-app-shell-focus-area="right-panel"]',
          ].join(",")));

          for (const element of targets) {
            if (!(element instanceof HTMLElement)) continue;
            setImportant(element, "direction", "rtl");
            setImportant(element, "text-align", "right");
            setImportant(element, "unicode-bidi", "isolate");
            setImportant(element, "min-width", "0");
            applied = true;
          }

          const editableTargets = Array.from(document.querySelectorAll([
            ".app-shell-main-content-viewport textarea",
            ".app-shell-main-content-viewport input",
            '.app-shell-main-content-viewport [contenteditable="true"]',
          ].join(",")));

          for (const element of editableTargets) {
            if (!(element instanceof HTMLElement)) continue;
            setImportant(element, "direction", "rtl");
            setImportant(element, "text-align", "right");
            setImportant(element, "unicode-bidi", "plaintext");
            applied = true;
          }

          return applied;
        };
        const findCodexSidebarContainer = () => {
          const nav =
            document.querySelector("nav.sidebar-foreground-muted") ||
            Array.from(document.querySelectorAll('nav[role="navigation"]')).find((candidate) =>
              candidate instanceof HTMLElement && candidate.querySelector("button.h-token-nav-row")
            );
          if (!(nav instanceof HTMLElement)) return null;

          let sidebar = nav;
          while (sidebar.parentElement && sidebar.parentElement !== document.body) {
            const rect = sidebar.getBoundingClientRect();
            const parentRect = sidebar.parentElement.getBoundingClientRect();
            const looksLikeSidebar =
              rect.width >= 180 &&
              rect.width <= 420 &&
              rect.height >= Math.max(360, window.innerHeight * 0.55) &&
              parentRect.width >= rect.width + 320;

            if (looksLikeSidebar) return sidebar;
            sidebar = sidebar.parentElement;
          }

          return nav;
        };
        const enforceCodexRtlSidebarLeft = () => {
          const sidebar = findCodexSidebarContainer();
          if (!(sidebar instanceof HTMLElement)) return false;

          const shell = sidebar.parentElement;
          if (!(shell instanceof HTMLElement)) return false;

          const rect = sidebar.getBoundingClientRect();
          const width = Math.max(240, Math.min(420, Math.ceil(rect.width || sidebar.offsetWidth || 288)));

          shell.setAttribute("data-codex-rtl-sidebar-shell", "true");
          sidebar.setAttribute("data-codex-rtl-sidebar-left", "true");

          setImportant(shell, "display", "flex");
          setImportant(shell, "flex-direction", "row");
          setImportant(shell, "direction", "ltr");
          setImportant(shell, "min-width", "0");

          if (shell.firstElementChild !== sidebar) {
            shell.insertBefore(sidebar, shell.firstElementChild);
          }

          setImportant(sidebar, "order", "-999");
          setImportant(sidebar, "flex", "0 0 " + width + "px");
          setImportant(sidebar, "width", width + "px");
          setImportant(sidebar, "min-width", width + "px");
          setImportant(sidebar, "max-width", width + "px");
          setImportant(sidebar, "direction", "rtl");

          Array.from(shell.children).forEach((child) => {
            if (child === sidebar || !(child instanceof HTMLElement)) return;
            setImportant(child, "order", "0");
            setImportant(child, "min-width", "0");
            if (!child.hasAttribute("data-codex-rtl-sidebar-left-spacer")) {
              setImportant(child, "flex", "1 1 auto");
            }
          });

          return true;
        };
        const mountCodexRtlStatus = () => {
          const existing = document.getElementById("codex-rtl-status-widget");
          if (existing) return;

          const widget = document.createElement("div");
          widget.id = "codex-rtl-status-widget";
          widget.setAttribute("role", "status");
          widget.setAttribute("aria-live", "polite");
          widget.title = "نسخة RTL مبنية من Codex الرسمي " + sourceVersion + ". التحديث التلقائي مفعّل عند فتح الاختصار.";
          widget.innerHTML = [
            '<button class="codex-rtl-status-close" type="button" aria-label="إغلاق تنبيه توافق RTL">×</button>',
            '<div class="codex-rtl-status-row">',
            '<span class="codex-rtl-status-dot" aria-hidden="true"></span>',
            '<span class="codex-rtl-status-title">RTL متوافق</span>',
            '</div>',
            '<div class="codex-rtl-status-meta">الرسمي ' + sourceVersion + '</div>',
            '<div class="codex-rtl-status-meta">تحديث تلقائي عند الفتح</div>',
            '<div class="codex-rtl-status-meta">مثبت - يغلق يدويًا فقط</div>'
          ].join("");
          document.body.appendChild(widget);
          const close = () => {
            widget.classList.add("codex-rtl-status-widget-hidden");
            window.setTimeout(() => widget.remove(), 220);
          };
          widget.querySelector(".codex-rtl-status-close")?.addEventListener("click", close);
        };
        applyCodexRtl();
        new MutationObserver(applyCodexRtl).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["dir", "lang"],
        });
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => {
            mountCodexRtlStatus();
            enforceCodexRtlPanelLayout();
            enforceCodexRtlSidebarLeft();
          }, { once: true });
        } else {
          mountCodexRtlStatus();
          enforceCodexRtlPanelLayout();
          enforceCodexRtlSidebarLeft();
        }
        let codexRtlLayoutFrames = 0;
        const enforceForStartup = () => {
          enforceCodexRtlPanelLayout();
          enforceCodexRtlSidebarLeft();
          codexRtlLayoutFrames += 1;
          if (codexRtlLayoutFrames < 600) window.requestAnimationFrame(enforceForStartup);
        };
        window.requestAnimationFrame(enforceForStartup);
        new MutationObserver(() => {
          enforceCodexRtlPanelLayout();
          enforceCodexRtlSidebarLeft();
        }).observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
        window.addEventListener("resize", () => {
          enforceCodexRtlPanelLayout();
          enforceCodexRtlSidebarLeft();
        });
      })();
    </script>
    <style id="codex-rtl-boot-patch">
      html,
      body,
      #root {
        direction: rtl !important;
      }
    </style>`;

const RTL_INJECTION = String.raw`
    <style id="codex-rtl-local-patch">
      html,
      body,
      #root {
        direction: rtl;
      }

      #codex-rtl-status-widget {
        position: fixed;
        left: auto;
        right: 12px;
        bottom: 16px;
        z-index: 2147483000;
        width: 248px;
        box-sizing: border-box;
        border: 1px solid color-mix(in srgb, var(--border-light, #3a3a3a) 72%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--token-main-surface-primary, #171717) 92%, transparent);
        color: var(--text-primary, #f4f4f5);
        box-shadow: 0 8px 24px rgb(0 0 0 / 28%);
        padding: 10px 12px;
        direction: rtl;
        text-align: right;
        unicode-bidi: isolate;
        pointer-events: auto;
        font-size: 12px;
        line-height: 1.45;
        opacity: 1;
        transform: translateY(0);
        transition: opacity 180ms ease, transform 180ms ease;
      }

      #codex-rtl-status-widget.codex-rtl-status-widget-hidden {
        opacity: 0;
        transform: translateY(8px);
        pointer-events: none;
      }

      #codex-rtl-status-widget .codex-rtl-status-close {
        position: absolute;
        top: 6px;
        left: 6px;
        width: 22px;
        height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--text-secondary, #a1a1aa);
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      }

      #codex-rtl-status-widget .codex-rtl-status-close:hover,
      #codex-rtl-status-widget .codex-rtl-status-close:focus-visible {
        background: rgb(255 255 255 / 8%);
        color: var(--text-primary, #f4f4f5);
        outline: none;
      }

      #codex-rtl-status-widget .codex-rtl-status-row {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        min-width: 0;
      }

      #codex-rtl-status-widget .codex-rtl-status-dot {
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        border-radius: 999px;
        background: #22c55e;
        box-shadow: 0 0 0 3px rgb(34 197 94 / 16%);
      }

      #codex-rtl-status-widget .codex-rtl-status-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 600;
      }

      #codex-rtl-status-widget .codex-rtl-status-meta {
        margin-top: 3px;
        color: var(--text-secondary, #a1a1aa);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      textarea,
      input,
      [contenteditable="true"] {
        direction: rtl !important;
        text-align: right !important;
        unicode-bidi: plaintext !important;
      }

      .app-shell-main-content-viewport,
      .app-shell-main-content-viewport .app-shell-main-content-frame,
      .app-shell-main-content-viewport [data-app-shell-main-content-layout] {
        direction: rtl !important;
        text-align: right;
        unicode-bidi: isolate;
      }

      .app-shell-main-content-viewport p,
      .app-shell-main-content-viewport li,
      .app-shell-main-content-viewport h1,
      .app-shell-main-content-viewport h2,
      .app-shell-main-content-viewport h3,
      .app-shell-main-content-viewport h4,
      .app-shell-main-content-viewport h5,
      .app-shell-main-content-viewport h6,
      .app-shell-main-content-viewport [data-message-author-role],
      .app-shell-main-content-viewport [data-testid*="message"],
      .app-shell-main-content-viewport [class*="prose"] {
        direction: rtl !important;
        text-align: right;
        unicode-bidi: plaintext;
      }

      button[role="switch"],
      button[role="switch"] * {
        direction: ltr;
        unicode-bidi: isolate;
      }

      [data-app-shell-header-edge-scroll],
      [data-test-id="header-shell-slot"],
      [data-test-id="header-shell-slot"] > div {
        direction: ltr;
        unicode-bidi: isolate;
      }

      [data-test-id="header-shell-slot"] {
        overflow: hidden;
      }

      [data-test-id="header-shell-slot"] > div {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }

      [data-test-id="header-shell-slot"] button,
      [data-test-id="header-shell-slot"] [role="button"] {
        min-width: 0;
        max-width: 100%;
        flex-shrink: 1;
      }

      [data-app-shell-header-edge-scroll] .text-md {
        direction: ltr;
        text-align: left;
        unicode-bidi: isolate;
      }

      [data-app-shell-header-edge-scroll] [class*="max-w-[320px]"] {
        direction: rtl;
        text-align: right;
        unicode-bidi: isolate;
      }

      [data-tab-id],
      [data-tab-id] [role="tab"] {
        direction: ltr;
        unicode-bidi: isolate;
        min-width: 0;
      }

      [data-tab-id] [role="tab"] {
        overflow: hidden;
      }

      [data-tab-id] [role="tab"] span:not([aria-hidden="true"]):not(.icon-xs) {
        direction: rtl;
        text-align: right;
        unicode-bidi: isolate;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      [data-tab-id] [aria-hidden="true"],
      [data-tab-id] svg {
        direction: ltr;
        unicode-bidi: isolate;
        flex: 0 0 auto;
      }

      [data-app-shell-focus-area="right-panel"],
      [data-app-shell-focus-area="right-panel"] * {
        direction: rtl;
        unicode-bidi: isolate;
      }

      .h-toolbar-pane:has(.group\/address-bar),
      .h-toolbar-pane:has(.group\/address-bar) > .draggable {
        direction: ltr;
        unicode-bidi: isolate;
      }

      .h-toolbar-pane:has(.group\/address-bar) > .draggable,
      .h-toolbar-pane:has(.group\/address-bar) > .draggable > * {
        min-width: 0;
      }

      .h-toolbar-pane:has(.group\/address-bar) .group\/address-bar {
        direction: ltr;
        unicode-bidi: isolate;
        min-width: 0;
        max-width: min(770px, 100%);
      }

      .h-toolbar-pane:has(.group\/address-bar) .group\/address-bar input {
        direction: ltr !important;
        text-align: left !important;
        unicode-bidi: plaintext !important;
        min-width: 0;
      }

      .h-toolbar-pane:has(.group\/address-bar) .group\/address-bar [aria-hidden="true"],
      .h-toolbar-pane:has(.group\/address-bar) .group\/address-bar svg,
      .h-toolbar-pane:has(.group\/address-bar) [data-browser-sidebar-open-external],
      .h-toolbar-pane:has(.group\/address-bar) [data-browser-sidebar-skip-address-commit] {
        direction: ltr;
        unicode-bidi: isolate;
        flex: 0 0 auto;
      }

      [role="tooltip"],
      [data-radix-popper-content-wrapper] {
        direction: rtl;
        text-align: right;
        unicode-bidi: plaintext;
      }

      nav[aria-label] [role="listitem"],
      nav[aria-label] [role="listitem"] button,
      nav[aria-label] [role="listitem"] a {
        min-width: 0;
      }

      nav.sidebar-foreground-muted > .shrink-0.px-row-x {
        padding-top: var(--height-toolbar, 46px);
      }

      nav[aria-label] button.h-token-nav-row {
        direction: rtl;
        text-align: right;
        unicode-bidi: isolate;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        overflow: hidden;
      }

      nav[aria-label] button.h-token-nav-row,
      nav[aria-label] button.h-token-nav-row * {
        min-width: 0;
      }

      nav[aria-label] button.h-token-nav-row > div:first-child {
        flex: 1 1 auto;
        justify-content: flex-start;
        overflow: hidden;
      }

      nav[aria-label] button.h-token-nav-row svg,
      nav[aria-label] button.h-token-nav-row [class*="icon-"] {
        flex: 0 0 auto;
      }

      nav[aria-label] button.h-token-nav-row > span[aria-hidden="true"] {
        direction: ltr;
        unicode-bidi: isolate;
        display: none !important;
      }

      nav[aria-label] button.h-token-nav-row > div:first-child > span,
      nav[aria-label] button.h-token-nav-row span:not([aria-hidden="true"]) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      nav[aria-label] button.h-token-nav-row:has(.disambiguated-digits) {
        padding-right: var(--padding-row-x) !important;
        padding-left: calc(var(--padding-row-x) + 1.75rem) !important;
      }

      nav[aria-label] button.h-token-nav-row .disambiguated-digits {
        right: auto !important;
        left: var(--padding-row-x) !important;
      }

      nav[aria-label] [role="listitem"] svg,
      [data-test-id="header-shell-slot"] svg {
        flex: 0 0 auto;
      }

      [data-thread-title-trigger] {
        min-width: 0;
        direction: rtl;
        text-align: right;
        unicode-bidi: isolate;
        box-sizing: border-box;
      }

      [data-thread-title] {
        direction: rtl;
        text-align: right;
        unicode-bidi: isolate;
      }

      [role="button"]:has([data-thread-title]) {
        --codex-rtl-thread-action-space: 3.25rem;
        direction: ltr;
        unicode-bidi: isolate;
      }

      [role="button"]:has([data-thread-title]) [data-thread-title-trigger] {
        padding-right: var(--codex-rtl-thread-action-space);
      }

      [role="button"]:has([data-thread-title]) [data-thread-title] {
        min-width: 0;
        max-width: 100%;
      }

      code,
      pre,
      kbd,
      samp,
      .cm-editor,
      .monaco-editor,
      [class*="terminal"],
      [class*="Terminal"],
      [class*="diff"],
      [class*="Diff"] {
        direction: ltr;
        text-align: left;
        unicode-bidi: plaintext;
      }
    </style>`;

async function assertCodexApp(appPath) {
  const exePath = path.join(appPath, "Codex.exe");
  const asarPath = path.join(appPath, "resources", "app.asar");
  await stat(exePath);
  await stat(asarPath);
  return { exePath, asarPath };
}

function parseVersionFromPackageName(name) {
  const match = /^OpenAI\.Codex_(\d+)\.(\d+)\.(\d+)\.(\d+)_/.exec(name);
  if (!match) return [0, 0, 0, 0];
  return match.slice(1).map((part) => Number.parseInt(part, 10));
}

function compareVersionsDesc(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (right[index] ?? 0) - (left[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function findCodexApp() {
  const explicitSource = process.env.CODEX_RTL_SOURCE_APP;
  if (explicitSource) {
    const explicitApp = path.resolve(explicitSource);
    await assertCodexApp(explicitApp);
    return explicitApp;
  }

  const windowsApps = path.join(process.env.ProgramFiles ?? "C:\\Program Files", "WindowsApps");
  let entries;
  try {
    entries = await readdir(windowsApps, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Cannot read WindowsApps folder: ${windowsApps}. ${error.message}`);
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("OpenAI.Codex_")) continue;
    const appPath = path.join(windowsApps, entry.name, "app");
    try {
      await assertCodexApp(appPath);
      candidates.push({
        appPath,
        name: entry.name,
        version: parseVersionFromPackageName(entry.name),
      });
    } catch {
      // Some AppX folders can be partial or inaccessible; ignore non-runnable candidates.
    }
  }

  candidates.sort((left, right) => {
    const versionSort = compareVersionsDesc(left.version, right.version);
    return versionSort !== 0 ? versionSort : right.name.localeCompare(left.name);
  });

  if (candidates.length === 0) {
    throw new Error(`Codex Desktop was not found under ${windowsApps}. Install Codex first.`);
  }

  return candidates[0].appPath;
}

function parseAsar(buffer) {
  const headerSize = buffer.readUInt32LE(12);
  const headerStart = 16;
  const headerEnd = headerStart + headerSize;
  return {
    header: JSON.parse(buffer.slice(headerStart, headerEnd).toString("utf8")),
    dataOffset: 8 + buffer.readUInt32LE(4),
  };
}

function walkFiles(node, callback, prefix = "") {
  if (!node.files) return;
  for (const [name, child] of Object.entries(node.files)) {
    const current = `${prefix}/${name}`;
    if (child.files) {
      walkFiles(child, callback, current);
    } else {
      callback(child, current);
    }
  }
}

function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function updateIntegrity(entry, content) {
  if (!entry.integrity) return;
  const algorithm = entry.integrity.algorithm ?? "SHA256";
  if (algorithm.toUpperCase() !== "SHA256") {
    throw new Error(`Unsupported asar integrity algorithm: ${algorithm}`);
  }

  const blockSize = entry.integrity.blockSize ?? 4194304;
  const blocks = [];
  for (let offset = 0; offset < content.length; offset += blockSize) {
    blocks.push(sha256Hex(content.subarray(offset, offset + blockSize)));
  }

  entry.integrity = {
    algorithm,
    hash: sha256Hex(content),
    blockSize,
    blocks,
  };
}

function injectRtl(html) {
  if (html.includes("codex-rtl-local-patch")) return html;

  const withLang = html.replace("<html lang=\"en\">", "<html dir=\"rtl\" lang=\"ar\">");
  if (withLang === html) {
    throw new Error("Expected HTML marker was not found.");
  }

  if (!withLang.includes(HEAD_BOOTSTRAP_MARKER)) {
    throw new Error("Expected app bootstrap marker was not found.");
  }

  const withBootPatch = withLang.replace(
    HEAD_BOOTSTRAP_MARKER,
    `${RTL_BOOT_INJECTION}\n${HEAD_BOOTSTRAP_MARKER}`,
  );

  return withBootPatch.replace("</head>", `${RTL_INJECTION}\n  </head>`);
}

function patchDirectiveParser(source) {
  const original = "function cx(e){let t=[];return ux(Kb(e,void 0),t),R.debug(`[parseDirectives] directives found`,{safe:{directiveCount:t.length,directiveNames:t.map(e=>e.name).join(`,`)},sensitive:{}}),t}";
  const replacement = "function cx(e){let t=[];try{ux(Kb(e,void 0),t)}catch(e){return R.debug(`[parseDirectives] directive parse failed`,{safe:{},sensitive:{error:String(e)}}),[]}return R.debug(`[parseDirectives] directives found`,{safe:{directiveCount:t.length,directiveNames:t.map(e=>e.name).join(`,`)},sensitive:{}}),t}";

  if (source.includes(original)) {
    return source.replace(original, replacement);
  }

  return source.replace(
    /function ([A-Za-z_$][\w$]*)\(e\)\{let t=\[\];return ([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\(e,void 0\),t\),R\.debug\(`\[parseDirectives\] directives found`,\{safe:\{directiveCount:t\.length,directiveNames:t\.map\(e=>e\.name\)\.join\(`,`\)\},sensitive:\{\}\}\),t\}/,
    "function $1(e){let t=[];try{$2($3(e,void 0),t)}catch(e){return R.debug(`[parseDirectives] directive parse failed`,{safe:{},sensitive:{error:String(e)}}),[]}return R.debug(`[parseDirectives] directives found`,{safe:{directiveCount:t.length,directiveNames:t.map(e=>e.name).join(`,`)},sensitive:{}}),t}",
  );
}

function patchAppShellRightPanelOrder(source) {
  return source;
}

async function rebuildAsar(sourceAsar, targetAsar) {
  const source = await readFile(sourceAsar);
  const { header, dataOffset } = parseAsar(source);
  const files = [];

  walkFiles(header, (entry, filePath) => {
    if (entry.link || entry.unpacked || entry.offset == null || entry.size == null) return;
    const start = dataOffset + Number(entry.offset);
    const original = source.subarray(start, start + entry.size);
    let content = original;

    if (filePath === TARGET) {
      content = Buffer.from(injectRtl(original.toString("utf8")), "utf8");
      updateIntegrity(entry, content);
    } else if (filePath.endsWith(".js")) {
      const patched = patchAppShellRightPanelOrder(patchDirectiveParser(original.toString("utf8")));
      if (patched !== original.toString("utf8")) {
        content = Buffer.from(patched, "utf8");
        updateIntegrity(entry, content);
      }
    }

    entry.size = content.length;
    entry.offset = String(files.reduce((total, item) => total + item.content.length, 0));
    files.push({ content });
  });

  const headerBuffer = Buffer.from(JSON.stringify(header), "utf8");
  const headerPadding = Buffer.alloc((4 - (headerBuffer.length % 4)) % 4);
  const prefix = Buffer.alloc(16);
  prefix.writeUInt32LE(4, 0);
  prefix.writeUInt32LE(headerBuffer.length + headerPadding.length + 8, 4);
  prefix.writeUInt32LE(headerBuffer.length + headerPadding.length + 4, 8);
  prefix.writeUInt32LE(headerBuffer.length, 12);

  await writeFile(targetAsar, Buffer.concat([
    prefix,
    headerBuffer,
    headerPadding,
    ...files.map((file) => file.content),
  ]));
  return sha256Hex(headerBuffer);
}

async function patchExecutableAsarIntegrity(executablePath, asarHeaderHash) {
  const executable = await readFile(executablePath);
  const marker = Buffer.from(
    '"file":"resources\\\\app.asar","alg":"SHA256","value":"',
    "utf8",
  );
  const index = executable.indexOf(marker);
  if (index === -1) {
    throw new Error("Embedded app.asar integrity marker was not found in Codex.exe.");
  }

  const valueStart = index + marker.length;
  const oldHash = executable.subarray(valueStart, valueStart + 64).toString("utf8");
  if (!/^[a-f0-9]{64}$/i.test(oldHash)) {
    throw new Error(`Unexpected embedded app.asar hash: ${oldHash}`);
  }

  Buffer.from(asarHeaderHash, "utf8").copy(executable, valueStart);
  await writeFile(executablePath, executable);
  return { oldHash, newHash: asarHeaderHash };
}

async function main() {
  const sourceApp = await findCodexApp();
  const sourceAsar = path.join(sourceApp, "resources", "app.asar");
  const localAsar = path.join(LOCAL_APP, "resources", "app.asar");

  await stat(sourceAsar);
  await rm(LOCAL_ROOT, { recursive: true, force: true });
  await mkdir(LOCAL_ROOT, { recursive: true });
  await cp(sourceApp, LOCAL_APP, { recursive: true, preserveTimestamps: true });
  const asarHeaderHash = await rebuildAsar(sourceAsar, localAsar);
  const localExe = path.join(LOCAL_APP, "Codex.exe");
  const integrityPatch = await patchExecutableAsarIntegrity(localExe, asarHeaderHash);

  console.log(JSON.stringify({
    sourceApp,
    localApp: LOCAL_APP,
    localExe,
    localAsar,
    integrityPatch,
  }, null, 2));
}

await main();
