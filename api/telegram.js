import { Telegram, Telegraf } from "telegraf";

export const config = {
  api: {
    bodyParser: false,
  },
};

const PATCH_FLAG = Symbol.for("userfx.telegram.spcl.patch");
const ACCESS_BY_ID_PATCH_FLAG = Symbol.for("userfx.telegram.access-by-id.patch");
const SYNTHETIC_ID_PATCH_FLAG = Symbol.for("userfx.telegram.synthetic-id.patch");

function syntheticUsernameForId(id) {
  const value = String(id || "").trim();
  return /^\d{5,20}$/.test(value) ? `id_${value}` : "";
}

function visibleSpecialCode(value) {
  return String(value || "")
    .replace(/TGMX-([A-HJ-NP-Z2-9]{4})/g, "SPCL-$1")
    .replace(/\bTGMX\b/g, "SPCL")
    .replace(/@id_(\d{5,20})\b/g, "ID $1")
    .replace(/\bid_(\d{5,20})\b/g, "ID $1");
}

function arrangeTelegramFxKeyboard(replyMarkup) {
  if (!replyMarkup || !Array.isArray(replyMarkup.inline_keyboard)) {
    return replyMarkup;
  }

  const buttons = replyMarkup.inline_keyboard.flat().filter(Boolean);
  const isPanel = buttons.some((button) =>
    String(button?.callback_data || "").startsWith("tfx_toggle_"),
  );

  if (!isPanel) return replyMarkup;

  const findByText = (needle) =>
    buttons.find((button) =>
      String(button?.text || "")
        .toLowerCase()
        .includes(needle),
    );

  const telegramfx = findByText("ᴛᴇʟᴇɢʀᴀᴍꜰx");
  const gallery = findByText("ɢᴀʟʟᴇʀʏ");
  const chat = findByText("ᴄʜᴀᴛ");
  const priv = findByText("ᴘʀɪᴠ");
  const group = findByText("ɢʀᴏᴜᴘ");
  const save = buttons.find((button) =>
    String(button?.callback_data || "").startsWith("tfx_save_"),
  );
  const revoke = buttons.find((button) =>
    String(button?.callback_data || "").startsWith("tfx_revoke_"),
  );

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
    inline_keyboard: [[telegramfx], [gallery, chat], [priv, group], [save, revoke]],
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

// Users without @username are mapped internally to id_<telegram_id>.
// This keeps the existing username-based TelegramFX access engine intact.
if (!globalThis[SYNTHETIC_ID_PATCH_FLAG]) {
  const originalHandleUpdate = Telegraf.prototype.handleUpdate;

  const ensureSyntheticUsername = (from) => {
    if (!from || typeof from !== "object" || from.username) return;
    const synthetic = syntheticUsernameForId(from.id);
    if (synthetic) from.username = synthetic;
  };

  Telegraf.prototype.handleUpdate = function userFxHandleUpdate(update, ...rest) {
    if (update && typeof update === "object") {
      ensureSyntheticUsername(update.message?.from);
      ensureSyntheticUsername(update.edited_message?.from);
      ensureSyntheticUsername(update.channel_post?.from);
      ensureSyntheticUsername(update.edited_channel_post?.from);
      ensureSyntheticUsername(update.callback_query?.from);
      ensureSyntheticUsername(update.inline_query?.from);
      ensureSyntheticUsername(update.chosen_inline_result?.from);
      ensureSyntheticUsername(update.shipping_query?.from);
      ensureSyntheticUsername(update.pre_checkout_query?.from);
      ensureSyntheticUsername(update.my_chat_member?.from);
      ensureSyntheticUsername(update.chat_member?.from);
      ensureSyntheticUsername(update.chat_join_request?.from);
    }

    return originalHandleUpdate.call(this, update, ...rest);
  };

  globalThis[SYNTHETIC_ID_PATCH_FLAG] = true;
}

// Allows the existing TelegramFX /access command to accept a numeric ID.
// If the account has no @username, it falls back to id_<telegram_id>.
// Example: /access 123456789
if (!globalThis[ACCESS_BY_ID_PATCH_FLAG]) {
  const originalCommand = Telegraf.prototype.command;

  Telegraf.prototype.command = function userFxCommand(command, ...handlers) {
    const commandNames = (Array.isArray(command) ? command : [command]).map((value) =>
      String(value || "")
        .replace(/^\//, "")
        .toLowerCase(),
    );

    if (!commandNames.includes("access")) {
      return originalCommand.call(this, command, ...handlers);
    }

    const wrappedHandlers = handlers.map((handler) => {
      if (typeof handler !== "function") return handler;

      return async function accessByTelegramIdMiddleware(ctx, next) {
        const text = String(ctx.message?.text || "").trim();
        const parts = text.split(/\s+/);
        const target = String(parts[1] || "").trim();

        if (!/^\d{5,20}$/.test(target)) {
          return handler(ctx, next);
        }

        const adminUserId = String(
          process.env.TELEGRAM_ADMIN_ID || process.env.ADMIN_USER_ID || "",
        );

        if (String(ctx.from?.id || "") !== adminUserId) {
          return handler(ctx, next);
        }

        try {
          const chat = await ctx.telegram.getChat(target);
          const username = String(chat?.username || "").trim();
          const accessKey = username || syntheticUsernameForId(target);

          if (!accessKey) {
            await ctx.reply(`✘ No pude crear una llave de acceso para ID ${target}.`);
            return;
          }

          ctx.message.text = `${parts[0]} @${accessKey}`;
          return handler(ctx, next);
        } catch (error) {
          await ctx.reply(
            `✘ No pude resolver el ID ${target}.\n\nPídele al usuario que abra el bot y presione START una vez, luego vuelve a usar /access ${target}.`,
          );
          return;
        }
      };
    });

    return originalCommand.call(this, command, ...wrappedHandlers);
  };

  globalThis[ACCESS_BY_ID_PATCH_FLAG] = true;
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
