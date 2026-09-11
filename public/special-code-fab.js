(() => {
  const TELEGRAM_IDENTITY_URL = "https://t.me/User18Fx_bot?start=identity";

  const crownSvg = `
    <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z"></path>
    </svg>`;

  function openSpecialCode() {
    try {
      localStorage.setItem("userfx_identity_return", "1");
    } catch {}

    window.open(TELEGRAM_IDENTITY_URL, "_blank", "noopener,noreferrer");
  }

  function syncFloatingButton() {
    const stage = document.querySelector(".smkl-modal__stage");
    if (!stage) return;

    const panelTitle = stage.querySelector(".smkl-panel h2")?.textContent?.trim().toUpperCase() || "";
    const isAccessStep = panelTitle === "PRIVATE ACCESS";

    let button = stage.querySelector(".smkl-special-code-fab");

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "smkl-special-code-fab";
      button.setAttribute("aria-label", "Get special code");
      button.innerHTML = `${crownSvg}<span class="smkl-special-code-fab__tip">SPECIAL CODE</span>`;
      button.addEventListener("click", openSpecialCode);
      stage.appendChild(button);
    }

    button.hidden = isAccessStep;

    const bubble = stage.querySelector(".smkl-modal__bubble--screen");
    if (bubble) {
      let hint = bubble.querySelector(".smkl-special-code-hint");
      if (!hint) {
        hint = document.createElement("button");
        hint.type = "button";
        hint.className = "smkl-special-code-hint";
        hint.innerHTML = `<span>HAVE A SPECIAL CODE? CLICK THE CROWN</span>${crownSvg}`;
        hint.addEventListener("click", openSpecialCode);
        bubble.appendChild(hint);
      }
      hint.hidden = isAccessStep;
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
