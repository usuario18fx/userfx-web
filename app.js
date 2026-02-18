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
  const src = `./assets/${file}?v=3`;

  if (isVideo(file)) {
    const v = document.createElement("video");
    v.className = "media";
    v.src = src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.controls = false;
    v.disablePictureInPicture = true;
    v.play().catch(() => {});
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

  page.style.zIndex = MEDIA.length - i; // 🔥 ORDEN CORRECTO

  book.appendChild(page);
  return page;
});

let index = 0;

function applyState() {
  pages.forEach((p, i) => {
    p.style.zIndex = pages.length - i;
    p.classList.toggle("is-flipped", i < index);
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

/* ========= LOCK + CLICK ========= */
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

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") next();
  if (e.key === "ArrowLeft") prev();
});

applyState();

/* ================== */
function applyState() {
  pages.forEach((p, i) => {
    const offset = i * 1.5;

    p.style.zIndex = pages.length - i;
    p.style.transform = i < index
      ? `rotateY(-180deg) translateZ(${offset}px)`
      : `rotateY(0deg) translateZ(${offset}px)`;
  });
}


/* ========= VISIBILITY ========= */
document.addEventListener("visibilitychange", () => {
  document.body.style.opacity = document.hidden ? "0.6" : "1";
});

