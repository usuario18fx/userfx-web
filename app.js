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
  "smkl.mp4",
];

const isVideo = (name) => /\.mp4$/i.test(name);

function mediaNode(file) {
  const src = `assets/${file}`; // GitHub Pages subpath correcto

  if (isVideo(file)) {
    const v = document.createElement("video");
    v.className = "media";
    v.src = src;
    v.muted = true;
    v.loop = true;
    v.autoplay = true;
    v.playsInline = true;
    v.preload = "metadata";
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

  book.appendChild(page);
  return page;
});
let index = 0;

function applyState() {
  pages.forEach((p, i) => {
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
book.addEventListener("click", (e) => {
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

/* ========= WATERMARK ========= */
function createWatermark() {
  const wm = document.getElementById("wm");
  if (!wm) return;

  wm.innerHTML = "";

  const pattern = document.createElement("div");
  pattern.className = "wm-pattern";

  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const domain = location.hostname;

  const text = `USERFX · ${domain} · ${date}`;

  for (let i = 0; i < 20; i++) {
    const span = document.createElement("span");
    span.textContent = text;
    pattern.appendChild(span);
  }

  wm.appendChild(pattern);
}

createWatermark();

setInterval(createWatermark, 10000);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    document.body.style.opacity = "0.6";
  } else {
    document.body.style.opacity = "1";
  }
});

