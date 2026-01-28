// app.js — UserFx Book Gallery + Tracking (Telegram Mini App)

const imageIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ===== Telegram helpers =====
function tg() {
  return window.Telegram?.WebApp || null;
}
function getTelegramInitData() {
  return tg()?.initData || "";
}

// ===== Tracking =====
async function track(event, meta = {}) {
  try {
    const initData = getTelegramInitData();
    const headers = { "Content-Type": "application/json" };

    // Dentro de Telegram -> manda initData por header
    if (initData) headers["X-Telegram-InitData"] = initData;

    // Testing fuera de Telegram (opcional): define window.TRACK_SECRET en index.html
    if (!initData && window.TRACK_SECRET) headers["X-Track-Secret"] = window.TRACK_SECRET;

    await fetch("/api/track", {
      method: "POST",
      headers,
      body: JSON.stringify({
        event,
        meta,
        initData,
        href: location.href,
        path: location.pathname,
        host: location.host,
        referrer: document.referrer || null,
        ts: Date.now(),
      }),
      keepalive: true,
    });
  } catch {
    // silencioso
  }
}

// ===== DOM =====
const bookEl = document.getElementById("book");
const resetBtn = document.getElementById("resetBtn");
const yearEl = document.getElementById("year");
const enterBtn = document.getElementById("enterBtn");

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Telegram polish
const T = tg();
if (T) {
  try {
    T.ready();
    T.expand?.();
  } catch {}
}

// ===== MEDIA MAP (AQUI defines EXACTO qué archivo usa cada página) =====
// Ajusta estos paths para que coincidan 1:1 con tu carpeta /img.
// Recomendado: todo en minúsculas (Vercel es case-sensitive).
const MEDIA = {
  1: { kind: "image", src: "./img/1.jpg" },
  2: { kind: "image", src: "./img/2.jpg" },

  // Si sigues con MOV, cámbialo a "./img/3.MOV" (respeta MAYÚSCULAS)
  // Mejor: convertir a mp4 y dejar "./img/3.mp4"
  3: { kind: "video", src: "./img/3.mp4" },

  // Si quieres usar 4.1.jpg en vez de 4.jpg -> cambia src a "./img/4.1.jpg"
  4: { kind: "image", src: "./img/4.jpg" },

  5: { kind: "image", src: "./img/5.jpg" },

  6: { kind: "video", src: "./img/6.mp4" },

  // Si quieres usar 7.1.jpg -> cambia src a "./img/7.1.jpg"
  7: { kind: "image", src: "./img/7.jpg" },

  // Si quieres usar 8.1.jpg -> cambia src a "./img/8.1.jpg"
  8: { kind: "image", src: "./img/8.jpg" },

  9: { kind: "image", src: "./img/9.jpg" },
};

function isVideo(id) {
  return MEDIA[id]?.kind === "video";
}
function mediaPath(id) {
  return MEDIA[id]?.src || "";
}

// ===== BOOK STATE =====
let openCount = 0;

function applyState(pages) {
  pages.forEach((p, idx) => p.classList.toggle("is-open", idx < openCount));
  bookEl?.classList.toggle("book-open", openCount > 0);
}

function toggleToIndex(clickedIndex) {
  if (!bookEl) return;
  const pages = Array.from(bookEl.querySelectorAll(".galeria-book-3d__item"));
  const targetOpenCount = clickedIndex + 1;
  openCount = openCount === targetOpenCount ? clickedIndex : targetOpenCount;
  applyState(pages);
}

function resetBook() {
  if (!bookEl) return;
  openCount = 0;
  const pages = Array.from(bookEl.querySelectorAll(".galeria-book-3d__item"));
  applyState(pages);
  track("reset_book");
}

// ===== RENDER =====
function renderBook() {
  if (!bookEl) return;

  bookEl.innerHTML = "";
  bookEl.style.setProperty("--total", String(imageIds.length));

  imageIds.forEach((id, idx) => {
    const page = document.createElement("button");
    page.type = "button";
    page.className = "galeria-book-3d__item";
    page.style.setProperty("--i", String(idx));
    page.setAttribute("aria-label", `Item ${id} (página ${idx + 1})`);
    page.dataset.index = String(idx);

    if (isVideo(id)) {
      const vid = document.createElement("video");
      vid.src = mediaPath(id);
      vid.preload = "metadata";
      vid.playsInline = true;
      vid.muted = true;
      vid.loop = true;
      vid.controls = true;

      vid.style.width = "100%";
      vid.style.height = "100%";
      vid.style.objectFit = "cover";
      vid.style.position = "absolute";
      vid.style.top = "0";
      vid.style.left = "0";
      vid.style.backfaceVisibility = "hidden";

      page.appendChild(vid);
    } else {
      const img = document.createElement("img");
      img.src = mediaPath(id);
      img.alt = `Foto ${id}`;
      img.loading = "lazy";
      page.appendChild(img);
    }

    const back = document.createElement("div");
    back.className = "page-back";
    back.textContent = `${idx + 1} / ${imageIds.length}`;
    page.appendChild(back);

    page.addEventListener("click", () => {
      track("page_click", { index: idx, item: id, kind: isVideo(id) ? "video" : "image" });
      toggleToIndex(idx);
    });

    page.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        track("page_click_key", { index: idx, item: id, key: e.key });
        toggleToIndex(idx);
      }
    });

    bookEl.appendChild(page);
  });

  openCount = 0;
  applyState(Array.from(bookEl.querySelectorAll(".galeria-book-3d__item")));

  track("page_view", { total: imageIds.length });
}

renderBook();
if (resetBtn) resetBtn.addEventListener("click", resetBook);
if (enterBtn) enterBtn.addEventListener("click", () => track("enter_bot_click"));
