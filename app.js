/* app.js — UserFX Web (static) */

const MEDIA = [
  { type: "img",  src: "./assets/1.jpg" },
  { type: "img",  src: "./assets/2.jpg" },
  { type: "video",src: "./assets/3.mp4" },
  { type: "img",  src: "./assets/4.jpg" },
  { type: "img",  src: "./assets/5.jpg" },
  { type: "video",src: "./assets/6.mp4" },
  { type: "img",  src: "./assets/7.jpg" },
  { type: "img",  src: "./assets/8.jpg" },
  { type: "img",  src: "./assets/9.jpg" },
];

// Si existen en tu carpeta (por el screenshot), puedes descomentar:
// MEDIA.splice(4, 0, { type:"img", src:"./assets/4.1.jpg" });
// MEDIA.splice(8, 0, { type:"img", src:"./assets/7.1.jpg" });
// MEDIA.splice(10,0, { type:"img", src:"./assets/8.1.jpg" });

function $(sel) { return document.querySelector(sel); }

function makeMediaEl(item) {
  if (item.type === "video") {
    const v = document.createElement("video");
    v.className = "galeria-book-3d__media";
    v.src = item.src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "metadata";
    // Autoplay suele requerir interacción; intentamos igual.
    v.addEventListener("canplay", () => v.play().catch(() => {}));
    return v;
  }

  const img = document.createElement("img");
  img.className = "galeria-book-3d__media";
  img.src = item.src;
  img.alt = "Media";
  img.loading = "lazy";
  return img;
}

function buildBook(bookEl) {
  const total = MEDIA.length;

  MEDIA.forEach((item, i) => {
    const page = document.createElement("div");
    page.className = "galeria-book-3d__item";
    page.style.setProperty("--i", String(i));
    page.style.setProperty("--total", String(total));

    const front = document.createElement("div");
    front.className = "galeria-book-3d__face front";
    front.appendChild(makeMediaEl(item));

    const backItem = MEDIA[(i + 1) % total];
    const back = document.createElement("div");
    back.className = "galeria-book-3d__face back";
    back.appendChild(makeMediaEl(backItem));

    page.appendChild(front);
    page.appendChild(back);

    page.addEventListener("click", () => {
      page.classList.toggle("is-open");

      const anyOpen = !!bookEl.querySelector(".galeria-book-3d__item.is-open");
      bookEl.classList.toggle("book-open", anyOpen);
    });

    bookEl.appendChild(page);
  });
}

function init() {
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const book = $("#book");
  if (book) buildBook(book);
}

document.addEventListener("DOMContentLoaded", init);
