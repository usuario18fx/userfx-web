import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const gatePath = path.join(root, "components", "PrivateRoom", "PrivateRoomDirectGate.tsx");
const cssPath = path.join(root, "components", "PrivateRoom", "PrivateRoomDirectGate.css");
const botPath = path.join(root, "lib", "telegram", "core.js");

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${path.relative(root, file)}`);
  return fs.readFileSync(file, "utf8");
}

function save(file, before, after) {
  if (before === after) {
    console.log(`UNCHANGED  ${path.relative(root, file)}`);
    return;
  }
  fs.writeFileSync(file, after, "utf8");
  console.log(`UPDATED    ${path.relative(root, file)}`);
}

let gate = read(gatePath);
const gateBefore = gate;
const hasVerifiedStage = gate.includes("verifiedStage") && gate.includes("setVerifiedStage");

if (hasVerifiedStage && !gate.includes("const returningIdentityRef = useRef(false);")) {
  gate = gate.replace(
    /(const \[specialLoading\s*,\s*setSpecialLoading\]\s*=\s*useState\(false\);?)/,
    `$1\nconst returningIdentityRef = useRef(false);`,
  );
}

/* ACCESS GRANTED always remains the visible shell. */
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
    setVerifiedStage("granted");
  }, [telegramVerified]);`;

  if (transitionPattern.test(gate)) {
    gate = gate.replace(transitionPattern, transitionBlock);
  }
}

/* Manual checks should show SPECIAL CODE button, not the returned-code input. */
if (
  hasVerifiedStage &&
  !gate.includes("reset Telegram-return mode for manual checks") &&
  gate.includes("const normalizedUsername = normalizeTelegramUsername(telegramUsername);")
) {
  gate = gate.replace(
    "const normalizedUsername = normalizeTelegramUsername(telegramUsername);",
    `const normalizedUsername = normalizeTelegramUsername(telegramUsername);\n    /* reset Telegram-return mode for manual checks */\n    returningIdentityRef.current = false;`,
  );
}

/* Fast paste helper. */
if (!gate.includes("function handleSpecialPaste")) {
  const anchor = "  /* ─────   SPECIAL CODE VERIFY ─────── */";
  const block = `  /* ─────   SPECIAL CODE · FAST PASTE ─────── */
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

  const at = gate.indexOf(anchor);
  if (at >= 0) gate = gate.slice(0, at) + block + gate.slice(at);
}

/* Replace only the original ACCESS GRANTED branch. */
if (hasVerifiedStage) {
  const pattern = /(\)\s*:\s*verifiedStage\s*===\s*["']granted["']\s*\?\s*\()([\s\S]*?)(\n\s*\)\s*:\s*\()/;

  const block = `
          <section className={\`pvr-direct-granted \${returningIdentityRef.current ? "is-code-entry" : ""}\`} aria-live="polite">
          <div className="pvr-direct-granted-check">
           ✓
          </div>
          <strong>
           ACCESS GRANTED
          </strong>
          <span>
           WELCOME {telegramUsername}
          </span>

          {returningIdentityRef.current ? (
          <form className="pvr-direct-granted-code" onSubmit={handleSpecialSubmit}>
          <div className="pvr-direct-granted-code-row">
          <b>
           SPCL
          </b>
          <i>
           —
          </i>
          <div className="pvr-direct-granted-code-field">
          <input type="text" value={specialCode} onChange={(event) => {
          setSpecialCode(normalizeSpecialSuffix(event.target.value));
          setTelegramError("");
          }} placeholder="CODE" maxLength={4} autoCapitalize="characters" autoComplete="off" disabled={specialLoading} aria-label="Special access code"/>
          <button type="button" className="pvr-direct-granted-paste" onClick={handleSpecialPaste} disabled={specialLoading}>
           PASTE
          </button>
          </div>
          </div>
          <button type="submit" className="pvr-direct-granted-enter" disabled={specialLoading || specialCode.length !== 4}>
           {specialLoading ? "VERIFYING…" : "VERIFY & ENTER"}
          </button>
          </form>
          ) : (
          <button type="button" className="pvr-direct-granted-special buttonupgrade" onClick={() => openTelegramLink("https://t.me/User18Fx_bot?start=identity")}>
          <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z"></path>
          </svg>
          <span>
           ꜱᴘᴇᴄɪᴀʟ<br />ᴄᴏᴅᴇ
          </span>
          </button>
          )}

          {telegramError && (
          <p className="pvr-direct-granted-error" role="alert">
           {telegramError}
          </p>
          )}
          </section>`;

  if (pattern.test(gate)) {
    gate = gate.replace(pattern, `$1${block}$3`);
  } else {
    console.warn("WARN · ACCESS GRANTED branch not found");
  }
}

save(gatePath, gateBefore, gate);

/* FINAL VISUAL OVERRIDES — preserve the user's original modal. */
let css = read(cssPath);
const cssBefore = css;
const start = "/* ═══════════ ACCESS GRANTED · RESTORED ORIGINAL DESIGN ═══════════ */";
const end = "/* ═══════════ END ACCESS GRANTED · RESTORED ORIGINAL DESIGN ═══════════ */";

const finalCss = `${start}
.pvr-direct-granted {
  position: relative !important;
  z-index: 60 !important;
  isolation: isolate !important;
  overflow: visible !important;
  width: 330px !important;
  max-width: calc(100% - 20px) !important;
  min-height: 102px !important;
  margin: 12px auto 0 !important;
  padding: 16px 14px 14px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px !important;
  border: 1px solid #c89a3a !important;
  border-radius: 4px !important;
  background: rgba(12, 9, 7, .80) !important;
  backdrop-filter: blur(8px) brightness(.56) saturate(.84) !important;
  -webkit-backdrop-filter: blur(8px) brightness(.56) saturate(.84) !important;
  box-shadow: inset 0 0 0 1px rgba(216,176,92,.05), 0 12px 28px rgba(0,0,0,.34) !important;
}
.pvr-direct-granted::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background: rgba(0,0,0,.43);
  backdrop-filter: blur(6px) brightness(.58) saturate(.86);
  -webkit-backdrop-filter: blur(6px) brightness(.58) saturate(.86);
  pointer-events: none;
}
.pvr-direct-granted.is-code-entry {
  min-height: 142px !important;
}
.pvr-direct-granted-check {
  margin: 0 0 2px !important;
  font-size: 44px !important;
  line-height: .8 !important;
  color: #d3a64c !important;
}
.pvr-direct-granted > strong {
  margin: 0 !important;
  font-size: 17px !important;
  line-height: 1 !important;
  letter-spacing: .03em !important;
  color: #f3ead9 !important;
}
.pvr-direct-granted > span {
  margin: 0 !important;
  font-size: 8px !important;
  line-height: 1 !important;
  letter-spacing: .10em !important;
  color: #c9bba3 !important;
}
.pvr-direct-granted-special.buttonupgrade {
  width: 105px !important;
  min-width: 105px !important;
  height: 28px !important;
  min-height: 28px !important;
  margin: 8px auto 0 !important;
  padding: 0 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 5px !important;
  border: none !important;
  border-radius: 6px !important;
  background: linear-gradient(15deg,#ddff00,#b8d100,#93a300,#6e7500,#ddff00,#b8d100,#93a300,#6e7500) no-repeat !important;
  background-size: 500% !important;
  background-position: left center !important;
  color: #000 !important;
  cursor: pointer !important;
  box-shadow: 0 9px 12px -9px #ddff004a !important;
}
.pvr-direct-granted-special.buttonupgrade:hover {
  background-size: 320% !important;
  background-position: right center !important;
}
.pvr-direct-granted-special.buttonupgrade svg {
  width: 17px !important;
  height: 14px !important;
  flex: 0 0 17px !important;
  fill: #000 !important;
}
.pvr-direct-granted-special.buttonupgrade span {
  margin: 0 !important;
  padding: 0 !important;
  font-size: 5.5px !important;
  font-weight: 900 !important;
  line-height: .72 !important;
  letter-spacing: .08em !important;
  text-align: center !important;
  white-space: nowrap !important;
  color: #000 !important;
}
.pvr-direct-granted-code {
  width: 272px !important;
  max-width: 100% !important;
  margin: 8px auto 0 !important;
  display: grid !important;
  gap: 6px !important;
}
.pvr-direct-granted-code-row {
  width: 100% !important;
  display: grid !important;
  grid-template-columns: 34px 12px minmax(0,1fr) !important;
  align-items: center !important;
  gap: 3px !important;
}
.pvr-direct-granted-code-row > b,
.pvr-direct-granted-code-row > i {
  color: #d2ad66 !important;
  font-size: 7px !important;
  font-style: normal !important;
  font-weight: 900 !important;
  letter-spacing: .10em !important;
  text-align: center !important;
}
.pvr-direct-granted-code-field {
  position: relative !important;
  width: 100% !important;
  min-width: 0 !important;
}
.pvr-direct-granted-code-field input {
  width: 100% !important;
  height: 28px !important;
  min-height: 28px !important;
  padding: 0 43px 0 8px !important;
  border: 1px solid #c89a3a66 !important;
  border-radius: 3px !important;
  outline: 0 !important;
  background: rgba(8,7,6,.88) !important;
  color: #f4e9d4 !important;
  -webkit-text-fill-color: #f4e9d4 !important;
  font-family: ui-monospace,SFMono-Regular,Consolas,monospace !important;
  font-size: 9px !important;
  font-weight: 900 !important;
  letter-spacing: .16em !important;
  text-transform: uppercase !important;
}
.pvr-direct-granted-code-field input::placeholder {
  color: #9f927d !important;
  -webkit-text-fill-color: #9f927d !important;
  opacity: .65 !important;
}
.pvr-direct-granted-paste {
  position: absolute !important;
  top: 50% !important;
  right: 3px !important;
  transform: translateY(-50%) !important;
  width: 36px !important;
  height: 21px !important;
  min-height: 21px !important;
  padding: 0 !important;
  border: 1px solid #c89a3a55 !important;
  border-radius: 2px !important;
  background: #c89a3a14 !important;
  color: #d4b16d !important;
  font-size: 4.5px !important;
  font-weight: 900 !important;
  letter-spacing: .05em !important;
  cursor: pointer !important;
}
.pvr-direct-granted-enter {
  width: 112px !important;
  height: 27px !important;
  min-height: 27px !important;
  margin: 0 auto !important;
  padding: 0 8px !important;
  border: 1px solid #d4b16d99 !important;
  border-radius: 3px !important;
  background: linear-gradient(180deg,#d6b66f,#a98243) !important;
  color: #161008 !important;
  font-size: 5px !important;
  font-weight: 900 !important;
  letter-spacing: .07em !important;
  cursor: pointer !important;
}
.pvr-direct-granted-enter:disabled,
.pvr-direct-granted-paste:disabled {
  opacity: .42 !important;
  cursor: not-allowed !important;
}
.pvr-direct-granted-error {
  margin: 3px 0 0 !important;
  color: #e0a5ad !important;
  font-size: 5px !important;
  font-weight: 800 !important;
  letter-spacing: .06em !important;
  text-align: center !important;
}
${end}`;

const oldStart = css.indexOf(start);
if (oldStart >= 0) {
  const oldEnd = css.indexOf(end, oldStart);
  if (oldEnd >= 0) {
    css = css.slice(0, oldStart) + finalCss + css.slice(oldEnd + end.length);
  }
} else {
  css = `${css.trimEnd()}\n\n${finalCss}\n`;
}

save(cssPath, cssBefore, css);

/* Telegram buttons in one row + last 4 chars copyable. */
let bot = read(botPath);
const botBefore = bot;

bot = bot.replace(
  /const keyboard = Markup\.inlineKeyboard\(\[\s*\[Markup\.button\.callback\("↻ ꜱᴇɴᴅ ᴀɢᴀɪɴ", `tgmx_resend_\$\{record\.code\}`\)\],\s*\[Markup\.button\.webApp\("ᴇɴᴛᴇʀ ᴄᴏᴅᴇ", returnUrl\)\],\s*\]\);/,
  `const keyboard = Markup.inlineKeyboard([\n      [\n        Markup.button.callback("↻ ꜱᴇɴᴅ ᴀɢᴀɪɴ", \`tgmx_resend_\${record.code}\`),\n        Markup.button.webApp("ᴇɴᴛᴇʀ ᴄᴏᴅᴇ", returnUrl),\n      ],\n    ]);`,
);

bot = bot.replace(
  '`\\n\\n⇀ <code>${escapeHtml(record.code)}</code>` +',
  '`\\n\\n⇀ SPCL-   <code>${escapeHtml(record.code.slice(-4))}</code>` +',
);

save(botPath, botBefore, bot);

console.log("DONE · Original ACCESS GRANTED design restored. Returned SPCL input now stays inside the same notification.");
