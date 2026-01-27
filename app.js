// app.js — UserFx Book Gallery + Tracking (Telegram Mini App)
// - Orden fijo: 1..9
// - Si existe img/7.mp4, lo renderiza como VIDEO en la página 7 (sin romper el orden).
// - Tracking: manda eventos a un endpoint (Vercel) usando initData para validar user en backend.

const IMG_EXT = "jpg"; // cambia a "png" si tus imágenes son .png
const imageIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ====== TRACKING CONFIG ======
const TRACK_ENDPOINT = "/api/track";
// Si lo dejas así (con YOUR-VERCEL-APP), track() no enviará nada por endpoint.

function tg() {
	return window.Telegram?.WebApp || null;
}

function hasRealEndpoint() {
	return (
		typeof TRACK_ENDPOINT === "string" &&
		TRACK_ENDPOINT.startsWith("http") &&
		!TRACK_ENDPOINT.includes("YOUR-VERCEL-APP")
	);
}

async function track(event, meta = {}) {
	const T = tg();
	const initData = T?.initData || ""; // enviar al backend para validar (NO confiar en initDataUnsafe)

	const payload = {
		event,
		meta,
		ts: Date.now(),
		href: location.href,
		initData,
		// Debug (no confiar en backend sin validar initData):
		tg_user_unsafe: T?.initDataUnsafe?.user || null,
	};

	// 1) Preferido: endpoint (no cierra mini app)
	if (hasRealEndpoint()) {
		const body = JSON.stringify(payload);

		// sendBeacon (mejor para eventos rápidos)
		if (navigator.sendBeacon) {
			const ok = navigator.sendBeacon(
				TRACK_ENDPOINT,
				new Blob([body], { type: "application/json" })
			);
			if (ok) return;
		}

		// fetch fallback
		try {
			await fetch(TRACK_ENDPOINT, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body,
				keepalive: true,
			});
		} catch {
			// silencioso
		}
		return;
	}

	// 2) Fallback opcional (NO recomendado): sendData CIERRA la Mini App.
	// Si quieres usarlo, descomenta, pero te va a cerrar la web en cada click.
	/*
	if (T?.sendData) {
		const s = JSON.stringify(payload);
		T.sendData(s.slice(0, 4096)); // límite de 4096 bytes
	}
	*/
}

// ====== DOM ======
const bookEl = document.getElementById("book");
const resetBtn = document.getElementById("resetBtn");
const yearEl = document.getElementById("year");

// Opcional: si tienes botón "Entrar al bot" con id="enterBtn"
const enterBtn = document.getElementById("enterBtn");

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Telegram Mini App polish
const T = tg();
if (T) {
	try {
		T.ready();
		T.expand?.();
	} catch {
		// ok
	}
}

// ====== MEDIA HELPERS ======
function isVideo(n) {
	// Ajuste simple: tu repo ya tiene img/7.mp4
	return n === 7;
}

function mediaPath(n) {
	if (isVideo(n)) return `./img/${n}.mp4`;
	return `./img/${n}.${IMG_EXT}`;
}

// ====== BOOK STATE ======
let openCount = 0;

function applyState(pages) {
	pages.forEach((p, idx) => {
		p.classList.toggle("is-open", idx < openCount);
	});
	if (bookEl) bookEl.classList.toggle("book-open", openCount > 0);
}

function toggleToIndex(clickedIndex) {
	if (!bookEl) return;
	const pages = Array.from(bookEl.querySelectorAll(".galeria-book-3d__item"));
	const targetOpenCount = clickedIndex + 1;

	// Toggle: si ya está abierto hasta esa página, ciérrala; si no, abre hasta ahí
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
		page.setAttribute("aria-label", `Item ${id} (página ${idx + 1})`);
		page.dataset.index = String(idx);

		// FRONT
		if (isVideo(id)) {
			const vid = document.createElement("video");
			vid.src = mediaPath(id);
			vid.preload = "metadata";
			vid.playsInline = true;
			vid.muted = true; // para permitir autoplay en muchos casos
			vid.loop = true;
			vid.controls = true;

			// Estilos inline para comportarse como las imágenes
			vid.style.width = "100%";
			vid.style.height = "100%";
			vid.style.objectFit = "cover";
			vid.style.position = "absolute";
			vid.style.top = "0";
			vid.style.left = "0";
			vid.style.backfaceVisibility = "hidden";
			vid.setAttribute("aria-label", `Video ${id}`);

			page.appendChild(vid);
		} else {
			const front = document.createElement("img");
			front.src = mediaPath(id);
			front.alt = `Foto ${id}`;
			front.loading = "lazy";
			page.appendChild(front);
		}

		// BACK (contracara neutra)
		const back = document.createElement("div");
		back.className = "page-back";
		back.textContent = `${idx + 1} / ${imageIds.length}`;
		page.appendChild(back);

		// Click tracking + acción
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

	// Estado inicial
	openCount = 0;
	applyState(Array.from(bookEl.querySelectorAll(".galeria-book-3d__item")));

	track("page_view", { total: imageIds.length });
}

// ====== INIT ======
renderBook();

if (resetBtn) resetBtn.addEventListener("click", resetBook);

if (enterBtn) {
	enterBtn.addEventListener("click", () => {
		track("enter_bot_click");
	});
}
