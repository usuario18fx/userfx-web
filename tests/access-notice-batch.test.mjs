import { readFile } from "node:fs/promises";
import vm from "node:vm";
import assert from "node:assert/strict";
const source=await readFile(new URL("../api/telegram.js",import.meta.url),"utf8");
const block=source.slice(source.indexOf("async function resolveNoticeRecipient("),source.indexOf("//// ADMIN CODE LOOKUP //"));
let queries=0, sends=0, calls=[];
const rows=Array.from({length:11},(_,i)=>({username_normalized:"user"+String(i).padStart(2,"0")}));
const context=vm.createContext({
  bot:{action(){},command(){}},adminBot:{action(){},command(){}},CODE_ENGINE_NAMESPACE:"test",
  isAdmin:ctx=>ctx.admin===true,ensureRedis:async()=>({set:async()=>"OK"}),
  telegramFxRequest:async path=>{queries++;assert.match(path,/enabled=eq.true&telegramfx_access=eq.true/);return rows;},
  normalizeTelegramFxUsername:s=>s,Markup:{button:{callback:(text,data)=>({text,callback_data:data})},inlineKeyboard:rows=>({reply_markup:{inline_keyboard:rows}})},logger:{error(){}}
});
vm.runInContext(block,context);
context.notifyRegisteredAccess=async username=>{calls.push(username);sends++;return "sent";};
let replies=[];
const ctx={admin:false,match:["","0"],chat:{id:7},callbackQuery:{message:{message_id:8}},answerCbQuery:async()=>{},reply:async(...a)=>replies.push(a)};
await context.handleAccessNoticeBatch(ctx);
assert.equal(queries,0);assert.equal(sends,0);
ctx.admin=true;
await context.handleAccessNoticeBatch(ctx);
assert.equal(queries,1);assert.equal(sends,10);
assert.equal(replies.at(-1)[1].reply_markup.inline_keyboard[0][0].callback_data,"tfx_notify_batch:user09");
assert.match(source,/access\|permissions\|notify_access\|find/);
assert.match(source,/for \(const targetBot of \[bot, adminBot\]\) targetBot.action\(\/\^tfx_save_/);
console.log("PASS: admin-only batches, active access filters, ten recipients per batch, cursor and command routing.");
