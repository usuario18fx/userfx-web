import test from "node:test";
import assert from "node:assert/strict";
import { fxBotTone, fxStyleReplyMarkup } from "../lib/fx-telegram-tone.js";

test("native Gen Z English is rendered in small capitals", () => {
  assert.equal(fxBotTone("Hey babe, slide in!"), "ʜᴇʏ ʙᴀʙᴇ, ꜱʟɪᴅᴇ ɪɴ!");
  assert.equal(fxBotTone("Please try again"), "ɢɪᴠᴇ ɪᴛ ᴀɴᴏᴛʜᴇʀ ɢᴏ");
});

test("security-sensitive tokens remain exactly copyable", () => {
  const tokens = [
    "@User18Fx_bot", "@RealGuest_2", "SPCL-HJ2K", "VIPX-HJ2K",
    "FXCHAT-AAAAAAAAAAAAAAAAAAAA", "/start", "/access", "/cancel",
    "https://t.me/User18Fx_bot?start=spcl", "User18fx.com", "&amp;",
    "<code>SPCL-HJ2K</code>", "<pre>/start</pre>",
  ];
  const input = "Hey babe · " + tokens.join(" · ");
  const actual = fxBotTone(input);
  for (const token of tokens) assert.ok(actual.includes(token), "Token changed: " + token);
});

test("HTML tags remain valid while visible prose gets styled", () => {
  assert.equal(fxBotTone("<b>Hey babe</b>"), "<b>ʜᴇʏ ʙᴀʙᴇ</b>");
  assert.ok(fxBotTone("Say &amp; go").includes("&amp;"));
});

test("callback data and protected admin keyboard actions never change", () => {
  const markup = {
    inline_keyboard: [[{ text: "SEND NOTICE", callback_data: "manual_notice:when:SPCL-HJ2K" }]],
    keyboard: [[{ text: "EXIT" }]],
  };
  const styled = fxStyleReplyMarkup(markup, { styleKeyboard: false });
  assert.equal(styled.inline_keyboard[0][0].text, "ꜱᴇɴᴅ ɴᴏᴛɪᴄᴇ");
  assert.equal(styled.inline_keyboard[0][0].callback_data, markup.inline_keyboard[0][0].callback_data);
  assert.equal(styled.keyboard[0][0].text, "EXIT");
  assert.equal(markup.inline_keyboard[0][0].text, "SEND NOTICE");
});

test("formatting already-styled bot copy is idempotent", () => {
  const once = fxBotTone("Hey babe · SPCL-HJ2K · /start");
  assert.equal(fxBotTone(once), once);
});
