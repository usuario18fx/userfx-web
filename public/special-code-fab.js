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

  let syncQueued = false;

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
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", queueSync, { once: true });
  } else {
    queueSync();
  }
})();
