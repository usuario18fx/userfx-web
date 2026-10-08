export const BOT_URL = "https://t.me/User18Fx_bot?start=getcode";
export const ENTER_URL = "#/private-room-access";
export const NAV = [
  { id: "home", label: "Home" },
  { id: "spaces", label: "Inside" },
  { id: "protocol", label: "Protocol" },
  { id: "access", label: "Access" },
] as const;
export const HERO = {
  headline: ["Your", "Private", "Vault", "Unlocked"],
  lede: "One identity. Your room. A shared stage. A private collection that opens with your code.",
  cta: "Enter the Vault",
  badge: ["Your", "moment", "Unfiltered"],
} as const;
export const COURSES = [
  {
    id: "myroom",
    name: "MyRoom",
    level: "Your space",
    route: "#/private-room",
    glyph: "camera",
    blurb:
      "Your camera, your guests, your rules. Approve who enters, open chat when you need it and share your moments in the feed.",
    metrics: [
      { value: "01", label: "personal room" },
      { value: "You", label: "control entry" },
    ],
  },
  {
    id: "stage",
    name: "Stage",
    level: "Together",
    route: "#/private-room/stage",
    glyph: "stage",
    blurb:
      "Meet on the shared stage. Switch the spotlight, see who is connected and keep the next event within reach.",
    metrics: [
      { value: "06", label: "camera seats" },
      { value: "Live", label: "shared moments" },
    ],
  },
  {
    id: "gallery",
    name: "Gallery",
    level: "Code protected",
    route: "#/private-room/gallery",
    glyph: "lock",
    blurb:
      "A private collection for each album code. BSIC, PRX0 and VIPX open their matching albums; SPCL identifies you without revealing private photos.",
    metrics: [
      { value: "03", label: "album codes" },
      { value: "Private", label: "matching access" },
    ],
  },
  {
    id: "buzon",
    name: "Buzón",
    level: "Stay connected",
    route: "#/private-room/buzon",
    glyph: "mail",
    blurb:
      "Your invitations in one place. See requests, respond and return to the conversations that matter.",
    metrics: [
      { value: "Your", label: "invitations" },
      { value: "One", label: "identity" },
    ],
  },
] as const;
export const METHOD = [
  {
    step: "01",
    title: "Open the Telegram bot",
    body: "Meet @User18Fx_bot. Verify your identity and explore the available access codes.",
    link: BOT_URL,
    cta: "Open the bot",
  },
  {
    step: "02",
    title: "Choose your access",
    body: "SPCL identifies you. BSIC, PRX0 and VIPX unlock their own album and membership benefits.",
    link: "#access",
    cta: "Compare access",
  },
  {
    step: "03",
    title: "Enter your code",
    body: "Return to the Vault and enter the code from the bot. Verification happens before your private content opens.",
    link: ENTER_URL,
    cta: "Enter a code",
  },
] as const;
export const METRICS = [
  { value: 4, suffix: "", label: "connected spaces" },
  { value: 6, suffix: "", label: "Stage camera seats" },
  { value: 3, suffix: "", label: "private album codes" },
  { value: 1, suffix: "", label: "your identity" },
] as const;
export const TRAINERS = [
  {
    name: "SPCL",
    role: "Identity",
    line: "Your identity access. Rooms open after verification; private albums and paid chat have their own access.",
    emoji: "♛",
  },
  {
    name: "BSIC",
    role: "Basic",
    line: "The Basic collection, linked to its own code. Start with a focused private experience.",
    emoji: "🌹",
  },
  {
    name: "PRX0",
    role: "Pro",
    line: "The Pro collection and paid member chat, with the benefits attached to your verified access.",
    emoji: "🔥",
  },
  {
    name: "VIPX",
    role: "VIP",
    line: "The VIP collection. Your benefits stay linked to your account and their active access window.",
    emoji: "👑",
  },
] as const;
export const PLANS = [
  {
    id: "basic",
    name: "Basic",
    prefix: "BSIC",
    stars: 350,
    window: "12 hours",
    tagline: "Your first private collection.",
    features: ["Matching BSIC album", "Member chat with active access", "Personal access code"],
    cta: "Get Basic",
    featured: false,
    emoji: "🌹",
  },
  {
    id: "pro",
    name: "Pro",
    prefix: "PRX0",
    stars: 750,
    window: "24 hours",
    tagline: "More room for your moment.",
    features: ["Matching PRX0 album", "Member chat with active access", "Personal access code"],
    cta: "Get Pro",
    featured: true,
    emoji: "🔥",
  },
  {
    id: "vip",
    name: "VIP",
    prefix: "VIPX",
    stars: 1500,
    window: "7 days",
    tagline: "The full VIP collection.",
    features: ["Matching VIPX album", "Member chat with active access", "Personal access code"],
    cta: "Get VIP",
    featured: false,
    emoji: "👑",
  },
] as const;
export const FAQS = [
  {
    q: "How do I get a code?",
    a: "Open @User18Fx_bot and choose your access. The bot sends your personal code, which you enter at the Vault gate.",
  },
  {
    q: "Does SPCL open every album?",
    a: "SPCL is identity access. Private albums require their matching BSIC, PRX0 or VIPX code. Your code does not reveal another collection.",
  },
  {
    q: "Can I share my code?",
    a: "Codes are personal. Identity verification and your active session determine which benefits are available to you.",
  },
  {
    q: "What if I do not receive my code?",
    a: "Return to the bot and contact @User18fx with your payment or access details. Never send your password.",
  },
] as const;
export const FOOTER = {
  columns: [
    { title: "Spaces", links: COURSES.map((s) => ({ label: s.name, href: s.route })) },
    {
      title: "Access",
      links: [
        { label: "Get my code", href: BOT_URL },
        { label: "Enter a code", href: ENTER_URL },
        { label: "Compare access", href: "#access" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Questions", href: "#faq" },
        { label: "Contact", href: "https://t.me/User18fx" },
        { label: "Privacy", href: "/privacy" },
      ],
    },
  ],
} as const;
