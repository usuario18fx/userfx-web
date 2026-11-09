import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "fx_telegram_login";
const AUTH_WINDOW_SECONDS = 24 * 60 * 60;
const SESSION_SECONDS = 7 * 24 * 60 * 60;
type Identity = { id: string; first_name: string; username: string; exp: number };
const botToken = () => process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
const sessionKey = () => process.env.TELEGRAM_LOGIN_SESSION_SECRET || botToken();

function hmac(message: string) {
  return createHmac("sha256", sessionKey()).update("userfx-login-v1:" + message).digest("hex");
}
function safeEq(a: string, b: string) {
  if (!/^[0-9a-f]{64}$/i.test(a) || !/^[0-9a-f]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
function sessionFromCookie(raw: string | undefined): Identity | null {
  if (!raw || !sessionKey()) return null;
  const [payload, signature, extra] = raw.split(".");
  if (!payload || !signature || extra || !safeEq(signature, hmac(payload))) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!value || typeof value !== "object") return null;
    const data = value as Record<string, unknown>;
    if (typeof data.id !== "string" || typeof data.first_name !== "string" || typeof data.username !== "string" || typeof data.exp !== "number") return null;
    if (!/^\d{1,20}$/.test(data.id) || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return { id: data.id, first_name: data.first_name, username: data.username, exp: data.exp };
  } catch {
    return null;
  }
}
const publicUser = (data: Identity) => ({ id: data.id, first_name: data.first_name, username: data.username });

export async function GET(request: NextRequest) {
  const data = sessionFromCookie(request.cookies.get(COOKIE)?.value);
  return NextResponse.json({ authenticated: Boolean(data), user: data ? publicUser(data) : null, configured: Boolean(botToken()) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!botToken()) return NextResponse.json({ error: "Telegram login is not configured." }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON required." }, { status: 415 });
  }
  let payload: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid payload");
    payload = value as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const fields = ["auth_date", "first_name", "id", "last_name", "photo_url", "username"] as const;
  const allowed = new Set<string>([...fields, "hash"]);
  if (Object.keys(payload).some(key => !allowed.has(key))) return NextResponse.json({ error: "Unexpected fields." }, { status: 400 });
  const rawHash = payload.hash;
  const authDate = Number(payload.auth_date);
  const now = Math.floor(Date.now() / 1000);
  if (typeof rawHash !== "string" || typeof payload.id !== "number" && typeof payload.id !== "string" ||
    !/^\d{1,20}$/.test(String(payload.id)) || !Number.isInteger(authDate) ||
    authDate < now - AUTH_WINDOW_SECONDS || authDate > now + 120) {
    return NextResponse.json({ error: "Invalid or expired Telegram authorization." }, { status: 401 });
  }
  if (fields.some(key => payload[key] !== undefined && typeof payload[key] !== "string" && typeof payload[key] !== "number")) {
    return NextResponse.json({ error: "Invalid authorization fields." }, { status: 400 });
  }
  const dataCheck = fields.filter(key => payload[key] !== undefined).sort().map(key => `${key}=${String(payload[key])}`).join("\n");
  const secret = createHash("sha256").update(botToken()).digest();
  const expected = createHmac("sha256", secret).update(dataCheck).digest("hex");
  if (!safeEq(rawHash, expected)) return NextResponse.json({ error: "Telegram signature check failed." }, { status: 401 });

  const data: Identity = {
    id: String(payload.id),
    first_name: String(payload.first_name || "").slice(0, 100),
    username: String(payload.username || "").replace(/^@/, "").slice(0, 32),
    exp: now + SESSION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const response = NextResponse.json({ authenticated: true, user: publicUser(data) }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(COOKIE, `${encoded}.${hmac(encoded)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: SESSION_SECONDS,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const response = NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete(COOKIE);
  return response;
}
