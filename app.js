(() => {
  const TELEGRAM_CALL_URL = "https://t.me/call/pJHwvL0fLj94ToJFieJxazX7hjI";

  const MEDIA_FILES = [
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
    "smkl-.MP4",
  ].map((name, i) => ({
    name,
    src: `/assets/${name}`,
    idx: i + 1,
    kind: /\.(mp4|webm|mov)$/i.test(name) ? "video" : "image",
  }));

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Make Telegram open nicer (optional)
  const enterBtn = document.getElementById("enterBotBtn");
  if (enterBtn) {
    enterBtn.addEventListener("click", (e) => {
      // Let normal link work, but improve Telegram WebApp experience if available
      try {
        if (window.Telegram?.WebApp?.openTelegramLink) {
          e.preventDefault();
          window.Telegram.WebApp.openTelegramLink(TELEGRAM_CALL_URL);
        }
      } catch {}
    });
  }

  // Book
  const bookEl = document.getElementById("book");
  if (!bookEl) return;

  let current = 0;
  const pages = [];

  function createMedia({ kind, src }) {
    if (kind === "video") {
      const v = document.createElement("video");
      v.className = "media";
      v.src = src;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = "metadata";
      v.autoplay = true;
      v.addEventListener("canplay", () => v.play().catch(() => {}));
      return v;
    }

    const img = document.createElement("img");
    img.className = "media";
    img.src = src;
    img.alt = "Galería";
    img.loading = "lazy";
    return img;
  }

  function buildBook() {
    bookEl.innerHTML = "";
    pages.length = 0;

    MEDIA_FILES.forEach((item, i) => {
      const page = document.createElement("div");
      page.className = "page";
      page.style.zIndex = String(1000 - i);

      // Front
      const front = document.createElement("div");
      front.className = "page-front page-inner";

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = `${i + 1}/${MEDIA_FILES.length}`;
      front.appendChild(badge);

      const media = createMedia(item);
      front.appendChild(media);

      // Back (simple)
      const back = document.createElement("div");
      back.className = "page-back page-inner";
      back.textContent = "🜲";

      page.appendChild(front);
      page.appendChild(back);

      page.addEventListener("click", () => {
        // Clicking the top page flips forward
        if (i === current) next();
      });

      pages.push(page);
      bookEl.appendChild(page);
    });

    sync();
  }

  function sync() {
    pages.forEach((p, i) => {
      p.classList.toggle("is-flipped", i < current);
      p.style.zIndex = String(1000 - i + (i < current ? -2000 : 0));
    });
  }

  function next() {
    if (current < pages.length) {
      current = Math.min(current + 1, pages.length);
      sync();
    }
  }

  function prev() {
    if (current > 0) {
      current = Math.max(current - 1, 0);
      sync();
    }
  }

  // Controls
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (prevBtn) prevBtn.addEventListener("click", prev);
  if (nextBtn) nextBtn.addEventListener("click", next);

  // Keyboard
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  buildBook();
})();
