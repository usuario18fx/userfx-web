(() => {
  const $ = (sel) => document.querySelector(sel);

  const TELEGRAM_CALL_URL = "https://t.me/call/pJHwvL0fLj94ToJFieJxazX7hjI";

  // Tus assets (según tu carpeta)
  const MEDIA = [
    { type: "img", src: "/assets/1.jpg" },
    { type: "img", src: "/assets/2.jpg" },
    { type: "video", src: "/assets/3.mp4" },
    { type: "img", src: "/assets/4.1.jpg" },
    { type: "img", src: "/assets/4.jpg" },
    { type: "img", src: "/assets/5.jpg" },
    { type: "video", src: "/assets/6.mp4" },
    { type: "img", src: "/assets/7.1.jpg" },
    { type: "img", src: "/assets/7.jpg" },
    { type: "img", src: "/assets/8.1.jpg" },
    { type: "img", src: "/assets/8.jpg" },
    { type: "img", src: "/assets/9.jpg" },
    { type: "video", src: "/assets/smkl-.MP4" }
  ];

  function setYear() {
    const el = $("#year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function buildBook() {
    const book = $("#book");
    if (!book) return;

    // Limpia por si recargas
    book.innerHTML = "";

    // Páginas apiladas (la 0 arriba)
    const pages = MEDIA.map((m, i) => {
      const page = document.createElement("div");
      page.className = "page";
      page.style.zIndex = String(MEDIA.length - i);

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = `${i + 1}/${MEDIA.length}`;
      page.appendChild(badge);

      if (m.type === "img") {
        const img = document.createElement("img");
        img.className = "media";
        img.src = m.src;
        img.alt = `Galería ${i + 1}`;
        img.loading = "lazy";
        page.appendChild(img);
      } else {
        const video = document.createElement("video");
        video.className = "media";
        video.src = m.src;
        video.preload = "metadata";
        video.controls = true;
        video.playsInline = true;
        page.appendChild(video);
      }

      return page;
    });

    pages.forEach((p) => book.appendChild(p));

    let current = 0;

    function flipNext() {
      if (current >= pages.length) return;
      pages[current].classList.add("flipped");
      current += 1;
    }

    function flipPrev() {
      if (current <= 0) return;
      current -= 1;
      pages[current].classList.remove("flipped");
    }

    // Click/tap
    book.addEventListener("click", () => {
      // Si llegaste al final, rebobina (porque sí, porque es cine)
      if (current >= pages.length) {
        for (let i = pages.length - 1; i >= 0; i--) pages[i].classList.remove("flipped");
        current = 0;
        return;
      }
      flipNext();
    });

    // Teclado (izq/der)
    book.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flipNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        flipPrev();
      }
    });

    // Botón CTA: fallback directo a Telegram
    const btn = $("#enterBotBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        // Nada fancy aquí: directo y listo
        window.open(TELEGRAM_CALL_URL, "_blank", "noopener,noreferrer");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setYear();
    buildBook();
  });
})();
