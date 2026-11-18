// Shared voice for both USER FX Telegram bots and direct API notices.
// Only bot-authored copy is styled; preserve machine-readable links, handles,
// slash commands, access codes, HTML markup, and escaped entities.
const SMALL_CAPS = Object.freeze({
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ",
  h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ",
  o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ",
  v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
});

const PROTECTED_PARTS = /(<(?:code|pre)\b[^>]*>[\s\S]*?<\/(?:code|pre)>|<[^>]+>|https?:\/\/[^\s<>]+|\bt\.me\/[^\s<>]+|@[A-Za-z0-9_]+|\/[A-Za-z][A-Za-z0-9_]*(?:@[A-Za-z0-9_]+)?|\b(?:TGMX|SPCL|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4}\b|\bFXCHAT-[A-F0-9]{20}\b|&(?:[A-Za-z]+|#\d+|#x[0-9a-fA-F]+);)/gi;

export function fxGenZCopy(value = "") {
  return String(value)
    .replace(/\bPlease try again\b/gi, "Give it another go")
    .replace(/\bCode expired\b/gi, "That code timed out")
    .replace(/\bInvalid code\b/gi, "That code isn't valid")
    .replace(/\bAccess denied\b/gi, "You're not cleared for this yet")
    .replace(/\bNot authorized\b/gi, "You're not cleared for this yet")
    .replace(/\bPayment confirmed\b/gi, "Payment locked in")
    .replace(/\bPayment received\b/gi, "Payment locked in")
    .replace(/\bRequest sent\b/gi, "Request's in, babe")
    .replace(/\bSomething went wrong\b/gi, "That didn't land")
    .replace(/\bYou already have\b/gi, "You've already got")
    .replace(/\bYou need to\b/gi, "You'll need to")
    .replace(/\bThank you\b/gi, "Appreciate you")
    .replace(/\bUnable to\b/gi, "Couldn't")
    .replace(/\bTry again\b/gi, "Run it back")
    .replace(/\bPlease\b/gi, "Just");
}

function smallCapsPart(value) {
  return fxGenZCopy(value).replace(/[A-Za-z]/g, (char) => SMALL_CAPS[char.toLowerCase()] || char);
}

export function fxBotTone(value = "") {
  // Never alter HTML entities, a real @username, a Telegram command, or a code.
  return String(value)
    .split(PROTECTED_PARTS)
    .map((part) => {
      if (!part) return part;
      PROTECTED_PARTS.lastIndex = 0;
      const protectedPart = PROTECTED_PARTS.test(part);
      PROTECTED_PARTS.lastIndex = 0;
      return protectedPart ? part : smallCapsPart(part);
    })
    .join("");
}

export function fxStyleReplyMarkup(replyMarkup, { styleKeyboard = true } = {}) {
  if (!replyMarkup || typeof replyMarkup !== "object") return replyMarkup;
  const clone = typeof structuredClone === "function"
    ? structuredClone(replyMarkup)
    : JSON.parse(JSON.stringify(replyMarkup));
  const styleButton = (button) => {
    if (button && typeof button.text === "string") button.text = fxBotTone(button.text);
    return button;
  };
  if (Array.isArray(clone.inline_keyboard)) {
    clone.inline_keyboard = clone.inline_keyboard.map((row) => row.map(styleButton));
  }
  // A reply-keyboard button generates a user text message; leave admin
  // keyboard values intact so exact-match command handlers still work.
  if (styleKeyboard && Array.isArray(clone.keyboard)) {
    clone.keyboard = clone.keyboard.map((row) => row.map(styleButton));
  }
  return clone;
}
