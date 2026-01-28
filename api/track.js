

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

  function timingSafeEqualHex(aHex, bHex) {
    try {
const a = Buffer.from(aHex, "hex");
const b = Buffer.from(bHex, "hex");
    if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);} catch {
      return false;}}

function validateTelegramInitData(initDataRaw, botToken) {
    if (!initDataRaw || typeof initDataRaw !== "string") {
      return { ok: false, error: "initData_empty" };}

const params = new URLSearchParams(initDataRaw);
const hash = params.get("hash");
  if (!hash) 
     return { ok: false, error: "missing_hash" };

  const pairs = []; for (const [k, v] of 
  params.entries()) pairs.push([k, v]);
  pairs.sort(([a], [b]) => 
  (a < b ? -1 : a > b ? 1 : 0));
const dataCheckString = 
  pairs.map(([k, v]) => `${k}=${v}`).join("\n");


const secretKey = 
      crypto.createHmac("sha256", "WebAppData").update(botToken).digest();


const computed = 
      crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!timingSafeEqualHex(computed, hash)) {
    return { ok: false, error: "bad_hash" };}

const out = 
      Object.fromEntries(pairs);
  if (out.user) { try { out.user = 
    JSON.parse(out.user); } catch{}}
    return { ok: true, data: out };}

function pickTelegramIdentity(tgData) {
const u = tgData?.user && typeof tgData.user === "object" ? tgData.user : null;
    return {
    user_id: u?.id ?? null,
    username: u?.username ?? null,
    first_name: u?.first_name ?? null,
    last_name: u?.last_name ?? null,
    language_code: u?.language_code ?? null,
    chat_instance: tgData?.chat_instance ?? null,
    start_param: tgData?.start_param ?? null,
    auth_date: tgData?.auth_date ?? null,};}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });}

const BOT_TOKEN = process.env.BOT_TOKEN;
const TRACK_SECRET = process.env.TRACK_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!BOT_TOKEN) 
      return res.status(500).json({ ok: false, error: "server_missing_bot_token" });
    if (!SUPABASE_URL) 
      return res.status(500).json({ ok: false, error: "server_missing_supabase_url" });
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ ok: false, error: "server_missing_service_role_key" });}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },});

const body = req.body && typeof req.body === "object" ? req.body : {};
const event = typeof body.event === "string" ? body.event : "unknown";
const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
const href = typeof body.href === "string" ? body.href : null;
 
const initDataHeader = req.headers["x-telegram-init-data"];
const initData =
    (typeof initDataHeader === "string" && initDataHeader) ||
    (typeof body.initData === "string" ? body.initData : "") ||"";

  
const secretHeader = req.headers["x-track-secret"];
const hasSecret = TRACK_SECRET && typeof secretHeader === "string" && secretHeader.length > 0 && secretHeader === TRACK_SECRET;
const hasTelegramInitData = typeof initData === "string" && initData.includes("hash="); let telegram = null;

    if (hasTelegramInitData) {
const v = validateTelegramInitData(initData, BOT_TOKEN);
    if (!v.ok) {
      return res.status(401).json({ ok: false, error: "bad_initData", reason: v.error });
    }
    telegram = pickTelegramIdentity(v.data);
   } else if (!hasSecret) {
      return res.status(401).json({ ok: false, error: "missing_initData_or_secret" });}
const geo = { country: req.headers["x-vercel-ip-country"] || null,
                region: req.headers["x-vercel-ip-country-region"] || null,
                city: req.headers["x-vercel-ip-city"] || null,
                latitude: req.headers["x-vercel-ip-latitude"] || null,
                longitude: req.headers["x-vercel-ip-longitude"] || null,
                timezone: req.headers["x-vercel-ip-timezone"] || null,
                postalCode: req.headers["x-vercel-ip-postal-code"] || null,};

const payload = 
              { ts: new Date().toISOString(), event, meta, telegram, geo, ua: req.headers["user-agent"] || null, href,};
console.log("[track]", JSON.stringify(payload));
const { error } = 
      await supabase.from("track_events").insert([{
      ts: payload.ts, event: payload.event, meta: payload.meta, telegram: payload.telegram,  geo: payload.geo, ua: payload.ua, href: payload.href,}, ]);
      if (error) {
console.error("[track][supabase_error]", error);}
      return res.status(200).json({ ok: true });}
