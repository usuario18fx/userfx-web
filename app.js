const IMG_EXT = "jpg";
const imageIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
function tg() {
          return window.Telegram?.WebApp || null; }
const bookEl = document.getElementById("book");
const resetBtn = document.getElementById("resetBtn");
const yearEl = document.getElementById("year");
const enterBtn = document.getElementById("enterBtn");
       if (yearEl) yearEl.textContent = String(new Date().getFullYear());
const T = tg();
       if (T) { try {
    T.ready();
    T.expand?.();
       } catch {}}
function isVideo(n) { 
       return n === 7;}
function mediaPath(n) {
       return isVideo(n) ? `./img/${n}.mp4` : `./img/${n}.${IMG_EXT}`;}
async function track(event, meta = {}) {
const T = tg();
const initData = T?.initData || "";
const payload = { event, meta, ts: Date.now(), href: location.href, initData,};
const headers = { "content-type": "application/json" };
     if (!initData && window.TRACK_SECRET) headers["x-track-secret"] = window.TRACK_SECRET;
     try { await fetch("/api/track", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    });} catch {}}
let openCount = 0;
function applyState(pages) {
  pages.forEach((p, idx) => p.classList.toggle("is-open", idx < openCount));
    if (bookEl) bookEl.classList.toggle("book-open", openCount > 0);}
function toggleToIndex(clickedIndex) {
    if (!bookEl) 
      return;
  const pages = Array.from(bookEl.querySelectorAll(".galeria-book-3d__item"));
  const targetOpenCount = clickedIndex + 1;
  openCount = openCount === targetOpenCount ? clickedIndex : targetOpenCount;
  applyState(pages);}
function resetBook() {
    if (!bookEl) 
      return;
  openCount = 0;
  applyState(Array.from(bookEl.querySelectorAll(".galeria-book-3d__item")));
  track("reset_book");}
function renderBook() {
    if (!bookEl) 
      return;
  bookEl.innerHTML = "";
  bookEl.style.setProperty("--total", String(imageIds.length));
  imageIds.forEach((id, idx) => {
    const page = document.createElement("button");
    page.type = "button";
    page.className = "galeria-book-3d__item";
    page.style.setProperty("--i", String(idx));
    page.dataset.index = String(idx);
    page.setAttribute("aria-label", `Item ${id} (página ${idx + 1})`);
    if (isVideo(id)) {
      const vid = document.createElement("video");
      vid.src = mediaPath(id);
      vid.preload = "metadata";
      vid.playsInline = true;
      vid.muted = true;
      vid.loop = true;
      vid.controls = true;
      vid.style.cssText = 
      "width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;backface-visibility:hidden;";
      page.appendChild(vid);
    } else {
      const img = document.createElement("img");
      img.src = mediaPath(id);
      img.alt = `Foto ${id}`;
      img.loading = "lazy";
      page.appendChild(img);}
    const back = document.createElement("div");
    back.className = "page-back";
    back.textContent = `${idx + 1} / ${imageIds.length}`;
    page.appendChild(back);
    page.addEventListener("click", () => {
      track("page_click", { index: idx, item: id, kind: isVideo(id) ? "video" : "image" });
      toggleToIndex(idx);});
    page.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") 
      return;
      e.preventDefault();
      track("page_click_key", { index: idx, item: id, key: e.key });
      toggleToIndex(idx);});
    bookEl.appendChild(page);});
  openCount = 0;
  applyState(Array.from(bookEl.querySelectorAll(".galeria-book-3d__item")));
  track("page_view", { total: imageIds.length, path: location.pathname });}
renderBook();
    if (resetBtn) resetBtn.addEventListener("click", resetBook);
    if (enterBtn) {
  enterBtn.addEventListener("click", () => track("enter_bot_click"));}
