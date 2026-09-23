import "./private-room-friend.css";

const FRIEND_ID = "userfx-global-friend";
const MODAL_ID = "userfx-spcl-album";
const INLINE_ID = "userfx-spcl-inline";
const SPCL_PHOTOS = [
  "/assets/album/SPCL/SPCL-01.jpg",
  "/assets/album/SPCL/SPCL-02.jpg",
];

function closeAlbum() {
  document.getElementById(MODAL_ID)?.remove();
  document.body.classList.remove("userfx-spcl-open");
}

function openAlbum() {
  closeAlbum();

  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.className = "userfx-spcl-modal";
  modal.innerHTML = `
    <button class="userfx-spcl-backdrop" type="button" aria-label="Close album"></button>
    <section class="userfx-spcl-panel" role="dialog" aria-modal="true" aria-label="User18Fx SPCL album">
      <header class="userfx-spcl-head">
        <div>
          <span>FRIEND · SPCL ACCESS</span>
          <strong>@User18Fx</strong>
          <small>ALBUM UNLOCKED · ${SPCL_PHOTOS.length} NEW PHOTOS</small>
        </div>
        <button class="userfx-spcl-close" type="button" aria-label="Close album">×</button>
      </header>
      <div class="userfx-spcl-grid">
        ${SPCL_PHOTOS.map((src, index) => `
          <figure class="userfx-spcl-photo">
            <img src="${src}" alt="SPCL private photo ${String(index + 1).padStart(2, "0")}" loading="eager" draggable="false" />
            <figcaption>SPCL-${String(index + 1).padStart(2, "0")}</figcaption>
          </figure>
        `).join("")}
      </div>
    </section>
  `;

  modal.querySelector(".userfx-spcl-backdrop")?.addEventListener("click", closeAlbum);
  modal.querySelector(".userfx-spcl-close")?.addEventListener("click", closeAlbum);

  document.body.appendChild(modal);
  document.body.classList.add("userfx-spcl-open");
}

function buildFriendCard() {
  const card = document.createElement("article");
  card.id = FRIEND_ID;
  card.className = "userfx-friend-card";
  card.innerHTML = `
    <div class="userfx-friend-avatar" aria-hidden="true">FX<span></span></div>
    <div class="userfx-friend-copy">
      <div class="userfx-friend-status">
        <span>FRIEND</span>
        <span>SPCL</span>
      </div>
      <strong>@User18Fx</strong>
      <small>ALBUM UNLOCKED · ${SPCL_PHOTOS.length} NEW PHOTOS</small>
    </div>
    <div class="userfx-friend-actions">
      <button class="userfx-friend-album" type="button">OPEN ALBUM</button>
      <a href="https://t.me/User18Fx" target="_blank" rel="noopener noreferrer">MESSAGE</a>
    </div>
  `;

  card.querySelector(".userfx-friend-album")?.addEventListener("click", openAlbum);
  return card;
}

function mountFriend() {
  const members = document.querySelector(".pvr-live-members-grid");
  if (!members || document.getElementById(FRIEND_ID)) return;

  members.prepend(buildFriendCard());

  const count = members.closest(".pvr-live-members")?.querySelector(".pvr-live-section-head small");
  if (count) count.textContent = "1 FRIEND";
}

function isSpclSession() {
  const liveCode = document.querySelector(".pvr-live-dot")?.textContent || "";
  let storedCode = "";
  try {
    storedCode = sessionStorage.getItem("userfx_access_code") || "";
  } catch {
    storedCode = "";
  }
  return `${liveCode} ${storedCode}`.toUpperCase().includes("SPCL");
}

function buildInlineCollection() {
  const section = document.createElement("section");
  section.id = INLINE_ID;
  section.className = "userfx-spcl-inline";
  section.innerHTML = `
    <header class="userfx-spcl-inline-head">
      <div>
        <span>PRIVATE COLLECTION · SPCL</span>
        <h2>YOUR ALBUM</h2>
        <small>@User18Fx · UNLOCKED</small>
      </div>
      <button type="button" class="userfx-spcl-inline-open">OPEN ALBUM</button>
    </header>
    <div class="userfx-spcl-inline-grid">
      ${SPCL_PHOTOS.map((src, index) => `
        <button type="button" class="userfx-spcl-inline-photo" aria-label="Open SPCL-${String(index + 1).padStart(2, "0")}">
          <img src="${src}" alt="SPCL-${String(index + 1).padStart(2, "0")}" draggable="false" />
          <span>SPCL-${String(index + 1).padStart(2, "0")}</span>
        </button>
      `).join("")}
    </div>
  `;

  section.querySelector(".userfx-spcl-inline-open")?.addEventListener("click", openAlbum);
  section.querySelectorAll(".userfx-spcl-inline-photo").forEach((button) => {
    button.addEventListener("click", openAlbum);
  });
  return section;
}

function mountSpclCollection() {
  if (!isSpclSession()) return;

  const nativeGallery = document.querySelector(".pvr-gallery-section");
  if (!nativeGallery) return;

  nativeGallery.classList.add("userfx-native-gallery-hidden");

  if (!document.getElementById(INLINE_ID)) {
    nativeGallery.insertAdjacentElement("afterend", buildInlineCollection());
  }
}

function boot() {
  mountFriend();
  mountSpclCollection();

  const observer = new MutationObserver(() => {
    mountFriend();
    mountSpclCollection();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.getElementById(MODAL_ID)) closeAlbum();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
