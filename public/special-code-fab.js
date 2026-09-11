(() => {
  const TELEGRAM_IDENTITY_URL = "https://t.me/User18Fx_bot?start=identity";

  const READY_MESSAGE =
    "USERNAME VERIFIED. TAP THE CROWN TO GET YOUR SPECIAL CODE IN TELEGRAM, THEN COME BACK AND ENTER IT HERE.";

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
        animation: userfxSpecialSoftPulse 2.4s ease-in-out infinite !important;
      }

      .smkl-special-code-fab.is-ready svg {
        animation: userfxSpecialCrownSoft 2.4s ease-in-out infinite !important;
      }

      @keyframes userfxSpecialSoftPulse {
        0%, 100% {
          transform: scale(1);
          box-shadow:
            0 12px 18px -12px #ddff0060,
            0 0 10px #ddff0038,
            inset 0 1px 0 #ffffff40;
        }
        50% {
          transform: scale(1.035);
          box-shadow:
            0 14px 20px -11px #ddff0075,
            0 0 17px #ddff004d,
            inset 0 1px 0 #ffffff55;
        }
      }

      @keyframes userfxSpecialCrownSoft {
        0%, 100% {
          transform: scale(1);
          filter: drop-shadow(0 0 2px #ddff0040);
        }
        50% {
          transform: scale(1.045);
          filter: drop-shadow(0 0 5px #ddff0066);
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

  function applyReadyUi(stage) {
    if (!stage) return;

    setClassState(stage, "is-special-ready", state.enabled);

    const telegramButton = stage.querySelector(".smkl-telegram-mode-btn");
    if (telegramButton) {
      if (telegramButton.disabled !== state.enabled) {
        telegramButton.disabled = state.enabled;
      }

      telegramButton.setAttribute(
        "aria-disabled",
        state.enabled ? "true" : "false",
      );

      if (state.enabled) {
        telegramButton.setAttribute(
          "title",
          "Telegram username already verified",
        );
      }
    }

    if (state.enabled) {
      const typingText = stage.querySelector(".smkl-typing-text");
      if (typingText && typingText.textContent !== READY_MESSAGE) {
        typingText.textContent = READY_MESSAGE;
      }
    }
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
