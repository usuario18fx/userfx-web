import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBSITE_URL = "https://userfx-web.vercel.app";

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}

const bot = new Telegraf(BOT_TOKEN);

const BRAND = "𝐔𝐬𝐞𝐫Ŧҳ 🜲";

const MEMBERSHIPS = {
  userfx: {
    key: "userfx",
    title: "🔷 userFX",
    days: 8,
    stars: 500,
    accessLabel: "X/USER",
  },
  vipfx: {
    key: "vipfx",
    title: "👑 vipFX",
    days: 30,
    stars: 1500,
    accessLabel: "V/VIP",
  },
};

const activeMembers = new Map();

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

function getMembershipInlineKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `🔷 userFX • ${MEMBERSHIPS.userfx.stars} XTR`,
        "buy_userfx"
      ),
    ],
    [
      Markup.button.callback(
        `👑 vipFX • ${MEMBERSHIPS.vipfx.stars} XTR`,
        "buy_vipfx"
      ),
    ],
    [Markup.button.url("↗ ENTER SITE", WEBSITE_URL)],
  ]);
}

function getUserKey(ctx) {
  return String(ctx.from?.id || "");
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getActiveMembership(ctx) {
  const key = getUserKey(ctx);
  const current = activeMembers.get(key);

  if (!current) return null;

  if (current.expiresAtMs <= Date.now()) {
    activeMembers.delete(key);
    return null;
  }

  return current;
}

function activateMembership(ctx, plan) {
  const now = Date.now();
  const expiresAtMs = now + plan.days * 24 * 60 * 60 * 1000;

  const membership = {
    planKey: plan.key,
    title: plan.title,
    days: plan.days,
    stars: plan.stars,
    accessLabel: plan.accessLabel,
    status: "Active",
    expiresAtMs,
    expiresAtText: formatDateTime(new Date(expiresAtMs)),
  };

  activeMembers.set(getUserKey(ctx), membership);
  return membership;
}

function getMembershipPanelText(ctx) {
  const membership = getActiveMembership(ctx);

  if (!membership) {
    return `☁️ <b>MEMBERSHIP</b>

Choose a plan and pay with Telegram Stars.

Available plans
<b>🔷 userFX</b> — 8 days — <b>${MEMBERSHIPS.userfx.stars} XTR</b>
<b>👑 vipFX</b> — 30 days — <b>${MEMBERSHIPS.vipfx.stars} XTR</b>

Status
<b>Inactive</b>

Access
<b>Locked</b>`;
  }

  return `☁️ <b>MEMBERSHIP</b>

Plan
<b>${membership.title}</b>

Status
<b>${membership.status}</b>

Access
<b>${membership.accessLabel}</b>

Expires
<b>${membership.expiresAtText}</b>`;
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
  await ctx.reply(getMembershipPanelText(ctx), {
    parse_mode: "HTML",
    ...getMembershipInlineKeyboard(),
  });

  await ctx.reply("‎", getMainKeyboard());
}

async function sendAccessPanel(ctx) {
  const membership = getActiveMembership(ctx);

  if (!membership) {
    await ctx.reply(
      `🔐 <b>ACCESS LOCKED</b>

No active membership found.

Open <b>Membership</b> and complete payment with Stars.`,
      {
        parse_mode: "HTML",
        ...getMembershipInlineKeyboard(),
      }
    );

    await ctx.reply("‎", getMainKeyboard());
    return;
  }

  await ctx.reply(
    `🔓 <b>ACCESS OPEN</b>

Plan
<b>${membership.title}</b>

Status
<b>${membership.status}</b>

Valid until
<b>${membership.expiresAtText}</b>

Choose a section below.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsPanel(ctx) {
  const membership = getActiveMembership(ctx);

  if (!membership) {
    await ctx.reply(
      `🖥️ <b>CHANNELS LOCKED</b>

You need an active membership before entering private channels.`,
      {
        parse_mode: "HTML",
        ...getMembershipInlineKeyboard(),
      }
    );

    await ctx.reply("‎", getMainKeyboard());
    return;
  }

  await ctx.reply(
    `🖥️ <b>CHANNELS</b>

Plan
<b>${membership.title}</b>

Private channel access
Exclusive drops
Locked sections
Direct website entry`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendRefreshPanel(ctx) {
  const membership = getActiveMembership(ctx);

  if (!membership) {
    await ctx.reply(
      `🔄 <b>STATUS UPDATED</b>

Plan
<b>None</b>

Status
<b>Inactive</b>

Access
<b>Locked</b>`,
      {
        parse_mode: "HTML",
        ...getMembershipInlineKeyboard(),
      }
    );

    await ctx.reply("‎", getMainKeyboard());
    return;
  }

  await ctx.reply(
    `🔄 <b>STATUS UPDATED</b>

Plan
<b>${membership.title}</b>

Status
<b>${membership.status}</b>

Access
<b>${membership.accessLabel}</b>

Expires
<b>${membership.expiresAtText}</b>`,
    {
      parse_mode: "
