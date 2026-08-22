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
                 ctaClass: string;
                 groups: BenefitGroup[];
                 }
  interface PlanKey { basic: Plan;
                      pro: Plan;
                      vip: Plan;
                    }
  const DAMASK =  "/assets/damask.png";
  const ICONS = { anydevice: "/assets/iconos/anydevice.png",
                  corona: "/assets/iconos/corona.png",
                  candado: "/assets/iconos/candado.png",
                  calendario: "/assets/iconos/calendario.png",
                  fotos: "/assets/iconos/fotos.png",
                  fuego:  "/assets/iconos/fuego.png",
                  getin: "/assets/iconos/getin.png",
                  ilimit: "/assets/iconos/ilimit.png",
                  quality: "/assets/iconos/quality.png",
                  preview: "/assets/iconos/preview.png",
                  rayo: "/assets/iconos/rayo.png",
                  rosa: "/assets/iconos/rosa.png",
                  telegram: "/assets/iconos/telegram.png", 
                  vip: "/assets/iconos/vip.png"
                };
/* ─── Plan Data ─── */
 const PLANS: PlanKey = { basic: {
    title: 'Basic',
    emoji: ICONS.rosa,
    ctaClass: 'cta-basic',
    groups: [
      { label: 'What you get',
        items: [
          { icon: ICONS.fotos, text: 'Private session access', sub: 'Unlock one selected session from the vault' },
          { icon: ICONS.getin, text: 'Instant entry', sub: 'Your access code is generated after purchase' },
          { icon: ICONS.anydevice, text: 'Any device', sub: 'Watch smoothly on phone, tablet or desktop' },
          { icon: ICONS.preview, text: 'Full session view', sub: 'Enjoy the complete unlocked session, not just a preview' },],},
      { label: 'Best for',
        items: [
          { icon: ICONS.rosa, text: 'First-time access', sub: 'Perfect for trying the private vault without a subscription' },
          { icon: '🔓', text: 'One premium drop', sub: 'Best when you only want one specific session' },],},],},
  pro: {
    title: 'Pro',
    emoji: ICONS.fuego,
    ctaClass: 'cta-pro',
    groups: [
      { label: 'What you get',
        items: [
          { icon: '🎬', text: 'Choose your sessions', sub: 'Pick from available premium sessions in the vault' },
          { icon: '🔢', text: '5 premium entries', sub: 'Get five individual entries to use within 7 days' },
          { icon: ICONS.anydevice, text: 'Any device', sub: 'Seamless access across phone, tablet and desktop' },
          { icon: '🎥', text: 'Enhanced quality', sub: 'Higher-quality streaming for a smoother viewing experience' },
          { icon: '⚡', text: 'Instant access', sub: 'No waiting — unlock and enter when you are ready' },],},
      { label: 'Best for',
        items: [
          { icon: ICONS.fuego, text: 'Regular viewers', sub: 'Made for people who want more than one session' },
          { icon: '💎', text: 'More value per entry', sub: 'Multiple premium sessions without committing to VIP' },
          { icon: ICONS.vip, text: 'VIP-ready', sub: 'A natural step up before going all-access' },],},],},
  vip: {
    title: 'VIP',
    emoji: ICONS.corona,
    ctaClass: 'cta-vip',
    groups: [
      { label: 'What you get',
        items: [
          { icon: ICONS.fotos, text: 'Full vault entry', sub: 'Every session, no restrictions' },
          { icon: ICONS.ilimit, text: 'Unlimited sessions', sub: 'Enter as many times as you want' },
          { icon: ICONS.calendario, text: '30-day access', sub: 'A full month of entry' },
          { icon: ICONS.quality, text: 'HD quality', sub: 'Highest available resolution' },
          { icon: '📱', text: 'Any device', sub: 'Sync across all your screens' },],},
      { label: 'Best for',
        items: [
          { icon: ICONS.telegram, text: 'Chat Experience', sub: 'Direct DM for anything' },],},],},
};
/* ─── Component ─── */
    export default function VaultDevice() {
      const [locked, setLocked] = useState(true);
      const [activeSheet, setActiveSheet] = useState<keyof PlanKey | null>(null);
      const [time, setTime] = useState('');
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
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
      })();

  const unlock = () => setLocked(false);

  const openSheet = (type: keyof PlanKey) => setActiveSheet(type);

  const closeSheet = () => setActiveSheet(null);

  const currentPlan = activeSheet ? PLANS[activeSheet] : null;

  return (
      <div className="vd-device">
{/* Side buttons */}
      <div className="vd-btn vd-pwr" />
      <div className="vd-btn vd-vol1" />
      <div className="vd-btn vd-vol2" />

      <div className="vd-screen">
{/* Dynamic Island */}
      <div className="vd-island" />

{/* ── Lock Screen ── */}        
      <div className={`vd-lockscreen ${!locked ? 'vd-unlocked' : ''}`} onClick={unlock}>
      <div className="vd-lock-time">{time}</div>
      <div className="vd-lock-date">{lockDate}</div>
      <div className="vd-lock-prompt">
      <div className="vd-lock-prompt-icon">
      <img src={ICONS.candado} alt="" className="vx-titleCandado" draggable={false}/>
        </div>
      <div className="vd-lock-prompt-text">      
        Tap to explore</div>
      </div>
      </div>
{/* ── Menu Screen ── */}
      <div className={`vd-menuscreen ${!locked ? 'vd-active' : ''}`}>
      <div className="vd-menu-header">
       <p>
        Select a plan to see details</p>
      </div>
      <div className="vd-menu-options">
      <div className="vd-option vd-opt-basic" onClick={() => openSheet('basic')}>
      <div className="vd-option-row">
      <div className="vd-option-icon">
      <img src={ICONS.rosa} alt="" className="vx-titleRose" draggable={false}/>
      </div>
      <div className="vd-option-info">
      <div className="vd-option-name">
        Basic</div>
      <div className="vd-option-desc">
        Single session access</div>
      </div>
      <div className="vd-option-arrow">›</div>
      </div>
      </div>
      <div className="vd-option vd-opt-pro" onClick={() => openSheet('pro')}>
      <div className="vd-option-row">
      <div className="vd-option-icon">
      <img src={ICONS.fuego} alt="" className="vx-planButtonIcon vx-planButtonFire" draggable={false}/>
      </div>
      <div className="vd-option-info">
      <div className="vd-option-name">
        Pro</div>
      <div className="vd-option-desc">
        Limited sessions · 7 days</div>
      </div>
      <div className="vd-option-arrow">›</div>
      </div>
      </div>
            
      <div className="vd-option vd-opt-vip" onClick={() => openSheet('vip')}>
      <div className="vd-option-row">
      <div className="vd-option-icon">
      <img src={ICONS.corona}  alt="" className="vd-option-img" draggable={false} />
      </div>
      <div className="vd-option-info">
      <div className="vd-option-name">
        VIP</div>
      <div className="vd-option-desc">
        Unlimited · 30 days</div>
      </div>
      <div className="vd-option-arrow">
        ›</div>
      </div>
      </div>
      </div>

      <div className="vd-menu-bottom">
      <div className="vd-home-pill" />
      </div>
      </div>
{/* ── Detail Sheet ── */}
      <div className={`vd-detail-sheet ${activeSheet ? 'vd-active' : ''}`}>
      <div className="vd-sheet-handle">
      <div className="vd-sheet-handle-bar" />
      </div>
      <div className="vd-sheet-header">
      <button className={`vd-sheet-back ${currentPlan?.ctaClass}`} onClick={closeSheet}>
         ☒ ʙᴀᴄᴋ
      </button>
      <div className="vd-sheet-title-area">
      <div className="vd-sheet-title">
  {currentPlan?.emoji.startsWith('/assets/') ? (
      <img src={currentPlan.emoji} alt="" className="vd-sheet-title-icon" draggable={false}/>
       ) : (
      <span className="vd-sheet-title-emoji">{currentPlan?.emoji}</span>
       )}
      <span className={`vd-sheet-title-name vd-title-${activeSheet}`}>
       {currentPlan?.title}
      </span>
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
       {item.icon.startsWith('/assets/') ? (
      <img src={item.icon} alt="" className="vd-benefit-img" draggable={false}/>
       ) : (
      item.icon
       )}
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

      <div className="vd-sheet-cta">
      <button className={`vd-cta-btn ${currentPlan?.ctaClass ?? ''}`} onClick={closeSheet}>
       {currentPlan?.emoji && (
      <img src={currentPlan?.emoji} alt="" aria-hidden="true" draggable={false} className={`vd-cta-icon vd-cta-icon-${activeSheet ?? ''}`}/>
        )}
        DONE
      </button>
      </div>
      </div>
      </div>
      </div>
      );
       }