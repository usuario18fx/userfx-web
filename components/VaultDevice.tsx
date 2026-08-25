import { useState, useEffect } from 'react';
import './VaultDevice.css';
/* ─── Types ─── */
  interface Benefit { icon: string;
                      text: string;
                      sub: string;
                 }
  interface BenefitGroup { label: string;
                           items: Benefit[];
                 }
  interface Plan { title: string;
                   emoji: string;
                   stars: number;
                   days: number;
                   ctaClass: string;
                   groups: BenefitGroup[];
                   }
  interface PlanKey { basic: Plan;
                      pro: Plan;
                      vip: Plan; }
  const ICONS = { anydevice: "/assets/iconos/anydevice.png",
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
                  vip: "/assets/iconos/vip.png",
                  bordeDevice: "/assets/iconos/bordeDevice.png",
                  bordeBtn: "/assets/iconos/bordeBtn.png",
                  quickly: "/assets/iconos/quickly.png",
                  };
/* ─── Plan Data ─── */
 const PLANS: PlanKey = { basic: {
            title: 'Basic',
            emoji: ICONS.rosa,
            stars: 350,
            days: 7,
            ctaClass: 'cta-basic',
            groups: 
         [{ label: 'What you get',
            items: 
         [{ icon: ICONS.fotos, text: 'Private session access', sub: 'Unlock one selected session from the vault' },
          { icon: ICONS.getin, text: 'Instant entry', sub: 'Your access code is generated after purchase' },
          { icon: ICONS.anydevice, text: 'Any device', sub: 'Watch smoothly on phone, tablet or desktop' },
          { icon: ICONS.preview, text: 'Full session view', sub: 'Enjoy the complete unlocked session, not just a preview' },],},
          { label: 'Best for',
            items: 
         [{ icon: ICONS.candado2, text: 'One premium drop', sub: 'Best when you only want one specific session' },],},],},
            pro: 
          { title: 'Pro',
            emoji: ICONS.fuego,
            stars: 750,
            days: 30,
            ctaClass: 'cta-pro',
            groups: 
         [{ label: 'What you get',
            items: 
         [{ icon: ICONS.choose, text:'Choose your sessions', sub: 'Pick from available premium sessions in the vault' },
          { icon: ICONS.quality, text:'Enhanced quality', sub: 'Higher-quality streaming for a smoother viewing experience' },
          { icon: ICONS.quickly, text:'Instant access', sub: 'No waiting — unlock and enter when you are ready' },],},
          { label: 'Best for',
            items: 
         [{ icon: ICONS.fuego, text:'Regular viewers', sub: 'Made for people who want more than one session' },
          { icon: '💎', text:'More value per entry', sub: 'Multiple premium sessions without committing to VIP' },
  
          { icon: ICONS.vip, text:'VIP-ready', sub: 'A natural step up before going all-access' },],},],},
  vip:{title:'VIP',
            emoji: ICONS.corona,
            stars: 1500,
            days: 90,
            ctaClass: 'cta-vip',
            groups: 
         [{ label: 'What you get',
            items: 
         [{ icon: ICONS.fotos, text: 'Full vault entry', sub: 'Every session, no restrictions' },
          { icon: ICONS.limit, text: 'Unlimited sessions', sub: 'Enter as many times as you want' },
          { icon: ICONS.calendario, text: '90-day access', sub: 'Three full months of entry' },
          { icon: ICONS.quality, text: 'HD quality', sub: 'Highest available resolution' },
          { icon: ICONS.anydevice, text: 'Any device', sub: 'Sync across all your screens' },],},
          { label: 'Best for',
            items: 
         [{ icon: ICONS.telegram, text: 'Chat Experience', sub: 'Direct DM for anything' },],},],},};
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
      const [activeSheet, setActiveSheet] =
        useState<keyof PlanKey | null>(null);
      const [selectedPlan, setSelectedPlan] =
        useState<keyof PlanKey | null>(null);
      const [time, setTime] = useState('');
      const [buying, setBuying] = useState(false);
      const [buyError, setBuyError] = useState('');
/* Clock */
      useEffect(() => {
      const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setTime(`${h}:${m}`);
  };
      update();
      const id = setInterval(update, 10000);
      return () => clearInterval(id);
  }, []);
/* Lock screen date */
  const lockDate = (() => {
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday',
                'Thursday','Friday','Saturday',
  ];
  const months = ['January','February','March',
                  'April','May','June',
                  'July','August','September',
                  'October','November','December',
  ];
      return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  })();
  const unlock = () => setLocked(false);
  const openSheet = (type: keyof PlanKey) => {
    setBuyError('');
    setSelectedPlan(type);
    setActiveSheet(type);
  };
  const closeSheet = () => { setBuyError('');
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
  setBuyError('');
  try {
  window.location.assign(TELEGRAM_PLAN_LINKS[activeSheet]);
  } catch {
  setBuying(false);
  setBuyError('No se pudo abrir Telegram. Inténtalo nuevamente.');
  }
  };
  const currentPlan = activeSheet
    ? PLANS[activeSheet]
    : null;
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
      <div className={`vd-menuscreen ${!locked ? 'vd-active' : ''}`}>      <img src={ICONS.bordeDevice} alt="" className="vd-device-damask-frame" draggable={false} aria-hidden="true"/>
      <div className="vd-menu-header">
      <p>
        𝚂𝚎𝚕𝚎𝚌𝚝 𝚊 𝚙𝚕𝚊𝚗 𝚝𝚘 𝚜𝚎𝚎 𝚍𝚎𝚝𝚊𝚒𝚕𝚜
      </p>
      </div>
      <div className="vd-menu-options">
      <div className={`vd-option vd-opt-basic ${selectedPlan === 'basic' ? 'vd-selected' : ''}`} onClick={() => openSheet('basic')}>
      <PlanDiamonds />
      <div className="vd-option-row">
      <div className="vd-option-icon">
      <img src={ICONS.rosa} alt="" className="vd-plan-icon vd-plan-icon--basic" draggable={false}/>
      </div>
      <div className="vd-option-info">
      <div className="vd-option-name">
        Basic
      </div>
      <div className="vd-option-desc">
        𝟳 ᴅᴀʏꜱ · 𝟭 ꜱᴇꜱꜱɪᴏɴ
      </div>
      </div>
      <div className="vd-option-arrow">
        ›
      </div>
      </div>
      </div>
      <div className={`vd-option vd-opt-pro ${selectedPlan === 'pro' ? 'vd-selected' : ''}`} onClick={() => openSheet('pro')}>
      <PlanDiamonds />
      <div className="vd-option-row">
      <div className="vd-option-icon">
      <img src={ICONS.fuego} alt="" className="vd-plan-icon vd-plan-icon--pro" draggable={false}/>
      </div>
      <div className="vd-option-info">
      <div className="vd-option-name">
        PRO
      </div>
      <div className="vd-option-desc">
        𝟯𝟬 ᴅᴀʏꜱ · 𝟱 ᴇɴᴛʀɪᴇꜱ
      </div>
      </div>
      <div className="vd-option-arrow">
        ›
      </div>
      </div>
      </div>
      <div className={`vd-option vd-opt-vip ${selectedPlan === 'vip' ? 'vd-selected' : ''}`} onClick={() => openSheet('vip')}>
      <PlanDiamonds />
      <div className="vd-option-row">
      <div className="vd-option-icon">
      <img src={ICONS.corona} alt="" className="vd-plan-icon vd-plan-icon--vip" draggable={false}/>
      </div>
      <div className="vd-option-info">
      <div className="vd-option-name">
        VIP
      </div>
      <div className="vd-option-desc">
        𝟵𝟬 ᴅᴀʏꜱ · ᴜɴʟɪᴍɪᴛᴇᴅ
      </div>
      </div>
      <div className="vd-option-arrow">
        ›
      </div>
      </div>
      </div>
      </div>
      <div className="vd-menu-bottom">
      </div>
      </div>
{/* ── Detail Sheet ── */}
      <div className={`vd-detail-sheet vd-detail-${activeSheet ?? 'closed'} ${activeSheet ? 'vd-active' : ''}`}>
      <div className="vd-sheet-handle">
      <div className="vd-sheet-handle-bar" />
      </div>
      <div className="vd-sheet-header">
      <div className="vd-sheet-title-area">
      <div className="vd-sheet-title">
      <span className={`vd-sheet-title-name vd-title-${activeSheet}`}>
       {currentPlan?.title}
      </span>
      </div>
      </div>
      </div>
      <div className="vd-sheet-body">
       {currentPlan?.groups.map((group, gi) => (
      <div className="vd-benefit-group" key={gi}>
      <div className="vd-benefit-group-label">
        {group.label}
      </div>
      <div className="vd-benefit-list">
       {group.items.map((item, ii) => (
      <div className="vd-benefit-item" key={ii}>
       {item.icon.startsWith('/assets/') ? (
      <img src={item.icon} alt="" className="vd-benefit-img vd-benefit-img-choose" draggable={false}/>):(
      <span>
       {item.icon}
      </span>
       )}
      <div>  
      <div className="vd-benefit-label">
      {item.text}
      </div>
      <div className="vd-benefit-sub">
      {item.sub}
      </div>
      </div>
      </div>
      ))}  
      </div>
      </div>
       ))}
      </div>
{/* ── Payment and Done buttons ── */}
      <div className="vd-sheet-footer">
      {buyError && (
      <p className="vd-buy-error">
        {buyError}
      </p>
      )}
      <div className="vd-sheet-actions">
      <button type="button" className={`vd-buy-btn ${currentPlan?.ctaClass ?? ''}`} onClick={openPlanInBot} disabled={buying || !currentPlan}>
      {buying ? (
      <span className="vd-buy-loading">
      CREATING ORDER...
      </span>
      ) : (
      <>
      <span className="vd-buy-label">
        GET CODE
      </span>
      <span className="vd-buy-price">
      {currentPlan?.stars ?? 0} STARS ⭐
     </span>
     </>
     )}
     </button>
      <button  type="button"  className={`vd-cta-btn ${currentPlan?.ctaClass ?? ''}`} onClick={closeSheet} >
        DONE
      </button>
      </div>
      </div>
      </div>
      </div>
      </div>
      );
       }

