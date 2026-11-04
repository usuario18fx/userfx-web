/* Las 4 escenas de UserFX. Las usan:
   - ScrollStory.tsx  → franjas SIN texto (solo imagen / video)
   - Sections.tsx     → cuadrantes del protocolo, CON el texto que se quitó de las franjas */

export type Scene = {
  index: string;
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  href: string;
  image: string;       // foto (también es el póster del video)
  video?: string;      // si existe, se usa video en lugar de la foto
  imageAlt: string;
  position?: string;   // object-position
};

export const SCENES: Scene[] = [
  {
    index: "01",
    id: "videocall",
    kicker: "ONE TO ONE",
    title: "VIDEO CALLS",
    subtitle: "MyRoom · your private space",
    href: "#/private-room",
    image: "/assets/album/PRVW/PRVW-04.jpg",
    video: "/assets/FX-Y24V01.mp4",
    imageAlt: "UserFX original preview photograph",
    position: "center 48%",
  },
  {
    index: "02",
    id: "stage",
    kicker: "THE SHARED MOMENT",
    title: "STAGE",
    subtitle: "Live sessions · come as you are",
    href: "#/private-room/stage",
    image: "/assets/album/PRVW/PRVW-03.jpg",
    imageAlt: "UserFX original outdoor portrait",
    position: "center 62%",
  },
  {
    index: "03",
    id: "gallery",
    kicker: "YOUR PRIVATE COLLECTION",
    title: "GALLERY",
    subtitle: "Photography · private albums",
    href: "#/private-room/gallery",
    image: "/assets/album/PRVW/PRVW-01.jpg",
    imageAlt: "UserFX original photograph",
    position: "center 39%",
  },
  {
    index: "04",
    id: "buzon",
    kicker: "KEEP THE CONVERSATION",
    title: "BUZÓN",
    subtitle: "Private messages · get in touch",
    href: "#/private-room/buzon",
    image: "/assets/album/PRVW/PRVW-02.jpg",
    imageAlt: "UserFX original sunset portrait",
    position: "center 40%",
  },
];