// app.js — UserFx Book Gallery (9 items en orden; #7 es video)

const media = [
	{ id: 1, type: "image", src: "./img/1.jpg" },
	{ id: 2, type: "image", src: "./img/2.jpg" },
	{ id: 3, type: "image", src: "./img/3.jpg" },
	{ id: 4, type: "image", src: "./img/4.jpg" },
	{ id: 5, type: "image", src: "./img/5.jpg" },
	{ id: 6, type: "image", src: "./img/6.jpg" },
	{ id: 7, type: "video", src: "./img/7.mp4" }, // ✅ video
	{ id: 8, type: "image", src: "./img/8.jpg" },
	{ id: 9, type: "image", src: "./img/9.jpg" },
];

const bookEl = document.getElementById("book");
const resetBtn = document.getElementById("resetBtn");
const yearEl = document.getElementById("year");

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Estado: cuántas páginas están abiertas (0..total)
let openCount = 0;

function renderBook() {
	if (!bookEl) return;

	bookEl.innerHTML = "";
	bookEl.style.setProperty("--total", String(media.length));

	media.forEach((item, idx) => {
		const page = document.createElement("button");
		page.type = "button";
		page.className = "galeria-book-3d__item";
		page.style.setProperty("--i", String(idx));
		page.dataset.index = String(idx);
		page.dataset.type = item.type;
		page.setAttribute("aria-label", `${item.type === "video" ? "Video" : "Foto"} ${item.id} (página ${idx + 1})`);

		// FRONT: imagen o video
		if (item.type === "image") {
			const front = document.createElement("img");
			front.src = item.src;
			front.alt = `Foto ${item.id}`;
			front.loading = "lazy";
			page.appendChild(front);
		} else {
			const video = document.createElement("video");
			video.src = item.src;

			// Autoplay en web/Telegram suele requerir muted + playsInline
			video.muted = true;
			video.loop = true;
			video.playsInline = true;
			video.preload = "metadata";

			// Sin controles para look “clean”
			video.controls = false;

			// Arranca pausado; lo activamos cuando la página esté abierta
			video.pause();

			page.appendChild(video);
		}

		// BACK: contracara neutra (no otro media)
		const back = document.createElement("div");
		back.className = "page-back";
		back.textContent = `${idx + 1} / ${media.length}`;
		page.appendChild(back);

		page.addEventListener("click", () => toggleToIndex(idx));
		page.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				toggleToIndex(idx);
			}
		});

		bookEl.appendChild(page);
	});

	applyState(Array.from(bookEl.querySelectorAll(".galeria-book-3d__item")));
}

function toggleToIndex(clickedIndex) {
	if (!bookEl) return;

	const pages = Array.from(bookEl.querySelectorAll(".galeria-book-3d__item"));
	const targetOpenCount = clickedIndex + 1;

	openCount = openCount === targetOpenCount ? clickedIndex : targetOpenCount;

	applyState(pages);
}

function applyState(pages) {
	pages.forEach((p, idx) => {
		const isOpen = idx < openCount;
		p.classList.toggle("is-open", isOpen);

		// Si hay video en esta página: play cuando está abierta, pause cuando no
		const video = p.querySelector("video");
		if (video) {
			if (isOpen) {
				// Intentar reproducir (si el navegador lo bloquea, no rompe)
				video.play().catch(() => {});
			} else {
				video.pause();
				video.currentTime = 0;
			}
		}
	});

	bookEl.classList.toggle("book-open", openCount > 0);
}

function resetBook() {
	if (!bookEl) return;
	openCount = 0;
	applyState(Array.from(bookEl.querySelectorAll(".galeria-book-3d__item")));
}

renderBook();
resetBook();

if (resetBtn) resetBtn.addEventListener("click", resetBook);
