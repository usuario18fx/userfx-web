import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;

const WEBSITE_URL = "https://userfx-web.vercel.app";

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}
 
const bot = new Telegraf(BOT_TOKEN);

const BRAND = "𝐅𝐗 | 𝐖𝐄𝐁𝐒𝐈𝐓𝐄";
const PLAN_NAME = "🔷 userFX";
const EXPIRES_AT = "Mar 25, 2026 · 08:13 a.m.";
const STATUS = "Verified";
const ACCESS_STATE = "Active";

function getMainKeyboard() {
  return Markup.keyboard(
    [
      ["💳 Membership"],
      ["🔐 Access", "🖥️ Channels"],
      ["🔄 Refresh"],
    ],
    { columns: 2 }
  ).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard([["📺", "🌩️"], ["📸", "🎁"], ["↩️"]]).resize();
}

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "↗ ENTER SITE", url: WEBSITE_URL }]],
    },
  };
}

async function sendMainPanel(ctx) {
  await ctx.reply(
    `${BRAND}

<b>Exclusive access panel</b>

Premium content, private sections, and direct entry.

Choose a section below.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendMembershipPanel(ctx) {
  await ctx.reply(
    `☁️ <b>MEMBERSHIP</b>

Plan
<b>${PLAN_NAME}</b>

Status
<b>${STATUS}</b>

Access
<b>${ACCESS_STATE}</b>

Expires
<b>${EXPIRES_AT}</b>

Your membership is currently active.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendAccessPanel(ctx) {
  await ctx.reply(
    `🔓 <b>ACCESS OPEN</b>

Plan
<b>${PLAN_NAME}</b>

Status
<b>${ACCESS_STATE}</b>

Valid until
<b>${EXPIRES_AT}</b>

Choose a section below.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `🖥️ <b>CHANNELS</b>

Private channel access
Exclusive drops
Locked sections
Direct website entry

Use the button below to enter.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendRefreshPanel(ctx) {
  await ctx.reply(
    `🔄 <b>STATUS UPDATED</b>

Plan
<b>${PLAN_NAME}</b>

Status
<b>${STATUS}</b>

Access
<b>${ACCESS_STATE}</b>

Expires
<b>${EXPIRES_AT}</b>`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendFeedMessage(ctx) {
  await ctx.reply(
    `📺 <b>FEED</b>

Selected drops
Public previews
Featured content`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendVideoCloudsMessage(ctx) {
  await ctx.reply(
    `🌩️ <b>VIDEOCLOUDS</b>

Ambient room
Visual session
Cloud access enabled`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  await ctx.reply(
    `📸 <b>PHOTOS</b>

Unlocked visual section
Private gallery access`,
    {
      parse_mode: "HTML",
    return res.status(500).json({
      ok: false,
      error: "handler_error",
      details: String(error?.message || error),
    });
  }
}
