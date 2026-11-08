import { NextResponse } from "next/server";
import { handleChatUpdate } from "../../../../lib/chat/telegramBridge";

/**
 * SOLO si NO tienes ya un webhook del bot.
 * Si ya tienes uno, no uses este archivo: llama a `handleChatUpdate(update)` desde el tuyo
 * (mira el ejemplo en el mensaje) y registra una única URL de webhook en Telegram.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  try {
    await handleChatUpdate(await req.json());
  } catch (e) {
    console.error("[CHAT WEBHOOK]", e);
  }
  return NextResponse.json({ ok: true });
}