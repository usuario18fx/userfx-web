export const PLANS = [
  { id: "basic",
    name: "BASIC",
    tab: "FX01-",
    stars: 350,
    days: 7,
    benefits: [
      "🔓 Acceso a la bóveda",
      "📸 Contenido BASIC",
      "🔐 Código personal",
      "⚡ Acceso inmediato",
    ],
  },
  { id: "pro",
    name: "PRO",
    tab: "AX01-",
    stars: 750,
    days: 30,
    benefits: [
      "🔓 Acceso completo",
      "📸 Contenido PRO exclusivo",
      "🎥 Videocall",
      "📺 Canales privados",
      "🔐 Código personal",
      "⚡ Acceso inmediato",
    ],
  },
  { id: "vip",
    name: "VIP",
    tab: "VIPX-",
    stars: 1500,
    days: 90,
    benefits: [
      "🔓 Acceso completo",
      "📸 Todo el contenido exclusivo",
      "🎥 Videocall",
      "📺 Todos los canales privados",
      "🔐 Código personal",
      "⭐ Acceso VIP",
      "⚡ Acceso inmediato",
    ],
  },
] as const;
export type Plan = (typeof PLANS)[number];
export function getPlan(id: string) {
  return PLANS.find((plan) => plan.id === id);
}