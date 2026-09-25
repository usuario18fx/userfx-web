import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const gatePath = path.join(
  root,
  "components",
  "PrivateRoom",
  "PrivateRoomDirectGate.tsx",
);
const botPath = path.join(root, "lib", "telegram", "core.js");

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing file: ${path.relative(root, file)}`);
  }
  return fs.readFileSync(file, "utf8");
}

function writeIfChanged(file, before, after) {
  if (before === after) {
    console.log(`UNCHANGED  ${path.relative(root, file)}`);
    return;
  }
  fs.writeFileSync(file, after, "utf8");
  console.log(`UPDATED    ${path.relative(root, file)}`);
}

function insertBefore(source, anchor, block, label) {
  if (source.includes(block.trim())) return source;
  const index = source.indexOf(anchor);
  if (index < 0) {
    console.warn(`SKIP ${label}: anchor not found`);
    return source;
  }
  return source.slice(0, index) + block + source.slice(index);
}

let gate = read(gatePath);
const gateBefore = gate;

/* ═══════════ 1. RETURN FROM TELEGRAM ═══════════ */
const hasVerifiedStage = gate.includes("setVerifiedStage") && gate.includes("verifiedStage");

if (hasVerifiedStage && !gate.includes("returningIdentityRef")) {
  const specialLoadingPattern = /(const \[specialLoading\s*,\s*setSpecialLoading\]\s*=\s*useState\(false\);?)/;
  if (specialLoadingPattern.test(gate)) {
    gate = gate.replace(
      specialLoadingPattern,
      `$1\nconst returningIdentityRef = useRef(false);`,
    );
  } else {
    console.warn("SKIP returningIdentityRef: specialLoading state not found");
  }
}

if (hasVerifiedStage) {
  const transitionPattern = /\s*\/\* ═══════════ VERIFIED TRANSITION ═══════════ \*\/[\s\S]*?\},\s*\[telegramVerified\]\);/;
  const transitionBlock = `

  /* ═══════════ VERIFIED TRANSITION ═══════════ */
  useEffect(() => {
    if (!telegramVerified) {
      setVerifiedStage("idle");
      return;
    }

    setSecondaryMode("none");

    if (returningIdentityRef.current) {
      setVerifiedStage("actions");
      return;
    }

    setVerifiedStage("granted");
  }, [telegramVerified]);`;

  if (transitionPattern.test(gate)) {
    gate = gate.replace(transitionPattern, transitionBlock);
  } else {
    console.warn("SKIP verified transition: block not found");
  }
}

if (!gate.includes("RETURN FROM TELEGRAM · SPECIAL CODE")) {
  const returnEffect = `  /* ─────   RETURN FROM TELEGRAM · SPECIAL CODE ─────── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("identity") !== "1") return;

    let savedUsername = "";

    try {
      savedUsername = normalizeTelegramUsername(
        params.get("username") ||
        localStorage.getItem(USERNAME_STORAGE_KEY) ||
        "",
      );
    } catch {
      savedUsername = normalizeTelegramUsername(
        params.get("username") || "",
      );
    }

    if (!savedUsername) return;

    let cancelled = false;

    ${hasVerifiedStage ? "returningIdentityRef.current = true;" : ""}

    async function restoreTelegramIdentity() {
      try {
        setTelegramLoading(true);
        setTelegramError("");

        const response = await fetch(
          \`/api/telegram-eligibility?username=\${encodeURIComponent(savedUsername)}\`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        const data: TelegramEligibilityResponse =
          await response.json().catch(() => ({}));

        if (!response.ok || !data?.eligible) {
          throw new Error(
            data?.error || "USERNAME IS NOT ACTIVE IN TELEGRAMFX",
          );
        }

        if (cancelled) return;

        const verifiedUsername = normalizeTelegramUsername(
          data.username || savedUsername,
        );

        setTelegramUsername(verifiedUsername);
        setTelegramVerified(true);
        setPrefix("SPCL");
        setSuffix("");
        setSpecialCode("");
        setSecondaryMode("none");

        try {
          localStorage.setItem(USERNAME_STORAGE_KEY, verifiedUsername);
        } catch {
          /* storage unavailable */
        }
      } catch (returnError) {
        if (!cancelled) {
          ${hasVerifiedStage ? "returningIdentityRef.current = false;" : ""}
          setTelegramVerified(false);
          setTelegramError(
            returnError instanceof Error && returnError.message
              ? returnError.message
              : "TELEGRAM IDENTITY CHECK FAILED",
          );
        }
      } finally {
        if (!cancelled) {
          setTelegramLoading(false);

          const cleanParams = new URLSearchParams(window.location.search);
          cleanParams.delete("identity");
          cleanParams.delete("username");

          const query = cleanParams.toString();

          window.history.replaceState(
            {},
            "",
            \`\${window.location.pathname}\${query ? \`?\${query}\` : ""}\${window.location.hash}\`,
          );
        }
      }
    }

    void restoreTelegramIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

`;

  gate = insertBefore(
    gate,
    "  /* ─────   EXISTING ACCESS SESSION ─────── */",
    returnEffect,
    "telegram return effect",
  );
}

if (
  hasVerifiedStage &&
  gate.includes("const normalizedUsername = normalizeTelegramUsername(telegramUsername);") &&
  !gate.includes("/* reset Telegram-return mode for manual checks */")
) {
  gate = gate.replace(
    "const normalizedUsername = normalizeTelegramUsername(telegramUsername);",
    `const normalizedUsername = normalizeTelegramUsername(telegramUsername);\n    /* reset Telegram-return mode for manual checks */\n    returningIdentityRef.current = false;`,
  );
}

/* ═══════════ 2. SPCL IN I HAVE A CODE ═══════════ */
gate = gate.replaceAll(
  '(["BSIC", "PRX0", "VIPX"] as const)',
  '(["BSIC", "PRX0", "VIPX", "SPCL"] as const)',
);

gate = gate.replaceAll(
  '/^(BSIC|PRX0|VIPX)$/',
  '/^(BSIC|PRX0|VIPX|SPCL)$/',
);

if (!gate.includes("GENERIC SPCL ACCESS")) {
  const normalVerifyAnchor = /\n\s*try \{\n\s*setLoading\(true\);\n\s*setError\(""\);\n\n\s*const response = await fetch\("\/api\/verify"/;

  const genericSpcl = `

  /* ─────   GENERIC SPCL ACCESS ─────── */
  if (normalizedPrefix === "SPCL") {
    const normalizedUsername = normalizeTelegramUsername(telegramUsername);

    if (!telegramVerified || !normalizedUsername) {
      setError("VERIFY YOUR TELEGRAM USERNAME FIRST");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const identityResponse = await fetch("/api/identity", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          username: normalizedUsername,
          code: \`SPCL-\${normalizedSuffix}\`,
        }),
      });

      const identityData: IdentityResponse =
        await identityResponse.json().catch(() => ({}));

      if (!identityResponse.ok || !identityData?.verified) {
        throw new Error(
          identityData?.error || "IDENTITY VERIFICATION FAILED",
        );
      }

      const sessionResponse = await fetch("/api/access-session", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });

      const sessionData: SessionResponse =
        await sessionResponse.json().catch(() => ({}));

      if (!sessionResponse.ok || !sessionData?.authenticated) {
        throw new Error(
          sessionData?.error || "PRIVATE SESSION COULD NOT BE CREATED",
        );
      }

      const fullCode = \`SPCL-\${normalizedSuffix}\`;

      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
        sessionStorage.setItem(ACCESS_CODE_KEY, fullCode);
        sessionStorage.setItem("vault_plan", "vip");
      } catch {
        /* storage unavailable */
      }

      setAuthenticated(true);
      return;
    } catch (specialError) {
      setSuffix("");
      setError(
        specialError instanceof Error && specialError.message
          ? specialError.message
          : "SPECIAL CODE VERIFICATION FAILED",
      );
      return;
    } finally {
      setLoading(false);
    }
  }
`;

  const match = gate.match(normalVerifyAnchor);
  if (match?.index != null) {
    gate = gate.slice(0, match.index) + genericSpcl + gate.slice(match.index);
  } else {
    console.warn("SKIP generic SPCL handler: /api/verify anchor not found");
  }
}

/* ═══════════ 3. SPECIAL CODE FAST PASTE HANDLER ═══════════ */
if (!gate.includes("function handleSpecialPaste")) {
  const specialHandler = `  /* ─────   SPECIAL CODE · FAST PASTE ─────── */
  async function handleSpecialPaste() {
    try {
      const clipboard = await navigator.clipboard.readText();
      setSpecialCode(normalizeSpecialSuffix(clipboard));
      setTelegramError("");
    } catch {
      setTelegramError("ALLOW CLIPBOARD ACCESS TO PASTE");
    }
  }

`;

  const specialAnchor = gate.includes("  /* ─────   SPECIAL CODE VERIFY ─────── */")
    ? "  /* ─────   SPECIAL CODE VERIFY ─────── */"
    : "  /* ─────   SPECIAL CODE VERIFY ─────── */";

  gate = insertBefore(
    gate,
    specialAnchor,
    specialHandler,
    "special paste handler",
  );
}

writeIfChanged(gatePath, gateBefore, gate);

/* ═══════════ 4. TELEGRAM BOT RETURN / KEYBOARD / COPY ═══════════ */
let bot = read(botPath);
const botBefore = bot;

bot = bot.replace(
  'const returnUrl = `${USERFX_SITE_URL.replace(/\\/$/, "")}/?identity=1`;',
  'const returnUrl = `${USERFX_SITE_URL.replace(/\\/$/, "")}/?identity=1#/private-room-access`;',
);

bot = bot.replace(
`    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("↻ ꜱᴇɴᴅ ᴀɢᴀɪɴ", \`tgmx_resend_\${record.code}\`)],
      [Markup.button.webApp("ᴇɴᴛᴇʀ ᴄᴏᴅᴇ", returnUrl)],
    ]);`,
`    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("↻ ꜱᴇɴᴅ ᴀɢᴀɪɴ", \`tgmx_resend_\${record.code}\`),
        Markup.button.webApp("ᴇɴᴛᴇʀ ᴄᴏᴅᴇ", returnUrl),
      ],
    ]);`,
);

bot = bot.replace(
  '`\\n\\n⇀ <code>${escapeHtml(record.code)}</code>` +',
  '`\\n\\n⇀ SPCL-   <code>${escapeHtml(record.code.slice(-4))}</code>` +',
);

writeIfChanged(botPath, botBefore, bot);

console.log("DONE · SPCL return flow applied locally.");
