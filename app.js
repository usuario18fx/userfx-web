/* ========= HELPERS ========= */
const $ = (id) => document.getElementById(id);

const yearEl = $("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const book = $("book");
if (!book) throw new Error("No se encontró #book");

/* ========= MEDIA ========= */
const MEDIA = [
  "1.jpg",
  "2.jpg",
  "3.mp4",
  "4.1.jpg",
  "4.jpg",
  "5.jpg",
  "6.mp4",
  "7.1.jpg",
  "7.jpg",
  "8.1.jpg",
  "8.jpg",
  "9.jpg",
  "v-08_.mp4",
];

const isVideo = (name) => /\.mp4$/i.test(name);
function mediaNode(file) {
  const src = `assets/${file}?v=3`;

  if (isVideo(file)) {
    const v = document.createElement("video");
    v.className = "media";
    v.src = src;

    v.muted = true;
    v.loop = true;
    v.autoplay = true;
    v.playsInline = true;
    v.preload = "auto";
    v.controls = false;

    // 🔥 IMPORTANTE
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("autoplay", "");

    v.addEventListener("loadeddata", () => {
      v.play().catch(() => {});
    });

    return v;
  }

  const img = document.createElement("img");
  img.className = "media";
  img.src = src;
  img.alt = file;
  img.loading = "lazy";
  return img;
}

/* ========= BUILD PAGES ========= */
const pages = MEDIA.map((file, i) => {
  const page = document.createElement("div");
  page.className = "page";

  const front = document.createElement("div");
  front.className = "face front";
  front.appendChild(mediaNode(file));

  const back = document.createElement("div");
  back.className = "face back";
  back.appendChild(mediaNode(file));

  page.appendChild(front);
  page.appendChild(back);

  page.style.zIndex = MEDIA.length - i;

  book.appendChild(page);
  return page;
});

let index = 0;

/* ========= APPLY STATE ========= */
function applyState() {
  pages.forEach((p, i) => {
    p.style.zIndex = pages.length - i;
    p.style.transform = i < index
      ? "rotateY(-180deg)"
      : "rotateY(0deg)";
  });
}

function next() {
  if (index < pages.length) {
    index++;
    applyState();
  }
}

function prev() {
  if (index > 0) {
    index--;
    applyState();
  }
}

/* ========= CLICK ========= */
const lockOverlay = document.getElementById("lockOverlay");
const handHint = document.querySelector(".hand-hint");

book.addEventListener("click", (e) => {

  if (lockOverlay) {
    lockOverlay.style.transition =
      "opacity 600ms ease, transform 600ms ease";
    lockOverlay.style.opacity = "0";
    lockOverlay.style.transform = "scale(0.6) rotate(-20deg)";
    setTimeout(() => lockOverlay.remove(), 600);
  }

  if (handHint) handHint.remove();

  const rect = book.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const isLeft = x < rect.width * 0.5;

  isLeft ? prev() : next();
});

/* ========= KEYBOARD ========= */
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") next();
  if (e.key === "ArrowLeft") prev();
});

applyState();
const accessCodeInput = document.getElementById("accessCodeInput");
const unlockBtn = document.getElementById("unlockBtn");
const unlockMsg = document.getElementById("unlockMsg");
const lockOverlayEl = document.getElementById("lockOverlay");

function unlockAlbumUI() {
  if (lockOverlayEl) {
    lockOverlayEl.remove();
  }
  localStorage.setItem("fx_album_unlocked", "1");
}

async function validateAccessCode(code) {
  const response = await fetch("/api/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  return response.json();
}

if (localStorage.getItem("fx_album_unlocked") === "1") {
  unlockAlbumUI();
}

if (unlockBtn && accessCodeInput) {
  unlockBtn.addEventListener("click", async () => {
    const code = accessCodeInput.value.trim().toUpperCase();

    if (!code) {
      if (unlockMsg) unlockMsg.textContent = "Ingresa un código.";
      return;
    }

    if (unlockMsg) unlockMsg.textContent = "Validando...";

    try {
      const result = await validateAccessCode(code);

      if (!result.ok) {
        if (unlockMsg) unlockMsg.textContent = result.error || "Código inválido.";
        return;
      }

      unlockAlbumUI();

      if (unlockMsg) {
        unlockMsg.textContent = "Acceso desbloqueado.";
      }
    } catch (error) {
      console.error("UNLOCK CLIENT ERROR:", error);
      if (unlockMsg) unlockMsg.textContent = "Error validando el código.";
    }
  });
}