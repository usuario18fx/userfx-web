from __future__ import annotations

from pathlib import Path
import re
import sys

PATH = Path("api/telegram.js")

CONST = 'const IDENTITY_CODE_TTL_SECONDS = 15 * 60;'
HELPER_MARK = '// TGMX IDENTITY CODE ENGINE'
COMMAND_MARK = '// TGMX IDENTITY COMMAND'
START_MARK = '// TGMX IDENTITY START'
ROUTER_MARK = '// TGMX IDENTITY START (TEXT ROUTER)'


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def insert_before(text: str, marker: str, block: str, label: str) -> str:
    pos = text.find(marker)
    if pos < 0:
        fail(f"{label} marker not found: {marker}")
    return text[:pos] + block + text[pos:]


def main() -> None:
    if not PATH.exists():
        fail(f"File not found: {PATH}")

    raw = PATH.read_text(encoding="utf-8")
    had_bom = raw.startswith("\ufeff")
    s = raw[1:] if had_bom else raw
    original = s

    if CONST not in s:
        needle = 'const PAYMENT_TTL_SECONDS = 60 * 60 * 24 * 365;'
        if needle not in s:
            fail("PAYMENT_TTL_SECONDS marker not found")
        s = s.replace(needle, needle + "\n" + CONST, 1)

    if HELPER_MARK not in s:
        helper = r'''
// ======================================================
// TGMX IDENTITY CODE ENGINE
// TGMX verifies Telegram identity only. It grants no paid vault access.
// ======================================================
function getIdentityCodeKey(code) {
    return `${CODE_ENGINE_NAMESPACE}:identity-code:${String(code || "").trim().toUpperCase()}`;
}
function getIdentityUserKey(userId) {
    return `${CODE_ENGINE_NAMESPACE}:identity-user:${String(userId)}`;
}
async function generateIdentityCode(ctx) {
    const userId = String(ctx.from?.id || "");
    const parsedUsername = normalizeTelegramFxUsername(ctx.from?.username || "");

    if (!userId) {
        throw new Error("Telegram user id missing");
    }
    if (!parsedUsername) {
        await ctx.reply(
            "⚠️ You need a Telegram @username before requesting an identity key. Set one in Telegram Settings and try again."
        );
        return null;
    }

    const client = await ensureRedis();
    if (!client) {
        throw new Error("Redis is required for TGMX generation");
    }

    const userKey = getIdentityUserKey(userId);
    const previousCode = await client.get(userKey);
    if (previousCode) {
        await client.del(getIdentityCodeKey(previousCode));
    }

    for (let attempt = 0; attempt < 20; attempt++) {
        const code = `TGMX-${randomCodePart(4)}`;
        const key = getIdentityCodeKey(code);
        const createdAt = new Date();
        const expiresAt = new Date(
            createdAt.getTime() + IDENTITY_CODE_TTL_SECONDS * 1000
        );
        const record = {
            code,
            purpose: "telegram_identity",
            userId,
            telegramUsername: parsedUsername.normalized,
            status: "active",
            createdAt: createdAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
        };

        const created = await client.set(
            key,
            JSON.stringify(record),
            "EX",
            IDENTITY_CODE_TTL_SECONDS,
            "NX"
        );

        if (created === "OK") {
            await client.set(
                userKey,
                code,
                "EX",
                IDENTITY_CODE_TTL_SECONDS
            );
            logger.info("TGMX IDENTITY CODE GENERATED", {
                userId,
                username: parsedUsername.display,
            });
            return record;
        }
    }

    throw new Error("Unable to generate unique TGMX identity code");
}
async function sendIdentityCode(ctx) {
    try {
        await trackButtonClick(ctx, "TGMX IDENTITY");
        const record = await generateIdentityCode(ctx);
        if (!record) return;

        const username = normalizeTelegramFxUsername(ctx.from?.username || "");
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.webApp("↩ RETURN TO VAULT", USERFX_SITE_URL)],
        ]);

        await ctx.reply(
            `🔐 <b>TELEGRAM IDENTITY KEY</b>\n\n` +
            `${escapeHtml(username?.display || "")}` +
            `\n\n<code>${escapeHtml(record.code)}</code>` +
            `\n\nThis TGMX key verifies your Telegram identity only.` +
            `\nIt does not unlock BASIC, PRO or VIP.` +
            `\n\n⏱ Expires in 15 minutes and can be used once.`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard.reply_markup,
            }
        );
    } catch (error) {
        logger.error("TGMX IDENTITY ERROR", {
            userId: String(ctx.from?.id || ""),
            ...getTelegramError(error),
            stack: getErrorStack(error),
        });
        await ctx.reply("❌ Unable to create your Telegram identity key right now.")
            .catch(() => {});
    }
}
'''
        match = re.search(r"(?m)^[ \t]*function getPlanFromPayload\(payload\) \{", s)
        if not match:
            fail("getPlanFromPayload marker not found")
        s = s[:match.start()] + helper + s[match.start():]

    if COMMAND_MARK not in s:
        command_block = r'''
// ======================================================
// TGMX IDENTITY COMMAND
// ======================================================
bot.command("identity", async (ctx) => {
    await sendIdentityCode(ctx);
});

'''
        if '//// USER START //' in s:
            s = insert_before(s, '//// USER START //', command_block, "USER START")
        else:
            match = re.search(r"(?m)^\s*bot\.start\(", s)
            if not match:
                fail("bot.start marker not found")
            s = s[:match.start()] + command_block + s[match.start():]

    if '//// WEBSITE DEVICE → BASIC //' in s and START_MARK not in s:
        block = r'''// TGMX IDENTITY START
        if (startPayload === "identity") {
        await sendIdentityCode(ctx);
        return;
        }
'''
        s = insert_before(s, '//// WEBSITE DEVICE → BASIC //', block, "WEBSITE DEVICE")

    if START_MARK not in s:
        old = 'const startPayload = String(ctx.startPayload || "").trim();'
        if old in s:
            s = s.replace(
                old,
                old + r'''
        // TGMX IDENTITY START
        if (startPayload.toLowerCase() === "identity") {
            await sendIdentityCode(ctx);
            return;
        }''',
                1,
            )

    router_pos = s.find('//// USER TEXT ROUTER //')
    if router_pos >= 0:
        head, tail = s[:router_pos], s[router_pos:]
        if ROUTER_MARK not in tail and 'const startPayload = text' in tail:
            pay_marker = 'if (startPayload === "pay_basic")'
            pay_pos = tail.find(pay_marker)
            if pay_pos >= 0:
                router_block = r'''// TGMX IDENTITY START (TEXT ROUTER)
    if (startPayload === "identity") {
    await sendIdentityCode(ctx);
    return;
    }
    '''
                tail = tail[:pay_pos] + router_block + tail[pay_pos:]
                s = head + tail

    s = s.replace(
        '(access|find|revoke|users)',
        '(access|find|revoke|users|identity)',
    )

    if s == original:
        print("TGMX integration already present; no changes needed.")
        return

    PATH.write_text(("\ufeff" if had_bom else "") + s, encoding="utf-8")
    print("TGMX Telegram integration applied to api/telegram.js")


if __name__ == "__main__":
    main()
