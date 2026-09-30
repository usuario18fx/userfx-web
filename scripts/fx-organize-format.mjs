import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";
import postcss from "postcss";
import ts from "typescript";

const ROOT = process.cwd();
const DIRECT_INDENT = "          ";
const SKIP_DIRS = new Set([".git", ".vercel", "dist", "node_modules"]);

function filePath(...parts) {
return path.join(ROOT, ...parts);
}

function exists(...parts) {
return fs.existsSync(filePath(...parts));
}

function read(...parts) {
return fs.readFileSync(filePath(...parts), "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

function writeRelative(relativePath, content) {
const target = filePath(relativePath);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, content.replace(/\r\n/g, "\n").trimEnd() + "\n", "utf8");
}

function removeRelative(relativePath) {
const target = filePath(relativePath);
if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function replaceRequired(source, search, replacement, label) {
const next = source.replace(search, replacement);
if (next === source) throw new Error(`Missing expected Telegram block: ${label}`);
return next;
}

function syntheticUsernameHelper() {
return `function syntheticUsernameForId(id) {\n  const value = String(id || "").trim();\n  return /^\\d{5,20}$/.test(value) ? \`id_\${value}\` : "";\n}\n\nfunction visibleSpecialText(value) {\n  return String(value || "")\n    .replace(/TGMX-([A-HJ-NP-Z2-9]{4})/g, "SPCL-$1")\n    .replace(/\\bTGMX\\b/g, "SPCL")\n    .replace(/@id_(\\d{5,20})\\b/g, "ID $1")\n    .replace(/\\bid_(\\d{5,20})\\b/g, "ID $1");\n}\n`;
}

function consolidateTelegram() {
const corePath = filePath("lib", "telegram", "core.js");
if (!fs.existsSync(corePath)) {
console.log("USER FX · Telegram already consolidated.");
return;
}

let source = fs.readFileSync(corePath, "utf8").replace(/\r\n/g, "\n");

source = replaceRequired(
source,
'const USERFX_SITE_URL = process.env.USERFX_SITE_URL || "https://userfx-web.vercel.app";',
'const USERFX_SITE_URL = process.env.USERFX_SITE_URL || "https://user18fx.com";',
"canonical USERFX_SITE_URL",
);

source = replaceRequired(
source,
'const adminBot = new Telegraf(ADMIN_BOT_TOKEN);\nbot.telegram.webhookReply = false;',
`const adminBot = new Telegraf(ADMIN_BOT_TOKEN);\n\n${syntheticUsernameHelper()}\nbot.telegram.webhookReply = false;`,
"synthetic username helpers",
);

source = replaceRequired(
source,
'  const username = from?.username ? `@${from.username}` : "sin_username";',
'  const rawUsername = from?.username || syntheticUsernameForId(from?.id);\n  const username = rawUsername ? `@${rawUsername}` : "sin_username";',
"getUserMeta synthetic username",
);

source = source.replaceAll(
'ctx.from?.username || ""',
'ctx.from?.username || syntheticUsernameForId(ctx.from?.id)',
);

source = replaceRequired(
source,
'  const text = fxGenZRewrite(value);',
'  const text = fxGenZRewrite(value);',
"fxBotTone anchor",
);

source = replaceRequired(
source,
'/(<[^>]+>|https?:\\/\\/[^\\s<]+|t\\.me\\/[^\\s<]+|@[A-Za-z0-9_]+|(?:TGMX|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4})/g;',
'/(<[^>]+>|https?:\\/\\/[^\\s<]+|t\\.me\\/[^\\s<]+|@[A-Za-z0-9_]+|\\bid_\\d{5,20}\\b|(?:TGMX|SPCL|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4})/g;',
"protected outgoing tokens",
);

source = replaceRequired(
source,
'      button.text = fxBotTone(button.text);',
'      button.text = visibleSpecialText(fxBotTone(button.text));',
"button visible special text",
);

source = replaceRequired(
source,
'      nextPayload[field] = fxBotTone(nextPayload[field]);',
'      nextPayload[field] = visibleSpecialText(fxBotTone(nextPayload[field]));',
"message visible special text",
);

source = replaceRequired(
source,
'  return fxOriginalUserCallApi(method, nextPayload, signal);',
`  let nextMethod = method;\n\n  if (\n    method === "sendPhoto" &&\n    typeof nextPayload.photo === "string" &&\n    /\\.mp4(?:\\?|$)/i.test(nextPayload.photo)\n  ) {\n    nextMethod = "sendVideo";\n    nextPayload.video = nextPayload.photo;\n    delete nextPayload.photo;\n  }\n\n  return fxOriginalUserCallApi(nextMethod, nextPayload, signal);`,
"mp4 media adapter",
);

source = replaceRequired(
source,
`function telegramFxPanelKeyboard(usernameNormalized, mask) {\n  const rows = TELEGRAMFX_FIELDS.map(([, label, bit]) => [\n      Markup.button.callback(\n      \`${"${mask & bit ? \"✔\" : \"✘\"} ${label}"}\`,\n      \`tfx_toggle_${"${usernameNormalized}