import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import vm from "node:vm";
import crypto from "node:crypto";
import { getAccessFeatures, sessionFeatures } from "../lib/access-features.js";

const runtimeSource = (await readFile(new URL("../api/admin-runtime.js", import.meta.url), "utf8"))
  .replace(/^\s*import .*;$/gm, "").replace("export default async function handler", "async function handler");
const mediaSource = (await readFile(new URL("../api/private-media.js", import.meta.url), "utf8"))
  .replace(/^\s*import .*;$/gm, "").replace("export default async function handler", "async function handler");
function response() {
  return { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } };
}
for (const [planId, rec, chat, multimedia] of [["basic", false, true, false], ["pro", true, true, true], ["vip", true, true, true], ["special", true, false, true]]) {
  const features = getAccessFeatures({ planId });
  assert.deepEqual(features, { oncam: true, rec, chat, multimedia });
  assert.equal(getAccessFeatures({ planId, features: { rec: true, chat: true, multimedia: true } }).chat, chat);
  for (const [action, allowed] of [["stage-heartbeat", rec], ["gallery-heartbeat", multimedia]]) {
    const writes = [];
    const redis = { set: async (...args) => writes.push(args), get: async () => null, scan: async () => ["0", []] };
    const context = vm.createContext({ crypto, console, process: { env: { REDIS_URL: "mock" } }, globalThis: { __userfxRedis: redis }, readVaultSession: async () => ({ planId, features, accountId: "test" }) });
    vm.runInContext(runtimeSource, context);
    const res = response();
    await context.handler({ method: "POST", headers: {}, body: { action } }, res);
    assert.equal(res.code, allowed ? 200 : 403);
    assert.equal(writes.length, allowed ? 1 : 0);
    if (allowed) assert.equal(res.body.stage.live, false);
  }
  let blobReads = 0;
  const context = vm.createContext({ URL, Buffer, console, readVaultSession: async () => ({ planId, features }), get: async () => { blobReads++; return null; } });
  vm.runInContext(mediaSource, context);
  const res = response();
  await context.handler({ method: "GET", headers: {}, url: "/api/private-media?pathname=userfx-album/BSIC/BSIC-01.jpg" }, res);
  assert.equal(res.code, multimedia ? 404 : 403);
  assert.equal(blobReads, multimedia ? 1 : 0);
}
assert.deepEqual(getAccessFeatures(null), { oncam: false, rec: false, chat: false, multimedia: false });
assert.equal(getAccessFeatures({ planId: "unknown", features: { chat: true } }).chat, false);
assert.equal(getAccessFeatures({ planId: "vip", accessMode: "telegram_identity" }).chat, false);
assert.equal(getAccessFeatures({ planId: "pro", features: { chat: false } }).chat, false);
assert.equal(sessionFeatures({ planId: "special", userId: "42" }, "42").chat, true);
assert.equal(sessionFeatures({ planId: "special", userId: "41" }, "42").chat, false);
console.log("PASS: plan matrix, legacy sessions, denied overrides, owner identity, runtime actions and private-media authorization");
