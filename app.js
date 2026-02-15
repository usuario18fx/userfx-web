const $ = (id) =>
   document.getElementById(id);
const yearEl = $("year");
if (yearEl) yearEl.textContent = 
   new Date().getFullYear();
const book = $("book");
if (!book) throw new Error("No se encontró #book");
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
  "smkl.mp4",];
const isVideo = 
   (name) => /\.mp4$/i.test(name);
function mediaNode(file) {
  const src = `assets/${file}`;
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
const pages = MEDIA.map((file, i) => {
  const page = document.createElement("div");
  page.className = "page";
  page.style.zIndex = String(MEDIA.length - i);

  const front = document.createElement("div");
  front.className = "face front";
  front.appendChild(mediaNode(file));

  const back = document.createElement("div");
  back.className = "face back";
  back.appendChild(mediaNode(file));

  page.appendChild(front);
  page.appendChild(back);

  book.appendChild(page);
  return page; });

let index = 1;
function applyState() {
  pages.forEach((p, i) => {
    p.classList.remove("is-flipped");
    p.style.zIndex = "0";
    p.style.opacity = "0";
  });
  if (index > 0) {
    const left = pages[index - 1];
    left.classList.add("is-flipped");
    left.style.zIndex = "2";
    left.style.opacity = "1";
  }
  if (index < pages.length) {
    const right = pages[index];
    right.style.zIndex = "3";
    right.style.opacity = "1";
  }}
function createWatermark(){
  const wm = document.getElementById("wm");
  if(!wm) return;
  const pattern = document.createElement("div");
  pattern.className = "wm-pattern";
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const domain = location.hostname;
  const text = `UserFX · ${domain} · ${date}`;
  for(let i = 0; i < 20; i++){
    const span = document.createElement("span");
    span.textContent = text;
    pattern.appendChild(span);
  }
  wm.appendChild(pattern);
  }
createWatermark();
setInterval(() => {
  const wm = document.getElementById("wm");
  if(wm) wm.innerHTML = "";
  createWatermark();
}, 10000);


