import { PLAN_DAYS } from "../../lib/access-plans.js";
          import { useState, useEffect } from "react";
          import "./VaultDevice.css";

/* ─── Types ─── */
          interface Benefit {
            icon: string;
            text: string;
            sub: string;
          }
          interface BenefitGroup {
            label: string;
            items: Benefit[];
          }
          interface Plan {
            title: string;
            emoji: string;
            stars: number;
            entries: number | null;
            ctaClass: string;
            groups: BenefitGroup[];
          }
          interface PlanKey {
            basic: Plan;
            pro: Plan;
            vip: Plan;
          }
          const ICONS = {
            anydevice: "/assets/iconos/anydevice.png",
            corona: "/assets/iconos/corona.png",
            candado: "/assets/iconos/candado.png",
            candado2: "/assets/iconos/candado2.png",
            calendario: "/assets/iconos/calendario.png",
            choose: "/assets/iconos/choose.png",
            fotos: "/assets/iconos/fotos.png",
            fuego: "/assets/iconos/fuego.png",
            getin: "/assets/iconos/getin.png",
            limit: "/assets/iconos/ilimit.png",
            quality: "/assets/iconos/quality.png",
            preview: "/assets/iconos/preview.png",
            rayo: "/assets/iconos/rayo.png",
            rosa: "/assets/iconos/rosa.png",
            telegram: "/assets/iconos/telegram.png",
            vipcard: "/assets/iconos/vipcard.png",
            bordeDevice: "/assets/iconos/bordeDevice.png",
            bordeBtn: "/assets/iconos/bordeBtn.png",
            quickly: "/assets/iconos/quickly.png",
          };
/* ─── Plan Data ─── */
          const PLANS: PlanKey = {
            basic: {
              title: "Basic",
              emoji: ICONS.rosa,
              stars: 350,
              entries: null,
              ctaClass: "cta-basic",
              groups: [
                {
                  label: "What you get",
                  items: [
                    {
                      icon: ICONS.fotos,
                      text: "Camera access",
                      sub: "Use ONCAM in your private room",
                    },
                    {
                      icon: ICONS.getin,
                      text: "Instant entry",
                      sub: "Your access code is generated after purchase",
                    },
                    {
                      icon: ICONS.anydevice,
                      text: "Any device",
                      sub: "Watch smoothly on phone, tablet or desktop",
                    },
                    {
                      icon: ICONS.preview,
                      text: "Private chat",
                      sub: "Chat during your private experience",
                    },
                  ],
                },
                {
                  label: "Best for",
                  items: [{ icon: ICONS.candado2, text: "Core privileges", sub: "Camera and chat while your BASIC code is active." }],
                },
              ],
            },
            pro: {
              title: "Pro",
              emoji: ICONS.fuego,
              stars: 750,
              entries: null,
              ctaClass: "cta-pro",
              groups: [
                {
                  label: "What you get",
                  items: [
                    {
                      icon: ICONS.choose,
                      text: "Camera and private chat",
                      sub: "Connect through ONCAM and chat",
                    },
                    {
                      icon: ICONS.quality,
                      text: "Recording",
                      sub: "Record your ONLIVE sessions",
                    },
                    {
                      icon: ICONS.quickly,
                      text: "Instant access",
                      sub: "No waiting — unlock and enter when you are ready",
                    },
                  ],
                },
                {
                  label: "Best for",
                  items: [
                    {
                      icon: ICONS.fuego,
                      text: "Multimedia access",
                      sub: "Open the multimedia collection",
                    },
                    { icon: "💎", text: "Stage access", sub: "Join the Stage experience" },
                    {
                      icon: ICONS.vipcard,
                      text: "Extended privileges",
                      sub: "Camera, chat, recording, multimedia and Stage",
                    },
                  ],
                },
              ],
            },
            vip: {
              title: "VIP",
              emoji: ICONS.corona,
              stars: 1500,
              entries: null,
              ctaClass: "cta-vip",
              groups: [
                {
                  label: "What you get",
                  items: [
                    { icon: ICONS.fotos, text: "Camera, chat and multimedia", sub: "Connect and explore the private collection" },
                    { icon: ICONS.limit, text: "Unlimited entries", sub: "Enter as many times as you want" },
                    {
                      icon: ICONS.calendario,
                      text: "Recording and Stage",
                      sub: "Record ONLIVE sessions and join Stage",
                    },
                    { icon: ICONS.quality, text: "Longest access period", sub: "Keep all included privileges for the full VIP period" },
                    { icon: ICONS.candado2, text: "Any device", sub: "Keep your access active" },
                  ],
                },
                {
                  label: "",
                  items: [{ icon: ICONS.telegram, text: "Chat Experience", sub: "Private chat while your VIP code is active" }],
                },
              ],
            },
          };
/* ─── Diamond figures ─── */
          function PlanDiamonds() {
            return (
              <span className="vd-option-diamonds" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => (
                  <span className="vd-option-diamond" key={index} />
                ))}
              </span>
            );
          }
/* ─── Component ─── */
          export default function VaultDevice() {
            const [locked, setLocked] = useState(true);
            const [activeSheet, setActiveSheet] = useState<keyof PlanKey | null>(null);
            const [selectedPlan, setSelectedPlan] = useState<keyof PlanKey | null>(null);
            const [time, setTime] = useState("");
            const [buying, setBuying] = useState(false);
            const [buyError, setBuyError] = useState("");
            /* Clock */
            useEffect(() => {
              const update = () => {
                const now = new Date();
                const h = String(now.getHours()).padStart(2, "0");
                const m = String(now.getMinutes()).padStart(2, "0");
                setTime(`${h}:${m}`);
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);
  /* Lock screen date */
  const lockDate = (() => {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  })();
  const unlock = () => setLocked(false);
  const openSheet = (type: keyof PlanKey) => {
    setBuyError("");
    setSelectedPlan(type);
    setActiveSheet(type);
  };
  const closeSheet = () => {
    setBuyError("");
    setActiveSheet(null);
  };
  const TELEGRAM_PLAN_LINKS: Record<keyof PlanKey, string> = {
    basic: "https://t.me/User18Fx_bot?start=getcode_basic",
    pro: "https://t.me/User18Fx_bot?start=getcode_pro",
    vip: "https://t.me/User18Fx_bot?start=getcode_vip",
  };
  const openPlanInBot = () => {
    if (!activeSheet || buying) return;
    setBuying(true);
    setBuyError("");
    try {
      window.location.assign(TELEGRAM_PLAN_LINKS[activeSheet]);
    } catch {
      setBuying(false);
      setBuyError("No se pudo abrir Telegram. Inténtalo nuevamente.");
    }
  };
  const currentPlan = activeSheet ? PLANS[activeSheet] : null;
  return (
    <div className="vd-device vd-device-damask">
      {/* Side buttons */}
      <div className="vd-btn vd-pwr" />
      <div className="vd-btn vd-vol1" />
      <div className="vd-btn vd-vol2" />
      <div className="vd-screen">
        {/* Dynamic Island */}
        <div className="vd-island" />
        {/* ── Menu Screen ── */}
        <div className={`vd-menuscreen ${!locked ? "vd-active" : ""}`}>
          {" "}
          <img src={ICONS.bordeDevice} alt="" className="vd-device-damask-frame" draggable={false} aria-hidden="true" />
          <div className="vd-menu-header">
            <p>
            𝚂𝚎𝚕𝚎𝚌𝚝 𝚊 𝚙𝚕𝚊𝚗 𝚝𝚘 𝚜𝚎𝚎 𝚍𝚎𝚝𝚊𝚒𝚕𝚜
            </p>
          </div>
          <div className="vd-menu-options">
            <button type="button" className={`vd-option vd-opt-basic ${selectedPlan === "basic" ? "vd-selected" : ""}`} onClick={() => openSheet("basic")} aria-pressed={selectedPlan === "basic"} aria-label="View BASIC plan details">
              <PlanDiamonds />
              <div className="vd-option-row">
                <div className="vd-option-icon">
                  <img src={ICONS.rosa} alt="" className="vd-plan-icon vd-plan-icon--basic" draggable={false} />
                </div>
                <div className="vd-option-info">
                  <div className="vd-option-name">
                  Basic
                  </div>
                </div>
                <div className="vd-option-arrow">
                ›
                </div>
              </div>
            </button>
            <button type="button" className={`vd-option vd-opt-pro ${selectedPlan === "pro" ? "vd-selected" : ""}`} onClick={() => openSheet("pro")} aria-pressed={selectedPlan === "pro"} aria-label="View PRO plan details">
              <PlanDiamonds />
              <div className="vd-option-row">
                <div className="vd-option-icon">
                  <img src={ICONS.fuego} alt="" className="vd-plan-icon vd-plan-icon--pro" draggable={false} />
                </div>
                <div className="vd-option-info">
                  <div className="vd-option-name">
                  PRO
                  </div>
                </div>
                <div className="vd-option-arrow">
                ›
                </div>
              </div>
            </button>
            <button type="button" className={`vd-option vd-opt-vip ${selectedPlan === "vip" ? "vd-selected" : ""}`} onClick={() => openSheet("vip")} aria-pressed={selectedPlan === "vip"} aria-label="View VIP plan details">
              <PlanDiamonds />
              <div className="vd-option-row">
                <div className="vd-option-icon">
                  <img src={ICONS.corona} alt="" className="vd-plan-icon vd-plan-icon--vip" draggable={false} />
                </div>
                <div className="vd-option-info">
                  <div className="vd-option-name">
                  VIP
                  </div>
                </div>
                <div className="vd-option-arrow">
                ›
                </div>
              </div>
            </button>
          </div>
          <div className="vd-menu-bottom"></div>
        </div>
        {/* ── Detail Sheet ── */}
        <div className={`vd-detail-sheet vd-detail-${activeSheet ?? "closed"} ${activeSheet ? "vd-active" : ""}`}>
          <div className="vd-sheet-handle">
            <div className="vd-sheet-handle-bar" />
          </div>
          <div className="vd-sheet-header" data-validity={activeSheet ? `VALID · ${PLAN_DAYS[activeSheet]} DAYS` : ""} data-privileges={activeSheet === "basic" ? "CAMERA + CHAT" : activeSheet ? "REC + MEDIA + STAGE" : ""}>
            <div className="vd-sheet-title-area">
              <div className="vd-sheet-title">
                <span className={`vd-sheet-title-name vd-title-${activeSheet}`}>{currentPlan?.title}</span>
              </div>
            </div>
          </div>
          <div className="vd-sheet-body">
            {currentPlan?.groups.map((group, gi) => (
              <div className="vd-benefit-group" key={gi}>
                <div className="vd-benefit-group-label">{group.label}</div>
                <div className="vd-benefit-list">
                  {group.items.map((item, ii) => (
                    <div className="vd-benefit-item" key={ii}>
                      {item.icon.startsWith("/assets/") ? <img src={item.icon} alt="" className="vd-benefit-img vd-benefit-img-choose" draggable={false} /> : <span>{item.icon}</span>}
                      <div>
                        <div className="vd-benefit-label">{item.text}</div>
                        <div className="vd-benefit-sub">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* ── Payment and Done buttons ── */}
          <div className="vd-sheet-footer">
            {buyError && <p className="vd-buy-error">{buyError}</p>}
            <div className="vd-sheet-actions">
              <button type="button" className={`vd-buy-btn ${currentPlan?.ctaClass ?? ""}`} onClick={openPlanInBot} disabled={buying || !currentPlan}>
                {buying ? (
                  <span className="vd-buy-loading">
                  CREATING ORDER...
                  </span>
                ) : (
                  <>
                    <span className="vd-buy-label">
                    GET CODE
                    </span>
                    <span className="vd-buy-price">{currentPlan?.stars ?? 0} STARS ⭐</span>
                  </>
                )}
              </button>
              <button type="button" className={`vd-cta-btn ${currentPlan?.ctaClass ?? ""}`} onClick={closeSheet}>
                DONE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
