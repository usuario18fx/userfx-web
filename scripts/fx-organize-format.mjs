import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";
import postcss from "postcss";
import ts from "typescript";

const ROOT = process.cwd();
const DIRECT_INDENT = "          ";
const SKIP_DIRS = new Set([".git", ".vercel", "dist", "node_modules"]);
const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const FORMAT_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".css"]);

function abs(relativePath) {
  return path.join(ROOT, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(abs(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(abs(relativePath), "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

function write(relativePath, content) {
  const target = abs(relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.replace(/\r\n/g, "\n").trimEnd() + "\n", "utf8");
}

function remove(relativePath) {
  const target = abs(relativePath);
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function walk(relativeDir = ".", out = []) {
  const directory = abs(relativeDir);
  if (!fs.existsSync(directory)) return out;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const relativePath = path.join(relativeDir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) walk(relativePath, out);
    else out.push(relativePath);
  }
  return out;
}

function replaceRequired(source, search, replacement, label) {
  const next = source.replace(search, replacement);
  if (next === source) throw new Error(`Missing expected block: ${label}`);
  return next;
}

function ensureContains(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`Missing expected text: ${label}`);
}

function consolidateTelegram() {
  if (!exists("lib/telegram/core.js")) {
    console.log("USER FX · Telegram already consolidated.");
    return;
  }

  let source = read("lib/telegram/core.js");

  source = source.replace(
    'const USERFX_SITE_URL = process.env.USERFX_SITE_URL || "https://userfx-web.vercel.app";',
    'const USERFX_SITE_URL = process.env.USERFX_SITE_URL || "https://user18fx.com";',
  );

  const helpers = `\nfunction syntheticUsernameForId(id) {\n  const value = String(id || "").trim();\n  return /^\\d{5,20}$/.test(value) ? \`id_\${value}\` : "";\n}\n\nfunction visibleSpecialText(value) {\n  return String(value || "")\n    .replace(/TGMX-([A-HJ-NP-Z2-9]{4})/g, "SPCL-$1")\n    .replace(/\\bTGMX\\b/g, "SPCL")\n    .replace(/@id_(\\d{5,20})\\b/g, "ID $1")\n    .replace(/\\bid_(\\d{5,20})\\b/g, "ID $1");\n}\n`;

  if (!source.includes("function syntheticUsernameForId(")) {
    source = replaceRequired(
      source,
      "const adminBot = new Telegraf(ADMIN_BOT_TOKEN);",
      `const adminBot = new Telegraf(ADMIN_BOT_TOKEN);${helpers}`,
      "Telegram helper insertion",
    );
  }

  source = source.replace(
    '  const username = from?.username ? `@${from.username}` : "sin_username";',
    '  const rawUsername = from?.username || syntheticUsernameForId(from?.id);\n  const username = rawUsername ? `@${rawUsername}` : "sin_username";',
  );

  source = source.replaceAll(
    'ctx.from?.username || ""',
    'ctx.from?.username || syntheticUsernameForId(ctx.from?.id)',
  );

  source = source.replace(
    /\(\?:TGMX\|BSIC\|PRX0\|VIPX\)-\[A-HJ-NP-Z2-9\]\{4\}/g,
    "(?:TGMX|SPCL|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4}",
  );

  source = source.replace(
    "button.text = fxBotTone(button.text);",
    "button.text = visibleSpecialText(fxBotTone(button.text));",
  );
  source = source.replace(
    "nextPayload[field] = fxBotTone(nextPayload[field]);",
    "nextPayload[field] = visibleSpecialText(fxBotTone(nextPayload[field]));",
  );

  if (!source.includes("nextMethod = method")) {
    source = replaceRequired(
      source,
      "  return fxOriginalUserCallApi(method, nextPayload, signal);",
      `  let nextMethod = method;\n\n  if (method === "sendPhoto" && typeof nextPayload.photo === "string" && /\\.mp4(?:\\?|$)/i.test(nextPayload.photo)) {\n    nextMethod = "sendVideo";\n    nextPayload.video = nextPayload.photo;\n    delete nextPayload.photo;\n  }\n\n  return fxOriginalUserCallApi(nextMethod, nextPayload, signal);`,
      "Telegram media adapter",
    );
  }

  source = source.replace('status: "ᴀᴄᴛɪᴠᴇ",', 'status: "active",');
  source = source.replace('if (created === "ᴏᴋ") {', 'if (created === "OK") {');
  source = source.replace('bot.command("ɢᴇᴛᴄᴏᴅᴇ",', 'bot.command("getcode",');
  source = source.replace('bot.command("ɪᴅᴇɴᴛɪᴛʏ",', 'bot.command("identity",');

  const keyboardPattern = /function telegramFxPanelKeyboard\(usernameNormalized, mask\) \{[\s\S]*?\n\s*async function telegramFxRequest/;
  if (keyboardPattern.test(source)) {
    source = source.replace(
      keyboardPattern,
      `function telegramFxPanelKeyboard(usernameNormalized, mask) {\n  const buttonFor = (label, bit) => Markup.button.callback(\`${"${mask & bit ? \"✔\" : \"✘\"} ${label}"}\`, \`tfx_toggle_${"${usernameNormalized}"}_${"${mask ^ bit}"}\`);\n  const telegramfx = buttonFor("ᴛᴇʟᴇɢʀᴀᴍꜰx", 1);\n  const gallery = buttonFor("ɢᴀʟʟᴇʀʏ", 2);\n  const chat = buttonFor("ᴄʜᴀᴛ", 4);\n  const priv = buttonFor("ᴘʀɪᴠ", 8);\n  const group = buttonFor("ɢʀᴏᴜᴘ", 16);\n  const save = Markup.button.callback("💾 ꜱᴀᴠᴇ", \`tfx_save_${"${usernameNormalized}"}_${"${mask}"}\`);\n  const revoke = Markup.button.callback("⛔ ʀᴇᴠᴏᴋᴇ ᴀʟʟ", \`tfx_revoke_${"${usernameNormalized}"}_0\`);\n  return Markup.inlineKeyboard([[telegramfx], [gallery, chat], [priv, group], [save, revoke]]);\n}\nasync function telegramFxRequest`,
    );
  }

  const accessPattern = /bot\.command\("access", async \(ctx\) => \{[\s\S]*?\n\s*\}\}\);/;
  const accessMatch = source.match(accessPattern);
  if (accessMatch) {
    let block = accessMatch[0];
    block = block.replace(
      "    const parsed = normalizeTelegramFxUsername(getCommandArg(ctx));",
      `    let accessTarget = getCommandArg(ctx);\n    if (/^\\d{5,20}$/.test(accessTarget)) {\n      try {\n        const chat = await ctx.telegram.getChat(accessTarget);\n        accessTarget = String(chat?.username || syntheticUsernameForId(accessTarget));\n      } catch {\n        accessTarget = syntheticUsernameForId(accessTarget);\n      }\n    }\n    const parsed = normalizeTelegramFxUsername(accessTarget);`,
    );
    source = source.replace(accessMatch[0], block);
  }

  ensureContains(source, 'status: "active"', "active access-code status");
  ensureContains(source, 'if (created === "OK") {', "Redis OK result");
  ensureContains(source, 'bot.command("getcode"', "getcode command");
  ensureContains(source, 'bot.command("identity"', "identity command");

  write("api/telegram.js", source);
  remove("lib/telegram/core.js");
  console.log("USER FX · Telegram consolidated into api/telegram.js.");
}

function splitSimpleJsxText(source) {
  const pattern = /(^[ \t]*)(<([A-Za-z][A-Za-z0-9_.:-]*)\b[^<>\n]*>)([^<>{}\n]+)(<\/\3>)/gm;
  let previous;
  let next = source;
  do {
    previous = next;
    next = next.replace(pattern, (_match, indent, open, _tag, text, close) => {
      const inner = String(text).trim();
      if (!inner) return _match;
      return `${indent}${open}\n${indent}${inner}\n${indent}${close}`;
    });
  } while (next !== previous);
  return next;
}

function compactCss(source) {
  return source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const trimmedRight = line.replace(/[ \t]+$/g, "");
      if (/^\s*\/\*/.test(trimmedRight) || /^\s*\*/.test(trimmedRight)) return trimmedRight;
      const declaration = trimmedRight.match(/^(\s*)(--?[A-Za-z][\w-]*|[A-Za-z][\w-]*):\s*(.+);$/);
      if (declaration) return `${declaration[1]}${declaration[2]}:${declaration[3].trim()};`;
      return trimmedRight.replace(/\s+\{$/, "{");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function sectionHeading(line) {
  const t = line.trim();
  return (
    /^\/\/\s*[═=─-]{3,}/.test(t) ||
    /^\/\/\s*[A-Z0-9][A-Z0-9 .·/|:_-]{2,}$/.test(t) ||
    /^\/\*\s*[═=─-]{3,}/.test(t) ||
    /^\/\*.*(?:SECTION|USER FX|TELEGRAM|REDIS|PRIVATE ROOM|VAULT|API).*\*\/$/i.test(t)
  );
}

function templateContinuationLines(source) {
  const protectedLines = new Set();
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, source);
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === "\n") starts.push(i + 1);
  const lineOf = (position) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= position) lo = mid + 1;
      else hi = mid - 1;
    }
    return Math.max(0, hi);
  };

  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token !== ts.SyntaxKind.NoSubstitutionTemplateLiteral &&
      token !== ts.SyntaxKind.TemplateHead &&
      token !== ts.SyntaxKind.TemplateMiddle &&
      token !== ts.SyntaxKind.TemplateTail
    ) continue;
    const startLine = lineOf(scanner.getTokenPos());
    const endLine = lineOf(scanner.getTextPos());
    for (let line = startLine + 1; line <= endLine; line++) protectedLines.add(line);
  }
  return protectedLines;
}

function applyDirectIndent(source, extension) {
  if (!CODE_EXTS.has(extension)) return source;
  const protectedLines = templateContinuationLines(source);
  return source
    .split("\n")
    .map((line, index) => {
      if (!line.trim()) return "";
      if (protectedLines.has(index)) return line;
      if (sectionHeading(line)) return line.trimStart();
      return `${DIRECT_INDENT}${line}`;
    })
    .join("\n");
}

function validateCode(relativePath, source) {
  const extension = path.extname(relativePath).toLowerCase();
  if (!CODE_EXTS.has(extension)) return;
  const kind = extension === ".tsx" ? ts.ScriptKind.TSX : extension === ".jsx" ? ts.ScriptKind.JSX : extension === ".ts" ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const file = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, kind);
  if (file.parseDiagnostics.length) {
    const first = file.parseDiagnostics[0];
    throw new Error(`${relativePath}: parse error ${first.messageText}`);
  }
}

async function formatProject() {
  const prettierConfig = {
    printWidth: 1000,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    bracketSameLine: true,
    singleAttributePerLine: false,
  };

  for (const relativePath of walk(".")) {
    const extension = path.extname(relativePath).toLowerCase();
    if (!FORMAT_EXTS.has(extension)) continue;
    if (relativePath === "scripts/fx-organize-format.mjs") continue;

    const parser = extension === ".css" ? "css" : extension === ".tsx" ? "typescript" : extension === ".ts" ? "typescript" : "babel";
    let source = read(relativePath);
    source = await prettier.format(source, { ...prettierConfig, parser });

    if (extension === ".tsx" || extension === ".jsx") source = splitSimpleJsxText(source);
    if (extension === ".css") {
      postcss.parse(source, { from: relativePath });
      source = compactCss(source);
    }

    source = applyDirectIndent(source, extension);
    validateCode(relativePath, source);
    write(relativePath, source);
  }
}

function removeStaleFiles() {
  const stale = [
    "PrivateRoomDirectGate.CONFLICT-BACKUP.css",
    "GITIGNORE-ADD.txt",
    "components/PrivateRoom/PrivateRoomDirectGateButtons.css",
    "components/PrivateRoom/PrivateRoomUnified.css",
    "components/VaultHome/mobile-polish.css",
    "components/VaultDevice/VaultDevice.mobile.css",
  ];
  for (const file of stale) remove(file);
}

async function main() {
  console.log("USER FX · 1/4 · Consolidating Telegram...");
  consolidateTelegram();
  console.log("USER FX · 2/4 · Removing stale patch/backup files...");
  removeStaleFiles();
  console.log("USER FX · 3/4 · Formatting TS/TSX/JS/JSX/CSS...");
  await formatProject();
  console.log("USER FX · 4/4 · Complete. Run npm run build.");
}

await main();
