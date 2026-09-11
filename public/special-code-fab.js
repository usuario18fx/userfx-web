(() => {
  const TELEGRAM_IDENTITY_URL = "https://t.me/User18Fx_bot?start=identity";

  const READY_MESSAGE =
    "USERNAME VERIFIED. TAP THE CROWN TO GET YOUR SPECIAL CODE IN TELEGRAM, THEN COME BACK AND ENTER IT HERE.";

  const ACCESS_MESSAGE =
    "YOU MADE IT! ACCESS IS UNLOCKED — WELCOME TO USER FX.";

  const crownSvg = `
    <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z"></path>
    </svg>`;

  let state = {
    enabled: false,
    visible: true,
  };

  let syncQueued = false;

  function ensureReadyStyles() {
    if (document.getElementById("userfx-special-ready-style")) return;

    const style = document.createElement("style");
    style.id = "userfx-special-ready-style";
    style.textContent = `
      .smkl-modal__stage.is-special-ready .smkl-telegram-mode-btn {
        pointer-events: none !important;
        opacity: .34 !important;
        filter: saturate(.28) grayscale(.12) !important;
        animation: none !important;
        transform: none !important;
        box-shadow: 0 8px 18px #00000044 !important;
        cursor: not-allowed !important;
      }

      .smkl-special-code-fab.is-ready {
        animation: userfxSpecialSoftPulse 3.2s ease-in-out infinite !important;
      }

      .smkl-special-code-fab.is-ready svg {
        animation: userfxSpecialCrownSoft 3.2s ease-in-out infinite !important;
      }

      @keyframes userfxSpecialSoftPulse {
        0%, 100% {
          transform: scale(1);
          box-shadow:
            0 10px 16px -12px #ddff0048,
            0 0 7px #ddff002c,
            inset 0 1px 0 #ffffff35;
        }
        50% {
          transform: scale(1.018);
          box-shadow:
            0 12px 18px -12px #ddff005a,
            0 0 11px #ddff003d,
            inset 0 1px 0 #ffffff45;
        }
      }

      @keyframes userfxSpecialCrownSoft {
        0%, 100% {
          transform: scale(1);
          filter: drop-shadow(0 0 1px #ddff0035);
        }
        50% {
          transform: scale(1.025);
          filter: drop-shadow(0 0 3px #ddff0055);
        }
      }

      .smkl-modal__stage.is-special-ready .smkl-typing-viewport {
        text-align: left !important;
      }

      .smkl-modal__stage.is-special-ready .smkl-typing-text {
        width: max-content !important;
        max-width: none !important;
        white-space: nowrap !important;
        animation:
          smklTypingReveal 7.5s steps(92,end) forwards,
          smklTypingPan 11s linear 3.8s forwards !important;
      }

      .smkl-modal__stage.is-special-ready .smkl-identity-combined {
        background:
          radial-gradient(circle at 22% 50%, #2cffe019, transparent 30%),
          linear-gradient(180deg, #0b2324e8 0%, #031012f5 58%, #020809fa 100%) !important;
        border-color: #35e8d7d9 !important;
        box-shadow:
          inset 0 1px 0 #ffffff12,
          inset 0 0 22px #00d8c617,
          0 9px 22px #00000066,
          0 0 16px #00d8c625 !important;
      }

      .smkl-code-digit {
        display: grid !important;
        place-items: center !important;
        font-family: "JetBrains Mono", ui-monospace, monospace !important;
        font-size: .88rem !important;
        font-weight: 900 !important;
        line-height: 1 !important;
      }

      .smkl-code-digit.is-filled {
        color: #020807 !important;
        background:
          linear-gradient(180deg, #b8ffef 0%, #68ffd1 52%, #32d9ae 100%) !important;
        border-color: #aaffeb !important;
        text-shadow: 0 1px 0 #ffffff80 !important;
        box-shadow:
          inset 0 1px 0 #ffffffcc,
          inset 0 -5px 10px #078c7040,
          0 0 8px #63ffd0a8,
          0 0 15px #63ffd04f !important;
      }

      .smkl-modal__stage.is-access-cleared .smkl-plan-switcher {
        visibility: hidden !important;
        pointer-events: none !important;
      }

      .smkl-modal__stage.is-access-cleared .smkl-panel {
        min-height: 356px !important;
      }

      .smkl-modal__stage.is-access-cleared .smkl-typing-text {
        width: max-content !important;
        max-width: none !important;
        white-space: nowrap !important;
        animation:
          smklTypingReveal 3.8s steps(58,end) forwards,
          userfxAccessWelcomeGlow 2.4s ease-in-out infinite !important;
      }

      @keyframes userfxAccessWelcomeGlow {
        0%, 100% {
          text-shadow: 0 0 5px #68ffd04a !important;
        }
        50% {
          text-shadow: 0 0 11px #68ffd080 !important;
        }
      }

      .smkl-modal__stage.is-access-cleared .smkl-robot__eye:last-child {
        transform-origin: center !important;
        animation:
          smklEyeGlow 2.4s ease-in-out infinite,
          userfxRightEyeWink 4.6s ease-in-out infinite !important;
      }

      @keyframes userfxRightEyeWink {
        0%, 66%, 72%, 100% { transform: scaleY(1); }
        68%, 70% { transform: scaleY(.08); }
      }

      .smkl-form__submit--get-in {
        position: relative !important;
        isolation: isolate !important;
        overflow: hidden !important;
        border-color: #52ffd4b8 !important;
        background:
          linear-gradient(110deg,
            #071018 0%,
            #0b2c32 24%,
            #0d6b62 46%,
            #08141a 64%,
            #071018 100%) !important;
        background-size: 260% 100% !important;
        animation:
          userfxGetIn247 3.6s linear infinite,
          userfxGetInBreath 2.2s ease-in-out infinite !important;
        box-shadow:
          0 8px 20px #00000066,
          0 0 12px #4affc52f,
          inset 0 1px 0 #ffffff16 !important;
      }

      .smkl-form__submit--get-in::after {
        content: "" !important;
        position: absolute !important;
        top: -30% !important;
        left: -36% !important;
        width: 24% !important;
        height: 160% !important;
        background: linear-gradient(90deg, transparent, #ffffff80, transparent) !important;
        transform: skewX(-18deg) !important;
        animation: userfxGetInShine 2.9s ease-in-out infinite !important;
        z-index: 1 !important;
        pointer-events: none !important;
      }

      .smkl-form__submit--get-in span {
        position: relative !important;
        z-index: 2 !important;
        color: #8affdc !important;
        text-shadow: 0 0 8px #5dffc168 !important;
      }

      @keyframes userfxGetIn247 {
        0% { background-position: 0% 50%; }
        100% { background-position: 260% 50%; }
      }

      @keyframes userfxGetInBreath {
        0%, 100% {
          box-shadow:
            0 8px 20px #00000066,
            0 0 9px #4affc523,
            inset 0 1px 0 #ffffff16;
        }
        50% {
          box-shadow:
            0 9px 24px #00000070,
            0 0 17px #4affc545,
            inset 0 1px 0 #ffffff24;
        }
      }

      @keyframes userfxGetInShine {
        0%, 24% { left: -36%; opacity: 0; }
        34% { opacity: .72; }
        62% { left: 118%; opacity: 0; }
        100% { left: 118%; opacity: 0; }
      }
    `;

    document.head.appendChild(style);
  }

  function setButtonMessage(button, message) {
    const tip = button?.querySelector?.(".smkl-special-code-fab__tip");
    if (!tip) return;
    if (tip.textContent !== message) tip.textContent = message;
  }

  function setClassState(element, className, enabled) {
    if (!element) return;
    const hasClass = element.classList.contains(className);
    if (hasClass !== enabled) element.classList.toggle(className, enabled);
  }

  function syncIdentityDigits(stage) {
    if (!stage) return;

    const input = stage.querySelector(".smkl-code-real-input");
    const digits = Array.from(stage.querySelectorAll(".smkl-code-digit"));
    if (!input || !digits.length) return;

    const renderDigits = () => {
      const codePart = String(input.value || "")
        .toUpperCase()
        .replace(/^(SPCL|TGMX)-?/i, "")
        .replace(/[^A-HJ-NP-Z2-9]/g, "")
        .slice(0, 4);

      digits.forEach((digit, index) => {
        const char = codePart[index] || "";
        if (digit.textContent !== char) digit.textContent = char;
        setClassState(digit, "is-filled", Boolean(char));
      });
    };

    if (input.dataset.userfxDigitMirror !== "1") {
      input.dataset.userfxDigitMirror = "1";
      input.addEventListener("input", renderDigits);
      input.addEventListener("change", renderDigits);
    }

    renderDigits();
  }

  function applyReadyUi(stage) {
    if (!stage) return;

    const accessCleared = Boolean(
      stage.querySelector(".smkl-form__submit--get-in"),
    );

    setClassState(stage, "is-special-ready", state.enabled && !accessCleared);
    setClassState(stage, "is-access-cleared", accessCleared);

    const telegramButton = stage.querySelector(".smkl-telegram-mode-btn");
    if (telegramButton) {
      const shouldDisableTelegram = state.enabled || accessCleared;

      if (telegramButton.disabled !== shouldDisableTelegram) {
        telegramButton.disabled = shouldDisableTelegram;
      }

      telegramButton.setAttribute(
        "aria-disabled",
        shouldDisableTelegram ? "true" : "false",
      );

      if (shouldDisableTelegram) {
        telegramButton.setAttribute(
          "title",
          accessCleared
            ? "Private access unlocked"
            : "Telegram username already verified",
        );
      }
    }

    const typingText = stage.querySelector(".smkl-typing-text");

    if (accessCleared) {
      if (typingText && typingText.textContent !== ACCESS_MESSAGE) {
        typingText.textContent = ACCESS_MESSAGE;
      }
    } else if (state.enabled) {
      if (typingText && typingText.textContent !== READY_MESSAGE) {
        typingText.textContent = READY_MESSAGE;
      }
    }

    syncIdentityDigits(stage);
  }

  function applyState(button) {
    if (!button) return;

    const shouldHide = !state.visible;
    const shouldDisable = !state.enabled;
    const ariaDisabled = state.enabled ? "false" : "true";

    if (button.hidden !== shouldHide) button.hidden = shouldHide;
    if (button.disabled !== shouldDisable) button.disabled = shouldDisable;

    setClassState(button, "is-ready", state.enabled);
    setClassState(button, "is-locked", !state.enabled);

    if (button.getAttribute("aria-disabled") !== ariaDisabled) {
      button.setAttribute("aria-disabled", ariaDisabled);
    }

    setButtonMessage(button, state.enabled ? "GET SPECIAL CODE" : "VERIFY USERNAME FIRST");
  }

  function openSpecialCode(event) {
    const button = event.currentTarget;
    if (!state.enabled || button.disabled) return;

    setButtonMessage(button, "OPENING TELEGRAM...");
    setClassState(button, "is-ready", false);

    try {
      localStorage.setItem("userfx_identity_return", "1");
    } catch {}

    window.open(TELEGRAM_IDENTITY_URL, "_blank", "noopener,noreferrer");

    window.setTimeout(() => {
      if (state.enabled) {
        setClassState(button, "is-ready", true);
        setButtonMessage(button, "GET SPECIAL CODE");
      }
    }, 1800);
  }

  function syncFloatingButton() {
    ensureReadyStyles();

    const stage = document.querySelector(".smkl-modal__stage");
    if (!stage) return;

    let button = stage.querySelector(".smkl-special-code-fab");

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "smkl-special-code-fab is-locked";
      button.setAttribute("aria-label", "Get special code");
      button.innerHTML = `${crownSvg}<span class="smkl-special-code-fab__tip">VERIFY USERNAME FIRST</span>`;
      button.addEventListener("click", openSpecialCode);
      stage.appendChild(button);
    }

    applyState(button);
    applyReadyUi(stage);
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;

    requestAnimationFrame(() => {
      syncQueued = false;
      syncFloatingButton();
    });
  }

  window.addEventListener("userfx:special-code-state", (event) => {
    const detail = event?.detail || {};
    state = {
      enabled: Boolean(detail.enabled),
      visible: detail.visible !== false,
    };
    queueSync();
  });

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", queueSync, { once: true });
  } else {
    queueSync();
  }
})();
