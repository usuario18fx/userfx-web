"use client";

/* ════════════════════════════════════════════════
        USER FX · PR-FX5.tsx  ·  ARCADE QUEER CA 🍁
        Mood: arcade · CRT · pride · Gen Z · PnP-aware
═══════════════════════════════════════════════════ */
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import "./PR-MyRoom.css";

/* ═══════════════════════════ 1 · TIPOS ═══════════════════════════════════ */


export type PrivateRoomMood = "cine" | "vintage" | "arcade";
const PRIVATE_ROOM_MOOD_KEY = "userfx_private_room_mood";
const PRIVATE_ROOM_MOODS: readonly PrivateRoomMood[] = ["cine", "vintage", "arcade"];

function readPrivateRoomMood(): PrivateRoomMood {
  try {
    const value = localStorage.getItem(PRIVATE_ROOM_MOOD_KEY);
    return value === "vintage" || value === "arcade" ? value : "cine";
  } catch {
    return "cine";
  }
}

function writePrivateRoomMood(mood: PrivateRoomMood) {
  document.documentElement.dataset.pvrMood = mood;
  try { localStorage.setItem(PRIVATE_ROOM_MOOD_KEY, mood); } catch {}
  window.dispatchEvent(new CustomEvent("userfx:private-room-mood", { detail: mood }));
}

export type Skin = "pride" | "trans" | "bi" | "pan" | "ace" | "nb" | "arcade";
export type CallFx = "none" | "vhs" | "glitch" | "zoom" | "pride";
export type CallStatus = "idle" | "ringing" | "live";
export type Tab = "muro" | "gente" | "salas" | "perfil";
export type WallFilter = "todos" | "fam" | "regalos" | "kiki";
export type PeopleFilter = "todos" | "online" | "cam" | "incall" | "fama" | "pnp" | "sober";

export type Person = {
  nick: string;
  nombre: string;
  edad: number;
  ciudad: string;
  prov: string;
  flag: string;
  signo: string;
  fama: number;
  votos: number;
  bio: string;
  intereses: string[];
  cam: boolean;
  regalos: number;
  identidad: string;       // they/them, she/her, he/him, etc.
  pnp: "no" | "party" | "sober" | "curious" | "harm-reduction";
};

export type Reply = { id: string; from: string; text: string };

export type Recado = {
  id: string;
  from: string;
  text: string;
  smile: string;
  at: number;
  replies: Reply[];
  gifts: string[];
  via: "muro" | "call";
  fresh?: boolean;
};

export type Visit = { id: string; nick: string; at: number };
export type NotifKind = "call" | "gift" | "star" | "visit" | "visitor" | "kiki";
export type Notif = { id: string; kind: NotifKind; who: string; text: string; at: number };
export type CallLog = { id: string; kind: "in" | "out" | "missed"; who: string; seconds: number; at: number };
export type CallMsg = { id: string; from: string; text: string; at: number; system?: boolean };
export type Gift = { emoji: string; label: string; fama: number };
export type Floaty = { id: string; emoji: string; left: number; size: number; dur: number };
export type Toast = { id: string; text: string };

export type Me = {
  nick: string;
  nombre: string;
  edad: number;
  ciudad: string;
  prov: string;
  flag: string;
  signo: string;
  identidad: string;
  mood: string;
  skin: Skin;
  fama: number;
  votos: number;
  amigues: number;
  visitas: number;
  regalos: number;
  calls: number;
  pokes: number;
  pnp: Person["pnp"];
};

export type CallState = {
  status: CallStatus;
  startedAt: number;
  muted: boolean;
  camOn: boolean;
  fx: CallFx;
  scene: string;
  participants: string[];
  chat: CallMsg[];
  incoming: string | null;
  inviteOpen: boolean;
  hasVideo: boolean;
};

export type Fx5State = {
  me: Me;
  people: Person[];
  online: Record<string, boolean>;
  wall: Recado[];
  top5: string[];
  visitors: Visit[];
  notifs: Notif[];
  history: CallLog[];
  starsSent: Record<string, boolean>;
  giftTarget: string | null;
  tab: Tab;
  openProfile: string | null;
  wallFilter: WallFilter;
  peopleFilter: PeopleFilter;
  query: string;
  call: CallState;
  stageOpen: boolean;
  pickerSlot: number | null;
  floats: Floaty[];
  toasts: Toast[];
  sound: boolean;
};

/* ═══════════════════════════ 2 · DATOS ═══════════════════════════════════ */

export const GIFTS: Gift[] = [
  { emoji: "🍁", label: "MAPLE", fama: 1 },
  { emoji: "🌈", label: "PRIDE", fama: 2 },
  { emoji: "💅", label: "SLAY", fama: 3 },
  { emoji: "👑", label: "CROWN", fama: 4 },
  { emoji: "🦄", label: "UNICORN", fama: 3 },
  { emoji: "🍸", label: "COCKTAIL", fama: 2 },
  { emoji: "💖", label: "HEART", fama: 1 },
  { emoji: "✨", label: "GLITTER", fama: 2 },
];

export const SMILES = ["😀", "💅", "😎", "😂", "🥳", "😴", "🤔", "😇", "🤩", "😜", "🦄", "🌈"];

export const MOODS = [
  "here & queer · disponible para call 📹",
  "slaying in a live rn 💅",
  "vibing to hyperpop 🎧",
  "busy babe · DM later",
  "bored eh · call me 🍁",
  "sober tonight · still fun ✨",
  "party mode · harm reduction first 🧪",
];

export const SKINS: Array<{ id: Skin; label: string; css: string }> = [
  { id: "arcade", label: "ARCADE", css: "linear-gradient(140deg,#c49d57,#62dfff,#7cff8b)" },
  { id: "pride",  label: "PRIDE",  css: "linear-gradient(140deg,#e40303,#ff8c00,#ffed00,#008026,#004dff,#750787)" },
  { id: "trans",  label: "TRANS",  css: "linear-gradient(140deg,#5bcefa,#f5a9b8,#ffffff,#f5a9b8,#5bcefa)" },
  { id: "bi",     label: "BI",     css: "linear-gradient(140deg,#d60270,#9b4f96,#0038a8)" },
  { id: "pan",    label: "PAN",    css: "linear-gradient(140deg,#ff218c,#ffd800,#21b1ff)" },
  { id: "ace",    label: "ACE",    css: "linear-gradient(140deg,#000,#a3a3a3,#fff,#800080)" },
  { id: "nb",     label: "NB",     css: "linear-gradient(140deg,#fcf434,#fff,#9c59d1,#000)" },
];

export const REACTIONS = ["🔥", "💅", "😂", "❤️", "🌈", "✨", "🍁", "🦄"];

export const PEOPLE: Person[] = [
  { nick: "@MapleBabe", nombre: "Maple Babe", edad: 24, ciudad: "Montreal", prov: "QC", flag: "🇨🇦", signo: "Gémeaux", fama: 4.9, votos: 812, bio: "MTL queen · bilingual (fr/en) · hyperpop & late night calls ☕", intereses: ["hyperpop", "drag", "montréal"], cam: true, regalos: 218, identidad: "she/her", pnp: "no" },
  { nick: "@TorontoKiki", nombre: "Toronto Kiki", edad: 27, ciudad: "Toronto", prov: "ON", flag: "🇨🇦", signo: "Léo", fama: 4.8, votos: 733, bio: "Ballroom scene TO · kiki house member · they/them energy 💅", intereses: ["ballroom", "vogue", "kiki"], cam: true, regalos: 196, identidad: "they/them", pnp: "sober" },
  { nick: "@VancouverVibe", nombre: "Vancouver Vibe", edad: 29, ciudad: "Vancouver", prov: "BC", flag: "🇨🇦", signo: "Balance", fama: 4.7, votos: 505, bio: "West coast chill · hikes, rain, and good convos 🌧️", intereses: ["hiking", "chill", "rain"], cam: true, regalos: 174, identidad: "he/him", pnp: "no" },
  { nick: "@PrairieDyke", nombre: "Prairie Dyke", edad: 31, ciudad: "Winnipeg", prov: "MB", flag: "🇨🇦", signo: "Taureau", fama: 4.5, votos: 342, bio: "Prairies represent · zines, dogs & radical softness", intereses: ["zines", "dogs", "prairie"], cam: true, regalos: 118, identidad: "she/they", pnp: "sober" },
  { nick: "@HalifaxHoney", nombre: "Halifax Honey", edad: 26, ciudad: "Halifax", prov: "NS", flag: "🇨🇦", signo: "Cancer", fama: 4.6, votos: 412, bio: "East coast honey · sea shanties & drag brunch 🌊", intereses: ["drag", "brunch", "ocean"], cam: true, regalos: 148, identidad: "she/her", pnp: "no" },
  { nick: "@OttawaOtter", nombre: "Ottawa Otter", edad: 33, ciudad: "Ottawa", prov: "ON", flag: "🇨🇦", signo: "Vierge", fama: 4.4, votos: 288, bio: "Capitol otter · policy by day, pool by night 🦦", intereses: ["policy", "pool", "otter"], cam: true, regalos: 92, identidad: "he/him", pnp: "curious" },
  { nick: "@QuebecQueen", nombre: "Québec Queen", edad: 28, ciudad: "Québec", prov: "QC", flag: "🇨🇦", signo: "Scorpion", fama: 4.8, votos: 640, bio: "Vieux-Québec · francophone first, en deuxième 💙", intereses: ["français", "vieux-québec", "café"], cam: true, regalos: 205, identidad: "she/her", pnp: "no" },
  { nick: "@CalgaryCowboy", nombre: "Calgary Cowboy", edad: 30, ciudad: "Calgary", prov: "AB", flag: "🇨🇦", signo: "Sagittaire", fama: 4.3, votos: 377, bio: "Yeehaw but make it gay · stampede is my olympics 🤠", intereses: ["rodeo", "country", "gay"], cam: true, regalos: 133, identidad: "he/him", pnp: "party" },
  { nick: "@EdmontonEmber", nombre: "Edmonton Ember", edad: 25, ciudad: "Edmonton", prov: "AB", flag: "🇨🇦", signo: "Aries", fama: 4.5, votos: 298, bio: "Oil city but I glow · poetry nights & cheap beer 🔥", intereses: ["poetry", "beer", "night"], cam: true, regalos: 86, identidad: "they/she", pnp: "harm-reduction" },
  { nick: "@SaskatoonStar", nombre: "Saskatoon Star", edad: 22, ciudad: "Saskatoon", prov: "SK", flag: "🇨🇦", signo: "Lion", fama: 4.7, votos: 598, bio: "Prairie star · first out in my family, big feelings ✨", intereses: ["family", "pride", "queer joy"], cam: true, regalos: 189, identidad: "he/they", pnp: "no" },
  { nick: "@NFLDNewfie", nombre: "NFLD Newfie", edad: 34, ciudad: "St. John's", prov: "NL", flag: "🇨🇦", signo: "Pisces", fama: 4.6, votos: 322, bio: "Rock the rock · cod, fog & fiddles 🎻", intereses: ["fiddle", "fog", "cod"], cam: false, regalos: 121, identidad: "he/him", pnp: "no" },
  { nick: "@YukonYoni", nombre: "Yukon Yoni", edad: 27, ciudad: "Whitehorse", prov: "YT", flag: "🇨🇦", signo: "Verseau", fama: 4.4, votos: 245, bio: "Northern lights & northern dykes · aurora calls 🌌", intereses: ["aurora", "north", "chill"], cam: true, regalos: 97, identidad: "she/they", pnp: "sober" },
  { nick: "@NWTNonbinary", nombre: "NWT Nonbinary", edad: 23, ciudad: "Yellowknife", prov: "NT", flag: "🇨🇦", signo: "Gémeaux", fama: 4.5, votos: 267, bio: "They/them in the territories · snow & solstice energy ❄️", intereses: ["solstice", "snow", "they/them"], cam: true, regalos: 102, identidad: "they/them", pnp: "no" },
  { nick: "@NunavutNova", nombre: "Nunavut Nova", edad: 26, ciudad: "Iqaluit", prov: "NU", flag: "🇨🇦", signo: "Cancer", fama: 4.6, votos: 233, bio: "Inuit & queer · throat singing meets hyperpop 🎶", intereses: ["inuit", "throat singing", "hyperpop"], cam: true, regalos: 79, identidad: "she/her", pnp: "sober" },
  { nick: "@DragKingMtl", nombre: "Drag King MTL", edad: 29, ciudad: "Montreal", prov: "QC", flag: "🇨🇦", signo: "Leo", fama: 4.9, votos: 806, bio: "King of the plateau · beard glitter & bad decisions 💫", intereses: ["drag king", "plateau", "comedy"], cam: true, regalos: 221, identidad: "he/him", pnp: "party" },
  { nick: "@TransVanCity", nombre: "Trans VanCity", edad: 25, ciudad: "Vancouver", prov: "BC", flag: "🇨🇦", signo: "Pisces", fama: 4.8, votos: 598, bio: "Trans masc · 3 yrs on T · gym, sushi, mosh pits 💪", intereses: ["gym", "sushi", "mosh"], cam: true, regalos: 189, identidad: "he/they", pnp: "no" },
  { nick: "@TwoSpiritTO", nombre: "Two-Spirit TO", edad: 32, ciudad: "Toronto", prov: "ON", flag: "🇨🇦", signo: "Virgo", fama: 4.9, votos: 680, bio: "Two-Spirit · Anishinaabe · teaching & learning 🪶", intereses: ["anishinaabe", "teaching", "ceremony"], cam: false, regalos: 156, identidad: "they/them", pnp: "sober" },
  { nick: "@VanDragQueen", nombre: "Van Drag Queen", edad: 28, ciudad: "Vancouver", prov: "BC", flag: "🇨🇦", signo: "Aries", fama: 4.7, votos: 512, bio: "Davie Village queen · 6'2 in heels, 5'10 out of them 👠", intereses: ["drag", "davie", "cabaret"], cam: true, regalos: 178, identidad: "she/her", pnp: "harm-reduction" },
];

export const ROOMS: Array<{ id: string; nombre: string; desc: string; tag: string }> = [
  { id: "kiki", nombre: "KIKI LOUNGE 🏳️‍🌈", desc: "Chill vibes · they/them energy · talk about anything, no judgment.", tag: "8 INSIDE" },
  { id: "drag", nombre: "DRAG BRUNCH 🥂", desc: "Sunday best · mimosas optional (sober-friendly) · kiki & reads.", tag: "6 INSIDE" },
  { id: "ballroom", nombre: "BALLROOM 101 💅", desc: "Vogue, duckwalk, dips · learn the 5 elements · walk the category.", tag: "12 INSIDE" },
  { id: "pnp-safe", nombre: "SAFE SPACE · HR 🧪", desc: "Party n Play harm reduction · no glorifying, real talk, resources.", tag: "4 INSIDE" },
];

const CALL_LINES = [
  "eh, totally eh", "no yeah for sure for sure", "slay queen 💅", "okurrr 💅✨",
  "wait I'm screaming 😭", "hold on my wifi is dying", "you're muted bud",
  "vibes are immaculate rn", "kiki continues 🏳️‍🌈", "so anyways how's your day",
  "we're so back", "it's giving main character energy",
];

const RECADO_LINES = [
  "just wrapped a 40 min call 📹 feeling so seen rn",
  "anyone wanna video call? bored eh 🍁",
  "drew my drag look while chatting with the kiki lounge 💅",
  "set my mood to 'slaying' and honestly? accurate",
  "entered the round of 5 and lost my seat 😭 classic",
  "drag brunch room is CHAOS today (affectionate)",
  "why does nobody leave me testimonials 😤",
  "just got a crown 👑 thank you whoever you are!",
];

const REPLY_LINES = [
  "slay 💅", "no yeah totally", "adding you to the kiki", "that's so real bestie",
  "vibes ✨", "ok but the way you said that", "5 stars ⭐⭐⭐⭐⭐",
  "sending you a maple 🍁", "wait this is the moment",
];

const GREETINGS = ["hey bestie! 😄", "heyyy you made it", "okurrr 💅", "eh what's up", "hi hi so good to see you"];
const THANKS = ["thanks babe! 💖", "you're a whole vibe", "okurrr gift received ✨", "making my day fr"];
const TEMOIGNAGES = [
  "Best kiki in the whole scene. Stays with you till the call ends, no rush.",
  "Actually listens. Came for a vibe, stayed till sunrise.",
  "Every call ends in laughter. 10/10 would recommend to my drag kids.",
  "Puts on hyperpop, does makeup, talks about everything. A legend.",
  "People enter their room and never want to leave. Slay.",
];
const MIS_TESTIMONIOS = [
  "Always on a call and always has a story. Certified bestie.",
  "Came to their wall out of curiosity, stayed the whole afternoon kiki-ing.",
  "Their video calls are my Friday night plan. Strongly recommend.",
  "Helped me through a lot live on camera. Real one.",
];
const HR_LINES = [
  "quick reminder: stay hydrated 💧",
  "know your limits tonight, ok? 🧪",
  "test your stuff if you can, be safe 💖",
  "buddy system always — no one parties alone 🍁",
  "you matter more than any night out 🏳️‍🌈",
];

/* ═══════════════════════════ 3 · UTILIDADES ══════════════════════════════ */

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const rint = (min: number, max: number) => Math.round(rand(min, max));
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const initialsOf = (nick: string) => nick.replace("@", "").slice(0, 2).toUpperCase();
const firstName = (value: string) => value.split(" ")[0];
const hueOf = (nick: string) => {
  let hash = 0;
  for (let index = 0; index < nick.length; index += 1) hash = (hash * 31 + nick.charCodeAt(index)) % 360;
  return hash;
};
const clock = (at: number) => new Date(at).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
const mmss = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const shuffle = <T,>(list: T[]): T[] => {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};
const starRow = (fama: number) => {
  const full = Math.round(fama);
  return [1, 2, 3, 4, 5].map((position) => (position <= full ? "★" : "☆"));
};

/* ═══════════════════════════ 3.b · HELPERS ══════════════════════════════ */

const MAX_VISITORS_PREVIEW = 7;
const MAX_NOTIFS = 14;
const MAX_HISTORY = 8;
const DEMO_INCOMING_CALLS = false;

const CALL_KIND_LABEL: Record<CallLog["kind"], string> = {
  in: "📥 INCOMING",
  out: "📤 OUTGOING",
  missed: "❌ MISSED",
};

const getCallLabel = (log: CallLog): string =>
  `${CALL_KIND_LABEL[log.kind] ?? "📞 CALL"}${log.seconds ? ` · ${mmss(log.seconds)}` : ""}`;

const PNP_LABEL: Record<Person["pnp"], string> = {
  "no": "🚫 NOT INTO PNP",
  "party": "🎉 PARTY",
  "sober": "✨ SOBER",
  "curious": "❓ CURIOUS",
  "harm-reduction": "🧪 HR-FIRST",
};

/* ═══════════════════════════ 4 · AUDIO 8-BIT ════════════════════════════ */

type AudioEngine = ReturnType<typeof createAudio>;

function createAudio() {
  let ctx: AudioContext | null = null;
  let ringTimer: number | null = null;
  let enabled = true;

  const ready = () => {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch { ctx = null; }
    return ctx;
  };

  const resume = () => {
    const node = ready();
    if (node && node.state === "suspended") void node.resume().catch(() => {});
    return node;
  };

  /* Arcade: square waves for that 8-bit feel */
  const tone = (freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) => {
    if (!enabled) return;
    const node = resume();
    if (!node) return;
    const osc = node.createOscillator();
    const gain = node.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, node.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), node.currentTime + dur);
    gain.gain.setValueAtTime(0.0001, node.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, node.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, node.currentTime + dur);
    osc.connect(gain).connect(node.destination);
    osc.start();
    osc.stop(node.currentTime + dur + 0.02);
  };

  return {
    get enabled() { return enabled; },
    setEnabled(next: boolean) { enabled = next; if (!next) this.stopRing(); },
    /* 8-bit coin / blip / power-up vibes */
    blip: () => tone(1200, 0.06, "square", 0.08),
    pop: () => tone(880, 0.05, "square", 0.09, 1400),
    chime: () => {
      tone(1046, 0.08, "square", 0.09);
      window.setTimeout(() => tone(1318, 0.08, "square", 0.09), 70);
      window.setTimeout(() => tone(1568, 0.15, "square", 0.09), 140);
    },
    join: () => {
      tone(523, 0.07, "square", 0.1, 784);
      window.setTimeout(() => tone(784, 0.09, "square", 0.1, 1046), 70);
    },
    leave: () => tone(784, 0.09, "square", 0.09, 392),
    poke: () => tone(400, 0.05, "square", 0.08, 1200),
    hangup: () => {
      tone(400, 0.1, "square", 0.1, 200);
      window.setTimeout(() => tone(200, 0.2, "square", 0.1, 80), 100);
    },
    /* Coin insert for incoming calls */
    coin: () => {
      tone(988, 0.06, "square", 0.1);
      window.setTimeout(() => tone(1319, 0.18, "square", 0.1), 60);
    },
    startRing() {
      if (ringTimer !== null) window.clearInterval(ringTimer);
      let step = 0;
      const seq = [988, 1319, 988, 1319, 784];
      ringTimer = window.setInterval(() => {
        if (!enabled) return;
        tone(seq[step % seq.length], 0.14, "square", 0.11);
        step += 1;
      }, 320);
    },
    stopRing() {
      if (ringTimer !== null) window.clearInterval(ringTimer);
      ringTimer = null;
    },
  };
}
const audio = createAudio();

/* ═══════════════════════════ 5 · PERSISTENCIA ════════════════════════════ */

const SAVE_KEY = "userfx_arcade_pride_ca_v1";

type SaveShape = {
  me?: Partial<Me>;
  top5?: string[];
  wall?: Recado[];
  history?: CallLog[];
  starsSent?: Record<string, boolean>;
  sound?: boolean;
};

function loadSave(): SaveShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SaveShape) : {};
  } catch { return {}; }
}

function writeSave(state: Fx5State) {
  if (typeof window === "undefined") return;
  try {
    const payload: SaveShape = {
      me: state.me,
      top5: state.top5,
      wall: state.wall.slice(0, 20),
      history: state.history.slice(0, 12),
      starsSent: state.starsSent,
      sound: state.sound,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch { /* private mode */ }
}

/* ═══════════════════════════ 6 · TIENDA ════════════════════════════════ */

function initialState(): Fx5State {
  const saved = loadSave();
  const online: Record<string, boolean> = {};
  PEOPLE.forEach((person) => { online[person.nick] = Math.random() > 0.32; });

  const seed: Recado[] = [
    { from: "@MapleBabe", text: "MTL kiki tonight at 9? bring your best fit 💅", smile: "🍁" },
    { from: "@TorontoKiki", text: "ballroom practice was EVERYTHING tonight, y'all missed it", smile: "💅" },
    { from: "@TransVanCity", text: "6 months on T today 🥹 thanks for all the love on my wall", smile: "💖" },
    { from: "@PrairieDyke", text: "prairie queer zine #4 is out, DM me for a copy 🐄", smile: "✨" },
    { from: "@TwoSpiritTO", text: "teaching a beading workshop this weekend, all 2S relatives welcome 🪶", smile: "🦅" },
    { from: "@VanDragQueen", text: "new number debut at Davie St next Friday, come thru 👠", smile: "👑" },
  ].map((item, index) => ({
    id: `seed-${index}`,
    from: item.from,
    text: item.text,
    smile: item.smile,
    at: Date.now() - (index + 1) * 420_000,
    replies: [{ id: uid("r"), from: "@User18Ca", text: pick(["omg yes 💅", "I'm so there", "slay", "adding to my calendar ✨"]) }],
    gifts: index === 1 ? ["🌈", "💅"] : index === 2 ? ["💖", "✨"] : [],
    via: "muro" as const,
  }));

  const me: Me = {
    nick: "@User18Ca",
    nombre: "Avery from TO",
    edad: 24,
    ciudad: "Toronto",
    prov: "ON",
    flag: "🇨🇦",
    signo: "Gémeaux",
    identidad: "they/them",
    mood: MOODS[0],
    skin: "arcade",
    fama: 4.8,
    votos: 214,
    amigues: 128,
    visitas: 3421,
    regalos: 57,
    calls: 0,
    pokes: 0,
    pnp: "no",
    ...(saved.me || {}),
  };

  return {
    me,
    people: PEOPLE.map((person) => ({ ...person })),
    online,
    wall: saved.wall && saved.wall.length ? saved.wall : seed,
    top5: saved.top5 && saved.top5.length ? saved.top5.filter((nick) => PEOPLE.some((person) => person.nick === nick)).slice(0, 5) : ["@MapleBabe", "@TorontoKiki", "@TransVanCity"],
    visitors: shuffle(PEOPLE).slice(0, 5).map((person) => ({ id: uid("v"), nick: person.nick, at: Date.now() - rint(60, 5400) * 1000 })),
    notifs: [
      { id: uid("n"), kind: "call", who: "@MapleBabe", text: "called you earlier (missed)", at: Date.now() - 900_000 },
      { id: uid("n"), kind: "gift", who: "@DragKingMtl", text: "sent you a crown 👑", at: Date.now() - 1_200_000 },
      { id: uid("n"), kind: "kiki", who: "@TorontoKiki", text: "invited you to the kiki lounge 🏳️‍🌈", at: Date.now() - 1_500_000 },
    ],
    history: saved.history && saved.history.length
      ? saved.history
      : [
          { id: uid("h"), kind: "in", who: "@MapleBabe", seconds: 268, at: Date.now() - 3_600_000 },
          { id: uid("h"), kind: "out", who: "@TorontoKiki, @TransVanCity", seconds: 1420, at: Date.now() - 7_200_000 },
          { id: uid("h"), kind: "missed", who: "@YukonYoni", seconds: 0, at: Date.now() - 10_800_000 },
        ],
    starsSent: saved.starsSent || {},
    giftTarget: null,
    tab: "muro",
    openProfile: null,
    wallFilter: "todos",
    peopleFilter: "todos",
    query: "",
    call: {
      status: "idle",
      startedAt: 0,
      muted: false,
      camOn: true,
      fx: "none",
      scene: "arcade",
      participants: [],
      chat: [],
      incoming: null,
      inviteOpen: false,
      hasVideo: false,
    },
    stageOpen: false,
    pickerSlot: null,
    floats: [],
    toasts: [],
    sound: saved.sound !== false,
  };
}

class Fx5Store {
  private state: Fx5State = initialState();
  private listeners = new Set<() => void>();
  private timerIds: number[] = [];
  private botIds: number[] = [];
  private stream: MediaStream | null = null;
  private mounts = 0;
  private saveTimer: number | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getState = (): Fx5State => this.state;

  private emit() { this.listeners.forEach((listener) => listener()); }

  private set(patch: Partial<Fx5State>) {
    this.state = { ...this.state, ...patch };
    this.emit();
    this.scheduleSave();
  }

  private patchCall(patch: Partial<CallState>) {
    this.set({ call: { ...this.state.call, ...patch } });
  }

  private scheduleSave() {
    if (typeof window === "undefined") return;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      writeSave(this.state);
      this.saveTimer = null;
    }, 400);
  }

  private later(callback: () => void, ms: number) {
    const id = window.setTimeout(() => {
      this.timerIds = this.timerIds.filter((timerId) => timerId !== id);
      callback();
    }, ms);
    this.timerIds.push(id);
    return id;
  }

  bootstrap() {
    this.mounts += 1;
    if (this.mounts > 1) return;
    audio.setEnabled(this.state.sound);
    this.startBots();
  }

  teardown() {
    this.mounts = Math.max(0, this.mounts - 1);
    if (this.mounts > 0) return;
    this.botIds.forEach((id) => { window.clearInterval(id); });
    this.botIds = [];
    this.timerIds.forEach((id) => { window.clearTimeout(id); });
    this.timerIds = [];
    if (this.saveTimer !== null) { window.clearTimeout(this.saveTimer); this.saveTimer = null; }
    audio.stopRing();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.state.call.hasVideo) this.patchCall({ hasVideo: false, muted: false, camOn: true });
  }

  person(nick: string | null): Person | null {
    if (!nick) return null;
    return this.state.people.find((person) => person.nick === nick) || null;
  }

  onlineBots(): Person[] {
    const online = this.state.people.filter((person) => this.state.online[person.nick]);
    return online.length ? online : this.state.people;
  }

  elapsed(): number {
    return this.state.call.startedAt ? Math.floor((Date.now() - this.state.call.startedAt) / 1000) : 0;
  }

  giftTarget(): string {
    const { giftTarget, openProfile, call } = this.state;
    if (giftTarget && this.person(giftTarget)) return giftTarget;
    if (openProfile && openProfile !== this.state.me.nick && this.person(openProfile)) return openProfile;
    if (call.status === "live" && call.participants.length) return call.participants[0];
    return this.onlineBots()[0].nick;
  }

  setTab(tab: Tab) { this.set({ tab }); }
  setQuery(query: string) { this.set({ query }); }
  setWallFilter(wallFilter: WallFilter) { this.set({ wallFilter }); }
  setPeopleFilter(peopleFilter: PeopleFilter) { this.set({ peopleFilter }); }
  setMe(patch: Partial<Me>) { this.set({ me: { ...this.state.me, ...patch } }); }

  openProfile(nick: string | null) {
    this.set({ openProfile: nick, tab: "perfil", giftTarget: nick ? nick : this.state.giftTarget });
  }

  cycleGiftTarget() {
    const pool = this.onlineBots();
    const current = pool.findIndex((person) => person.nick === this.giftTarget());
    const next = pool[(current + 1 + pool.length) % pool.length];
    this.set({ giftTarget: next.nick });
    this.toast(`GIFT TARGET: ${next.nick}`);
  }

  setMood(mood: string) {
    this.set({ me: { ...this.state.me, mood } });
    this.toast(`MOOD: ${mood.toUpperCase()}`);
  }

  setSkin(skin: Skin) {
    this.set({ me: { ...this.state.me, skin } });
    audio.blip();
    this.toast(`THEME: ${skin.toUpperCase()}`);
  }

  setPnp(pnp: Person["pnp"]) {
    this.set({ me: { ...this.state.me, pnp } });
    this.toast(`PNP STATUS: ${PNP_LABEL[pnp]}`);
  }

  toggleSound() {
    const sound = !this.state.sound;
    audio.setEnabled(sound);
    this.set({ sound });
    if (sound && this.state.call.status === "ringing") audio.startRing();
  }

  float(emoji: string, left?: number) {
    const floaty: Floaty = {
      id: uid("f"),
      emoji,
      left: clamp(left === undefined ? rand(6, 90) : left, 2, 94),
      size: rint(20, 38),
      dur: rand(1.9, 2.7),
    };
    this.set({ floats: [...this.state.floats, floaty].slice(-60) });
    this.later(() => this.set({ floats: this.state.floats.filter((item) => item.id !== floaty.id) }), 2900);
  }

  toast(text: string) {
    const item: Toast = { id: uid("t"), text };
    this.set({ toasts: [...this.state.toasts, item].slice(-4) });
    this.later(() => this.set({ toasts: this.state.toasts.filter((entry) => entry.id !== item.id) }), 2700);
  }

  private notify(kind: NotifKind, who: string, text: string) {
    this.set({ notifs: [{ id: uid("n"), kind, who, text, at: Date.now() }, ...this.state.notifs].slice(0, 40) });
  }

  private log(kind: CallLog["kind"], who: string, seconds = 0) {
    this.set({ history: [{ id: uid("h"), kind, who, seconds, at: Date.now() }, ...this.state.history].slice(0, 14) });
  }

  postRecado(text: string, smile = "") {
    const clean = text.trim();
    if (!clean) { this.toast("WRITE SOMETHING FIRST EH"); return; }
    const recado: Recado = {
      id: uid("w"),
      from: this.state.me.nick,
      text: clean,
      smile,
      at: Date.now(),
      replies: [],
      gifts: [],
      via: this.state.call.status === "live" ? "call" : "muro",
      fresh: true,
    };
    this.set({ wall: [recado, ...this.state.wall].slice(0, 40) });
    audio.pop();
    this.toast("POSTED TO YOUR WALL 🍁");

    const bots = shuffle(this.onlineBots()).slice(0, rint(2, 4));
    bots.forEach((bot, index) => {
      this.later(() => {
        const current = this.state.wall.find((item) => item.id === recado.id);
        if (!current) return;
        const reply: Reply = { id: uid("r"), from: bot.nick, text: pick(REPLY_LINES) };
        this.set({
          wall: this.state.wall.map((item) => (item.id === recado.id ? { ...item, fresh: false, replies: [...item.replies, reply] } : item)),
        });
        audio.blip();
        if (Math.random() > 0.55) this.notify("visitor", bot.nick, "commented on your post");
      }, 1200 + index * rint(900, 2600));
    });
  }

  smileTo(nick: string, smile = "💅") {
    this.float(smile);
    audio.pop();
    this.notify("visitor", nick, "got your smile " + smile);
    this.toast(`SMILE → ${nick}`);
  }

  giftTo(nick: string, emoji: string) {
    const gift = GIFTS.find((item) => item.emoji === emoji) || GIFTS[0];
    const person = this.person(nick);
    const people = this.state.people.map((item) => {
      if (item.nick !== nick) return item;
      const votos = item.votos + 1;
      const fama = clamp(Math.round(((item.fama * item.votos + gift.fama * 4) / votos) * 10) / 10, 3, 5);
      return { ...item, votos, fama, regalos: item.regalos + 1 };
    });
    this.set({ people, giftTarget: nick, me: { ...this.state.me, regalos: this.state.me.regalos + 1 } });
    audio.chime();
    for (let index = 0; index < 5; index += 1) this.later(() => this.float(emoji, rand(10, 88)), index * 90);
    this.notify("gift", nick, `got your gift ${emoji}`);
    this.toast(`GIFT ${emoji} → ${nick}`);
    if (person && this.state.call.status === "live" && this.state.call.participants.includes(nick)) {
      this.callChat("SYSTEM", `You sent ${emoji} to ${nick}`, true);
      this.later(() => {
        if (this.state.call.status === "live") this.callChat(nick, pick(THANKS));
      }, rint(700, 1600));
    }
  }

  giveStars(nick: string) {
    if (this.state.starsSent[nick]) {
      this.toast(`ALREADY GAVE 5 STARS TO ${nick}`);
      return;
    }
    const people = this.state.people.map((item) => {
      if (item.nick !== nick) return item;
      const votos = item.votos + 1;
      return { ...item, votos, fama: clamp(Math.round(((item.fama * item.votos + 25) / votos) * 10) / 10, 3, 5) };
    });
    this.set({ people, starsSent: { ...this.state.starsSent, [nick]: true } });
    audio.chime();
    for (let index = 0; index < 4; index += 1) this.later(() => this.float("⭐", rand(8, 90)), index * 110);
    this.notify("star", nick, "got your 5 stars");
    this.toast(`5 STARS → ${nick}`);
  }

  poke(nick: string) {
    this.set({ me: { ...this.state.me, pokes: this.state.me.pokes + 1 } });
    audio.poke();
    this.float("👋", rand(10, 88));
    this.notify("visit", nick, "got your poke");
    this.toast(`POKED ${nick}`);
    if (Math.random() > 0.4) {
      this.later(() => {
        this.notify("visit", nick, "poked you back 👋");
        audio.poke();
        this.float("👋", rand(10, 88));
      }, rint(1500, 3500));
    }
  }

  setPickerSlot(slot: number | null) { this.set({ pickerSlot: slot }); }

  pickFavorite(slot: number, nick: string) {
    const top5 = this.state.top5.slice();
    top5[slot] = nick;
    const clean = top5.filter(Boolean).slice(0, 5);
    const unique = Array.from(new Set(clean)).slice(0, 5);
    this.set({ top5: unique, pickerSlot: null });
    audio.blip();
    this.toast(`${nick} JOINED YOUR TOP 5`);
  }

  clearTop5() { this.set({ top5: [] }); this.toast("TOP 5 CLEARED"); }

  fillTop5() {
    const free = 5 - this.state.top5.length;
    const pool = shuffle(this.onlineBots().filter((person) => !this.state.top5.includes(person.nick))).slice(0, Math.max(0, free));
    this.set({ top5: [...this.state.top5, ...pool.map((person) => person.nick)].slice(0, 5) });
    this.toast("TOP 5 FILLED FROM ONLINE FOLKS");
  }

  toggleTop5(nick: string) {
    if (this.state.top5.includes(nick)) {
      this.set({ top5: this.state.top5.filter((item) => item !== nick) });
      this.toast(`${nick} LEFT YOUR TOP 5`);
      return;
    }
    if (this.state.top5.length >= 5) { this.toast("YOU ALREADY HAVE 5 · FREE A SLOT"); return; }
    this.set({ top5: [...this.state.top5, nick] });
    this.toast(`${nick} JOINED YOUR TOP 5`);
  }

  openStage() { if (this.state.call.status === "idle") return; this.set({ stageOpen: true }); }
  closeStage() { this.set({ stageOpen: false }); }
  toggleInvite() { this.patchCall({ inviteOpen: !this.state.call.inviteOpen }); }

  startCall(nicks: string[], options: { incoming?: boolean } = {}) {
    if (this.state.call.status !== "idle") {
      this.toast("ALREADY IN A CALL · MINIMIZE OR INVITE");
      return;
    }
    const targets = nicks.filter(Boolean).slice(0, 5);
    if (!targets.length) { this.toast("NOBODY AVAILABLE RN"); return; }

    this.patchCall({
      status: "ringing",
      participants: targets,
      chat: [],
      startedAt: 0,
      incoming: options.incoming ? targets[0] : null,
      inviteOpen: false,
    });
    this.set({ me: { ...this.state.me, calls: this.state.me.calls + 1 } });
    audio.startRing();
    this.openStage();

    this.later(() => {
      if (this.state.call.status !== "ringing") return;
      const answered = options.incoming ? targets : targets.filter(() => Math.random() > 0.22);
      if (!answered.length) {
        audio.stopRing();
        audio.hangup();
        this.log("missed", targets[0], 0);
        this.notify("call", targets[0], "missed call");
        this.patchCall({ status: "idle", participants: [], incoming: null, startedAt: 0 });
        this.set({ stageOpen: false });
        this.toast(`${targets[0]} DIDN'T PICK UP`);
        return;
      }
      this.patchCall({ status: "live", participants: answered, startedAt: Date.now(), incoming: null });
      audio.stopRing();
      audio.join();
      this.callChat("SYSTEM", `Call connected · ${answered.join(", ")}`, true);
      /* Harm reduction reminder if anyone in call is party/hr */
      if (answered.some((n) => { const p = this.person(n); return p && (p.pnp === "party" || p.pnp === "harm-reduction"); })) {
        this.later(() => this.callChat("SAFE SPACE 🧪", pick(HR_LINES), true), 1200);
      }
      answered.forEach((nick, index) => {
        this.later(() => {
          if (this.state.call.status !== "live") return;
          this.callChat(nick, pick(GREETINGS));
          audio.blip();
        }, 700 + index * 900);
      });
      this.log(options.incoming ? "in" : "out", answered.join(", "), 0);
      this.toast("CONNECTED · KEEP BROWSING, CALL STAYS LIVE 💅");
    }, rint(1200, 2100) + targets.length * 300);
  }

  incomingCall(from: string) {
    if (this.state.call.status !== "idle") return;
    this.patchCall({ status: "ringing", participants: [from], chat: [], incoming: from, startedAt: 0 });
    audio.coin();
    audio.startRing();
    this.notify("call", from, "is calling you 📹");
  }

  answerCall() {
    const from = this.state.call.incoming;
    if (!from) return;
    audio.stopRing();
    audio.join();
    this.patchCall({ status: "live", startedAt: Date.now(), incoming: null, participants: [from] });
    this.callChat("SYSTEM", `You picked up ${from}'s call`, true);
    this.log("in", from, 0);
    this.set({ stageOpen: true });
    const fromPerson = this.person(from);
    if (fromPerson && (fromPerson.pnp === "party" || fromPerson.pnp === "harm-reduction")) {
      this.later(() => this.callChat("SAFE SPACE 🧪", pick(HR_LINES), true), 1000);
    }
    this.later(() => {
      if (this.state.call.status !== "live") return;
      this.callChat(from, pick(["thanks for picking up bestie 💖", "was gonna tell you something", "hey! saw you on the wall and thought, lemme call"]));
      audio.blip();
    }, 800);
    this.toast(`IN CALL WITH ${from}`);
  }

  rejectCall(auto = false) {
    const from = this.state.call.incoming || this.state.call.participants[0];
    audio.stopRing();
    audio.hangup();
    if (from) {
      this.log("missed", from, 0);
      this.notify("call", from, auto ? "missed call (no answer)" : "call declined");
    }
    this.patchCall({ status: "idle", participants: [], incoming: null, startedAt: 0, chat: [] });
    this.set({ stageOpen: false });
    if (from) this.toast(auto ? `MISSED CALL FROM ${from}` : `DECLINED ${from}`);
  }

  endCall() {
    const { status, startedAt, participants } = this.state.call;
    if (status === "idle") return;
    const seconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    const who = participants.join(", ");
    audio.stopRing();
    audio.hangup();
    if (status === "live" && who) {
      const history = this.state.history.slice();
      const index = history.findIndex((item) => item.who === who && item.seconds === 0);
      if (index >= 0) history[index] = { ...history[index], seconds };
      else history.unshift({ id: uid("h"), kind: "out", who, seconds, at: Date.now() });
      this.set({ history: history.slice(0, 14) });
    }
    this.patchCall({ status: "idle", startedAt: 0, participants: [], chat: [], incoming: null, inviteOpen: false });
    this.set({ stageOpen: false });
    this.toast(seconds ? `CALL ENDED · ${mmss(seconds)}` : "CALL ENDED");
  }

  inviteToCall(nick: string) {
    if (this.state.call.status === "idle") { this.startCall([nick]); return; }
    if (this.state.call.participants.length >= 5) { this.toast("CALL IS FULL (5 PEOPLE)"); return; }
    if (this.state.call.participants.includes(nick)) { this.toast("ALREADY IN THE CALL"); return; }
    if (!this.state.online[nick]) { this.toast(`${nick} IS OFFLINE`); return; }
    this.patchCall({ participants: [...this.state.call.participants, nick], inviteOpen: false });
    audio.join();
    this.callChat("SYSTEM", `${nick} joined the call`, true);
    this.toast(`${nick} JOINED`);
    this.later(() => {
      if (this.state.call.status !== "live") return;
      this.callChat(nick, pick(["hey everyone 👋", "I'm in!", "what's the vibe rn?", "made it!"]));
    }, 900);
  }

  removeParticipant(nick: string) {
    const participants = this.state.call.participants.filter((item) => item !== nick);
    audio.leave();
    if (!participants.length) { this.patchCall({ participants }); this.endCall(); return; }
    this.patchCall({ participants });
    this.callChat("SYSTEM", `${nick} left the call`, true);
  }

  toggleMic() {
    const muted = !this.state.call.muted;
    this.stream?.getAudioTracks().forEach((track) => { track.enabled = !muted; });
    this.patchCall({ muted });
    audio.poke();
  }

  toggleCam() {
    const camOn = !this.state.call.camOn;
    this.stream?.getVideoTracks().forEach((track) => { track.enabled = camOn; });
    this.patchCall({ camOn });
  }

  cycleFx() {
    const list: CallFx[] = ["none", "vhs", "glitch", "zoom", "pride"];
    const fx = list[(list.indexOf(this.state.call.fx) + 1) % list.length];
    this.patchCall({ fx });
    this.toast(`FX: ${fx.toUpperCase()}`);
  }

  changeScene() {
    const scene = pick(["arcade", "neon", "studio", "northlight"]);
    this.patchCall({ scene });
    this.toast(`SCENE → ${scene.toUpperCase()}`);
  }

  callChat(from: string, text: string, system = false) {
    const message: CallMsg = { id: uid("c"), from, text, at: Date.now(), system };
    this.patchCall({ chat: [...this.state.call.chat, message].slice(-80) });
  }

  sendCallText(text: string) {
    const clean = text.trim();
    if (!clean) return;
    this.callChat(this.state.me.nick, clean);
    audio.pop();
    const bots = this.state.call.participants;
    if (bots.length) {
      this.later(() => {
        if (this.state.call.status !== "live") return;
        this.callChat(pick(bots), pick(CALL_LINES));
        audio.blip();
      }, rint(900, 2400));
    }
  }

  reactInCall(emoji: string) {
    audio.pop();
    for (let index = 0; index < 3; index += 1) this.later(() => this.float(emoji, rand(8, 92)), index * 110);
    const bots = this.state.call.participants;
    if (bots.length && Math.random() > 0.45) this.later(() => this.float(pick(["🔥", "💅", "❤️", "✨"]), rand(8, 92)), 500);
  }

  giftToCall() {
    const bots = this.state.call.participants;
    if (!bots.length) { this.toast("NOBODY IN THE CALL"); return; }
    this.giftTo(pick(bots), pick(GIFTS).emoji);
  }

  enableRealCam() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.toast("BROWSER WON'T GIVE CAM/MIC ACCESS");
      return;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        this.stream = stream;
        stream.getVideoTracks().forEach((track) => { track.enabled = this.state.call.camOn; });
        stream.getAudioTracks().forEach((track) => { track.enabled = !this.state.call.muted; });
        this.patchCall({ hasVideo: true });
        this.toast("CAMERA + MIC ON 🎥");
      })
      .catch(() => {
        this.patchCall({ hasVideo: false });
        this.toast("NO PERMISSION · STAYING WITH SIM CAM");
      });
  }

  attachMyVideo(video: HTMLVideoElement | null): () => void {
    if (!video) return () => {};
    const bind = () => {
      const stream = this.stream;
      if (stream && video.srcObject !== stream) {
        video.srcObject = stream;
        const play = video.play();
        if (play && typeof play.catch === "function") play.catch(() => {});
      }
      if (!stream && video.srcObject) video.srcObject = null;
    };
    bind();
    return this.subscribe(bind);
  }

  private bot(fn: () => void, ms: number) {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      fn();
    }, ms);
    this.botIds.push(id);
  }

  private startBots() {
    this.bot(() => {
      const person = pick(this.state.people);
      this.set({ online: { ...this.state.online, [person.nick]: !this.state.online[person.nick] } });
    }, 6500);

    this.bot(() => {
      const person = pick(this.onlineBots());
      const recado: Recado = {
        id: uid("w"),
        from: person.nick,
        text: pick(RECADO_LINES),
        smile: pick(SMILES),
        at: Date.now(),
        replies: Math.random() > 0.5 ? [{ id: uid("r"), from: pick(this.onlineBots()).nick, text: pick(["slay", "okurrr", "so real", "vibes ✨"]) }] : [],
        gifts: [],
        via: "muro",
      };
      this.set({ wall: [recado, ...this.state.wall].slice(0, 40) });
      audio.pop();
    }, 7000);

    this.bot(() => {
      const person = pick(this.onlineBots());
      const gift = pick(GIFTS);
      const people = this.state.people.map((item) => (item.nick === person.nick ? { ...item, fama: clamp(item.fama + gift.fama * 0.01, 3, 5), regalos: item.regalos + 1 } : item));
      this.set({ people, me: { ...this.state.me, regalos: this.state.me.regalos + (Math.random() > 0.5 ? 1 : 0) } });
      audio.chime();
      this.float(gift.emoji, rand(8, 92));
      this.notify("gift", person.nick, `sent you ${gift.label} ${gift.emoji}`);
    }, 11_000);

    this.bot(() => {
      const people = this.state.people.map((item) => {
        if (Math.random() > 0.12) return item;
        return { ...item, votos: item.votos + rint(1, 6), fama: clamp(Math.round((item.fama + rand(-0.05, 0.08)) * 10) / 10, 3.5, 5) };
      });
      this.set({ people });
    }, 9000);

    this.bot(() => {
      const person = pick(this.state.people);
      this.set({
        visitors: [{ id: uid("v"), nick: person.nick, at: Date.now() }, ...this.state.visitors].slice(0, 20),
        me: { ...this.state.me, visitas: this.state.me.visitas + rint(1, 9) },
      });
      this.notify("visitor", person.nick, "visited your profile");
    }, 13_000);

    if (DEMO_INCOMING_CALLS) {
      this.bot(() => {
        if (this.state.call.status !== "idle") return;
        if (Math.random() > 0.42) return;
        const person = pick(this.onlineBots());
        this.incomingCall(person.nick);
      }, 17_000);
    }

    this.bot(() => {
      if (this.state.call.status !== "live") return;
      const bots = this.state.call.participants;
      if (!bots.length) return;
      this.callChat(pick(bots), pick(CALL_LINES));
      audio.blip();
      if (this.state.call.participants.length < 5 && Math.random() > 0.72) {
        const extra = pick(this.state.people.filter((person) => this.state.online[person.nick] && !this.state.call.participants.includes(person.nick)));
        if (extra) this.inviteToCall(extra.nick);
      }
    }, 8000);

    this.bot(() => {
      if (this.state.call.status !== "live") return;
      if (Math.random() > 0.6) this.float(pick(["🔥", "💅", "❤️", "✨", "🌈"]), rand(8, 92));
    }, 4200);

    this.bot(() => {
      this.notify("visitor", pick(this.state.people).nick, pick(["sent you a smile 💅", "added you as a friend", "mentioned you on their wall", "invited you to the kiki lounge 🏳️‍🌈"]));
    }, 15_000);

    /* HR reminder broadcast every ~90s if PnP community active */
    this.bot(() => {
      if (Math.random() > 0.35) return;
      this.toast(pick(HR_LINES));
      audio.coin();
    }, 90_000);

    this.later(() => this.toast("POST TO YOUR WALL OR CALL SOMEONE 📹🍁"), 800);
  }
}

export const fx5 = new Fx5Store();

/* ═══════════════════════════ 7 · HOOKS ═══════════════════════════════════ */

export function useFx5(): Fx5State {
  return useSyncExternalStore(fx5.subscribe, fx5.getState, fx5.getState);
}

function useCallClock(active: boolean) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => force((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
}

function useFx5Bootstrap() {
  useEffect(() => {
    fx5.bootstrap();
    return () => fx5.teardown();
  }, []);
}

/* ═══════════════════════════ 8 · PRIMITIVAS UI ═══════════════════════════ */

function Ava({ nick, size, online, incall, className = "" }: { nick: string; size?: "sm" | "md" | "lg"; online?: boolean; incall?: boolean; className?: string }) {
  return (
    <span className={`ava ${size ? size : ""} ${online ? "is-online" : ""} ${incall ? "is-call" : ""} ${className}`.trim()}>
      {initialsOf(nick)}
    </span>
  );
}

function Stars({ value, votos }: { value: number; votos?: number }) {
  return (
    <span className="stars">
      {starRow(value).map((char, index) => (
        <b key={index}>{char}</b>
      ))}
      {votos !== undefined ? <em>{`${value.toFixed(1)} · ${votos} votes`}</em> : null}
    </span>
  );
}

function Metric({ label, value, tone, id }: { label: string; value: ReactNode; tone?: "a" | "green"; id?: string }) {
  return (
    <div className={`fx5-metric ${tone ? `is-${tone}` : ""}`}>
      <span>{label}</span>
      <strong id={id}>{value}</strong>
    </div>
  );
}

function EffBtn({
  children, onClick, kind, size, disabled, title, dataAct, dataNick, "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "live" | "danger";
  size?: "sm";
  disabled?: boolean;
  title?: string;
  dataAct?: string;
  dataNick?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      className={`fx5-btn ${kind ? kind : ""} ${size === "sm" ? "sm" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      data-act={dataAct}
      data-nick={dataNick}>
      {children}
    </button>
  );
}

function CamTile({
  nick, label, muted, tag, badge, footer, children,
}: {
  nick: string; label?: string; muted?: boolean; tag?: string; badge?: string; footer?: ReactNode; children?: ReactNode;
}) {
  const hue = hueOf(nick);
  return (
    <div className="cam-tile" style={{ ["--tint" as string]: `hsla(${hue},72%,55%,.24)` }}>
      <div className="sim"><i /><b /></div>
      <Ava nick={nick} size="md" className="is-center" />
      {children}
      <div className="who">
        <span className={muted ? "offmic" : "on"}>{`${muted ? "🔇" : "🎙"} ${label || nick}`}</span>
        {footer}
      </div>
      <div className="bars"><i /><i /><i /><i /></div>
      {tag ? <span className={`tag badge ${badge || ""}`}>{tag}</span> : null}
    </div>
  );
}

/* ═══════════════════════════ 9 · VISTAS ══════════════════════════════════ */

function RecadoCard({ recado }: { recado: Recado }) {
  const state = useFx5();
  const person = fx5.person(recado.from);
  return (
    <article className={`recado ${recado.fresh ? "is-new" : ""}`}>
      <Ava nick={recado.from} online={Boolean(state.online[recado.from])} />
      <div className="body">
        <header>
          <b>{recado.from}{person ? ` · ${person.nombre}` : ""}</b>
          <small>{clock(recado.at)} · {recado.via === "call" ? "FROM THE CALL" : "ON YOUR WALL"}</small>
        </header>
        <p>
          {recado.text}
          {recado.smile ? ` ${recado.smile}` : ""}
          {recado.gifts.length ? <span className="smile">{` ${recado.gifts.join("")}`}</span> : null}
        </p>
        {recado.replies.length ? (
          <div className="replies">
            {recado.replies.map((reply) => (
              <span key={reply.id}><b>{reply.from}</b> {reply.text}</span>
            ))}
          </div>
        ) : null}
        <div className="acts">
          <EffBtn size="sm" onClick={() => fx5.giveStars(recado.from)}>★ 5 STARS</EffBtn>
          <EffBtn size="sm" onClick={() => fx5.giftTo(recado.from, "👑")}>👑 GIFT</EffBtn>
          <EffBtn size="sm" onClick={() => fx5.smileTo(recado.from, "💅")}>💅 SMILE</EffBtn>
          <EffBtn size="sm" kind="live" onClick={() => fx5.startCall([recado.from])}>📹 CALL</EffBtn>
          <EffBtn size="sm" onClick={() => fx5.openProfile(recado.from)}>PROFILE</EffBtn>
        </div>
      </div>
    </article>
  );
}

function MuroView() {
  const state = useFx5();
  const [text, setText] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const list = useMemo(() => {
    if (state.wallFilter === "fam") return state.wall.filter((item) => item.from !== state.me.nick);
    if (state.wallFilter === "regalos") return state.wall.filter((item) => item.gifts.length > 0);
    if (state.wallFilter === "kiki") return state.wall.filter((item) => item.text.toLowerCase().includes("kiki") || item.text.toLowerCase().includes("call"));
    return state.wall;
  }, [state.wall, state.wallFilter, state.me.nick]);

  const insertSmile = (smile: string) => {
    setText((current) => `${current} ${smile}`.trimStart());
    areaRef.current?.focus();
  };

  const publish = () => { fx5.postRecado(text); setText(""); };

  return (
    <>
      <section className="composer">
        <div className="composer-row">
          <Ava nick={state.me.nick} online className="is-a" />
          <span className="eyebrow">POST TO YOUR WALL · SHOWS ON YOUR PROFILE 🍁</span>
        </div>
        <textarea
          ref={areaRef}
          value={text}
          placeholder="what's the vibe? who you wanna call?"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) publish(); }}
        />
        <div className="smiles">
          {SMILES.map((smile) => (
            <button key={smile} type="button" onClick={() => insertSmile(smile)}>{smile}</button>
          ))}
        </div>
        <div className="composer-row">
          {(["todos", "fam", "regalos", "kiki"] as WallFilter[]).map((filter) => (
            <button key={filter} type="button" className={`chip ${state.wallFilter === filter ? "is-on" : ""}`} onClick={() => fx5.setWallFilter(filter)}>
              {filter === "todos" ? "ALL" : filter === "fam" ? "FAM ONLY" : filter === "regalos" ? "WITH GIFTS" : "KIKI / CALLS"}
            </button>
          ))}
          <EffBtn kind="primary" onClick={publish}>POST 🍁</EffBtn>
        </div>
      </section>

      <section className="card">
        <div className="recados">
          {list.length ? list.map((recado) => <RecadoCard key={recado.id} recado={recado} />) : <span className="eyebrow">YOUR WALL IS EMPTY · POST SOMETHING</span>}
        </div>
      </section>
    </>
  );
}

function PersonCard({ person }: { person: Person }) {
  const state = useFx5();
  const online = Boolean(state.online[person.nick]);
  const inCall = state.call.participants.includes(person.nick) && state.call.status !== "idle";
  const inTop5 = state.top5.includes(person.nick);

  return (
    <article className="person">
      <div className="cam-tile" style={{ ["--tint" as string]: `hsla(${hueOf(person.nick)},72%,55%,.22)` }}>
        <div className="sim"><i /><b /></div>
        <Ava nick={person.nick} size="md" className="is-a is-center" />
        <div className="who">
          <span className={online ? "on" : ""}>{online ? "🎙 AVAILABLE" : "LAST SEEN TODAY"}</span>
          <span>{`${person.fama.toFixed(1)} ★`}</span>
        </div>
        {online ? <div className="bars"><i /><i /><i /><i /></div> : null}
      </div>

      <div className="row">
        <Ava nick={person.nick} online={online} incall={inCall} />
        <div>
          <strong>{`${person.nombre} · ${person.edad}`}</strong>
          <small>{`${person.nick} · ${person.flag} ${person.ciudad}, ${person.prov} · ${person.identidad}`}</small>
        </div>
      </div>

      <div className="meta">
        <span className={`badge ${inCall ? "incall" : online ? "on" : ""}`}>{inCall ? "IN CALL" : online ? "ONLINE" : "AWAY"}</span>
        <span>{`${person.votos} votes`}</span>
        <Stars value={person.fama} />
        <span className="pnp-badge">{PNP_LABEL[person.pnp]}</span>
      </div>

      <p className="bio">{person.bio}</p>

      <div className="interests">
        {person.intereses.map((interest) => (<span key={interest}>{interest}</span>))}
      </div>

      <div className="acts">
        <EffBtn kind="live" onClick={() => fx5.startCall([person.nick])}>📹 CALL</EffBtn>
        <EffBtn size="sm" title="Poke" onClick={() => fx5.poke(person.nick)}>👋</EffBtn>
        <EffBtn size="sm" title="5 stars" onClick={() => fx5.giveStars(person.nick)}>★</EffBtn>
        <EffBtn size="sm" kind={inTop5 ? "primary" : undefined} onClick={() => fx5.toggleTop5(person.nick)}>
          {inTop5 ? "IN MY 5" : "＋ TOP 5"}
        </EffBtn>
        <EffBtn size="sm" onClick={() => fx5.openProfile(person.nick)}>PROFILE</EffBtn>
      </div>
    </article>
  );
}

function GenteView() {
  const state = useFx5();

  const list = useMemo(() => {
    const query = state.query.trim().toLowerCase();
    const filtered = state.people.filter((person) => {
      if (state.peopleFilter === "online" && !state.online[person.nick]) return false;
      if (state.peopleFilter === "cam" && !person.cam) return false;
      if (state.peopleFilter === "incall" && !(state.call.participants.includes(person.nick) && state.call.status !== "idle")) return false;
      if (state.peopleFilter === "pnp" && !(person.pnp === "party" || person.pnp === "curious" || person.pnp === "harm-reduction")) return false;
      if (state.peopleFilter === "sober" && person.pnp !== "sober") return false;
      if (!query) return true;
      return `${person.nombre} ${person.nick} ${person.ciudad} ${person.prov} ${person.signo} ${person.identidad} ${person.intereses.join(" ")}`.toLowerCase().includes(query);
    });
    return filtered.sort((a, b) =>
      state.peopleFilter === "fama" ? b.fama - a.fama : Number(Boolean(state.online[b.nick])) - Number(Boolean(state.online[a.nick])) || b.fama - a.fama,
    );
  }, [state.people, state.online, state.peopleFilter, state.query, state.call.participants, state.call.status]);

  return (
    <>
      <section className="card">
        <div className="filters">
          <input className="fx5-input" value={state.query} placeholder="search name, nick, city, province, vibe…" onChange={(event) => fx5.setQuery(event.target.value)} />
          {(
            [
              ["todos", "ALL"],
              ["online", "ONLINE"],
              ["cam", "CAM ON"],
              ["incall", "IN CALL"],
              ["fama", "TOP FAMA"],
              ["pnp", "PNP / HR"],
              ["sober", "SOBER"],
            ] as Array<[PeopleFilter, string]>
          ).map(([id, label]) => (
            <button key={id} type="button" className={`chip ${state.peopleFilter === id ? "is-on" : ""}`} onClick={() => fx5.setPeopleFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </section>
      <div className="people">
        {list.length ? list.map((person) => <PersonCard key={person.nick} person={person} />) : <span className="eyebrow">NOBODY MATCHES · TRY ANOTHER FILTER</span>}
      </div>
    </>
  );
}

function SalasView() {
  const state = useFx5();

  const roomMembers = useMemo(() => {
    const pool = state.people.filter((person) => state.online[person.nick]);
    const source = pool.length >= 6 ? pool : state.people;
    const offline = source.filter((person) => !state.online[person.nick]).slice(0, 2);
    return [...source.slice(0, 4), ...offline].map((person) => person.nick);
  }, [state.people, state.online]);

  const rondaLista = state.top5.filter((nick) => state.online[nick]);

  return (
    <>
      <section className="card">
        <h2>THE ROUND OF 5 <em>GROUP CALL WITH YOUR FAVES</em></h2>
        <div className="seats">
          {[0, 1, 2, 3, 4].map((slot) => {
            const nick = state.top5[slot];
            const person = nick ? fx5.person(nick) : null;
            return (
              <div key={slot} className={`seat ${nick ? "filled" : ""}`}>
                {nick ? (
                  <>
                    <Ava nick={nick} className="is-a" />
                    <small>{person ? firstName(person.nombre) : nick}</small>
                    <small className={`badge ${state.online[nick] ? "on" : ""}`}>{state.online[nick] ? "ONLINE" : "AWAY"}</small>
                  </>
                ) : (<><span style={{ fontSize: 16 }}>＋</span><small>OPEN</small></>)}
              </div>
            );
          })}
        </div>
        <div className="acts">
          <EffBtn kind="primary" onClick={() => {
            if (!rondaLista.length) { fx5.toast("YOUR 5 AREN'T ONLINE · CALL ANYONE"); fx5.setTab("gente"); return; }
            fx5.startCall(rondaLista);
          }}>🎥 START THE ROUND</EffBtn>
          <EffBtn onClick={() => fx5.fillTop5()}>FILL FROM ONLINE</EffBtn>
        </div>
      </section>

      <section className="rooms">
        {ROOMS.map((room) => (
          <article key={room.id} className={`room is-live ${room.id === "pnp-safe" ? "is-hr" : ""}`}>
            <header>
              <strong>{room.nombre}</strong>
              <span className="badge on">{room.tag}</span>
            </header>
            <p className="desc">{room.desc}</p>
            <div className="seats">
              {roomMembers.slice(0, 5).map((nick) => (
                <div key={`${room.id}-${nick}`} className="seat filled">
                  <Ava nick={nick} className="is-a" />
                  <small>{firstName(fx5.person(nick)?.nombre || nick)}</small>
                </div>
              ))}
            </div>
            <div className="acts">
              <EffBtn kind="live" onClick={() => {
                const gente = shuffle(state.people.filter((person) => state.online[person.nick])).slice(0, rint(2, 4)).map((person) => person.nick);
                fx5.startCall(gente.length ? gente : [pick(state.people).nick]);
                fx5.toast(`JOINED ${room.nombre}`);
              }}>🎥 JOIN CALL</EffBtn>
              <EffBtn size="sm" onClick={() => { fx5.setPeopleFilter("online"); fx5.setTab("gente"); }}>SEE PEOPLE</EffBtn>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function ProfileSlots({ nicks, caption }: { nicks: string[]; caption?: string }) {
  return (
    <>
      <div className="top5">
        {[0, 1, 2, 3, 4].map((slot) => {
          const nick = nicks[slot];
          const person = nick ? fx5.person(nick) : null;
          return (
            <div key={slot} className={`slot ${nick ? "filled" : ""}`}>
              <b>{slot + 1}</b>
              {nick ? (
                <><Ava nick={nick} className="is-a" /><small>{person ? firstName(person.nombre) : nick}</small></>
              ) : (<><span style={{ fontSize: 16 }}>＋</span><small>OPEN</small></>)}
            </div>
          );
        })}
      </div>
      {caption ? <span className="eyebrow">{caption}</span> : null}
    </>
  );
}

function MyProfileView() {
  const state = useFx5();
  const mios = state.wall.filter((item) => item.from === state.me.nick);
  const giftCounts = useMemo(() => {
    const map: Record<string, number> = {};
    GIFTS.forEach((gift) => { map[gift.emoji] = rint(2, 60); });
    return map;
  }, []);

  return (
    <>
      <section className="profile-hero">
        <div className="head">
          <Ava nick={state.me.nick} size="lg" online className="is-a" />
          <div>
            <strong>{state.me.nombre}</strong>
            <small>{`${state.me.nick} · ${state.me.edad} · ${state.me.flag} ${state.me.ciudad}, ${state.me.prov} · ${state.me.identidad}`}</small>
            <Stars value={state.me.fama} votos={state.me.votos} />
            <small className="mood">{`MOOD: ${state.me.mood.toUpperCase()}`}</small>
            <small className="pnp-badge">{PNP_LABEL[state.me.pnp]}</small>
          </div>
          <div className="head-acts">
            <EffBtn kind="primary" onClick={() => { fx5.setTab("muro"); fx5.toast("WRITE YOUR POST ON THE WALL"); }}>✍ POST</EffBtn>
            <EffBtn kind="live" onClick={() => fx5.enableRealCam()}>🎥 TEST MY CAM</EffBtn>
            <EffBtn onClick={() => fx5.startCall([pick(fx5.onlineBots()).nick])}>📹 SURPRISE CALL</EffBtn>
            <EffBtn onClick={() => {
              const link = `${window.location.origin}${window.location.pathname}`;
              if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(link).catch(() => {});
              fx5.toast("PROFILE LINK COPIED 🍁");
            }}>🔗 COPY PROFILE</EffBtn>
          </div>
        </div>
        <div className="me-stats" style={{ maxWidth: 420 }}>
          <div className="me-stat"><span>FRIENDS</span><strong>{state.me.amigues}</strong></div>
          <div className="me-stat"><span>VISITS</span><strong>{state.me.visitas}</strong></div>
          <div className="me-stat"><span>GIFTS</span><strong>{state.me.regalos}</strong></div>
        </div>
      </section>

      <div className="profile-grid">
        <section className="card">
          <h2>MY TOP 5 <em>{`${state.top5.length}/5`}</em></h2>
          <ProfileSlots nicks={state.top5} caption="TAP A SLOT TO CHANGE IT" />
          <div className="acts">
            <EffBtn size="sm" kind="live" onClick={() => {
              const ready = state.top5.filter((nick) => state.online[nick]);
              if (!ready.length) { fx5.toast("YOUR 5 AREN'T ONLINE"); return; }
              fx5.startCall(ready);
            }}>🎥 CALL MY 5</EffBtn>
            <EffBtn size="sm" onClick={() => fx5.fillTop5()}>AUTO-FILL</EffBtn>
          </div>
        </section>

        <section className="card">
          <h2>MY POSTS <em>{mios.length}</em></h2>
          {mios.length ? (
            mios.slice(0, 4).map((item) => (
              <p key={item.id} className="mio">
                {item.text}{item.smile ? ` ${item.smile}` : ""} <small>{`· ${clock(item.at)}${item.replies.length ? ` · ${item.replies.length} replies` : ""}`}</small>
              </p>
            ))
          ) : (<span className="eyebrow">YOU HAVEN'T POSTED YET</span>)}
        </section>

        <section className="card">
          <h2>GIFTS RECEIVED <em>{`${state.me.regalos} TOTAL`}</em></h2>
          <div className="gifts">
            {GIFTS.map((gift) => (
              <div key={gift.emoji} className="gift-cell">{gift.emoji}<small>{giftCounts[gift.emoji]}</small></div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>TESTIMONIALS FROM MY FRIENDS <em>MY NETWORK'S FAMA</em></h2>
          <div className="testi">
            {shuffle(state.people).slice(0, 3).map((person) => (
              <article key={person.nick}><b>{person.nick}</b><p>{pick(MIS_TESTIMONIOS)}</p></article>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>PNP STATUS <em>MY CHOICE, MY RULES</em></h2>
          <div className="pnp-picker">
            {(
              [
                ["no", "🚫 NOT INTO PNP"],
                ["party", "🎉 PARTY"],
                ["sober", "✨ SOBER"],
                ["curious", "❓ CURIOUS"],
                ["harm-reduction", "🧪 HR-FIRST"],
              ] as Array<[Person["pnp"], string]>
            ).map(([id, label]) => (
              <button key={id} type="button" className={`chip ${state.me.pnp === id ? "is-on" : ""}`} onClick={() => fx5.setPnp(id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="eyebrow" style={{ marginTop: 10, lineHeight: 1.6 }}>
            whatever you choose, your body, your rules. if you party: hydrate, test, buddy system. resources at <b>CATIE.ca</b> 🧪
          </p>
        </section>
      </div>
    </>
  );
}

function PersonProfileView({ nick }: { nick: string }) {
  const state = useFx5();
  const person = fx5.person(nick);
  const others = useMemo(() => shuffle(state.people.filter((item) => item.nick !== nick)).slice(0, 5).map((item) => item.nick), [state.people, nick]);
  const testimonios = useMemo(() => shuffle(state.people.filter((item) => item.nick !== nick)).slice(0, 3), [state.people, nick]);
  const giftCounts = useMemo(() => {
    const map: Record<string, number> = {};
    GIFTS.forEach((gift) => { map[gift.emoji] = rint(1, 40) + gift.fama * 3; });
    return map;
  }, []);

  if (!person) return null;
  const online = Boolean(state.online[nick]);

  return (
    <>
      <section className="profile-hero">
        <div className="head">
          <Ava nick={nick} size="lg" online={online} className="is-a" />
          <div>
            <strong>{person.nombre}</strong>
            <small>{`${person.nick} · ${person.edad} · ${person.flag} ${person.ciudad}, ${person.prov} · ${person.identidad}`}</small>
            <Stars value={person.fama} votos={person.votos} />
            <small className="pnp-badge">{PNP_LABEL[person.pnp]}</small>
          </div>
          <div className="head-acts">
            <EffBtn kind="primary" onClick={() => fx5.startCall([nick])}>📹 CALL NOW</EffBtn>
            <EffBtn kind="live" onClick={() => fx5.inviteToCall(nick)}>＋ INVITE TO MY CALL</EffBtn>
            <EffBtn onClick={() => fx5.poke(nick)}>👋 POKE</EffBtn>
            <EffBtn onClick={() => fx5.giveStars(nick)}>★ 5 STARS</EffBtn>
          </div>
        </div>
        <p className="bio">{person.bio}</p>
        <div className="interests">
          {person.intereses.map((interest) => (<span key={interest}>{interest}</span>))}
        </div>
      </section>

      <div className="profile-grid">
        <section className="card">
          <h2>{firstName(person.nombre).toUpperCase()}'S TOP 5 <em>FAVES ON THEIR PROFILE</em></h2>
          <ProfileSlots nicks={others} />
          <div className="acts">
            <EffBtn size="sm" kind="live" onClick={() => {
              const gente = shuffle(state.people.filter((item) => state.online[item.nick])).slice(0, 3).map((item) => item.nick);
              fx5.startCall(gente.length ? gente : [nick]);
            }}>🎥 GROUP CALL</EffBtn>
            <EffBtn size="sm" onClick={() => { fx5.setPeopleFilter("online"); fx5.setTab("gente"); }}>FIND SIMILAR FOLKS</EffBtn>
          </div>
        </section>

        <section className="card">
          <h2>GIFTS THEY'VE RECEIVED <em>{`${person.regalos} GIFTS`}</em></h2>
          <div className="gifts">
            {GIFTS.map((gift) => (
              <button key={gift.emoji} type="button" className="gift-cell" title={`Send ${gift.label}`} onClick={() => fx5.giftTo(nick, gift.emoji)}>
                {gift.emoji}<small>{giftCounts[gift.emoji]}</small>
              </button>
            ))}
          </div>
          <p className="eyebrow">TAP A GIFT TO SEND IT. IF YOU'RE IN A CALL IT FLOATS ON SCREEN.</p>
        </section>

        <section className="card">
          <h2>TESTIMONIALS <em>WHAT PEOPLE SAY ABOUT {firstName(person.nombre).toUpperCase()}</em></h2>
          <div className="testi">
            {testimonios.map((other) => (
              <article key={other.nick}><b>{other.nick}</b><p>{pick(TEMOIGNAGES)}</p></article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function PerfilView() {
  const state = useFx5();
  if (!state.openProfile) {
    return (
      <section className="card">
        <h2>OPEN PROFILE</h2>
        <p className="eyebrow" style={{ lineHeight: 1.6 }}>
          Pick someone from PEOPLE, the WALL or WHO VISITED YOU and see their full profile: top 5, gifts, testimonials, and the call button — without hanging up your current call.
        </p>
      </section>
    );
  }
  return state.openProfile === state.me.nick ? <MyProfileView /> : <PersonProfileView nick={state.openProfile} />;
}

/* ═══════════════════════════ 10 · LLAMADA UI ═══════════════════════════ */

function MyVideo({ mirrored }: { mirrored?: boolean }) {
  const state = useFx5();
  const [node, setNode] = useState<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!node) return;
    return fx5.attachMyVideo(node);
  }, [node]);
  const visible = state.call.hasVideo && state.call.camOn;
  return <video ref={setNode} playsInline autoPlay muted className={visible ? "is-visible" : ""} style={{ transform: mirrored ? "scaleX(-1)" : undefined }} />;
}

function CallDock() {
  const state = useFx5();
  const call = state.call;
  useCallClock(call.status === "live");
  const onlineFriends = useMemo(() => shuffle(state.people.filter((person) => state.online[person.nick])).slice(0, 5), [state.people, state.online]);

  if (call.status === "idle") {
    return (
      <section className="call-dock">
        <div className="head">
          <h2>VIDEO CALL</h2>
          <span className="badge">NO CALL</span>
        </div>
        <p className="eyebrow">CALL A FRIEND, MINIMIZE IT IN THE CORNER AND KEEP BROWSING. THE CALL DOESN'T DROP.</p>
        <div className="call-people">
          {onlineFriends.map((person) => (
            <div key={person.nick} className="call-person">
              <Ava nick={person.nick} online />
              <div>
                <strong>{person.nombre}</strong>
                <small>{`${person.flag} ${person.ciudad} · online now`}</small>
              </div>
              <EffBtn size="sm" kind="live" title={`Call ${person.nick}`} onClick={() => fx5.startCall([person.nick])}>📹</EffBtn>
            </div>
          ))}
        </div>
        <div className="fx5-actions">
          <EffBtn onClick={() => fx5.startCall([pick(fx5.onlineBots()).nick])}>📹 SURPRISE CALL</EffBtn>
          <EffBtn onClick={() => fx5.enableRealCam()}>🎥 TEST MY CAM</EffBtn>
        </div>
      </section>
    );
  }

  const tiles = [state.me.nick, ...call.participants].slice(0, 2);

  return (
    <section className={`call-dock ${call.status === "live" ? "is-live" : ""}`}>
      <div className="head">
        <h2>{call.status === "ringing" ? "RINGING..." : "IN CALL"}</h2>
        <strong>{call.status === "ringing" ? "◌◌◌" : mmss(fx5.elapsed())}</strong>
      </div>

      <div className="call-mini">
        {tiles.map((nick) =>
          nick === state.me.nick ? (
            <CamTile key={nick} nick={nick} label={`YOU · ${state.me.identidad}`} muted={call.muted} tag="ME" badge="incall">
              <MyVideo mirrored />
            </CamTile>
          ) : (
            <CamTile key={nick} nick={nick} label={nick} tag="CALL" badge="on" footer={<span>HD</span>} />
          ),
        )}
      </div>

      <div className="call-people">
        {call.participants.map((nick) => {
          const person = fx5.person(nick);
          return (
            <div key={nick} className="call-person">
              <Ava nick={nick} className="is-a" />
              <div>
                <strong>{nick}</strong>
                <small>{`${person ? `${person.flag} ${person.prov} · ` : ""}IN CALL`}</small>
              </div>
              <span className="tools">
                <EffBtn size="sm" title="Remove from call" onClick={() => fx5.removeParticipant(nick)}>✕</EffBtn>
              </span>
            </div>
          );
        })}
      </div>

      <div className="call-ctrl">
        <button type="button" className={call.muted ? "off" : "is-on"} title="Mic" onClick={() => fx5.toggleMic()}>{call.muted ? "🔇" : "🎙"}</button>
        <button type="button" className={call.camOn ? "is-on" : "off"} title="Cam" onClick={() => fx5.toggleCam()}>{call.camOn ? "📷" : "🚫"}</button>
        <button type="button" title="FX" onClick={() => fx5.cycleFx()}>{`✨ ${call.fx === "none" ? "FX" : call.fx.toUpperCase()}`}</button>
        <button type="button" title="Fullscreen" onClick={() => fx5.openStage()}>⛶</button>
      </div>

      <div className="fx5-actions">
        <EffBtn kind="live" onClick={() => fx5.openStage()}>⛶ EXPAND CALL</EffBtn>
        <EffBtn kind="danger" onClick={() => fx5.endCall()}>📵 HANG UP</EffBtn>
      </div>
    </section>
  );
}

function CallStage() {
  const state = useFx5();
  const call = state.call;
  useCallClock(call.status === "live");
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = chatRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [call.chat.length]);

  const tiles = [state.me.nick, ...call.participants];
  const invitables = useMemo(
    () => shuffle(state.people.filter((person) => state.online[person.nick] && !call.participants.includes(person.nick))).slice(0, 6),
    [state.people, state.online, call.participants],
  );

  const send = () => { fx5.sendCallText(draft); setDraft(""); };

  return (
    <div className={`call-stage fx-${call.fx}`}>
      <div className="head">
        <div className="lead">
          <strong>{call.status === "ringing" ? "RINGING..." : `IN CALL · ${mmss(fx5.elapsed())}`}</strong>
          <small>{`${tiles.length} PEOPLE · MINIMIZE AND KEEP BROWSING`}</small>
        </div>
        <div className="right">
          <EffBtn size="sm" onClick={() => fx5.closeStage()}>🗕 MINIMIZE</EffBtn>
          <EffBtn size="sm" kind="live" onClick={() => fx5.toggleInvite()}>＋ INVITE</EffBtn>
          <EffBtn size="sm" kind="danger" onClick={() => fx5.endCall()}>📵 HANG UP</EffBtn>
        </div>
      </div>

      <div className="grid-wrap">
        <div className={`call-grid n${clamp(tiles.length, 1, 6)}`}>
          {tiles.map((nick) =>
            nick === state.me.nick ? (
              <CamTile key={nick} nick={nick} label={`YOU · ${state.me.identidad}`} muted={call.muted} tag="ME" badge="incall">
                <MyVideo mirrored />
              </CamTile>
            ) : (
              <CamTile key={nick} nick={nick} label={nick} tag="CALL" badge="on" footer={<span>{state.online[nick] ? "HD" : "REC"}</span>} />
            ),
          )}
        </div>

        <div className="call-side">
          <div className="call-chat" ref={chatRef}>
            {call.chat.length ? (
              call.chat.map((message) => (
                <div key={message.id} className={`msg ${message.system ? "is-event" : message.from === state.me.nick ? "is-you" : "is-bot"}`}>
                  <b>{message.from}</b>
                  <p>{message.text}</p>
                </div>
              ))
            ) : (<span className="eyebrow">CALL CHAT</span>)}
          </div>

          <div className="side-bottom">
            {call.inviteOpen ? (
              <div className="invite-list">
                {invitables.length ? (
                  invitables.map((person) => (
                    <div key={person.nick} className="invite-row">
                      <Ava nick={person.nick} />
                      <b>{person.nick}</b>
                      <EffBtn size="sm" kind="live" onClick={() => fx5.inviteToCall(person.nick)}>ADD</EffBtn>
                    </div>
                  ))
                ) : (<span className="eyebrow">NOBODY ELSE ONLINE RN</span>)}
              </div>
            ) : null}

            <div className="composer-row">
              <input
                className="fx5-input"
                value={draft}
                placeholder="type in call chat…"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") send(); }}
              />
              <EffBtn kind="primary" onClick={send} disabled={!draft.trim()}>SEND</EffBtn>
            </div>

            <div className="composer-row">
              {REACTIONS.map((emoji) => (
                <button key={emoji} type="button" className="chip" onClick={() => fx5.reactInCall(emoji)}>{emoji}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="call-bar">
        <button type="button" className={call.muted ? "off" : "is-on"} onClick={() => fx5.toggleMic()}>{call.muted ? "🔇 MIC OFF" : "🎙 MIC ON"}</button>
        <button type="button" className={call.camOn ? "is-on" : "off"} onClick={() => fx5.toggleCam()}>{call.camOn ? "📷 CAM ON" : "🚫 CAM OFF"}</button>
        <button type="button" onClick={() => fx5.enableRealCam()}>🎥 USE REAL CAM</button>
        <button type="button" onClick={() => fx5.cycleFx()}>{`✨ FX: ${call.fx.toUpperCase()}`}</button>
        <button type="button" onClick={() => fx5.giftToCall()}>👑 GIFT TO CALL</button>
        <button type="button" onClick={() => fx5.changeScene()}>🎬 CHANGE SCENE</button>
      </div>
    </div>
  );
}

function RingModal() {
  const state = useFx5();
  const from = state.call.incoming;
  if (!from) return null;
  const person = fx5.person(from);
  return (
    <div className="ring">
      <div className="ring-card">
        <div className="ring-anim"><i /><i /><i /><Ava nick={from} size="lg" className="is-a" /></div>
        <strong>{from}</strong>
        <small>{`INCOMING VIDEO CALL${person ? ` · ${person.flag} ${person.ciudad}, ${person.prov}` : ""}`}</small>
        <div className="acts">
          <EffBtn kind="live" onClick={() => fx5.answerCall()}>📹 ACCEPT</EffBtn>
          <EffBtn kind="danger" onClick={() => fx5.rejectCall(false)}>📵 DECLINE</EffBtn>
        </div>
      </div>
    </div>
  );
}

function Top5Picker() {
  const state = useFx5();
  const slot = state.pickerSlot;
  const list = useMemo(
    () =>
      shuffle(state.people.filter((person) => state.online[person.nick]))
        .concat(shuffle(state.people.filter((person) => !state.online[person.nick])))
        .slice(0, 10),
    [state.people, state.online],
  );
  if (slot === null) return null;
  return (
    <div className="ring" onClick={() => fx5.setPickerSlot(null)}>
      <div className="card picker" onClick={(event) => event.stopPropagation()}>
        <h2>PICK FAVE #{slot + 1} <em>MY TOP 5</em></h2>
        {list.map((person) => (
          <div key={person.nick} className="call-person">
            <Ava nick={person.nick} online={Boolean(state.online[person.nick])} />
            <div>
              <strong>{person.nombre}</strong>
              <small>{`${person.nick} · ${person.flag} ${person.ciudad}, ${person.prov} · ${person.fama.toFixed(1)}★`}</small>
            </div>
            <EffBtn size="sm" kind="primary" onClick={() => fx5.pickFavorite(slot, person.nick)}>PICK</EffBtn>
          </div>
        ))}
        <EffBtn onClick={() => fx5.setPickerSlot(null)}>CANCEL</EffBtn>
      </div>
    </div>
  );
}

/* ═══════════════════════════ 11 · COMPONENTE PRINCIPAL ═══════════════════ */

export type PRFX5Props = {
  nick?: string;
  initialTab?: Tab;
  className?: string;
};

export default function PRFX5({
  const [privateRoomMood, setPrivateRoomMood] = useState<PrivateRoomMood>(() => readPrivateRoomMood());
  useEffect(() => { writePrivateRoomMood(privateRoomMood); }, [privateRoomMood]); nick = "@User18Ca", initialTab = "muro", className = "" }: PRFX5Props) {
  useFx5Bootstrap();
  const state = useFx5();
  const call = state.call;
  useCallClock(call.status === "live");
  const [mood, setMood] = useState(state.me.mood);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (nick !== state.me.nick) fx5.setMe({ nick });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nick]);

  useEffect(() => {
    if (initialTab !== state.tab) fx5.setTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  useEffect(() => { setMood(state.me.mood); }, [state.me.mood]);

  const famaRed = useMemo(() => {
    const people = state.people;
    const total = people.reduce((sum, person) => sum + person.fama * person.votos, 0);
    const votos = people.reduce((sum, person) => sum + person.votos, 0);
    return votos ? total / votos : 0;
  }, [state.people]);

  const misRecados = state.wall.filter((item) => item.from === state.me.nick).length;
  const enLinea = state.people.filter((person) => state.online[person.nick]).length;

  const tabs: Array<[Tab, string, number | null]> = [
    ["muro", "WALL", state.wall.length],
    ["gente", "PEOPLE", state.people.length],
    ["salas", "ROOMS", ROOMS.length],
    ["perfil", "OPEN PROFILE", null],
  ];

  const visibleVisitors = useMemo(
    () =>
      state.visitors
        .slice(0, MAX_VISITORS_PREVIEW)
        .map((visit) => ({ visit, person: fx5.person(visit.nick) }))
        .filter((entry): entry is { visit: Visit; person: Person } => Boolean(entry.person)),
    [state.visitors],
  );

  const visibleNotifs = useMemo(() => state.notifs.slice(0, MAX_NOTIFS), [state.notifs]);
  const visibleHistory = useMemo(() => state.history.slice(0, MAX_HISTORY), [state.history]);

  const giftTarget = fx5.giftTarget();

  if (!mounted) {
    return <div className={`fx5 ${className}`.trim()} aria-hidden="true" />;
  }

  return (
    <div className={`fx5 ${className}`.trim()} data-skin={state.me.skin} data-scene={call.scene}>
      <div className="fx5-mood-switch" role="group" aria-label="Private Room visual mood">
        {PRIVATE_ROOM_MOODS.map((option) => (
          <button key={option} type="button" className={privateRoomMood === option ? "is-active" : ""} onClick={() => setPrivateRoomMood(option)}>
{option.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="fx5-scan" aria-hidden="true" />
      <div className="fx5-grid" aria-hidden="true" />
      <div className="fx5-fx" aria-hidden="true">
        {state.floats.map((float) => (
          <span key={float.id} className="fx5-float" style={{ left: `${float.left}%`, fontSize: float.size, animationDuration: `${float.dur}s` }}>
            {float.emoji}
          </span>
        ))}
      </div>
      {state.toasts.map((item) => (
        <div key={item.id} className="toast" role="status">{item.text}</div>
      ))}

      <header className="fx5-top">
        <div className="fx5-logo">
          <b>🍁</b>
          <div>
            <strong>FX5 · ARCADE · CA 🏳️‍🌈</strong>
            <small>QUEER CANADIAN NETWORK · PNP-AWARE</small>
          </div>
        </div>

        <span className={`fx5-pill ${call.status === "live" ? "is-live" : call.status === "ringing" ? "is-ring" : ""}`} data-role="call-pill">
          {call.status === "live"
            ? `● IN CALL · ${mmss(fx5.elapsed())} · ${call.participants.length + 1} PEOPLE`
            : call.status === "ringing"
              ? "◌ RINGING..."
              : "○ NO CALL"}
        </span>
        <span className="fx5-pill is-live"><i /><b>{enLinea}</b> FRIENDS ONLINE</span>

        <div className="fx5-metrics">
          <Metric label="FAMA" value={state.me.fama.toFixed(1)} tone="a" />
          <Metric label="FRIENDS" value={state.me.amigues} />
          <Metric label="VISITS" value={state.me.visitas} />
          <Metric label="GIFTS" value={state.me.regalos} tone="green" />
        </div>

        <div className="fx5-actions">
          <EffBtn kind="primary" onClick={() => fx5.startCall([pick(fx5.onlineBots()).nick])}>📹 CALL SOMEONE</EffBtn>
          <EffBtn onClick={() => fx5.toggleSound()} title="App sound">{state.sound ? "🔊 SOUND" : "🔇 MUTED"}</EffBtn>
          <EffBtn onClick={() => fx5.openProfile(state.me.nick)}>👤 MY PROFILE</EffBtn>
        </div>
      </header>

      <main>
        <div className="col col-left">
          <section className="card me-card">
            <div className="me-head">
              <Ava nick={state.me.nick} size="lg" online className="is-a" />
              <div>
                <strong>{state.me.nick}</strong>
                <span>{`${state.me.edad} · ${state.me.ciudad}, ${state.me.prov} ${state.me.flag} · ${state.me.identidad}`}</span>
                <Stars value={state.me.fama} votos={state.me.votos} />
              </div>
            </div>
            <div className="me-mood">
              <select className="fx5-input" value={mood} aria-label="My mood" onChange={(event) => fx5.setMood(event.target.value)}>
                {MOODS.map((option) => (<option key={option} value={option}>{option}</option>))}
              </select>
              <EffBtn size="sm" onClick={() => fx5.openProfile(state.me.nick)}>VIEW</EffBtn>
            </div>
            <div className="me-stats">
              <div className="me-stat"><span>CALLS</span><strong>{state.me.calls}</strong></div>
              <div className="me-stat"><span>POSTS</span><strong>{misRecados}</strong></div>
              <div className="me-stat"><span>POKES</span><strong>{state.me.pokes}</strong></div>
            </div>
            <div className="skins-block">
              <span className="eyebrow">PROFILE THEME 🏳️‍🌈</span>
              <div className="skins">
                {SKINS.map((skin) => (
                  <button
                    key={skin.id}
                    type="button"
                    className={`skin ${state.me.skin === skin.id ? "is-on" : ""}`}
                    style={{ background: skin.css }}
                    title={skin.label}
                    aria-label={skin.label}
                    aria-pressed={state.me.skin === skin.id}
                    onClick={() => fx5.setSkin(skin.id)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <h2>MY TOP 5 <em>{`${state.top5.length}/5`}</em></h2>
            <div className="top5">
              {[0, 1, 2, 3, 4].map((slot) => {
                const nick5 = state.top5[slot];
                const person = nick5 ? fx5.person(nick5) : null;
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`slot ${nick5 ? "filled" : ""}`}
                    onClick={() => (nick5 ? fx5.toggleTop5(nick5) : fx5.setPickerSlot(slot))}
                    title={nick5 ? `Remove ${nick5} from your 5` : "Pick a fave"}>
                    <b>{slot + 1}</b>
                    {nick5 ? (
                      <><Ava nick={nick5} className="is-a" /><small>{person ? firstName(person.nombre) : nick5}</small></>
                    ) : (<><span style={{ fontSize: 17 }}>＋</span><small>OPEN</small></>)}
                  </button>
                );
              })}
            </div>
            <p className="eyebrow">YOUR 5 SHOW ON YOUR PROFILE AND ENTER THE ROUND OF 5.</p>
            <div className="fx5-actions">
              <EffBtn size="sm" kind="live" onClick={() => {
                const ready = state.top5.filter((item) => state.online[item]);
                if (!ready.length) { fx5.toast("YOUR 5 AREN'T ONLINE · CALL ANYONE"); fx5.setTab("gente"); return; }
                fx5.startCall(ready);
              }}>🎥 CALL MY 5</EffBtn>
              <EffBtn size="sm" onClick={() => fx5.clearTop5()}>CLEAR</EffBtn>
            </div>
          </section>

          <section className="card">
            <h2>WHO VISITED YOU <em>{state.visitors.length}</em></h2>
            <div className="call-people">
              {visibleVisitors.map(({ visit, person }) => (
                <VisitorRow
                  key={visit.id}
                  visit={visit}
                  person={person}
                  isOnline={Boolean(state.online[person.nick])}
                  onOpenProfile={fx5.openProfile}
                  onCall={fx5.startCall}
                />
              ))}
              {!state.visitors.length ? <span className="eyebrow">NOBODY YET · POST TO BE SEEN</span> : null}
            </div>
          </section>
        </div>

        <div className="col">
          <section className="card">
            <h2>THE NETWORK <em>EVERYTHING HAPPENS WITHOUT HANGING UP</em></h2>
            <nav className="tabs" role="tablist">
              {tabs.map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  className={state.tab === id ? "is-on" : ""}
                  aria-selected={state.tab === id}
                  onClick={() => fx5.setTab(id)}>
                  {label}
                  {count !== null ? <em>{count}</em> : null}
                </button>
              ))}
            </nav>
          </section>

          {state.tab === "muro" ? <MuroView /> : null}
          {state.tab === "gente" ? <GenteView /> : null}
          {state.tab === "salas" ? <SalasView /> : null}
          {state.tab === "perfil" ? <PerfilView /> : null}
        </div>

        <div className="col">
          <CallDock />

          <section className="card">
            <h2>SEND A GIFT <em>BOOSTS FAMA</em></h2>
            <p className="eyebrow">
              SENDING TO <b>{giftTarget}</b>{" "}
              <button type="button" className="chip" onClick={() => fx5.cycleGiftTarget()} aria-label="Change gift target">CHANGE TARGET</button>
            </p>
            <GiftGrid target={giftTarget} onSend={fx5.giftTo} />
            <p className="eyebrow">IN HI5 WE SENT STARS AND BEARS… HERE THEY FLOAT ON VIDEO CALLS TOO.</p>
          </section>

          <section className="card">
            <h2>ACTIVITY <em>{state.notifs.length}</em></h2>
            <div className="notif" role="list">
              {visibleNotifs.map((item) => (<NotifItem key={item.id} item={item} />))}
              {!state.notifs.length ? <span className="eyebrow">NO ACTIVITY YET</span> : null}
            </div>
          </section>

          <section className="card">
            <h2>CALL HISTORY <em>{state.history.length}</em></h2>
            <div className="notif" role="list">
              {visibleHistory.map((log) => (<HistoryItem key={log.id} log={log} />))}
              {!state.history.length ? <span className="eyebrow">NO CALLS YET · CALL SOMEONE</span> : null}
            </div>
          </section>

          <section className="card hr-card">
            <h2>SAFE SPACE 🧪 <em>HARM REDUCTION</em></h2>
            <ul className="hr-list">
              <li>💧 <b>Hydrate</b> — water between everything</li>
              <li>🧪 <b>Test your stuff</b> — free kits via CATIE.ca</li>
              <li>👯 <b>Buddy system</b> — never party alone</li>
              <li>📵 <b>Know when to stop</b> — no shame in going home</li>
              <li>💖 <b>Consent always</b> — every time, every body</li>
            </ul>
            <p className="eyebrow">If you need help: <b>988</b> (CA Suicide Crisis) · <b>1-800-668-6868</b> (Kids Help) · <b>CATIE.ca</b></p>
          </section>
        </div>
      </main>

      <footer className="fx5-foot">
        FX5 · arcade queer canadian network 🍁🏳️‍🌈 · persistent video calls, profiles, wall, gifts, 5 stars, testimonials and TOP 5. Average network fama: {famaRed.toFixed(2)} ·{" "}
        {PEOPLE.length} folks in the directory. People calling and commenting are simulated (bots) so you can see how it feels with your real community. PnP-aware with harm reduction first.
      </footer>

      {call.status !== "idle" && state.stageOpen ? <CallStage /> : null}
      {call.status === "ringing" && call.incoming ? <RingModal /> : null}
      {state.pickerSlot !== null ? <Top5Picker /> : null}
    </div>
  );
}

/* ═══════════════════════════ 12 · SUBCOMPONENTES MEMOIZADOS ═══════════ */

const VisitorRow = memo(function VisitorRow({
  visit, person, isOnline, onOpenProfile, onCall,
}: {
  visit: Visit;
  person: Person;
  isOnline: boolean;
  onOpenProfile: (nick: string) => void;
  onCall: (nicks: string[]) => void;
}) {
  return (
    <div className="call-person">
      <Ava nick={person.nick} online={isOnline} />
      <div>
        <strong>{person.nombre}</strong>
        <small>{`visited your profile · ${clock(visit.at)}`}</small>
      </div>
      <span className="tools">
        <EffBtn size="sm" onClick={() => onOpenProfile(person.nick)} aria-label={`View ${person.nombre}'s profile`}>VIEW</EffBtn>
        <EffBtn size="sm" kind="live" onClick={() => onCall([person.nick])} aria-label={`Video call ${person.nombre}`}>📹</EffBtn>
      </span>
    </div>
  );
});

const NotifItem = memo(function NotifItem({ item }: { item: Notif }) {
  return (
    <article className={`is-${item.kind}`} role="listitem">
      <i aria-hidden="true" />
      <div><b>{item.who}</b> <span>{item.text}</span></div>
      <time dateTime={new Date(item.at).toISOString()}>{clock(item.at)}</time>
    </article>
  );
});

const HistoryItem = memo(function HistoryItem({ log }: { log: CallLog }) {
  return (
    <article className={`is-${log.kind === "missed" ? "visit" : "call"}`} role="listitem">
      <i aria-hidden="true" />
      <div><b>{log.who}</b> <span>{getCallLabel(log)}</span></div>
      <time dateTime={new Date(log.at).toISOString()}>{clock(log.at)}</time>
    </article>
  );
});

const GiftGrid = memo(function GiftGrid({ target, onSend }: { target: string; onSend: (nick: string, emoji: string) => void }) {
  return (
    <div className="gift-grid">
      {GIFTS.map((gift) => (
        <button
          key={gift.emoji}
          type="button"
          className="gift-btn"
          title={`Send ${gift.label} to ${target}`}
          aria-label={`Send ${gift.label} to ${target}`}
          onClick={() => onSend(target, gift.emoji)}>
          {gift.emoji}
          <small>{gift.label}</small>
        </button>
      ))}
    </div>
  );
});