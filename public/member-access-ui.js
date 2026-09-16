(() => {
  const MEMBER_MODE = "telegram_identity";
  const MEMBER_SECTION_ID = "member-private-section";
  const MODAL_POLISH_STYLE_ID = "userfx-access-modal-polish";

  const MEDIA = {
    basic: [
      "userfx-album/BSIC/BSIC-01.jpg",
      "userfx-album/BSIC/BSIC-02.jpg",
      "userfx-album/BSIC/BSIC-03.jpg",
      "userfx-album/BSIC/BSIC-04.jpg",
      "userfx-album/BSIC/BSIC-05.jpg",
    ],
    pro: [
      "userfx-album/PRX0/PRX0-01.jpg",
      "userfx-album/PRX0/PRX0-02.jpg",
      "userfx-album/PRX0/PRX0-03.jpg",
    ],
    vip: [
      "userfx-album/VIPX/VIPX-01.jpg",
      "userfx-album/VIPX/VIPX-02.jpg",
      "userfx-album/VIPX/VIPX-03.jpg",
      "userfx-album/VIPX/VIPX-04.jpg",
    ],
  };

  let authenticated = false;
  let memberActive = false;
  let planId = null;
  let syncQueued = false;

  const privateUrl = (pathname) => `/api/private-media?pathname=${encodeURIComponent(pathname)}`;

  function ensureAccessModalPolishStyles() {
    if (document.getElementById(MODAL_POLISH_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = MODAL_POLISH_STYLE_ID;
    style.textContent = `
      /* USER FX · access modal polish */
      .smkl-form__field--username,
      .smkl-form__field--username input {
        background: #07111d !important;
      }

      .smkl-form__field--username input {
        color: #63ffd0 !important;
        caret-color: #63ffd0 !important;
        -webkit-text-fill-color: #63ffd0 !important;
        box-shadow: inset 0 0 0 1000px #07111d !important;
      }

      .smkl-form__field--username input:-webkit-autofill,
      .smkl-form__field--username input:-webkit-autofill:hover,
      .smkl-form__field--username input:-webkit-autofill:focus,
      .smkl-form__field--username input:-webkit-autofill:active {
        -webkit-text-fill-color: #63ffd0 !important;
        caret-color: #63ffd0 !important;
        box-shadow: inset 0 0 0 1000px #07111d !important;
        -webkit-box-shadow: inset 0 0 0 1000px #07111d !important;
        transition: background-color 9999s ease-out 0s !important;
      }

      .smkl-panel__bottom-actions {
        position: absolute !important;
        left: auto !important;
        right: 4px !important;
        top: -62px !important;
        bottom: auto !important;
        transform: none !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 8px !important;
        width: max-content !important;
        z-index: 70 !important;
      }

      .smkl-telegram-action-wrap {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 48px !important;
        height: 48px !important;
        margin: 0 !important;
      }

      .smkl-telegram-mode-btn {
        position: relative !important;
        left: auto !important;
        right: auto !important;
        top: auto !important;
        bottom: auto !important;
        width: 48px !important;
        height: 48px !important;
        min-width: 48px !important;
        min-height: 48px !important;
        margin: 0 !important;
        padding: 0 !important;
        transform-origin: center !important;
      }

      .smkl-special-code-fab {
        position: relative !important;
        left: auto !important;
        right: auto !important;
        top: auto !important;
        bottom: auto !important;
        width: 48px !important;
        height: 48px !important;
        min-width: 48px !important;
        min-height: 48px !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: none !important;
        border-radius: 8px !important;
      }

      .smkl-special-code-fab small {
        display: none !important;
      }

      .smkl-telegram-side-label {
        position: absolute !important;
        left: 56px !important;
        right: auto !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        min-width: max-content !important;
        padding: 5px 8px !important;
        margin: 0 !important;
        border: 1px solid #00c4ff8f !important;
        border-radius: 6px !important;
        background: #04121ef2 !important;
        color: #d4fbff !important;
        font-size: 7px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        letter-spacing: .10em !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        z-index: 90 !important;
      }

      .smkl-panel__bottom-actions:has(.smkl-special-code-fab)
        .smkl-telegram-side-label {
        left: 112px !important;
      }

      .smkl-telegram-mode-btn:hover:not(:disabled),
      .smkl-special-code-fab:hover:not(:disabled) {
        transform: translateY(-1px) scale(1.04) !important;
      }

      .smkl-telegram-mode-btn:active:not(:disabled),
      .smkl-special-code-fab:active:not(:disabled) {
        transform: scale(.95) !important;
      }

      @media (max-width: 600px) {
        .smkl-panel__bottom-actions {
          right: 6px !important;
          top: -54px !important;
          gap: 6px !important;
        }

        .smkl-telegram-action-wrap,
        .smkl-telegram-mode-btn,
        .smkl-special-code-fab {
          width: 42px !important;
          height: 42px !important;
          min-width: 42px !important;
          min-height: 42px !important;
        }

        .smkl-telegram-side-label {
          left: 48px !important;
          padding: 4px 7px !important;
          font-size: 6px !important;
        }

        .smkl-panel__bottom-actions:has(.smkl-special-code-fab)
          .smkl-telegram-side-label {
          left: 96px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function getPrivateMedia() {
    if (!authenticated) return [];
    if (memberActive || planId === "vip") {
      return [...MEDIA.basic, ...MEDIA.pro, ...MEDIA.vip];
    }
    if (planId === "pro") {
      return [...MEDIA.basic, ...MEDIA.pro];
    }
    if (planId === "basic") {
      return [...MEDIA.basic];
    }
    return [];
  }

  function scrambleText(node, finalText) {
    if (!node || node.dataset.scrambling === "1") return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789🜲✦";
    const original = finalText || node.textContent || "";
    let frame = 0;
    node.dataset.scrambling = "1";

    const timer = window.setInterval(() => {
      const progress = frame / 9;
      node.textContent = original
        .split("")
        .map((char, index) => {
          if (char === " ") return " ";
          if (index / Math.max(original.length, 1) < progress) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("");

      frame += 1;
      if (frame > 9) {
        window.clearInterval(timer);
        node.textContent = original;
        node.dataset.scrambling = "0";
      }
    }, 42);
  }

  function updateHeaderBadge() {
    if (!memberActive) return;
    const badge = document.querySelector(".vx-hudRight .vx-unlockedBadge");
    if (!badge) return;

    badge.classList.add("is-spcl-member");
    badge.setAttribute("aria-label", "SPCL member access");

    const prefix = badge.querySelector(".vx-unlockedPrefix");
    const state = badge.querySelector(".vx-unlockedState");
    if (prefix) prefix.textContent = "SPCL";
    if (state) state.textContent = "MEMBER";
  }

  function hideLegacyAlbum() {
    const legacy = document.querySelector(".vx-privateAlbum");
    if (!legacy) return;

    if (authenticated) {
      legacy.setAttribute("data-userfx-legacy-private", "true");
    } else {
      legacy.removeAttribute("data-userfx-legacy-private");
    }
  }

  function ensureDoorsState() {
    const root = document.querySelector(".vhd-root");
    if (!root) return;

    if (!memberActive) {
      root.classList.remove("is-spcl-member");
      root.querySelector(".vhd-member-getin")?.remove();
      return;
    }

    root.classList.add("is-open", "is-spcl-member");

    let button = root.querySelector(".vhd-member-getin");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "vhd-member-getin";
      button.textContent = "GET IN";
      button.addEventListener("click", () => {
        document
          .getElementById(MEMBER_SECTION_ID)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      root.appendChild(button);
    }
  }

  function ensurePrivateGallery() {
    const carousel = document.querySelector(".vx-carousel");
    if (!carousel) return;

    const existing = document.getElementById(MEMBER_SECTION_ID);
    const privateMedia = getPrivateMedia();

    if (!authenticated || !privateMedia.length) {
      existing?.remove();
      return;
    }

    const label = memberActive
      ? "✦ SPCL MEMBER ACCESS"
      : planId === "vip"
        ? "✦ VIP PRIVATE ACCESS"
        : planId === "pro"
          ? "✦ PRO PRIVATE ACCESS"
          : "✦ BASIC PRIVATE ACCESS";

    if (existing?.dataset.gallerySignature === `${memberActive}:${planId}:${privateMedia.length}`) {
      return;
    }

    existing?.remove();

    const section = document.createElement("section");
    section.id = MEMBER_SECTION_ID;
    section.className = "vx-memberPrivate";
    section.dataset.gallerySignature = `${memberActive}:${planId}:${privateMedia.length}`;
    section.setAttribute("aria-label", "Private gallery");

    section.innerHTML = `
      <div class="vx-memberPrivate__head">
        <div>
          <p class="vx-memberPrivate__kicker">${label}</p>
          <h2 class="vx-memberPrivate__title">PRIVATE GALLERY</h2>
        </div>
        <p class="vx-memberPrivate__note">${memberActive ? "MEMBER ACCESS · SPCL" : "PAID ACCESS"}</p>
      </div>
      <div class="vx-memberPrivate__grid">
        ${privateMedia
          .map(
            (pathname, index) => `
          <figure class="vx-memberPrivate__item" oncontextmenu="return false">
            <img src="${privateUrl(pathname)}" alt="Private image ${index + 1}" draggable="false" loading="lazy" />
            <figcaption>
              <span>USER 🜲 FX</span>
              <small>PRIVATE FILE ${String(index + 1).padStart(2, "0")}</small>
            </figcaption>
          </figure>
        `,
          )
          .join("")}
      </div>
    `;

    carousel.insertAdjacentElement("afterend", section);
  }

  function ensureFooterActions() {
    const links = document.querySelector(".vx-foot .vx-links");
    if (!links) return;

    links.classList.add("is-member-actions");

    const actions = [
      {
        emoji: "💬",
        label: "MESSAGE",
        href: "https://t.me/User18Fx",
        external: true,
      },
      {
        emoji: "🖼️",
        label: "GALLERY",
        href: `#${MEMBER_SECTION_ID}`,
        external: false,
      },
      {
        emoji: "👑",
        label: "VIP",
        href: "https://t.me/User18Fx_bot?start=getcode_vip",
        external: true,
      },
    ];

    links.innerHTML = actions
      .map(
        (action) => `
          <a
            class="vx-member-link"
            href="${memberActive ? action.href : "#"}"
            ${memberActive && action.external ? 'target="_blank" rel="noreferrer"' : ""}
            aria-disabled="${memberActive ? "false" : "true"}"
            data-member-action="${action.label}"
          >
            <span class="vx-member-link__emoji">${action.emoji}</span>
            <span class="vx-member-link__text">${action.label}</span>
          </a>
        `,
      )
      .join("");

    links.querySelectorAll(".vx-member-link").forEach((link) => {
      const text = link.querySelector(".vx-member-link__text");
      link.addEventListener("mouseenter", () => {
        scrambleText(text, link.dataset.memberAction || text?.textContent || "");
      });

      link.addEventListener("click", (event) => {
        if (!memberActive) {
          event.preventDefault();
          scrambleText(text, link.dataset.memberAction || text?.textContent || "");
          return;
        }

        if (link.dataset.memberAction === "GALLERY") {
          event.preventDefault();
          document
            .getElementById(MEMBER_SECTION_ID)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  function applyUi() {
    ensureAccessModalPolishStyles();
    updateHeaderBadge();
    hideLegacyAlbum();
    ensureDoorsState();
    ensurePrivateGallery();
    ensureFooterActions();
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      applyUi();
    });
  }

  async function refreshMemberState() {
    try {
      const response = await fetch("/api/access-session", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      authenticated = Boolean(response.ok && data?.authenticated === true);
      memberActive = Boolean(authenticated && data?.accessMode === MEMBER_MODE);
      planId = authenticated ? String(data?.planId || "") : null;
    } catch {
      authenticated = false;
      memberActive = false;
      planId = null;
    }

    queueSync();
  }

  ensureAccessModalPolishStyles();

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("hashchange", queueSync);
  window.addEventListener("focus", refreshMemberState);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshMemberState, { once: true });
  } else {
    refreshMemberState();
  }
})();
