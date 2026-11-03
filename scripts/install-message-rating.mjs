import fs from 'node:fs';
const botPath = 'server/api/telegram.js';
const landingPath = 'components/FX/Landing.tsx';
let bot = fs.readFileSync(botPath, 'utf8');
let landing = fs.readFileSync(landingPath, 'utf8');
const anchor = 'const accessEntryModes = new Map();';
if (!bot.includes('installMessages(')) {
  if (bot.split(anchor).length !== 2 || !bot.includes('async function resolveNoticeRecipient(')) throw new Error('El bot no tiene la versión esperada. No se modificó.');
  bot = 'import { installMessages } from "../../lib/bot-message.js";\n' + bot.replace(anchor, `for (const [targetBot, botId] of [[bot, 'user'], [adminBot, 'admin']]) {
  installMessages(targetBot, { redis: ensureRedis, isAdmin, resolveRecipient: resolveNoticeRecipient,
    sender: bot.telegram, siteUrl: USERFX_SITE_URL, secret: BOT_TOKEN, botId });
}
${anchor}`);
}
if (!landing.includes('<FxRating />')) {
  if (landing.split('</main>').length !== 2) throw new Error('Landing no coincide. No se modificó.');
  landing = landing.replace('"use client";', '"use client";\nimport FxRating from "../FxRating/FxRating";').replace('</main>', '<FxRating />\n </main>');
}
fs.writeFileSync(botPath, bot, 'utf8');
fs.writeFileSync(landingPath, landing, 'utf8');
console.log('/message y coronas integrados. Ejecuta npm run build antes de publicar.');
