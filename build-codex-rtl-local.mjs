import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SOURCE_APP =
  "C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.429.8261.0_x64__2p2nqsd0c76g0\\app";
const LOCAL_ROOT =
  "C:\\Users\\ibnra.DESKTOP-A17OJSP\\Documents\\Codex\\2026-05-07\\rtl\\_codex_rtl_app_v9";
const LOCAL_APP = path.join(LOCAL_ROOT, "app");
const SOURCE_ASAR = path.join(SOURCE_APP, "resources", "app.asar");
const LOCAL_ASAR = path.join(LOCAL_APP, "resources", "app.asar");
const TARGET = "/webview/index.html";

const RTL_INJECTION = String.raw`
    <script>
      (() => {
        const applyCodexRtl = () => {
          document.documentElement.setAttribute("dir", "rtl");
          document.documentElement.setAttribute("lang", "ar");
        };
        applyCodexRtl();
        new MutationObserver(applyCodexRtl).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["dir", "lang"],
        });
      })();
    </script>
    <style id="codex-rtl-local-patch">
      html,
      body,
      #root {
        direction: rtl;
      }

      textarea,
      input,
      [contenteditable="true"] {
        direction: rtl;
        text-align: right;
        unicode-bidi: plaintext;
      }

      button[role="switch"],
      button[role="switch"] * {
        direction: ltr;
        unicode-bidi: isolate;
      }

      [data-test-id="header-shell-slot"],
      [data-test-id="header-shell-slot"] > div {
        direction: ltr;
        unicode-bidi: isolate;
      }

      [data-test-id="header-shell-slot"] button,
      [data-test-id="header-shell-slot"] [role="button"] {
        flex: 0 0 auto;
      }

      [data-app-shell-header-edge-scroll] .text-md,
      [data-app-shell-header-edge-scroll] [class*="max-w-[320px]"] {
        direction: rtl;
        text-align: right;
        unicode-bidi: plaintext;
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

      nav[aria-label] [role="listitem"] svg,
      [data-test-id="header-shell-slot"] svg {
        flex: 0 0 auto;
      }

      [data-thread-title-trigger] {
        min-width: 0;
        direction: rtl;
        text-align: right;
        box-sizing: border-box;
      }

      [data-thread-title] {
        direction: rtl;
        text-align: right;
        unicode-bidi: plaintext;
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

function parseAsar(buffer) {
  const headerSize = buffer.readUInt32LE(12);
  const headerStart = 16;
  const headerEnd = headerStart + headerSize;
  return {
    header: JSON.parse(buffer.slice(headerStart, headerEnd).toString("utf8")),
    dataOffset: headerEnd,
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

  return withLang.replace("</head>", `${RTL_INJECTION}\n  </head>`);
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
    }

    entry.size = content.length;
    entry.offset = String(files.reduce((total, item) => total + item.content.length, 0));
    files.push({ content });
  });

  const headerBuffer = Buffer.from(JSON.stringify(header), "utf8");
  const prefix = Buffer.alloc(16);
  prefix.writeUInt32LE(4, 0);
  prefix.writeUInt32LE(headerBuffer.length + 8, 4);
  prefix.writeUInt32LE(headerBuffer.length + 4, 8);
  prefix.writeUInt32LE(headerBuffer.length, 12);

  await writeFile(targetAsar, Buffer.concat([prefix, headerBuffer, ...files.map((file) => file.content)]));
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
  await stat(SOURCE_ASAR);
  await rm(LOCAL_ROOT, { recursive: true, force: true });
  await mkdir(LOCAL_ROOT, { recursive: true });
  await cp(SOURCE_APP, LOCAL_APP, { recursive: true, preserveTimestamps: true });
  const asarHeaderHash = await rebuildAsar(SOURCE_ASAR, LOCAL_ASAR);
  const integrityPatch = await patchExecutableAsarIntegrity(
    path.join(LOCAL_APP, "Codex.exe"),
    asarHeaderHash,
  );

  console.log(JSON.stringify({
    sourceApp: SOURCE_APP,
    localApp: LOCAL_APP,
    localExe: path.join(LOCAL_APP, "Codex.exe"),
    localAsar: LOCAL_ASAR,
    integrityPatch,
  }, null, 2));
}

await main();
