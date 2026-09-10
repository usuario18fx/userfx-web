import { Telegram } from "telegraf";

export const config = {
  api: {
    bodyParser: false,
  },
};

const PATCH_FLAG = Symbol.for("userfx.telegram.spcl.patch");

function visibleSpecialCode(value) {
  return String(value || "")
    .replace(/TGMX-([A-HJ-NP-Z2-9]{4})/g, "SPCL-$1")
    .replace(/\bTGMX\b/g, "SPCL");
}

function arrangeTelegramFxKeyboard(replyMarkup) {
  if (!replyMarkup || !Array.isArray(replyMarkup.inline_keyboard)) {
    return replyMarkup;
  }

  const buttons = replyMarkup.inline_keyboard.flat().filter(Boolean);
  const isPanel = buttons.some((button) =>
    String(button?.callback_data || "").startsWith("tfx_toggle_")
  );

  if (!isPanel) return replyMarkup;

  const findByText = (needle) =>
    buttons.find((button) => String(button?.text || "").toLowerCase().includes(needle));

  const telegramfx = findByText("ᴛᴇʟᴇɢʀᴀᴍꜰx");
  const gallery = findByText("ɢᴀʟʟᴇʀʏ");
  const chat = findByText("ᴄʜᴀᴛ");
  const priv = findByText("ᴘʀɪᴠ");
  const group = findByText("ɢʀᴏᴜᴘ");
  const save = buttons.find((button) => String(button?.callback_data || "").startsWith("tfx_save_"));
  const revoke = buttons.find((button) => String(button?.callback_data || "").startsWith("tfx_revoke_"));

  if (!telegramfx || !gallery || !chat || !priv || !group || !save || !revoke) {
    return replyMarkup;
  }

  telegramfx.text = `${String(telegramfx.text || "").startsWith("✔") ? "✔" : "✘"} ᴛᴇʟᴇɢʀᴀᴍꜰx`;
  gallery.text = `${String(gallery.text || "").startsWith("✔") ? "✔" : "✘"} ɢᴀʟʟᴇʀʏ`;
  chat.text = `${String(chat.text || "").startsWith("✔") ? "✔" : "✘"} ᴄʜᴀᴛ`;
  priv.text = `${String(priv.text || "").startsWith("✔") ? "✔" : "✘"} ᴘʀɪᴠ`;
  group.text = `${String(group.text || "").startsWith("✔") ? "✔" : "✘"} ɢʀᴏᴜᴘ`;
  save.text = "💾 ꜱᴀᴠᴇ";
  revoke.text = "⛔ ʀᴇᴠᴏᴋᴇ ᴀʟʟ";

  return {
    ...replyMarkup,
    inline_keyboard: [
      [telegramfx],
      [gallery, chat],
      [priv, group],
      [save, revoke],
    ],
  };
}

if (!globalThis[PATCH_FLAG]) {
  const originalCallApi = Telegram.prototype.callApi;

  Telegram.prototype.callApi = function userFxCallApi(method, payload = {}, ...rest) {
    const nextPayload = { ...payload };

    for (const field of ["text", "caption", "title", "description"]) {
      if (typeof nextPayload[field] === "string") {
        nextPayload[field] = visibleSpecialCode(nextPayload[field]);
      }
    }

    if (nextPayload.reply_markup && typeof nextPayload.reply_markup === "object") {
      nextPayload.reply_markup = arrangeTelegramFxKeyboard(nextPayload.reply_markup);
    }

    return originalCallApi.call(this, method, nextPayload, ...rest);
  };

  globalThis[PATCH_FLAG] = true;
}

let corePromise;

async function getCore() {
  if (!corePromise) corePromise = import("./telegram-core.js");
  return corePromise;
}

export default async function handler(req, res) {
  const core = await getCore();
  return core.default(req, res);
}
