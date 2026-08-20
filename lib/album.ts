export type Photo = {
  id: number;
  src: string;
  no: string;
  title: string;
  cat: "RETRATO" | "URBANO" | "35MM";
  exif: string;
  orient: "portrait" | "landscape";
};
export const ALBUM_META = {
  no: "07",
  title: "NOCTURNA",
  shots: 47,
  dropDay: "VIERNES · 22:00 UTC",
};
export const PHOTOS: Photo[] = [
  {
    id: 1,
    src: "/assets/pic01.png",
    no: "Nº01",
    title: "Humo y seda",
    cat: "RETRATO",
    exif: "f/1.8 · 1/125 · ISO 400",
    orient: "portrait",
  },
  {
    id: 2,
    src: "/assets/pic02.png",
    no: "Nº02",
    title: "Shinjuku, 2 A.M.",
    cat: "URBANO",
    exif: "f/2.0 · 1/60 · ISO 1600",
    orient: "portrait",
  },
  {
    id: 3,
    src: "/assets/pic03.png",
    no: "Nº03",
    title: "La aparición",
    cat: "RETRATO",
    exif: "f/2.8 · 1/200 · ISO 200",
    orient: "landscape",
  },
  {
    id: 4,
    src: "/assets/pic04.png",
    no: "Nº04",
    title: "Aliento de invierno",
    cat: "35MM",
    exif: "f/1.4 · 1/250 · ISO 100",
    orient: "portrait",
  },
  {
    id: 5,
    src: "/assets/pic05.png",
    no: "Nº05",
    title: "Cruce en verde",
    cat: "URBANO",
    exif: "f/4.0 · 1/30 · ISO 3200",
    orient: "landscape",
  },
  {
    id: 6,
    src: "/assets/pic06.png",
    no: "Nº06",
    title: "Media luz",
    cat: "RETRATO",
    exif: "f/1.8 · 1/160 · ISO 640",
    orient: "portrait",
  },
];

export const TEASER_IDS = [1, 2, 3, 4, 5, 6];

export const teaserSrc = (id: number) => {
  const photo = PHOTOS.find((p) => p.id === id);
  return photo?.src ?? "/images/pic01.png";
};

export const photoFull = (p: Photo) => p.src;