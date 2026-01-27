// app.js — UserFx Book Gallery + Tracking (Telegram Mini App)
// - Orden fijo: 1..9
// - Si existe img/7.mp4, se usa como VIDEO en el item 7 (sin romper el orden)
// - Tracking: POST /api/track con initData (Telegram) o con secret (testing)

const IMG_EXT = "jpg"; // cambia a "png" si tus imágenes son .png
const imageIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const VIDEO_ID = 7;

const TRACK_ENDPOINT = "/api/track";

function tg() {
  return window.Telegram?.WebApp ?? null;
}

function getInitData() {
  return tg()?.initData || "";
}

// Tracking seguro (no rompe UI si falla)
async function track(event, meta = {}) {
  try {
    const initData = getInitData();

    const headers = { "Content-Type": "application/json" };

    // Dentro de Telegram: manda initData (para validar en backend)
    if (initData) headers["X-Telegram-InitData"] = initData;

    // Fuera de Telegram (testing): define window.TRACK_SECRET en index.html (opcional)
    if (!initData && window.TRACK_SECRET) headers["X-Track-Secret"] = window.TRACK_SECRET;

    const payload = {
      event,
      meta,
      ts: Date.now(),
      href: location.href,
      initData, // también va en body por compatibilidad
    };

    await fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // silencioso
  }
}

// ====== DOM ======
const bookEl = document.getElementById("book");
const resetBtn = document.getElementById("resetBtn");
const yearEl = document.getElementById("year");

// Opcional (si quieres trackear ese click). Pon id="enterBtn" en tu botón/link.
const enterBtn = document.getElementById("enterBtn");

// Año footer
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Telegram Mini App polish
const T = tg();
if (T) {
  try {
    T.ready();
    T.expand?.();
  } catch {}
}

// ====== MEDIA ======
function isVideo(id) {
  return id === VIDEO_ID;
}

function mediaPath(id) {
  return isVideo(id) ? `./img/${id}.mp4` : `./img/${id}.${IMG_EXT}`;
}

// ====== BOOK STATE ======
let openCount = 0;

function applyState(pages) {
  pages.forEach((p, idx) => p.classList.toggle("is-open", idx < openCount));
  if (bookEl) bookEl.classList.toggle("book-open", openCount > 0);
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

// ====== RENDER ======
function renderBook() {
  if (!bookEl) return;

  bookEl.innerHTML = "";
  bookEl.style.setProperty("--total", String(imageIds.length));

  imageIds.forEach((id, idx) => {
    const page = document.createElement("button");
    page.type = "button";
    page.className = "galeria-book-3d__item";
    page.style.setProperty("--i", String(idx));
    page.dataset.index = String(idx);
    page.setAttribute("aria-label", `Item ${id} (página ${idx + 1})`);

    // FRONT
    if (isVideo(id)) {
      const vid = document.createElement("video");
      vid.src = mediaPath(id);
      vid.preload = "metadata";
      vid.playsInline = true;
      vid.muted = true;
      vid.loop = true;
      vid.controls = true;

      // Para que se comporte como la imagen (tu CSS ya usa position/cover)
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

    // BACK (contracara neutra)
    const back = document.createElement("div");
    back.className = "page-back";
    back.textContent = `${idx + 1} / ${imageIds.length}`;
    page.appendChild(back);

    // Eventos
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
}

// ====== INIT ======
renderBook();
track("page_view", { total: imageIds.length, inTelegram: !!getInitData() });

if (resetBtn) resetBtn.addEventListener("click", resetBook);

if (enterBtn) {
  enterBtn.addEventListener("click", () => track("enter_bot_click"));
}
