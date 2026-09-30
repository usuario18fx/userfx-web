import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function file(rel) {
          return path.join(ROOT,rel);
}

function exists(rel) {
          return fs.existsSync(file(rel));
}

function read(rel) {
          return fs.readFileSync(file(rel),"utf8").replace(/^\uFEFF/,"").replace(/\r\n/g,"\n");
}

function write(rel,content) {
          fs.mkdirSync(path.dirname(file(rel)),{recursive:true});
          fs.writeFileSync(file(rel),content.trimEnd() + "\n","utf8");
}

function remove(rel) {
          if (!exists(rel)) return;
          fs.rmSync(file(rel),{recursive:true,force:true});
          console.log(`removed ${rel}`);
}

function replaceRequired(text,oldValue,newValue,label) {
          if (!text.includes(oldValue)) throw new Error(`Missing expected block: ${label}`);
          return text.replace(oldValue,newValue);
}

function replaceAllRequired(text,oldValue,newValue,label) {
          if (!text.includes(oldValue)) throw new Error(`Missing expected block: ${label}`);
          return text.split(oldValue).join(newValue);
}

function replaceFunction(text,startToken,endToken,replacement,label) {
          const start = text.indexOf(startToken);
          if (start < 0) throw new Error(`Missing function start: ${label}`);
          const end = text.indexOf(endToken,start);
          if (end < 0) throw new Error(`Missing function end: ${label}`);
          return text.slice(0,start) + replacement.trimEnd() + "\n" + text.slice(end);
}

function removeSection(text,startTitle,endTitle) {
          const titleStart = text.indexOf(`// ${startTitle}`);
          if (titleStart < 0) return text;
          const start = text.lastIndexOf("// ======================================================",titleStart);
          const titleEnd = text.indexOf(`// ${endTitle}`,titleStart);
          if (titleEnd < 0) throw new Error(`Missing ending section ${endTitle}`);
          const end = text.lastIndexOf("// ======================================================",titleEnd);
          if (start < 0 || end < 0) throw new Error(`Could not isolate ${startTitle}`);
          return text.slice(0,start) + text.slice(end);
}

function mergeCss(target,source,label) {
          if (!exists(source)) return;
          if (!exists(target)) throw new Error(`Missing CSS target ${target}`);
          const targetText = read(target).trimEnd();
          const sourceText = read(source).trim();
          const marker = `/* ═══════════ ${label} ═══════════ */`;
          const next = targetText.includes(marker) ? targetText : `${targetText}\n\n${marker}\n${sourceText}`;
          write(target,next);
          remove(source);
}

function removeImportEverywhere(importName) {
          const roots = ["app.jsx","main.jsx","components"];
          const targets = [];
          function walk(abs) {
                    if (!fs.existsSync(abs)) return;
                    const stat = fs.statSync(abs);
                    if (stat.isFile()) {
                              targets.push(abs);
                              return;
                    }
                    for (const entry of fs.readdirSync(abs,{withFileTypes:true})) {
                              if (entry.name === "node_modules" || entry.name === "dist") continue;
                              walk(path.join(abs,entry.name));
                    }
          }
          for (const root of roots) walk(file(root));
          for (const abs of targets) {
                    if (!/\.(tsx|jsx|ts|js)$/.test(abs)) continue;
                    const original = fs.readFileSync(abs,"utf8");
                    const lines = original.split(/\r?\n/);
                    const next = lines.filter((line) => !(line.includes("import") && line.includes(importName))).join("\n");
                    if (next !== original) fs.writeFileSync(abs,next.replace(/\n{3,}/g,"\n\n").trimEnd() + "\n","utf8");
          }
}

function unifyTelegram() {
          const corePath = "lib/telegram/core.js";
          if (!exists(corePath)) throw new Error("lib/telegram/core.js not found");
          let telegram = read(corePath);

          telegram = removeSection(telegram,"USER BOT VOICE · NATIVE GEN-Z ENGLISH + SMALL CAPS","TOKEN VALIDATION");
          telegram = replaceRequired(
                    telegram,
                    'const USERFX_SITE_URL = process.env.USERFX_SITE_URL || "https://userfx-web.vercel.app";',
                    'const USERFX_SITE_URL = process.env.USERFX_SITE_URL || "https://user18fx.com";',
                    "USERFX_SITE_URL",
          );

          const utilityAnchor = `function isAdmin(ctx) {\n  return String(ctx.from?.id || "") === String(ADMIN_USER_ID);\n}`;
          const utilities = `${utilityAnchor}\n\nfunction syntheticUsernameForId(id) {\n          const value = String(id || "").trim();\n          return /^\\d{5,20}$/.test(value) ? \`id_\${value}\` : "";\n}\n\nfunction visibleTelegramIdentity(value) {\n          return String(value || "").replace(/^@?id_(\\d{5,20})$/i,"ID $1");\n}\n\nasync function resolveTelegramFxTarget(ctx,value) {\n          const raw = String(value || "").trim().replace(/^@+/,"");\n          if (!raw) return null;\n          if (/^\\d{5,20}$/.test(raw)) {\n                    try {\n                              const chat = await ctx.telegram.getChat(raw);\n                              return normalizeTelegramFxUsername(chat?.username || syntheticUsernameForId(raw));\n                    } catch {\n                              return normalizeTelegramFxUsername(syntheticUsernameForId(raw));\n                    }\n          }\n          return normalizeTelegramFxUsername(raw);\n}`;
          telegram = replaceRequired(telegram,utilityAnchor,utilities,"Telegram identity helpers");

          telegram = replaceRequired(
                    telegram,
                    '  const username = from?.username ? `@${from.username}` : "sin_username";',
                    '  const rawUsername = from?.username || syntheticUsernameForId(from?.id);\n  const username = rawUsername ? `@${rawUsername}` : "sin_username";',
                    "getUserMeta username",
          );

          telegram = replaceAllRequired(
                    telegram,
                    'normalizeTelegramFxUsername(ctx.from?.username || "")',
                    'normalizeTelegramFxUsername(ctx.from?.username || syntheticUsernameForId(ctx.from?.id))',
                    "identity username normalization",
          );

          telegram = replaceRequired(
                    telegram,
                    '${escapeHtml(username?.display || "")}',
                    '${escapeHtml(visibleTelegramIdentity(username?.display || ""))}',
                    "visible identity label",
          );

          const keyboardReplacement = `function telegramFxPanelKeyboard(usernameNormalized, mask) {\n          const buttons = TELEGRAMFX_FIELDS.map(([,label,bit]) =>\n                    Markup.button.callback(\n                              \`\${mask & bit ? "✔" : "✘"} \${label}\`,\n                              \`tfx_toggle_\${usernameNormalized}_\${mask ^ bit}\`,\n                    ),\n          );\n          const [telegramfx,gallery,chat,priv,group] = buttons;\n          const save = Markup.button.callback("💾 ꜱᴀᴠᴇ",\`tfx_save_\${usernameNormalized}_\${mask}\`);\n          const revoke = Markup.button.callback("⛔ ʀᴇᴠᴏᴋᴇ ᴀʟʟ",\`tfx_revoke_\${usernameNormalized}_0\`);\n          return Markup.inlineKeyboard([\n                    [telegramfx],\n                    [gallery,chat],\n                    [priv,group],\n                    [save,revoke],\n          ]);\n}\n`;
          telegram = replaceFunction(
                    telegram,
                    "function telegramFxPanelKeyboard(usernameNormalized, mask) {",
                    "  async function telegramFxRequest",
                    keyboardReplacement,
                    "telegramFxPanelKeyboard",
          ).replace("  async function telegramFxRequest","async function telegramFxRequest");

          const mediaReplacement = `async function sendMediaSafe(ctx, kind, url, extra = {}) {\n          try {\n                    const normalizedKind = String(kind || "").toLowerCase();\n                    const videoByName = normalizedKind === "video" || normalizedKind.includes("ᴠɪᴅᴇᴏ");\n                    const videoByUrl = /\\.mp4(?:\\?|$)/i.test(String(url || ""));\n                    if (videoByName || videoByUrl) {\n                              await ctx.replyWithVideo(url,extra);\n                              return;\n                    }\n                    await ctx.replyWithPhoto(url,extra);\n          } catch (error) {\n                    logger.error("ꜱᴇɴᴅ ᴍᴇᴅɪᴀ ᴇʀʀᴏʀ",{kind,url,...getTelegramError(error)});\n          }\n}\n`;
          telegram = replaceFunction(
                    telegram,
                    "async function sendMediaSafe(ctx, kind, url, extra = {}) {",
                    "//// BUTTON TRACKING //",
                    mediaReplacement,
                    "sendMediaSafe",
          );

          telegram = replaceAllRequired(telegram,'bot.command("ɢᴇᴛᴄᴏᴅᴇ"','bot.command("getcode"',"getcode command");
          telegram = replaceAllRequired(telegram,'bot.command("ɪᴅᴇɴᴛɪᴛʏ"','bot.command("identity"',"identity command");
          telegram = replaceAllRequired(telegram,'status: "ᴀᴄᴛɪᴠᴇ"','status: "active"',"access code active status");
          telegram = replaceAllRequired(telegram,'created === "ᴏᴋ"','created === "OK"',"Redis NX return value");

          telegram = replaceRequired(
                    telegram,
                    '  return redisGetJson(getCodeKey(normalized));',
                    '  const record = await redisGetJson(getCodeKey(normalized));\n  if (record?.status === "ᴀᴄᴛɪᴠᴇ") record.status = "active";\n  return record;',
                    "legacy access record normalization",
          );

          telegram = replaceAllRequired(
                    telegram,
                    'const parsed = normalizeTelegramFxUsername(getCommandArg(ctx));',
                    'const parsed = await resolveTelegramFxTarget(ctx,getCommandArg(ctx));',
                    "admin TelegramFX target resolution",
          );

          telegram = telegram.replace(
                    'return `🔐 <b>ᴛᴇʟᴇɢʀᴀᴍ𝐅𝐗 ᴀᴄᴄᴇꜱꜱ</b>\\n\\n<b>${escapeHtml(username)}</b>',
                    'return `🔐 <b>ᴛᴇʟᴇɢʀᴀᴍ𝐅𝐗 ᴀᴄᴄᴇꜱꜱ</b>\\n\\n<b>${escapeHtml(visibleTelegramIdentity(username))}</b>',
          );

          telegram = telegram.replace(/\n{4,}/g,"\n\n");
          write("api/telegram.js",telegram);
          remove("lib/telegram/core.js");
          console.log("unified Telegram bot into api/telegram.js");
}

function cleanCssFragments() {
          mergeCss("components/VaultHome/VaultHome.css","components/VaultHome/mobile-polish.css","USER FX · VAULT HOME · MOBILE");
          mergeCss("components/VaultDevice/VaultDevice.css","components/VaultDevice/VaultDevice.mobile.css","USER FX · VAULT DEVICE · MOBILE");
          mergeCss("components/PrivateRoom/PrivateRoomLuxury.css","components/PrivateRoom/PrivateRoomUnified.css","USER FX · PRIVATE ROOM · UNIFIED");
          mergeCss("components/PrivateRoom/PrivateRoomDirectGate.css","components/PrivateRoom/PrivateRoomDirectGateButtons.css","USER FX · DIRECT GATE · BUTTONS");
          removeImportEverywhere("mobile-polish.css");
          removeImportEverywhere("VaultDevice.mobile.css");
          removeImportEverywhere("PrivateRoomUnified.css");
          removeImportEverywhere("PrivateRoomDirectGateButtons.css");
}

function removePatchArtifacts() {
          const files = [
                    "-recuperar",
                    "GITIGNORE-ADD.txt",
                    "PrivateRoomDirectGate.CONFLICT-BACKUP.css",
                    "scripts/apply-private-room-spcl-return-fix.mjs",
                    "scripts/cleanup-userfx-2026-09.py",
                    "scripts/fix-private-room-mobile-black-screen.mjs",
                    "scripts/fix-private-room-mobile-black-screen-v2.mjs",
                    "scripts/fix-private-room-mobile-black-screen-v3.mjs",
                    "scripts/fx-organize-format.mjs",
                    "scripts/integrate_tgmx.py",
                    "scripts/restore-private-room-final-design.mjs",
                    "scripts/restore-private-room-final-design-v2.mjs",
                    "scripts/restore-private-room-final-design-v3.mjs",
          ];
          for (const rel of files) remove(rel);
          remove("components/FxAccess/FxAccessModal");
}

function updatePackage() {
          const pkg = JSON.parse(read("package.json"));
          pkg.scripts = {
                    dev:pkg.scripts?.dev || "vite",
                    build:pkg.scripts?.build || "vite build",
                    "format:fx":"node scripts/format-userfx.mjs",
                    "check:fx":"npm run format:fx && npm run build",
          };
          write("package.json",JSON.stringify(pkg,null,2));
}

unifyTelegram();
cleanCssFragments();
removePatchArtifacts();
updatePackage();
console.log("USER FX · structural cleanup complete");
