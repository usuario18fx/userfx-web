import { useCallback, useState } from "react";
import { PLANS, type Plan } from "@/lib/plans";
import Countdown from "@/components/Countdown";
import Hud from "@/components/Hud";
import Reveal from "@/components/Reveal";
import Scramble from "@/components/Scramble";
import Ticker from "@/components/Ticker";
import VaultCard from "@/components/VaultCard";

type OrderInfo = Record<string, unknown>;

const TICKER_ITEMS = [
  "NUEVO DROP CADA VIERNES · 22:00 UTC",
  "PAGO VÍA TELEGRAM STARS ⭐",
  "47 FOTOGRAFÍAS · RESOLUCIÓN 4K",
  "SIN REGISTROS · SIN NOMBRES",
  "CÓDIGO DE 4 CARACTERES · UN SOLO USO",
  "ÁLBUM Nº07 «NOCTURNA» — DISPONIBLE AHORA",
];

const PREVIEW_SHOTS = [
  { id: "01", no: "MARCO 01", title: "Nocturna I", cat: "Nº07" },
  { id: "02", no: "MARCO 02", title: "Nocturna II", cat: "Nº07" },
  { id: "03", no: "MARCO 03", title: "Nocturna III", cat: "Nº07" },
  { id: "04", no: "MARCO 04", title: "Nocturna IV", cat: "Nº07" },
] as const;

const previewSrc = (id: string) => `/images/preview-${id}.jpg`;

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
    a: "El botón «Pagar con Telegram ⭐» crea tu orden y te lleva al bot @User18Fx_bot, donde confirmas el pago con Telegram Stars. En cuanto Telegram confirma el cobro, el bot te envía tu código al instante — normalmente en menos de 10 segundos.",
  },
  {
    q: "¿Qué son las Telegram Stars?",
    a: "Es la moneda digital que vive dentro de Telegram (1 ⭐ ≈ $0.02 USD). Se compra directamente en la app con tarjeta, Apple Pay o Google Pay, sin salir del chat y sin crear cuentas en ningún otro sitio.",
  },
  {
    q: "¿Cuánto dura mi acceso?",
    a: "Cada código desbloquea una sesión de 72 horas (96 h con la llave mensual). El código es de un solo uso, pero una vez dentro puedes entrar y salir de tu sesión las veces que quieras hasta que expire.",
  },
  {
    q: "¿Puedo compartir mi código?",
    a: "No. Cada llave abre una sola vez y queda ligada a tu dispositivo. Si el sistema detecta redistribución, el código se revoca sin reembolso y el álbum cambia de cerradura.",
  },
  {
    q: "¿Y si no me llega el código?",
    a: "Escríbele a @User18Fx_bot con tu número de orden (ej. AX01-M3K9Q). Todo pago confirmado genera código; si el bot no respondió en 5 minutos, lo reponemos manualmente sin costo.",
  },
  {
    q: "¿Hay reembolsos?",
    a: "Una vez entregado el código no hay reembolso, porque el acceso es inmediato e irreversible. Si el pago se cobró y nunca recibiste código, se repone o se devuelve — sin excusas.",
  },
];

export default function VaultExperience({ botConfigured }: { botConfigured: boolean }) {
  const [flow, setFlow] = useState<{ plan: Plan; order: OrderInfo } | null>(null);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = (await res.json()) as OrderInfo & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "error");
      setFlow({ plan, order: data });
    } catch {
      setBuyError("✕ No se pudo crear la orden. Inténtalo de nuevo.");
    } finally {
      setBusyPlan(null);
    }
  }, []);

  return (
    <div id="top" className="relative">
      <Hud />

      {/* ══ APERTURA: LA BÓVEDA CON EL LOGO DEL USUARIO ══ */}
      <section className="relative overflow-hidden px-5 pb-16 pt-24 sm:pt-28">
        {/* atmósfera */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-[540px] w-[540px] rounded-full bg-[radial-gradient(circle,rgba(120,30,44,0.28),transparent_65%)]" />
          <div className="absolute -right-48 top-1/3 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(211,163,92,0.1),transparent_65%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          {/* columna editorial y logotipo del usuario */}
          <div>
            <div className="mb-6 overflow-hidden border border-gold/30 bg-ink2/90 shadow-[0_0_30px_rgba(211,163,92,0.12)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/user-logo.jpg"
                alt="USER Ŧχ🜲 Logo oficial"
                className="w-full object-cover transition-transform duration-700 hover:scale-105"
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
              Acceso privado a 47 fotografías en alta definición. Paga con Telegram Stars en nuestro
              bot oficial <code className="text-gold">@User18Fx_bot</code>, recibe tu código de 4
              caracteres y desbloquea el archivo al instante.
            </p>

            {/* ficha técnica */}
            <VaultCard className="mt-8 max-w-md p-5">
              <p className="mb-3 flex items-center gap-3 border-b border-linedark pb-2 font-mono text-[10px] tracking-[0.3em] text-gold/80">
                <span className="dot-live h-1.5 w-1.5 rounded-full bg-gold" />
                FICHA TÉCNICA
              </p>
              <dl>
                {[
                  { k: "FOTOGRAFÍAS", v: "47 · 4K + RAW-lite" },
                  { k: "PRÓXIMO DROP · Nº08", v: <Countdown className="text-goldhi" /> },
                  { k: "MÉTODO DE PAGO", v: "⭐ Telegram Stars" },
                  { k: "DURACIÓN DE ACCESO", v: "72 H · código de un uso" },
                ].map((row, i, arr) => (
                  <div
                    key={row.k}
                    className={`flex items-center justify-between gap-4 py-2.5 ${
                      i < arr.length - 1 ? "border-b border-linedark" : ""
                    }`}
                  >
                    <dt className="font-mono text-[10px] tracking-[0.24em] text-faint">{row.k}</dt>
                    <dd className="font-mono text-[11px] tracking-[0.14em] text-bone/90">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </VaultCard>
          </div>

          {/* columna panel con el componente AlbumLockPanel del usuario */}
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-3 translate-x-3 translate-y-3 border border-gold/15"
              aria-hidden
            />
           
          </div>
        </div>
      </section>

      <Ticker items={TICKER_ITEMS} />

      {/* ══ PROTOCOLO ══ */}
      <section id="protocolo" className="relative px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.34em] text-gold">◈ PROTOCOLO DE ACCESO</p>
            <h2 className="mt-3 max-w-xl font-display text-4xl leading-tight text-bone sm:text-5xl">
              Cómo se abre <span className="italic text-rose">la bóveda</span>
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 110}>
                <VaultCard className="group h-full p-6">
                  <div className="flex items-start gap-5">
                    <span className="font-display text-6xl font-light italic leading-none text-gold/35 transition-colors duration-500 group-hover:text-gold sm:text-7xl">
                      {s.n}
                    </span>
                    <div className="pt-1.5">
                      <h3 className="font-mono text-xs tracking-[0.3em] text-goldhi">{s.title}</h3>
                      <p className="mt-2 leading-relaxed text-dim">{s.text}</p>
                    </div>
                  </div>
                  <span className="absolute bottom-3 right-4 font-mono text-[9px] tracking-[0.3em] text-faint/70">
                    PASO {s.n} / 04
                  </span>
                </VaultCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ LLAVES / PRECIOS ══ */}
      <section id="llaves" className="relative border-y border-line bg-ink2/40 px-5 py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(211,163,92,0.06),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.34em] text-gold">◈ LLAVES DE ACCESO</p>
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
            <p className="anim-flicker mt-6 border border-rose/40 bg-rose/10 px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] text-rosehi">
              {buyError}
            </p>
          )}

          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {PLANS.map((plan, i) => {
              const busy = busyPlan === plan.id;
              const featured = plan.id === "vip";
              const accent = plan.id === "vip" ? "rose" : "default";
              const variant = featured ? "featured" : accent;
              return (
                <Reveal key={plan.id} delay={i * 120} className="h-full">
                  <VaultCard
                    as="article"
                    variant={variant}
                    className={`group flex h-full flex-col p-7 transition-transform duration-500 hover:-translate-y-1.5 ${
                      featured ? "lg:-translate-y-3 lg:hover:-translate-y-4" : ""
                    }`}
                  >
                    {featured && (
                      <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-gold px-3 py-1 font-mono text-[9px] tracking-[0.26em] text-ink shadow-[0_0_18px_rgba(211,163,92,0.5)]">
                        ★ MÁS PEDIDA
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] tracking-[0.22em] text-faint">
                        {plan.tab}
                      </span>
                      <span
                        className={`font-mono text-[9px] tracking-[0.26em] ${
                          accent === "rose" ? "text-rosehi" : "text-gold"
                        }`}
                      >
                        {plan.id.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-3xl italic text-bone">{plan.name}</h3>
                    <p className="mt-1 font-display text-sm italic text-dim">
                      Acceso durante {plan.days} días
                    </p>

                    <div className="mt-6 flex items-baseline gap-3">
                      <span
                        className={`font-mono text-5xl font-semibold tabular ${
                          accent === "rose" ? "text-rosehi" : "text-goldhi"
                        }`}
                      >
                        {plan.stars}
                      </span>
                      <span className="text-xl">⭐</span>
                      <span className="font-mono text-[10px] tracking-[0.16em] text-faint">
                        ${(plan.stars * 0.02).toFixed(2)} · {plan.days} DÍAS
                      </span>
                    </div>

                    <ul className="mt-6 flex-1 space-y-2.5 border-t border-linedark pt-6">
                      {plan.benefits.map((perk) => (
                        <li key={perk} className="flex items-start gap-2.5 text-sm leading-snug text-bone/80">
                          <span className="mt-0.5 text-[11px] text-gold">✦</span>
                          {perk}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void buy(plan)}
                      className={`btn-shine mt-7 w-full py-3.5 font-mono text-[11px] tracking-[0.28em] transition-all disabled:opacity-60 ${
                        featured
                          ? "border border-gold bg-gold text-ink hover:bg-goldhi"
                          : accent === "rose"
                            ? "border border-rose/50 text-rosehi hover:border-rose hover:bg-rose hover:text-ink"
                            : "border border-gold/50 text-goldhi hover:border-gold hover:bg-gold hover:text-ink"
                      }`}
                    >
                      {busy ? "GENERANDO ORDEN…" : "PAGAR CON TELEGRAM ⭐"}
                    </button>
                  </VaultCard>
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

      {/* ══ ARCHIVO / TEASER ══ */}
      <section id="archivo" className="relative px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="font-mono text-[11px] tracking-[0.34em] text-gold">◈ DENTRO DE LA BÓVEDA</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-bone sm:text-5xl">
                Lo que hay <span className="italic text-rose">dentro</span>
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-dim">
                Cada viernes a las 22:00 UTC se sella un drop nuevo. Estos son algunos marcos del
                Nº07 «Nocturna» — borrosos hasta que alguien pague la llave.
              </p>
            </div>
            <VaultCard className="p-5">
              <p className="font-mono text-[9px] tracking-[0.3em] text-gold/80">DROP Nº08 EN</p>
              <Countdown className="mt-1 block text-3xl text-goldhi sm:text-4xl" />
              <p className="mt-1 font-mono text-[9px] tracking-[0.22em] text-dim">
                VIERNES · 22:00 UTC
              </p>
            </VaultCard>
          </Reveal>
          {/* 4 marcos SIN FILTRO — cortesía de la casa */}
          <Reveal className="mt-16">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.34em] text-gold">
                  <span className="inline-block h-px w-8 bg-gold/60" />
                  CORTESÍA DE LA CASA · SIN FILTRO
                </p>
                <h3 className="mt-2 font-display text-2xl italic text-bone sm:text-3xl">
                  Cuatro marcos <span className="text-rose">a la vista</span>
                </h3>
              </div>
              <span className="border border-gold/30 bg-gold/5 px-3 py-1.5 font-mono text-[9px] tracking-[0.24em] text-goldhi">
                ✦ FREE PREVIEW · 4/47
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {PREVIEW_SHOTS.map((shot, i) => (
                <Reveal key={shot.id} delay={i * 90}>
                  <VaultCard className="group h-full overflow-hidden">
                    <figure className="relative aspect-[3/4] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewSrc(shot.id)}
                        alt={`${shot.no} — ${shot.title}`}
                        loading="lazy"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        className="h-full w-full select-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />

                      {/* marca de agua sutil */}
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="-rotate-12 font-display text-3xl italic tracking-[0.4em] text-bone/10 select-none">
                          Ŧχ🜲
                        </span>
                      </span>

                      {/* barrido dorado al hover */}
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-goldhi/15 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-full" />

                      {/* etiqueta superior */}
                      <span className="absolute left-3 top-3 z-10 border border-gold/50 bg-ink/80 px-2 py-0.5 font-mono text-[9px] tracking-[0.22em] text-goldhi backdrop-blur-sm">
                        {shot.no}
                      </span>
                      <span className="absolute right-3 top-3 z-10 border border-line bg-ink/80 px-1.5 py-0.5 font-mono text-[8px] tracking-[0.2em] text-dim opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                        4K
                      </span>

                      {/* pie */}
                      <figcaption className="absolute inset-x-0 bottom-0 z-10 translate-y-full bg-gradient-to-t from-ink via-ink/90 to-transparent p-3 pt-10 transition-transform duration-500 group-hover:translate-y-0">
                        <p className="truncate font-display text-sm italic text-bone">
                          {shot.title}
                        </p>
                        <p className="mt-0.5 font-mono text-[9px] tracking-[0.2em] text-gold/80">
                          {shot.cat} · MUESTRA
                        </p>
                      </figcaption>
                    </figure>
                  </VaultCard>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-12 text-center">
            <a
              href="#llaves"
              className="group inline-flex items-center gap-3 border border-gold/50 px-8 py-3.5 font-mono text-[11px] tracking-[0.3em] text-goldhi transition-all hover:border-gold hover:bg-gold hover:text-ink"
            >
              QUIERO LOS 43 RESTANTES · OBTENER LLAVE
              <span className="transition-transform duration-300 group-hover:translate-y-1">↓</span>
            </a>
          </Reveal>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" className="relative border-t border-line px-5 py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.34em] text-gold">◈ TRANSMISIONES FRECUENTES</p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-bone sm:text-5xl">
              Antes de <span className="italic text-rose">pagar</span>
            </h2>
          </Reveal>

          <VaultCard className="mt-10 px-6 py-2 sm:px-10">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={f.q} delay={i * 60}>
                  <div className={i === FAQS.length - 1 ? "" : "border-b border-linedark"}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="group flex w-full items-center gap-5 py-5 text-left"
                      aria-expanded={open}
                    >
                      <span className="font-display text-lg italic text-gold/50 transition-colors group-hover:text-gold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`flex-1 text-base transition-colors sm:text-lg ${
                          open ? "text-goldhi" : "text-bone/90 group-hover:text-bone"
                        }`}
                      >
                        {f.q}
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className={`shrink-0 text-dim transition-transform duration-300 ${
                          open ? "rotate-45 text-gold" : ""
                        }`}
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                    <div className={`faq-body ${open ? "open" : ""}`}>
                      <div>
                        <p className="pb-6 pl-12 pr-4 leading-relaxed text-dim">{f.a}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </VaultCard>
        </div>
      </section>

      {/* ══ PIE ══ */}
      <footer className="relative border-t border-line px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] tracking-[0.22em] text-faint">
            <span>
              USER | <span className="text-gold/80">Ŧχ🜲</span> | 2026 © ALL RIGHTS RESERVED
            </span>
            <div className="flex items-center gap-5">
              <a
                href="https://t.me/User18Fx_bot"
                target="_blank"
                rel="noreferrer"
                className="text-dim transition-colors hover:text-gold"
              >
                @User18Fx_bot
              </a>
              <a href="/galeria" className="text-dim transition-colors hover:text-gold">
                BÓVEDA
              </a>
              <a href="/admin" className="text-dim transition-colors hover:text-gold">
                PANEL
              </a>
            </div>
          </div>
          <p className="max-w-2xl font-mono text-[9px] leading-relaxed tracking-[0.14em] text-faint/70">
            CONTENIDO PARA MAYORES DE 18 AÑOS · AL PAGAR ACEPTAS: SIN REEMBOLSOS UNA VEZ ENTREGADO
            EL CÓDIGO, PROHIBIDA LA REDISTRIBUCIÓN, EL ACCESO ES PERSONAL E INTRANSFERIBLE. ESTE
            SITIO NO ALMACENA NOMBRES, CORREOS NI TARJETAS — SOLO ÓRDENES, CÓDIGOS Y SESIONES
            ANÓNIMAS.
          </p>
        </div>
      </footer>
      {/* modal de pago */}
      {flow && null}
    </div>
  );
}

