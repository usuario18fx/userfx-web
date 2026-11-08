import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addMessage, allow, CHAT_COOKIE, getChatSession, listMessages, MAX_TEXT } from "../../../../lib/chat/chat";
import { relayToAdmin } from "../../../../lib/chat/telegramBridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
async function current() {
  const store = await cookies();
  return getChatSession(store.get(CHAT_COOKIE)?.value);
}
/** Polling: mensajes con id > after. */
export async function GET(req: Request) {
  try {
    const s = await current();
    if (!s) return NextResponse.json({ error: "consent_required" }, { status: 401 });
    const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
    return NextResponse.json({ messages: await listMessages(s.id, after), linked: Boolean(s.telegramChatId) });
  } catch (e) {
    console.error("[CHAT MESSAGES GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }}
/** Mensaje del visitante → se guarda y se reenvía al admin por Telegram. */
export async function POST(req: Request) {
  try {
    const s = await current();
    if (!s) return NextResponse.json({ error: "consent_required" }, { status: 401 });
    const body = (await req.json().catch(() => ({}))) as { text?: string };
    const text = String(body.text ?? "").trim();
    if (!text || text.length > MAX_TEXT) return NextResponse.json({ error: "text" }, { status: 400 });
    if (!allow(s.id)) return NextResponse.json({ error: "ratelimit" }, { status: 429 });
    const msg = await addMessage(s.id, "user", "web", text);
    // Si Telegram falla, el mensaje queda guardado y visible igualmente.
    await relayToAdmin(s, msg.id, text).catch((e) => console.error("[CHAT RELAY]", e));
    return NextResponse.json({ message: msg });
  } catch (e) {
    console.error("[CHAT MESSAGES POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }}