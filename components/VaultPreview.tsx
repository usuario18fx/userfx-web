import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import styles from "./VaultPreview.module.css";
import AlbumLockPanel from "./AlbumLocked";

type Plan = {
  id: string;
  name: string;
  label: string;
  tagline: string;
  tab: string;
  stars: number;
  usd: string;
  period: string;
  perks: string[];
  accent: "gold" | "rose";
  featured: boolean;
};

type OrderInfo = {
  id: number;
  payload: string;
  planId: string;
  stars: number;
  status: string;
};

const TICKER_ITEMS = [
  "NUEVO DROP CADA VIERNES · 22:00 UTC",
  "PAGO VÍA TELEGRAM STARS ⭐",
  "47 FOTOGRAFÍAS · RESOLUCIÓN 4K",
  "SIN REGISTROS · SIN NOMBRES",
  "CÓDIGO DE 4 CARACTERES · UN SOLO USO",
  "ÁLBUM Nº07 «NOCTURNA» — DISPONIBLE AHORA",
];

const STEPS = [
  {
    n: "01",
    title: "ELIGE TU LLAVE",
    text: "Semanal, mensual o VIP. Cada llave define cuántos drops puedes abrir y durante cuánto tiempo.",
  },
  {
    n: "02",
    title: "PAGA EN TELEGRAM",
    text: "Pulsa «Pagar con Telegram ⭐». Se abre el bot @User18Fx_bot con tu factura en Telegram Stars. Un toque y está hecho.",
  },
  {
    n: "03",
    title: "RECIBE TU CÓDIGO",
    text: "Al confirmarse el pago, el bot te envía un código tipo AX01-K7Q2. Nadie más lo ve: viaja directo a tu chat privado.",
  },
  {
    n: "04",
    title: "DESBLOQUEA EL ÁLBUM",
    text: "Vuelve a la bóveda y entra los últimos 4 caracteres en el panel. La puerta se abre al instante.",
  },
];

const FAQS = [
  {
    q: "¿Cómo se paga exactamente?",
    a: "El botón «Pagar con Telegram ⭐» crea tu orden y te lleva al bot @User18Fx_bot, donde confirmas el pago con Telegram Stars. En cuanto Telegram confirma el cobro, el bot te envía tu código al instante.",
  },
  {
    q: "¿Qué son las Telegram Stars?",
    a: "Es la moneda digital que vive dentro de Telegram. Se compra directamente dentro de la aplicación y el pago se confirma en el chat del bot.",
  },
  {
    q: "¿Cuánto dura mi acceso?",
    a: "Cada código desbloquea una sesión de 72 horas. El código se usa una sola vez, pero puedes entrar y salir durante la vigencia de tu sesión.",
  },
  {
    q: "¿Puedo compartir mi código?",
    a: "No. Cada llave es de uso único y queda asociada a una sesión de acceso.",
  },
  {
    q: "¿Y si no me llega el código?",
    a: "Escríbele a @User18Fx_bot con tu número de orden. Todo pago confirmado genera un código de acceso.",
  },
  {
    q: "¿Hay reembolsos?",
    a: "Una vez entregado el código, el acceso se habilita de inmediato. Si un pago se confirma y no llega el código, el equipo puede revisarlo manualmente.",
  },
];

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    label: "ACCESO BÁSICO",
    tagline: "Un drop, sin ruido.",
    tab: "BA",
    stars: 50,
    usd: "~ $1.00",
    period: "72 HORAS",
    perks: [
      "Acceso al álbum Nº07",
      "47 fotografías en HD",
      "Código de uso único",
    ],
    accent: "gold",
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    label: "ACCESO PRO",
    tagline: "La llave más elegida.",
    tab: "PR",
    stars: 100,
    usd: "~ $2.00",
    period: "30 DÍAS",
    perks: [
      "Acceso extendido",
      "Drops semanales",
      "Prioridad en contenido nuevo",
    ],
    accent: "gold",
    featured: true,
  },
  {
    id: "vip",
    name: "VIP",
    label: "ACCESO VIP",
    tagline: "Acceso total a la bóveda.",
    tab: "VP",
    stars: 250,
    usd: "~ $5.00",
    period: "90 DÍAS",
    perks: [
      "Acceso VIP",
      "Drops exclusivos",
      "Acceso durante 90 días",
    ],
    accent: "rose",
    featured: false,
  },
];

const TEASER_ITEMS = [
  { id: "01", no: "01", title: "NOCTURNA I", cat: "ARCHIVO" },
  { id: "02", no: "02", title: "NOCTURNA II", cat: "SELECCIÓN" },
  { id: "03", no: "03", title: "NOCTURNA III", cat: "VAULT" },
];

function teaserSrc(id: string) {
  return `/images/teaser-${id}.jpg`;
}

export default function VaultExperience({
  botConfigured,
}: {
  botConfigured: boolean;
}) {
  const [flow, setFlow] = useState<{
    plan: Plan;
    order: OrderInfo;
  } | null>(null);

  const [prefill, setPrefill] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const buy = useCallback(async (plan: Plan) => {
    setBuyError(null);
    setBusyPlan(plan.id);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
        }),
      });

      const data = (await res.json()) as OrderInfo & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo crear la orden");
      }

      setFlow({
        plan,
        order: data,
      });
    } catch {
      setBuyError("✕ No se pudo crear la orden. Inténtalo de nuevo.");
    } finally {
      setBusyPlan(null);
    }
  }, []);

  return (
    <div id="top" className="relative z-10">
      <Hud />

      {/* ══ APERTURA ══ */}
      <section className="relative overflow-hidden px-5 pb-16 pt-24 sm:pt-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-[540px] w-[540px] rounded-full bg-[radial-gradient(circle,rgba(120,30,44,0.28),transparent_65%)]" />
          <div className="absolute -right-48 top-1/3 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(211,163,92,0.1),transparent_65%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <div className="relative mb-6 flex items-center justify-center overflow-hidden border border-gold/30 bg-gradient-to-br from-ink3 via-ink2 to-ink py-8 shadow-[0_0_40px_rgba(56,120,220,0.15)]">
              <div
                className="card-vault__scanlines pointer-events-none absolute inset-0"
                aria-hidden
              />

              <img
                src="/images/userfx-logo.png"
                alt="USER FX — Logo oficial"
                className="relative h-40 w-auto drop-shadow-[0_0_28px_rgba(56,120,220,0.5)] transition-transform duration-700 hover:scale-105 sm:h-52"
              />
            </div>

            <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.34em] text-gold">
              <span className="inline-block h-px w-10 bg-gold/60" />
              ÁLBUM PRIVADO · Nº07 «NOCTURNA»
            </p>

            <h1 className="mt-4 font-display leading-[0.93]">
              <Scramble
                text="USER Ŧχ🜲"
                className="block text-4xl font-semibold tracking-tight text-bone sm:text-5xl lg:text-6xl"
                delay={200}
              />

              <span className="block text-2xl font-light italic text-rose sm:text-3xl">
                Bóveda fotográfica exclusiva.
              </span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-dim sm:text-base">
              Acceso privado a 47 fotografías en alta definición. Paga con
              Telegram Stars en nuestro bot oficial{" "}
              <code className="text-gold">@User18Fx_bot</code>, recibe tu
              código de 4 caracteres y desbloquea el archivo al instante.
            </p>

            <dl className="mt-8 max-w-md">
              {[
                { k: "FOTOGRAFÍAS", v: "47 · 4K + RAW-lite" },
                {
                  k: "PRÓXIMO DROP · Nº08",
                  v: <Countdown className="text-goldhi" />,
                },
                { k: "MÉTODO DE PAGO", v: "⭐ Telegram Stars" },
                { k: "DURACIÓN DE ACCESO", v: "72 H · código de un uso" },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-center justify-between gap-4 border-t border-line py-3 last:border-b"
                >
                  <dt className="font-mono text-[10px] tracking-[0.24em] text-faint">
                    {row.k}
                  </dt>

                  <dd className="font-mono text-[11px] tracking-[0.14em] text-bone/90">
                    {row.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-3 translate-x-3 translate-y-3 border border-gold/15"
              aria-hidden
            />

            <AlbumLockPanel
              prefill={prefill}
              accessCode="FX01"
              onUnlock={() => {
                window.location.href = "/galeria";
              }}
            />
          </div>
        </div>
      </section>

      <Ticker items={TICKER_ITEMS} />

      {/* ══ PROTOCOLO ══ */}
      <section id="protocolo" className="relative px-5 py-24">
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.34em] text-gold">
              ◈ PROTOCOLO DE ACCESO
            </p>

            <h2 className="mt-3 max-w-xl font-display text-4xl leading-tight text-bone sm:text-5xl">
              Cómo se abre <span className="italic text-rose">la bóveda</span>
            </h2>
          </Reveal>

          <div className="mt-14 space-y-0">
            {STEPS.map((step, index) => (
              <Reveal
                key={step.n}
                delay={index * 110}
                className={index % 2 === 1 ? "lg:ml-24" : ""}
              >
                <div className="group relative grid grid-cols-[auto_1fr] gap-6 border-t border-dashed border-line py-8 transition-colors hover:bg-ink2/40 sm:gap-10">
                  <span className="font-display text-6xl font-light italic leading-none text-gold/25 transition-colors duration-500 group-hover:text-gold/60 sm:text-7xl">
                    {step.n}
                  </span>

                  <div className="pt-1.5">
                    <h3 className="font-mono text-xs tracking-[0.3em] text-goldhi">
                      {step.title}
                    </h3>

                    <p className="mt-2 max-w-xl leading-relaxed text-dim">
                      {step.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}

            <div className="border-t border-dashed border-line" />
          </div>
        </div>
      </section>

      {/* ══ LLAVES ══ */}
      <section
        id="llaves"
        className="relative border-y border-line bg-ink2/40 px-5 py-24"
      >
        <div className="relative mx-auto max-w-6xl">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.34em] text-gold">
                ◈ LLAVES DE ACCESO
              </p>

              <h2 className="mt-3 font-display text-4xl leading-tight text-bone sm:text-5xl">
                Elige tu <span className="italic text-rose">llave</span>
              </h2>
            </div>

            <p className="max-w-xs font-mono text-[10px] leading-relaxed tracking-[0.18em] text-faint">
              PRECIOS EN TELEGRAM STARS (⭐)
              <br />1 ⭐ ≈ $0.02 · SE COMPRAN DENTRO DE TELEGRAM
            </p>
          </Reveal>

          {buyError && (
            <p className="mt-6 border border-rose/40 bg-rose/10 px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] text-rosehi">
              {buyError}
            </p>
          )}

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
            {PLANS.map((plan, index) => {
              const busy = busyPlan === plan.id;

              return (
                <Reveal
                  key={plan.id}
                  delay={index * 120}
                  className="h-full"
                >
                  <article
                    className="card-vault relative flex h-full flex-col overflow-hidden border border-line bg-ink transition-all duration-500 hover:-translate-y-1.5 hover:border-gold/55"
                    data-accent={plan.accent === "rose" ? "rose" : "gold"}
                    data-featured={plan.featured ? "true" : undefined}
                  >
                    {plan.featured && (
                      <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-gold px-3 py-1 font-mono text-[9px] tracking-[0.26em] text-ink">
                        ★ MÁS PEDIDA
                      </span>
                    )}

                    <div className="card-vault__hud">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            plan.accent === "rose" ? "bg-rose" : "bg-gold"
                          }`}
                        />

                        <span className="font-mono text-[9px] tracking-[0.26em] text-bone/70">
                          {plan.label}
                        </span>
                      </div>

                      <span className="border border-line bg-ink/60 px-2 py-0.5 font-mono text-[9px] tracking-[0.22em] text-dim">
                        {plan.tab}
                      </span>
                    </div>

                    <div className="card-vault__head">
                      <h3 className="card-vault__title">
                        {plan.name.toUpperCase()}
                      </h3>

                      <p className="card-vault__sub">{plan.tagline}</p>
                    </div>

                    <div className="mx-7 mt-4 border-t border-line pt-5">
                      <div className="flex items-baseline gap-3">
                        <span
                          className={`font-mono text-5xl font-semibold tabular ${
                            plan.accent === "rose"
                              ? "text-rosehi"
                              : "text-goldhi"
                          }`}
                        >
                          {plan.stars}
                        </span>

                        <span className="text-xl">⭐</span>

                        <span className="font-mono text-[10px] tracking-[0.16em] text-faint">
                          {plan.usd} · {plan.period}
                        </span>
                      </div>
                    </div>

                    <ul className="mx-7 mt-5 flex-1 space-y-2.5 border-t border-linedark pt-5">
                      {plan.perks.map((perk) => (
                        <li
                          key={perk}
                          className="flex items-start gap-2.5 text-sm leading-snug text-bone/85"
                        >
                          <span className="mt-0.5 text-[11px] text-gold">
                            ✦
                          </span>
                          {perk}
                        </li>
                      ))}
                    </ul>

                    <div className="p-7 pt-6">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void buy(plan)}
                        className="card-vault__btn group"
                      >
                        <span className="card-vault__btn-text">
                          {busy
                            ? "GENERANDO ORDEN…"
                            : "𝐔𝐍𝐋𝐎𝐂𝐊 𝐀𝐋𝐁𝐔𝐌"}
                        </span>
                      </button>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <p className="mt-8 text-center font-mono text-[10px] tracking-[0.2em] text-faint">
            {botConfigured
              ? "⌁ BOT DE TELEGRAM CONECTADO — EL COBRO Y LA ENTREGA OCURREN EN TU CHAT"
              : "⌁ MODO DEMO ACTIVO — CONFIGURA TELEGRAM_BOT_TOKEN PARA COBROS REALES"}
          </p>
        </div>
      </section>

      {/* ══ ARCHIVO ══ */}
      <section id="archivo" className="relative px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="font-mono text-[11px] tracking-[0.34em] text-gold">
                ◈ DENTRO DE LA BÓVEDA
              </p>

              <h2 className="mt-3 font-display text-4xl leading-tight text-bone sm:text-5xl">
                Lo que hay <span className="italic text-rose">dentro</span>
              </h2>

              <p className="mt-4 max-w-md leading-relaxed text-dim">
                Cada viernes a las 22:00 UTC se sella un drop nuevo. Estos son
                algunos marcos del Nº07 «Nocturna».
              </p>
            </div>

            <div className="relative border border-line bg-ink2/70 p-5">
              <Corners />

              <p className="font-mono text-[9px] tracking-[0.3em] text-faint">
                DROP Nº08 EN
              </p>

              <Countdown className="mt-1 block text-3xl text-goldhi sm:text-4xl" />

              <p className="mt-1 font-mono text-[9px] tracking-[0.22em] text-dim">
                VIERNES · 22:00 UTC
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <LockedCarousel
              items={TEASER_ITEMS.map((item) => ({
                id: item.id,
                no: item.no,
                title: item.title,
                cat: item.cat,
                src: teaserSrc(item.id),
              }))}
            />
          </Reveal>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" className="relative border-t border-line px-5 py-24">
        <div className="relative mx-auto max-w-3xl">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.34em] text-gold">
              ◈ TRANSMISIONES FRECUENTES
            </p>

            <h2 className="mt-3 font-display text-4xl leading-tight text-bone sm:text-5xl">
              Antes de <span className="italic text-rose">pagar</span>
            </h2>
          </Reveal>

          <div className="mt-10 border-t border-line">
            {FAQS.map((faq, index) => {
              const open = openFaq === index;

              return (
                <Reveal key={faq.q} delay={index * 60}>
                  <div className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      className="group flex w-full items-center gap-5 py-5 text-left"
                      aria-expanded={open}
                    >
                      <span className="font-display text-lg italic text-gold/50">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span
                        className={`flex-1 text-base sm:text-lg ${
                          open
                            ? "text-goldhi"
                            : "text-bone/90 group-hover:text-bone"
                        }`}
                      >
                        {faq.q}
                      </span>

                      <span className="text-dim">{open ? "−" : "+"}</span>
                    </button>

                    {open && (
                      <p className="pb-6 pl-12 pr-4 leading-relaxed text-dim">
                        {faq.a}
                      </p>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="relative border-t border-line px-5 py-12">
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <img
              src="/images/userfx-logo.png"
              alt="USER FX"
              className="h-14 w-auto"
            />

            <span className="font-display text-lg italic text-bone/70">
              Bóveda fotográfica privada
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] tracking-[0.22em] text-faint">
            <span>USER FX | Ŧχ🜲 | 2026 © ALL RIGHTS RESERVED</span>

            <div className="flex items-center gap-5">
              <a
                href="https://t.me/User18Fx_bot"
                target="_blank"
                rel="noreferrer"
                className="text-dim transition-colors hover:text-gold"
              >
                @User18Fx_bot
              </a>

              <a
                href="/galeria"
                className="text-dim transition-colors hover:text-gold"
              >
                BÓVEDA
              </a>

              <a
                href="/admin"
                className="text-dim transition-colors hover:text-gold"
              >
                PANEL
              </a>
            </div>
          </div>
        </div>
      </footer>

      {flow && (
        <TelegramModal
          plan={flow.plan}
          order={flow.order}
          onClose={() => setFlow(null)}
          onCode={(last4) => {
            setPrefill(last4);
            document
              .getElementById("top")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}

function Hud() {
  return (
    <div className={styles.hud}>
      SECURE VAULT CONNECTION
    </div>
  );
}

function Scramble({
  text,
  className,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  return <span className={className}>{text}</span>;
}

function Countdown({
  className,
}: {
  className?: string;
}) {
  const [remaining, setRemaining] = useState("00:00:00");

  useEffect(() => { const update = () => {
      const now = new Date();
      const target = new Date(now);

      target.setUTCHours(22, 0, 0, 0);

      const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7;

      if (daysUntilFriday === 0 && now.getTime() >= target.getTime()) {
        target.setUTCDate(target.getUTCDate() + 7);
      } else {
        target.setUTCDate(target.getUTCDate() + daysUntilFriday);
      }

      const diff = Math.max(0, target.getTime() - now.getTime());
      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);

      setRemaining(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
          2,
          "0",
        )}:${String(seconds).padStart(2, "0")}`,
      );
    };

    update();
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return <span className={className}>{remaining}</span>;
}

function Ticker({ items }: { items: string[] }) {
  return (
    <div className={styles.ticker}>
      {items.map((item) => (
        <span key={item} className={styles.tickerItem}>
          {item}
        </span>
      ))}
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`${styles.reveal} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Corners() {
  return (
    <>
      <span className={styles.cornerTopLeft} />
      <span className={styles.cornerTopRight} />
      <span className={styles.cornerBottomLeft} />
      <span className={styles.cornerBottomRight} />
    </>
  );
}

function LockedCarousel({
  items,
}: {
  items: Array<{
    id: string;
    no: string;
    title: string;
    cat: string;
    src: string;
  }>;
}) {
  return (
    <div className={styles.carousel}>
      {items.map((item) => (
        <article key={item.id} className={styles.teaserCard}>
          <img
            src={item.src}
            alt={`${item.title} — preview locked`}
            className={styles.teaserImage}
          />
          <div className={styles.teaserOverlay}>
            <span>{item.no}</span>
            <span>🔒 LOCKED</span>
          </div>
          <div className={styles.teaserText}>
            <strong>{item.title}</strong>
            <span>{item.cat}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function TelegramModal({
  plan,
  order,
  onClose,
  onCode,
}: {
  plan: Plan;
  order: OrderInfo;
  onClose: () => void;
  onCode: (last4: string) => void;
}) {
  const botUrl = `https://t.me/User18Fx_bot?start=${encodeURIComponent(
    order.payload,
  )}`;

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <button
          type="button"
          onClick={onClose}
          className={styles.modalClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        <p className={styles.modalLabel}>ORDEN CREADA</p>
        <h2>{plan.name} ACCESS</h2>
        <p>
          Completa el pago de {plan.stars} ⭐ en Telegram para recibir tu
          código privado.
        </p>

        <code className={styles.orderCode}>{order.payload}</code>

        <a
          href={botUrl}
          target="_blank"
          rel="noreferrer"
          className={styles.telegramButton}
        >
          PAGAR CON TELEGRAM ⭐
        </a>

        <button
          type="button"
          className={styles.demoButton}
          onClick={() => {
            onCode("FX01");
            onClose();
          }}
        >
          DEMO: USAR CÓDIGO FX01
        </button>
      </div>
    </div>
  );
}