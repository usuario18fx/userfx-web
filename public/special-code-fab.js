(() => {
  const TELEGRAM_IDENTITY_URL = "https://t.me/User18Fx_bot?start=identity";
  const USERNAME_MESSAGE = "Hey sexy, if you already got your special code, drop it here.";
  const SPECIAL_MESSAGE = "Need a special code? Tap the crown";
  const SECOND_MESSAGE_DELAY = 10200;

  const crownSvg = `
    <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z"></path>
    </svg>`;

  const sequenceTimers = new WeakMap();

  function ensureStyleOverrides() {
    if (document.getElementById("smkl-special-code-runtime-style")) return;

    const style = document.createElement("style");
    style.id = "smkl-special-code-runtime-style";
    style.textContent = `
      /* old fixed hint and old lock are removed */
      .smkl-special-code-hint,
      .smkl-step-unlock-icon{
        display:none!important;
      }

      /* button copy belongs on the RIGHT side of the crown */
      .smkl-special-code-fab__tip{
        left:calc(100% + 10px)!important;
        right:auto!important;
        top:50%!important;
        transform:translateY(-50%) translateX(-5px)!important;
        opacity:1!important;
        visibility:visible!important;
        color:#ddff00!important;
      }

      .smkl-special-code-fab:hover .smkl-special-code-fab__tip,
      .smkl-special-code-fab:focus-visible .smkl-special-code-fab__tip{
        transform:translateY(-50%) translateX(0)!important;
      }

      /* crown added to the SECOND typed screen message */
      .smkl-typing-text.smkl-special-second-message{
        color:#dff1ff!important;
      }

      .smkl-typing-text.smkl-special-second-message svg{
        display:inline-block!important;
        width:15px!important;
        height:11px!important;
        margin-left:7px!important;
        vertical-align:-1px!important;
        fill:#dff1ff!important;
        filter:drop-shadow(0 0 5px #62ffd080)!important;
      }

      /* restart typing animation for second message */
      .smkl-typing-viewport .smkl-typing-text.smkl-special-second-message{
        width:max-content!important;
        clip-path:inset(0 100% 0 0)!important;
        animation:
          smklSpecialSecondTyping 4.8s steps(42,end) forwards,
          smklSpecialSecondPan 7.5s linear 3.4s forwards!important;
      }

      @keyframes smklSpecialSecondTyping{
        from{clip-path:inset(0 100% 0 0);}
        to{clip-path:inset(0 0 0 0);}
      }

      @keyframes smklSpecialSecondPan{
        from{transform:translateX(0);}
        to{transform:translateX(calc(-100% + 300px));}
      }

      /* pulse begins exactly when second message starts */
      .smkl-special-code-fab.is-special-pulsing{
        animation:smklSpecialCodePulse 1.15s ease-in-out infinite!important;
      }

      @keyframes smklSpecialCodePulse{
        0%,100%{
          box-shadow:0 14px 22px -12px #ddff0070,0 0 16px #ddff0040,inset 0 1px 0 #ffffff55;
          filter:brightness(1);
        }
        50%{
          box-shadow:0 16px 26px -10px #ddff00aa,0 0 34px #ddff0090,0 0 54px #ddff0048,inset 0 1px 0 #ffffff88;
          filter:brightness(1.18);
        }
      }

      @media(max-width:520px){
        .smkl-special-code-fab__tip{
          display:block!important;
          left:calc(100% + 7px)!important;
          right:auto!important;
          padding:6px 8px!important;
          font-size:.46rem!important;
          letter-spacing:.07em!important;
          pointer-events:none!important;
          white-space:nowrap!important;
        }

        @keyframes smklSpecialSecondPan{
          from{transform:translateX(0);}
          to{transform:translateX(calc(-100% + 235px));}
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setButtonMessage(button, message) {
    const tip = button?.querySelector?.(".smkl-special-code-fab__tip");
    if (!tip) return;
    tip.textContent = message;
  }

  function openSpecialCode(event) {
    const button = event?.currentTarget;

    if (button) {
      button.classList.remove("is-special-pulsing");
      setButtonMessage(button, "OPENING TELEGRAM...");
      window.setTimeout(() => setButtonMessage(button, "GET SPECIAL CODE"), 1800);
    }

    try {
      localStorage.setItem("userfx_identity_return", "1");
    } catch {}

    window.open(TELEGRAM_IDENTITY_URL, "_blank", "noopener,noreferrer");
  }

  function clearSequence(stage) {
    const timer = sequenceTimers.get(stage);
    if (timer) {
      window.clearTimeout(timer);
      sequenceTimers.delete(stage);
    }

    delete stage.dataset.specialMessagePhase;

    const typingText = stage.querySelector(".smkl-typing-text");
    typingText?.classList.remove("smkl-special-second-message");

    const button = stage.querySelector(".smkl-special-code-fab");
    button?.classList.remove("is-special-pulsing");
  }

  function startUsernameSequence(stage) {
    const typingText = stage.querySelector(".smkl-typing-text");
    if (!typingText) return;

    const phase = stage.dataset.specialMessagePhase;

    if (!phase) {
      stage.dataset.specialMessagePhase = "1";
      typingText.classList.remove("smkl-special-second-message");
      typingText.textContent = USERNAME_MESSAGE;

      const timer = window.setTimeout(() => {
        if (!document.documentElement.contains(stage)) return;

        const currentTitle = stage.querySelector(".smkl-panel h2")?.textContent?.trim().toUpperCase() || "";
        if (currentTitle !== "WHO'S PULLING UP?") return;

        stage.dataset.specialMessagePhase = "2";

        const currentText = stage.querySelector(".smkl-typing-text");
        if (!currentText) return;

        currentText.classList.add("smkl-special-second-message");
        currentText.innerHTML = `${SPECIAL_MESSAGE}${crownSvg}`;

        const button = stage.querySelector(".smkl-special-code-fab");
        button?.classList.add("is-special-pulsing");
      }, SECOND_MESSAGE_DELAY);

      sequenceTimers.set(stage, timer);
      return;
    }

    if (phase === "1" && typingText.textContent?.trim() !== USERNAME_MESSAGE) {
      typingText.textContent = USERNAME_MESSAGE;
    }
  }

  function removeLegacyFixedHint(stage) {
    stage.querySelectorAll(".smkl-special-code-hint").forEach((node) => node.remove());
  }

  function syncFloatingButton() {
    ensureStyleOverrides();

    const stage = document.querySelector(".smkl-modal__stage");
    if (!stage) return;

    const panelTitle = stage.querySelector(".smkl-panel h2")?.textContent?.trim().toUpperCase() || "";
    const isUsernameStep = panelTitle === "WHO'S PULLING UP?";
    const isAccessStep = panelTitle === "PRIVATE ACCESS";

    removeLegacyFixedHint(stage);

    let button = stage.querySelector(".smkl-special-code-fab");

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "smkl-special-code-fab";
      button.setAttribute("aria-label", "Get special code");
      button.innerHTML = `${crownSvg}<span class="smkl-special-code-fab__tip">GET SPECIAL CODE</span>`;
      button.addEventListener("click", openSpecialCode);
      stage.appendChild(button);
    }

    button.hidden = isAccessStep;

    if (isUsernameStep) {
      startUsernameSequence(stage);
    } else {
      clearSequence(stage);
    }
  }

  const observer = new MutationObserver(syncFloatingButton);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncFloatingButton, { once: true });
  } else {
    syncFloatingButton();
  }
})();
