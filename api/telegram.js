import { Markup, Telegraf } from "telegraf";

const originalKeyboard = Markup.keyboard.bind(Markup);
const originalOn = Telegraf.prototype.on;

const BASIC_LABEL = "🌹 ʙᴀꜱɪᴄ";
const PRO_LABEL = "🔥 ᴘʀᴏ";
const VIP_LABEL = "👑 ᴠɪᴘ";
const BACK_LABEL = "↽ ʙᴀᴄᴋ";
const ENTER_CODE_LABEL = "ᴇɴᴛᴇʀ ᴄᴏᴅᴇ";
const HELP_LABEL = "ᴜ ɴᴇᴇᴅ ʜᴇʟᴘ?";
const SMOKELANDIA_LABEL = "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const USERFX_LABEL = "𝐔𝐬ᴇʀ 🜲∓ҳ";

Markup.keyboard = function patchedKeyboard(buttons, ...args) {
    const labels = Array.isArray(buttons)
        ? buttons.flat(Infinity).map((item) => String(item))
        : [];

    const isAccessKeyboard =
        labels.includes(BASIC_LABEL) &&
        labels.includes(PRO_LABEL) &&
        labels.includes(VIP_LABEL) &&
        labels.includes(BACK_LABEL);

    if (isAccessKeyboard) {
        const userFxUrl =
            process.env.USERFX_SITE_URL ||
            "https://userfx-web.vercel.app";

        return originalKeyboard([
            [BASIC_LABEL, VIP_LABEL],
            [
                PRO_LABEL,
                Markup.button.webApp(ENTER_CODE_LABEL, userFxUrl),
            ],
            [BACK_LABEL, HELP_LABEL],
        ], ...args);
    }

    const isChannelsKeyboard =
        labels.includes(SMOKELANDIA_LABEL) &&
        labels.includes(USERFX_LABEL);

    if (isChannelsKeyboard) {
        return originalKeyboard([
            [SMOKELANDIA_LABEL, USERFX_LABEL],
        ], ...args);
    }

    return originalKeyboard(buttons, ...args);
};

Telegraf.prototype.on = function patchedOn(filters, ...fns) {
    if (filters !== "text") {
        return originalOn.call(this, filters, ...fns);
    }

    const wrappedFns = fns.map((fn) => async (ctx, next) => {
        const text = String(ctx.message?.text || "").trim();
        const assetsBaseUrl = `${String(
            process.env.USERFX_SITE_URL || "https://userfx-web.vercel.app"
        ).replace(/\/$/, "")}/assets`;

        if (text === HELP_LABEL) {
            return ctx.reply("ᴜ ɴᴇᴇᴅ ʜᴇʟᴘ?", {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: "💬 ᴄʜᴀᴛ @User18Fx",
                            url: "https://t.me/User18Fx",
                        },
                    ]],
                },
            });
        }

        if (text === SMOKELANDIA_LABEL) {
            const smokelandiaUrl =
                process.env.SMOKELANDIA_GROUP_LINK ||
                "https://t.me/SmokelandiaFx_bot";

            return ctx.replyWithVideo(`${assetsBaseUrl}/introSMKL.mp4`, {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: SMOKELANDIA_LABEL,
                            url: smokelandiaUrl,
                        },
                    ]],
                },
            });
        }

        if (text === USERFX_LABEL) {
            const userFxChannelUrl =
                process.env.USER_GROUP_LINK ||
                "https://t.me/+v57jkAGn3DA0NWJh";

            return ctx.replyWithVideo(`${assetsBaseUrl}/introFX.mp4`, {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: USERFX_LABEL,
                            url: userFxChannelUrl,
                        },
                    ]],
                },
            });
        }

        return fn(ctx, next);
    });

    return originalOn.call(this, filters, ...wrappedFns);
};

let corePromise;

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    corePromise ||= import("./telegram-core.js");
    const core = await corePromise;
    return core.default(req, res);
}
