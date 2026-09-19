import Redis from "ioredis";
import { Telegram, Telegraf } from "telegraf";

export const config = {
  api: {
    bodyParser: false,
  },
};

if (!process.env.USERFX_SITE_URL) {
  process.env.USERFX_SITE_URL = "https://user18fx.com";
}

const CODE_ENGINE_NAMESPACE =
  process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";

const TELEGRAM_PATCH_FLAG = Symbol.for("userfx.telegram.spcl.patch");
const COMMAND_PATCH_FLAG = Symbol.for("userfx.telegram.command.patch");
const SYNTHETIC_ID_PATCH_FLAG = Symbol.for(
  "userfx.telegram.synthetic-id.patch",
);
const REDIS_CODE_PATCH_FLAG = Symbol.for("userfx.telegram.code-redis.patch");

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
    inline_keyboard: [
      [telegramfx],
      [gallery, chat],
      [priv, group],
      [save, revoke],
    ],
  };
}

/*
 * Legacy core compatibility:
 * older code-generation records used a decorative status literal and
 * expected Redis' "OK" response in decorative small caps. Normalize the
 * stored record while preserving the return value expected by that core.
 */
if (!globalThis[REDIS_CODE_PATCH_FLAG]) {
  const originalSet = Redis.prototype.set;

  Redis.prototype.set = async function userFxRedisSet(...args) {
    const key = String(args[0] || "");
    const isVaultCode = key.startsWith(`${CODE_ENGINE_NAMESPACE}:code:`);

    if (isVaultCode && typeof args[1] === "string") {
      args[1] = args[1].replace(
        /"status":"ᴀᴄᴛɪᴠᴇ"/g,
        '"status":"active"',
      );
    }

    const result = await originalSet.apply(this, args);
    const usesNx = args
      .slice(2)
      .some((value) => String(value).toUpperCase() === "NX");

    if (isVaultCode && usesNx && result === "OK") {
      return "ᴏᴋ";
    }

    return result;
  };

  globalThis[REDIS_CODE_PATCH_FLAG] = true;
}

if (!globalThis[TELEGRAM_PATCH_FLAG]) {
  const originalCallApi = Telegram.prototype.callApi;

  Telegram.prototype.callApi = function userFxCallApi(
    method,
    payload = {},
    ...rest
  ) {
    let nextMethod = method;
    const nextPayload = { ...payload };

    for (const field of ["text", "caption", "title", "description"]) {
      if (typeof nextPayload[field] === "string") {
        nextPayload[field] = visibleSpecialCode(nextPayload[field]);
      }
    }

    if (nextPayload.reply_markup && typeof nextPayload.reply_markup === "object") {
      nextPayload.reply_markup = arrangeTelegramFxKeyboard(nextPayload.reply_markup);
    }

    if (
      method === "sendPhoto" &&
      typeof nextPayload.photo === "string" &&
      /\.mp4(?:\?|$)/i.test(nextPayload.photo)
    ) {
      nextMethod = "sendVideo";
      nextPayload.video = nextPayload.photo;
      delete nextPayload.photo;
    }

    return originalCallApi.call(this, nextMethod, nextPayload, ...rest);
  };

  globalThis[TELEGRAM_PATCH_FLAG] = true;
}

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

function normalizeCommandName(value) {
  const command = String(value || "")
    .replace(/^\//, "")
    .toLowerCase();

  if (command === "ɢᴇᴛᴄᴏᴅᴇ") return "getcode";
  if (command === "ɪᴅᴇɴᴛɪᴛʏ") return "identity";
  return command;
}

if (!globalThis[COMMAND_PATCH_FLAG]) {
  const originalCommand = Telegraf.prototype.command;

  Telegraf.prototype.command = function userFxCommand(command, ...handlers) {
    const normalizedCommand = Array.isArray(command)
      ? command.map(normalizeCommandName)
      : normalizeCommandName(command);

    const commandNames = Array.isArray(normalizedCommand)
      ? normalizedCommand
      : [normalizedCommand];

    if (!commandNames.includes("access")) {
      return originalCommand.call(this, normalizedCommand, ...handlers);
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
        } catch {
          await ctx.reply(
            `✘ No pude resolver el ID ${target}.\n\nPídele al usuario que abra el bot y presione START una vez, luego vuelve a usar /access ${target}.`,
          );
          return;
        }
      };
    });

    return originalCommand.call(this, normalizedCommand, ...wrappedHandlers);
  };

  globalThis[COMMAND_PATCH_FLAG] = true;
}

let corePromise;

async function getCore() {
  if (!corePromise) {
    corePromise = import("../lib/telegram/core.js");
  }

  return corePromise;
}

export default async function handler(req, res) {
  const core = await getCore();
  return core.default(req, res);
}
