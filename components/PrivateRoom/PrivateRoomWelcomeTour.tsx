import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import "./PrivateRoomWelcomeTour.css";

const TOUR_KEY = "userfx_pvr_onboarding_v2";

type TourStep = {
  kicker:string;
  title:string;
  text:string;
  action?:string;
};

const STEPS:readonly TourStep[] = [
  {
    kicker:"WELCOME",
    title:"YOUR PRIVATE CLUB",
    text:"Salon, live camera, members, private gallery and your profile now live inside one private member space.",
  },
  {
    kicker:"MY CAM",
    title:"CAMERA AS DEFAULT VIEW",
    text:"Start your camera, choose PRIVATE or PUBLIC, then close the studio. Your live preview stays docked while you browse the club.",
    action:"OPEN CAMERA",
  },
  {
    kicker:"SALONS · 5",
    title:"BUILD A PRIVATE CIRCLE",
    text:"Your salon starts with you as host. Invite up to four members and keep the camera private to your group when the room layer is connected.",
    action:"VIEW SALON",
  },
  {
    kicker:"MEMBERS",
    title:"DISCOVER WHO IS ONLINE",
    text:"Member presence, public cameras and private requests will appear in the network as the live presence backend is connected.",
    action:"VIEW MEMBERS",
  },
  {
    kicker:"PRIVATE MEDIA",
    title:"YOUR GALLERY STAYS PROTECTED",
    text:"The existing private gallery, access rules and forensic watermark system remain part of the same PrivateRoom.",
    action:"VIEW GALLERY",
  },
  {
    kicker:"READY",
    title:"BROWSE WITHOUT LEAVING CAM",
    text:"Use the dock to manage visibility, reopen the camera studio, open your profile or turn the camera off at any time.",
  },
] as const;

function openCamera() {
  document.body.classList.remove("pvr-camera-docked");

  if (document.querySelector(".pvr-camera-studio")) return;

  const launcher = document.querySelector<HTMLButtonElement>(".pvr-account-launcher");
  if (!launcher) return;
  if (!launcher.classList.contains("is-open")) launcher.click();

  window.setTimeout(() => {
    document.querySelector<HTMLButtonElement>(".pvr-account-view")?.click();
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(".pvr-profile-camera > button")?.click();
    },80);
  },80);
}

function scrollTo(selector:string) {
  document.querySelector(selector)?.scrollIntoView({behavior:"smooth",block:"start"});
}

export default function PrivateRoomWelcomeTour():ReactElement {
  const [open,setOpen] = useState(false);
  const [step,setStep] = useState(0);

  /* ─────   FIRST VISIT ─────── */
  useEffect(() => {
    let completed = false;
    try {completed = localStorage.getItem(TOUR_KEY) === "1";} catch {/* noop */}
    if (completed) return;

    const timer = window.setTimeout(() => setOpen(true),700);
    return () => window.clearTimeout(timer);
  },[]);

  const finish = useCallback(() => {
    try {localStorage.setItem(TOUR_KEY,"1");} catch {/* noop */}
    setOpen(false);
    setStep(0);
  },[]);

  const replay = useCallback(() => {
    setStep(0);
    setOpen(true);
  },[]);

  const handleAction = useCallback(() => {
    const action = STEPS[step]?.action;
    if (action === "OPEN CAMERA") openCamera();
    if (action === "VIEW SALON") scrollTo(".pvr-live-group");
    if (action === "VIEW MEMBERS") scrollTo(".pvr-live-members");
    if (action === "VIEW GALLERY") scrollTo(".pvr-gallery-section");
    if (action) setOpen(false);
  },[step]);

  const current = STEPS[step];

  return (
    <>
      <button type="button" className="pvr-tour-launcher" onClick={replay}>GUIDE</button>

      {open && (
        <div className="pvr-tour-layer" role="dialog" aria-modal="true" aria-label="USER FX PrivateRoom guide">
          <button type="button" className="pvr-tour-backdrop" onClick={finish} aria-label="Close guide"></button>

          <section className="pvr-tour-card">
            <header className="pvr-tour-head">
              <div>
                <span>USER FX · PRIVATE ROOM</span>
                <strong>{String(step + 1).padStart(2,"0")} / {String(STEPS.length).padStart(2,"0")}</strong>
              </div>
              <button type="button" onClick={finish} aria-label="Close guide">✕</button>
            </header>

            <div className="pvr-tour-body">
              <span className="pvr-tour-kicker">{current.kicker}</span>
              <h2>{current.title}</h2>
              <p>{current.text}</p>

              {current.action && (
                <button type="button" className="pvr-tour-action" onClick={handleAction}>
                  {current.action}
                </button>
              )}
            </div>

            <div className="pvr-tour-progress">
              {STEPS.map((_,index) => (
                <span key={index} className={index <= step ? "is-active" : ""}></span>
              ))}
            </div>

            <footer className="pvr-tour-footer">
              <button type="button" className="pvr-tour-skip" onClick={finish}>SKIP TOUR</button>
              <div>
                <button type="button" disabled={step === 0} onClick={() => setStep((currentStep) => Math.max(0,currentStep - 1))}>BACK</button>
                <button
                  type="button"
                  className="is-next"
                  onClick={() => {
                    if (step >= STEPS.length - 1) finish();
                    else setStep((currentStep) => currentStep + 1);
                  }}
                >
                  {step >= STEPS.length - 1 ? "ENTER CLUB" : "NEXT"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
