import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";
import postcss from "postcss";
import ts from "typescript";

const ROOT = process.cwd();
const DIRECT_INDENT = "          ";
const SKIP_DIRS = new Set([".git", ".vercel", "dist", "node_modules"]);

function resolvePath(relativePath) {
return path.join(ROOT, relativePath);
}

function read(relativePath) {
return fs.readFileSync(resolvePath(relativePath), "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

function write(relativePath, content) {
const target = resolvePath(relativePath);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, content.replace(/\r\n/g, "\n").trimEnd() + "\n", "utf8");
}

function remove(relativePath) {
const target = resolvePath(relativePath);
if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function replaceRequired(source, search, replacement, label) {
const next = source.replace(search, replacement);
if (next === source) throw new Error(`Missing expected block: ${label}`);
return next;
}

function consolidateTelegram() {
const corePath = resolvePath("lib/telegram/core.js");
if (!fs.existsSync(corePath)) {
console.log("USER FX · Telegram already consolidated.");
return;
}

let source = fs.readFileSync(corePath, "utf8").replace(/\r\n/g, "\n");

source = replaceRequired(source, 'const USERFX_SITE_URL = process.env.USERFX_SITE_URL || "https://userfx-web.vercel.app";', 'const USERFX_SITE_URL = process.env.USERFX_SITE_URL || "https://user18fx.com";', "USERFX_SITE_URL");

const helpers = `
function syntheticUsernameForId(id) {
  const value = String(id || "").trim();
  return /^\\d{5,20}$/.test(value) ? \`id_\${value}\` : "";
}

function visibleSpecialText(value) {
  return String(value || "")
    .replace(/TGMX-([A-HJ-NP-Z2-9]{4})/g, "SPCL-$1")
    .replace(/\\bTGMX\\b/g, "SPCL")
    .replace(/@id_(\\d{5,20})\\b/g, "ID $1")
    .replace(/\\bid_(\\d{5,20})\\b/g, "ID $1");
}
`;

source = replaceRequired(source, "const adminBot = new Telegraf(ADMIN_BOT_TOKEN);", `const adminBot = new Telegraf(ADMIN_BOT_TOKEN);${helpers}`, "Telegram helpers");

source = replaceRequired(source, '  const username = from?.username ? `@${from.username}` : "sin_username";', '  const rawUsername = from?.username || syntheticUsernameForId(from?.id);\n  const username = rawUsername ? `@${rawUsername}` : "sin_username";', "getUserMeta username");

source = source.replaceAll('ctx.from?.username || ""', 'ctx.from?.username || syntheticUsernameForId(ctx.from?.id)');
source = source.replace('(?:TGMX|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4}', '(?:TGMX|SPCL|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4}');
source = source.replace('button.text = fxBotTone(button.text);', 'button.text = visibleSpecialText(fxBotTone(button.text));');
source = source.replace('nextPayload[field] = fxBotTone(nextPayload[field]);', 'nextPayload[field] = visibleSpecialText(fxBotTone(nextPayload[field]));');

source = replaceRequired(
source,
'  return fxOriginalUserCallApi(method, nextPayload, signal);',
`  let nextMethod = method;

  if (method === "sendPhoto" && typeof nextPayload.photo === "string" && /\\.mp4(?:\\?|$)/i.test(nextPayload.photo)) {
    nextMethod = "sendVideo";
    nextPayload.video = nextPayload.photo;
    delete nextPayload.photo;
  }

  return fxOriginalUserCallApi(nextMethod, nextPayload, signal);`,
"Telegram media adapter",
);

source = source.replace(/function telegramFxPanelKeyboard\(usernameNormalized, mask\) \{[\s\S]*?\n\s*async function telegramFxRequest/, `function telegramFxPanelKeyboard(usernameNormalized, mask) {
  const buttons = TELEGRAMFX_FIELDS.map(([, label, bit]) => Markup.button.callback(\`${"${mask & bit ? \"✔\" : \"✘\"} ${label}"}\`, \`tfx_toggle_${"${usernameNormalized}