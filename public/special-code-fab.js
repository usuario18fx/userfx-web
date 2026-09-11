(() => {
  const TELEGRAM_IDENTITY_URL = "https://t.me/User18Fx_bot?start=identity";

  const crownSvg = `
    <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z"></path>
    </svg>`;

  let state = {
    enabled: false,
    visible: true,
  };

  function setButtonMessage(button, message) {
    const tip = button?.querySelector?.(".smkl-special-code-fab__tip");
    if (tip) tip.textContent = message;
  }

  function applyState(button) {
    if (!button) return;

    button.hidden = !state.visible;
    button.disabled = !state.enabled;
    button.classList.toggle("is-ready", state.enabled);
    button.classList.toggle("is-locked", !state.enabled);
    button.setAttribute("aria-disabled", state.enabled ? "false" : "true");
    setButtonMessage(button, state.enabled ? "GET SPECIAL CODE" : "VERIFY USERNAME FIRST");
  }

  function openSpecialCode(event) {
    const button = event.currentTarget;
    if (!state.enabled || button.disabled) return;

    setButtonMessage(button, "OPENING TELEGRAM...");
    button.classList.remove("is-ready");

    try {
      localStorage.setItem("userfx_identity_return", "1");
    } catch {}

    window.open(TELEGRAM_IDENTITY_URL, "_blank", "noopener,noreferrer");

    window.setTimeout(() => {
      if (state.enabled) {
        button.classList.add("is-ready");
        setButtonMessage(button, "GET SPECIAL CODE");
      }
    }, 1800);
  }

  function syncFloatingButton() {
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
  }

  window.addEventListener("userfx:special-code-state", (event) => {
    const detail = event?.detail || {};
    state = {
      enabled: Boolean(detail.enabled),
      visible: detail.visible !== false,
    };
    syncFloatingButton();
  });

  const observer = new MutationObserver(syncFloatingButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncFloatingButton, { once: true });
  } else {
    syncFloatingButton();
  }
})();
