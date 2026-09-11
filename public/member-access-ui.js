(() => {
  const MEMBER_MODE = "telegram_identity";
  const MEMBER_SECTION_ID = "member-private-section";

  const PRIVATE_MEDIA = [
    "userfx-album/BSIC/BSIC-01.jpg",
    "userfx-album/BSIC/BSIC-02.jpg",
    "userfx-album/BSIC/BSIC-03.jpg",
    "userfx-album/BSIC/BSIC-04.jpg",
    "userfx-album/BSIC/BSIC-05.jpg",
    "userfx-album/PRX0/PRX0-01.jpg",
    "userfx-album/PRX0/PRX0-02.jpg",
    "userfx-album/PRX0/PRX0-03.jpg",
    "userfx-album/VIPX/VIPX-01.jpg",
    "userfx-album/VIPX/VIPX-02.jpg",
    "userfx-album/VIPX/VIPX-03.jpg",
    "userfx-album/VIPX/VIPX-04.jpg",
  ];

  let memberActive = false;
  let syncQueued = false;

  const privateUrl = (pathname) =>
    `/api/private-media?pathname=${encodeURIComponent(pathname)}`;

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
    legacy.setAttribute("data-userfx-legacy-private", "true");
  }

  function ensureDoorsState() {
    const root = document.querySelector(".vhd-root");
    if (!root) return;

    if (!memberActive) {
      root.classList.remove("is-spcl-member");
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

  function ensureMemberGallery() {
    const carousel = document.querySelector(".vx-carousel");
    if (!carousel) return;

    const existing = document.getElementById(MEMBER_SECTION_ID);
    if (!memberActive) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const section = document.createElement("section");
    section.id = MEMBER_SECTION_ID;
    section.className = "vx-memberPrivate";
    section.setAttribute("aria-label", "SPCL member private gallery");

    section.innerHTML = `
      <div class="vx-memberPrivate__head">
        <div>
          <p class="vx-memberPrivate__kicker">✦ SPCL MEMBER ACCESS</p>
          <h2 class="vx-memberPrivate__title">PRIVATE GALLERY</h2>
        </div>
        <p class="vx-memberPrivate__note">MEMBER ACCESS · NO PLAN LABEL</p>
      </div>
      <div class="vx-memberPrivate__grid">
        ${PRIVATE_MEDIA.map((pathname, index) => `
          <figure class="vx-memberPrivate__item" oncontextmenu="return false">
            <img src="${privateUrl(pathname)}" alt="Private member image ${index + 1}" draggable="false" loading="lazy" />
            <figcaption>
              <span>USER 🜲 FX</span>
              <small>MEMBER FILE ${String(index + 1).padStart(2, "0")}</small>
            </figcaption>
          </figure>
        `).join("")}
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
    updateHeaderBadge();
    hideLegacyAlbum();
    ensureDoorsState();
    ensureMemberGallery();
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
      memberActive = Boolean(
        response.ok &&
          data?.authenticated === true &&
          data?.accessMode === MEMBER_MODE,
      );
    } catch {
      memberActive = false;
    }

    queueSync();
  }

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
