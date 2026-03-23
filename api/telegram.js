import { Telegraf, Markup, Input } from "telegraf";
import path from "path";

const bot = new Telegraf(process.env.BOT_TOKEN);

const WEBSITE_URL = "https://userfx-web.vercel.app";
const VIP_CHANNEL_URL = "https://t.me/+HpfTil4YbSA5NjJh";
const SMOKELANDIA_CHANNEL_URL = "https://t.me/+E4X5V3IlygxhMGQx";
const PAYPAL_URL = "https://paypal.me/UsuarioFX";
const ZOOM_URL = "https://us05web.zoom.us/j/9010970018?pwd=TU_LINK_REAL";

const BRAND = "𝐔𝐬𝐞𝐫 Ŧҳ 🜲";

const VIDEO_PATH = path.join(process.cwd(), "assets", "smkl-video01.mp4");

const MEMBERSHIPS = {
  userfx: {
    title: "🔷 userFX",
    days: 8,
    priceUsd: 5,
    starsAmount: 500,
    label: "userFX · 8 days · $5",
  },
  vipfx: {
    title: "👑 vipFX",
    days: 30,
    priceUsd: 15,
    starsAmount: 1500,
    label: "vipFX · 30 days · $15",
  },
};

function getMainKeyboard() {
  return Markup.keyboard([["💳"], ["🔐", "🖥️"], ["🔄"]]).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard([["📺", "🌩️"], ["📸", "🎁"], ["↩️"]]).resize();
}

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "🜲", url: WEBSITE_URL }]],
    },
  };
}

function getInlineWebsiteAndStarsButtons(planKey = "vipfx") {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🜲", url: WEBSITE_URL }],
        [{ text: "⭐", callback_data: `pay_stars:${planKey}` }],
      ],
    },
  };
}

function getMembershipsInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔷", callback_data: "membership:userfx" }],
        [{ text: "👑", callback_data: "membership:vipfx" }],
        [{ text: "🜲", url: WEBSITE_URL }],
      ],
    },
  };
}

function getChannelsInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "👑", url: VIP_CHANNEL_URL }],
        [{ text: "☁️", url: SMOKELANDIA_CHANNEL_URL }],
        [{ text: "🜲", url: WEBSITE_URL }],
      ],
    },
  };
}

function formatDate(dateValue) {
  try {
    const date = new Date(dateValue);
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return String(dateValue || "");
  }
}

function getCodeLast4(fullCode = "") {
  return fullCode.slice(-4).toUpperCase();
}

function isMembershipActive(user) {
  if (!user?.membership_expires_at) return false;
  return new Date(user.membership_expires_at).getTime() > Date.now();
}

async function getFreshUserRecord(userId) {
  return {
    telegram_id: userId,
    username: "userFX",
    plan: "userfx",
    membership_expires_at: "2026-03-25T08:13:00.000Z",
    access_code: "FX-USERFX-BXZRKL",
  };
}

async function sendMainPanel(ctx) {
  await ctx.reply(
    `${BRAND}

Main panel:`,
    getMainKeyboard()
  );
}

async function sendAccessPanel(ctx, user) {
  await ctx.reply(
    `🔓 <b>Access unlocked</b>

Active plan: 🔷 <b>${user.plan === "vipfx" ? "vipFX" : "userFX"}</b>
Expires: <b>${formatDate(user.membership_expires_at)}</b>

Choose an option:`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendMembershipStatus(ctx, user) {
  const fullCode = user?.access_code || "FX-USERFX-BXZRKL";
  const last4 = getCodeLast4(fullCode);

  await ctx.reply(
    `${BRAND}

ℹ️ <b>Your ${user.plan === "vipfx" ? "vipFX" : "userFX"} membership is already active.</b>
Expires: <b>${formatDate(user.membership_expires_at)}</b>

Full code:
${fullCode}

Last 4 characters:
<b>${last4}</b>

On the website, the first part is already filled in.

You only need to enter:
<b>${last4}</b>`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendMembershipOptions(ctx) {
  await ctx.reply(
    `${BRAND}

Access to Feed, VideoClouds, unlocked Photos, and Gifts.

Pick a membership:`,
    getMembershipsInlineKeyboard()
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendFeedMessage(ctx) {
  await ctx.reply(
    `📺 <b>Feed</b>

Public updates, previews, and featured drops.

Open the website for the full experience.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendVideoCloudsMessage(ctx) {
  await ctx.reply(
    `☁️ <b>VideoClouds</b>

A chill spot to get ready, settle in, and be set to smoke with me.`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "☁️", url: ZOOM_URL }],
          [{ text: "🜲", url: WEBSITE_URL }],
        ],
      },
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  await ctx.reply(
    `📸 <b>Unlocked Photos</b>

Your photos won’t stay blocked anymore. With an active membership, you’ll be able to view them on my website.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  await ctx.reply(
    `🎁 <b>Gifts & transfers</b>

Send support here.`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💸", url: PAYPAL_URL }],
          [{ text: "🜲", url: WEBSITE_URL }],
          [{ text: "⭐", callback_data: "pay_stars:vipfx" }],
        ],
      },
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsMessage(ctx) {
  await ctx.reply(
    `${BRAND}

╭─────────────── crown ───────────────╮

👑 <b>ROOM | Ŧҳ VIP</b>
One page.
One video.
Exclusive content.
Private drops.
VIP access.

☁️ <b>SmokeLandia</b>
One page.
One video.
Ambient content.
Exclusive space.
Website-linked access.

╰─────────────────────────────────────╯

/channels`,
    {
      parse_mode: "HTML",
      ...getChannelsInlineKeyboard(),
    }
  );

  try {
    await ctx.replyWithVideo(Input.fromLocalFile(VIDEO_PATH), {
      caption: `${BRAND}

Channel preview.`,
      ...getInlineWebsiteButton(),
    });
  } catch (error) {
    console.error("VIDEO ERROR:", error);
    await ctx.reply(
      `${BRAND}

Preview video pending.`,
      getInlineWebsiteButton()
    );
  }

  await ctx.reply("‎", getMainKeyboard());
}

async function handleProtectedAccess(ctx, userId, type) {
  const user = await getFreshUserRecord(userId);

  if (!isMembershipActive(user) || user.plan === "free") {
    await ctx.reply(
      `🔒 <b>Access locked</b>

You need an active membership to use this option.`,
      {
        parse_mode: "HTML",
        ...getInlineWebsiteAndStarsButtons("vipfx"),
      }
    );

    await ctx.reply("‎", getMainKeyboard());
    return;
  }

  if (type === "feed") {
    await sendFeedMessage(ctx);
    return;
  }

  if (type === "videoclouds") {
    await sendVideoCloudsMessage(ctx);
    return;
  }

  if (type === "photos") {
    await sendPhotosMessage(ctx);
    return;
  }

  if (type === "gifts") {
    await sendGiftsMessage(ctx);
    return;
  }
}

async function sendTelegramStarsInvoice(ctx, planKey) {
  const plan = MEMBERSHIPS[planKey];
  if (!plan) return;

  await ctx.replyWithInvoice({
    title: `${plan.title} membership`,
    description: "Access to exclusive content.",
    payload: `membership:${planKey}`,
    currency: "XTR",
    prices: [{ label: plan.label, amount: plan.starsAmount }],
    start_parameter: `buy-${planKey}`,
  });
}

bot.start(async (ctx) => {
  await sendMainPanel(ctx);
});

bot.command("channels", async (ctx) => {
  await sendChannelsMessage(ctx);
});

bot.command("memberships", async (ctx) => {
  await sendMembershipOptions(ctx);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `${BRAND}

Available commands:
/start
/channels
/memberships`,
    getMainKeyboard()
  );
});

bot.hears("💳", async (ctx) => {
  const user = await getFreshUserRecord(ctx.from.id);

  if (isMembershipActive(user) && user.plan !== "free") {
    await sendMembershipStatus(ctx, user);
    return;
  }

  await sendMembershipOptions(ctx);
});

bot.hears("🔐", async (ctx) => {
  const user = await getFreshUserRecord(ctx.from.id);

  if (!isMembershipActive(user) || user.plan === "free") {
    await ctx.reply(
      `🔒 <b>Access locked</b>

You need an active membership to use this option.`,
      {
        parse_mode: "HTML",
        ...getInlineWebsiteAndStarsButtons("vipfx"),
      }
    );

    await ctx.reply("‎", getMainKeyboard());
    return;
  }

  await sendAccessPanel(ctx, user);
});

bot.hears("🖥️", async (ctx) => {
  await sendChannelsMessage(ctx);
});

bot.hears("🔄", async (ctx) => {
  const user = await getFreshUserRecord(ctx.from.id);

  if (isMembershipActive(user) && user.plan !== "free") {
    await sendMembershipStatus(ctx, user);
    return;
  }

  await ctx.reply(
    `${BRAND}

No active membership found.`,
    getInlineWebsiteAndStarsButtons("vipfx")
  );

  await ctx.reply("‎", getMainKeyboard());
});

bot.hears("📺", async (ctx) => {
  await handleProtectedAccess(ctx, ctx.from.id, "feed");
});

bot.hears("🌩️", async (ctx) => {
  await handleProtectedAccess(ctx, ctx.from.id, "videoclouds");
});

bot.hears("📸", async (ctx) => {
  await handleProtectedAccess(ctx, ctx.from.id, "photos");
});

bot.hears("🎁", async (ctx) => {
  await handleProtectedAccess(ctx, ctx.from.id, "gifts");
});

bot.hears("↩️", async (ctx) => {
  await sendMainPanel(ctx);
});

bot.action("membership:userfx", async (ctx) => {
  await ctx.answerCbQuery();
  await sendTelegramStarsInvoice(ctx, "userfx");
});

bot.action("membership:vipfx", async (ctx) => {
  await ctx.answerCbQuery();
  await sendTelegramStarsInvoice(ctx, "vipfx");
});

bot.action("pay_stars:userfx", async (ctx) => {
  await ctx.answerCbQuery();
  await sendTelegramStarsInvoice(ctx, "userfx");
});

bot.action("pay_stars:vipfx", async (ctx) => {
  await ctx.answerCbQuery();
  await sendTelegramStarsInvoice(ctx, "vipfx");
});

bot.on("pre_checkout_query", async (ctx) => {
  console.log("PRE CHECKOUT:", ctx.update.pre_checkout_query);
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;

  console.log("SUCCESSFUL PAYMENT:", payment);

  await ctx.reply(
    `${BRAND}

✅ Payment received.

Currency: ${payment.currency}
Total: ${payment.total_amount}`,
    getInlineWebsiteButton()
  );

  await ctx.reply("‎", getMainKeyboard());
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();

  const knownInputs = [
    "💳",
    "🔐",
    "🖥️",
    "🔄",
    "📺",
    "🌩️",
    "📸",
    "🎁",
    "↩️",
    "/start",
    "/channels",
    "/memberships",
    "/help",
  ];

  if (knownInputs.includes(text)) return;

  await sendMainPanel(ctx);
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Telegram endpoint alive" });
  }

  try {
    await bot.handleUpdate(req.body, res);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("TELEGRAM HANDLER ERROR:", error);
    return res.status(500).json({ ok: false, error: "handler_error" });
  }
}
