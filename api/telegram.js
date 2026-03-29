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
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendFeedMessage(ctx) {
  const membership = getActiveMembership(ctx);

  if (!membership) {
    await sendAccessPanel(ctx);
    return;
  }

  await ctx.reply(
    `📺 <b>FEED</b>

Plan
<b>${membership.title}</b>

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
  const membership = getActiveMembership(ctx);

  if (!membership) {
    await sendAccessPanel(ctx);
    return;
  }

  await ctx.reply(
    `🌩️ <b>VIDEOCLOUDS</b>

Plan
<b>${membership.title}</b>

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
  const membership = getActiveMembership(ctx);

  if (!membership) {
    await sendAccessPanel(ctx);
    return;
  }

  await ctx.reply(
    `📸 <b>PHOTOS</b>

Plan
<b>${membership.title}</b>

Unlocked visual section
Private gallery access`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  const membership = getActiveMembership(ctx);

  if (!membership) {
    await sendAccessPanel(ctx);
    return;
  }

  await ctx.reply(
    `🎁 <b>GIFTS</b>

Plan
<b>${membership.title}</b>

Support section
Transfer section
Additional access support`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendStarsInvoice(ctx, plan) {
  const payload = JSON.stringify({
    type: "membership",
    planKey: plan.key,
    userId: String(ctx.from.id),
    createdAt: Date.now(),
  });

  await ctx.replyWithInvoice({
    title: plan.title,
    description: `${plan.days} days premium membership access.`,
    payload,
    currency: "XTR",
    prices: [
      {
        label: `${plan.title} · ${plan.days} days`,
        amount: plan.stars,
      },
    ],
  });
}

bot.start(async (ctx) => {
  await sendMainPanel(ctx);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `${BRAND}

<b>Available commands</b>

/start
/help`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
});

bot.hears("💳 Membership", async (ctx) => {
  await sendMembershipPanel(ctx);
});

bot.hears("🔐 Access", async (ctx) => {
  await sendAccessPanel(ctx);
});

bot.hears("🖥️ Channels", async (ctx) => {
  await sendChannelsPanel(ctx);
});

bot.hears("🔄 Refresh", async (ctx) => {
  await sendRefreshPanel(ctx);
});

bot.hears("📺", async (ctx) => {
  await sendFeedMessage(ctx);
});

bot.hears("🌩️", async (ctx) => {
  await sendVideoCloudsMessage(ctx);
});

bot.hears("📸", async (ctx) => {
  await sendPhotosMessage(ctx);
});

bot.hears("🎁", async (ctx) => {
  await sendGiftsMessage(ctx);
});

bot.hears("↩️", async (ctx) => {
  await sendMainPanel(ctx);
});

bot.action("buy_userfx", async (ctx) => {
  await ctx.answerCbQuery("Opening invoice...");
  await sendStarsInvoice(ctx, MEMBERSHIPS.userfx);
});

bot.action("buy_vipfx", async (ctx) => {
  await ctx.answerCbQuery("Opening invoice...");
  await sendStarsInvoice(ctx, MEMBERSHIPS.vipfx);
});

bot.on("pre_checkout_query", async (ctx) => {
  try {
    const query = ctx.update.pre_checkout_query;
    const payload = JSON.parse(query.invoice_payload || "{}");

    if (query.currency !== "XTR") {
      await ctx.answerPreCheckoutQuery(false, "Invalid currency.");
      return;
    }

    if (payload.type !== "membership") {
      await ctx.answerPreCheckoutQuery(false, "Invalid payment payload.");
      return;
    }

    if (!MEMBERSHIPS[payload.planKey]) {
      await ctx.answerPreCheckoutQuery(false, "Unknown membership.");
      return;
    }

    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    await ctx.answerPreCheckoutQuery(false, "Payment validation failed.");
  }
});

bot.on("message", async (ctx) => {
  const payment = ctx.message?.successful_payment;

  if (!payment) return;

  try {
    const payload = JSON.parse(payment.invoice_payload || "{}");

    if (payment.currency !== "XTR") return;
    if (payload.type !== "membership") return;

    const plan = MEMBERSHIPS[payload.planKey];
    if (!plan) return;

    const membership = activateMembership(ctx, plan);

    console.log("PAYMENT OK:", {
      user_id: String(ctx.from?.id || ""),
      plan: plan.key,
      total_amount: payment.total_amount,
      currency: payment.currency,
      telegram_payment_charge_id: payment.telegram_payment_charge_id,
    });

    await ctx.reply(
      `✅ <b>PAYMENT RECEIVED</b>

Plan
<b>${membership.title}</b>

Status
<b>${membership.status}</b>

Access
<b>${membership.accessLabel}</b>

Expires
<b>${membership.expiresAtText}</b>`,
      {
        parse_mode: "HTML",
        ...getInlineWebsiteButton(),
      }
    );

    await ctx.reply("‎", getAccessKeyboard());
  } catch (error) {
    console.error("PAYMENT PARSE ERROR:", error);
    await ctx.reply(
      `⚠️ <b>PAYMENT RECEIVED</b>

The charge was received, but the membership payload could not be processed.`,
      {
        parse_mode: "HTML",
      }
    );
  }
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();

  const knownInputs = [
    "💳 Membership",
    "🔐 Access",
    "🖥️ Channels",
    "🔄 Refresh",
    "📺",
    "🌩️",
    "📸",
    "🎁",
    "↩️",
    "/start",
    "/help",
  ];

  if (knownInputs.includes(text)) return;

  await sendMainPanel(ctx);
});

bot.catch((error) => {
  console.error("TELEGRAF ERROR:", error);
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      method: req.method,
      message: "Telegram endpoint alive",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
      method: req.method,
    });
  }

  try {
    const update =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    await bot.handleUpdate(update);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("TELEGRAM HANDLER ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: "handler_error",
      details: String(error?.message || error),
    });
  }
}
