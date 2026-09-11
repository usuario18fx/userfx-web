(() => {
  const TELEGRAM_IDENTITY_URL = "https://t.me/User18Fx_bot?start=identity";
  const USERNAME_MESSAGE = "Hey sexy, if you already got your special code, drop it here. Need a special code? Tap the crown.";

  const crownSvg = `
    <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z"></path>
    </svg>`;

  function ensureStyleOverrides() {
    if (document.getElementById("smkl-special-code-runtime-style")) return;

    const style = document.createElement("style");
    style.id = "smkl-special-code-runtime-style";
    style.textContent = `
      .smkl-special-code-hint{display:none!important;}

      .smkl-special-code-fab:focus-visible .smkl-special-code-fab__tip{
        opacity:1!important;
        visibility:visible!important;
        transform:translateY(-50%) translateX(0)!important;
      }

      @media(max-width:520px){
        .smkl-special-code-fab__tip{
          display:block!important;
          right:calc(100% + 7px)!important;
          top:50%!important;
          opacity:1!important;
          visibility:visible!important;
          transform:translateY(-50%) translateX(0)!important;
          padding:6px 8px!important;
          font-size:.48rem!important;
          letter-spacing:.09em!important;
          pointer-events:none!important;
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
      setButtonMessage(button, "OPENING TELEGRAM...");
      window.setTimeout(() => setButtonMessage(button, "GET SPECIAL CODE"), 1800);
    }

    try {
      localStorage.setItem("userfx_identity_return", "1");
    } catch {}

    window.open(TELEGRAM_IDENTITY_URL, "_blank", "noopener,noreferrer");
  }

  function syncTypedMessage(stage, panelTitle) {
    if (panelTitle !== "WHO'S PULLING UP?") return;

    const typingText = stage.querySelector(".smkl-typing-text");
    if (!typingText) return;

    if (typingText.textContent?.trim() !== USERNAME_MESSAGE) {
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
    const isAccessStep = panelTitle === "PRIVATE ACCESS";

    removeLegacyFixedHint(stage);
    syncTypedMessage(stage, panelTitle);

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
  }

  const observer = new MutationObserver(syncFloatingButton);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncFloatingButton, { once: true });
  } else {
    syncFloatingButton();
  }
})();
