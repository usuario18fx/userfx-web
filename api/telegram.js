import { Markup } from "telegraf";

const originalKeyboard = Markup.keyboard.bind(Markup);
const SMOKELANDIA_LABEL = "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BACK_LABEL = "↽ ʙᴀᴄᴋ";
const BASIC_LABEL = "🌹 ʙᴀꜱɪᴄ";
const PRO_LABEL = "🔥 ᴘʀᴏ";
const VIP_LABEL = "👑 ᴠɪᴘ";
const ENTER_CODE_LABEL = "ᴇɴᴛᴇʀ ᴄᴏᴅᴇ";
const HELP_LABEL = "ᴜ ɴᴇᴇᴅ ʜᴇʟᴘ?";

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
        const helpUrl =
            process.env.USERFX_HELP_URL ||
            "https://t.me/User18Fx";
        const botUsername =
            process.env.USER_BOT_USERNAME ||
            "User18Fx_bot";
        const botBaseUrl = `https://t.me/${botUsername}`;

        return Markup.inlineKeyboard([
            [
                Markup.button.url(BASIC_LABEL, `${botBaseUrl}?start=getcode_basic`),
                Markup.button.url(VIP_LABEL, `${botBaseUrl}?start=getcode_vip`),
            ],
            [
                Markup.button.url(PRO_LABEL, `${botBaseUrl}?start=getcode_pro`),
                Markup.button.url(ENTER_CODE_LABEL, userFxUrl),
            ],
            [
                Markup.button.url(BACK_LABEL, `${botBaseUrl}?start=menu`),
                Markup.button.url(HELP_LABEL, helpUrl),
            ],
        ]);
    }

    const isChannelsKeyboard =
        labels.includes(SMOKELANDIA_LABEL) &&
        labels.includes(BACK_LABEL);

    if (isChannelsKeyboard) {
        const smokelandiaUrl =
            process.env.SMOKELANDIA_GROUP_LINK ||
            "https://t.me/SmokelandiaFx_bot";
        const userFxUrl =
            process.env.USERFX_SITE_URL ||
            "https://userfx-web.vercel.app";
        const backUrl = "https://t.me/User18Fx_bot?start=menu";

        return Markup.inlineKeyboard([
            [Markup.button.url(SMOKELANDIA_LABEL, smokelandiaUrl)],
            [Markup.button.url("𝐔𝐬ᴇʀ 🜲∓ҳ", userFxUrl)],
            [Markup.button.url(BACK_LABEL, backUrl)],
        ]);
    }

    return originalKeyboard(buttons, ...args);
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
