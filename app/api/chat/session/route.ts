import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CHAT_COOKIE, CHAT_COOKIE_DAYS, CHAT_TERMS_VERSION, createChatSession, getChatSession } from "../../../../lib/chat/chat";
import { chatLinkUrl } from "../../../../lib/chat/telegramBridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type S = NonNullable<Awaited<ReturnType<typeof getChatSession>>>;
const view = (s: S) => ({
  consented: true,
  termsVersion: s.consentVersion,
  linked: Boolean(s.telegramChatId),
  username: s.telegramUsername ? `@${s.telegramUsername}` : null,
  linkUrl: chatLinkUrl(s.linkCode),
});

/** ¿Ya aceptó términos? ¿Ya vinculó Telegram? */
export async function GET() {
  try {
    const store = await cookies();
    const s = await getChatSession(store.get(CHAT_COOKIE)?.value);
    if (!s) return NextResponse.json({ consented: false, termsVersion: CHAT_TERMS_VERSION });
    return NextResponse.json(view(s));
  } catch (e) {
    console.error("[CHAT SESSION GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** Acepta términos y crea la conversación. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { accept?: boolean };
    if (body.accept !== true) return NextResponse.json({ error: "terms_required" }, { status: 400 });

    const store = await cookies();
    const existing = await getChatSession(store.get(CHAT_COOKIE)?.value);
    if (existing) return NextResponse.json(view(existing));

    const s = await createChatSession();
    store.set(CHAT_COOKIE, s.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CHAT_COOKIE_DAYS * 86400,
    });
    return NextResponse.json(view(s));
  } catch (e) {
    console.error("[CHAT SESSION POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}