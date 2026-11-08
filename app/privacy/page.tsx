import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacy · UserFX" };
export default function Privacy() {
  return (
    <main className="mx-auto min-h-svh max-w-3xl space-y-8 px-6 py-20">
      <a className="text-gold" href="/">
        ← USER FX
      </a>
      <h1 className="font-display text-5xl uppercase">Your privacy.</h1>
      <p className="text-ink/70">
        UserFX uses your verified Telegram identity to associate access codes, room permissions and
        your profile with your account. Protected albums require matching active access.
      </p>
      <p className="text-ink/70">
        Your profile visibility and room approval remain under your control. Camera and microphone
        require browser permission. Closing a call stops its media streams.
      </p>
      <p className="text-ink/70">
        If you subscribe to updates, we store your email address and subscription date. To
        unsubscribe or request removal of your data, contact{" "}
        <a
          className="text-gold underline"
          href="https://t.me/User18fx"
          target="_blank"
          rel="noreferrer">
          @User18fx
        </a>
        .
      </p>
      <p className="text-ink/70">
        Webchat Telegram sync is optional and requires explicit consent plus a one-time code from
        the Telegram bot. When enabled, USER FX stores up to 100 synchronized messages for up to
        30 days in its server database and uses a signed-in cookie to show them only to the linked
        account. You can unlink from the chat, which deletes your web chat history and sync consent.
        This does not delete any messages stored separately inside Telegram. Replies may be sent by
        the automated bot or USER FX support.
      </p>
      <p className="text-ink/70">
        Session cookies keep you signed in. They do not give another user access to your private
        collections.
      </p>
    </main>
  );
}
