import { Markup } from "telegraf";

const originalKeyboard = Markup.keyboard.bind(Markup);
const SMOKELANDIA_LABEL = "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BACK_LABEL = "↽ ʙᴀᴄᴋ";

Markup.keyboard = function patchedKeyboard(buttons, ...args) {
    const labels = Array.isArray(buttons)
        ? buttons.flat(Infinity).map((item) => String(item))
        : [];

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
