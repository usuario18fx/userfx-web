import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactElement,
} from "react";
import "./PrivateRoom.css";

const BOT_URL = "https://t.me/User18Fx_bot";
const GET_CODE_URL = "https://t.me/User18Fx_bot?start=getcode";
const VIDEOCALL_URL = "https://t.me/User18Fx_bot?start=videocall";
const SUPPORT_URL = "https://t.me/User18Fx_bot?start=support";
const USER_URL = "https://t.me/User18Fx";
const ACCESS_CODE_KEY = "userfx_access_code";
const LIKES_STORAGE_KEY = "userfx_private_likes";
const NOTE_PREFIX = "userfx_private_note_";
const WATERMARK_ENDPOINT = "/api/private-security";
const DEVICE_ID_KEY = "userfx_device_id";

const CAPTURE_KEYS: ReadonlySet<string> = new Set(["PrintScreen", "Snapshot"]);
const SCREEN_SHARE_HINT = "getDisplayMedia";

type AccessPrefix = "BSIC" | "PRX0" | "VIPX" | "SPCL";
type PlanId = "basic" | "pro" | "vip";
type AccessMode = "code" | "telegram_identity";
type AccessType = "basic" | "pro" | "vip" | "spcl";

interface AccessMeta { type: AccessType; planId: PlanId; accessMode: AccessMode; }
interface ParsedAccessCode extends AccessMeta { prefix: AccessPrefix; suffix: string; code: string; }
interface SessionInfo { planId: PlanId; accessMode: AccessMode; accessCode: string; }
interface PrivateFile { id: number; src: string; title: string; }
interface SideAction { key: string; label: string; description: string; }
interface AccessRules {
  videocall: boolean; upgrade: boolean; message: boolean; gallery: boolean;
  chat: boolean; profile: boolean; notes: boolean; report: boolean;
  telegramfx: boolean; priv: boolean; group: boolean; revoke: boolean;
}
interface AccessSessionResponse { authenticated?: boolean; planId?: string; accessMode?: string; }
type SecurityEvent =
  | "keyboard_capture" | "visibility_drop" | "window_blur"
  | "context_menu" | "devtools_hint" | "screen_share_detected";

interface SecurityReport {
  event: SecurityEvent; code: string; deviceId: string;
  timestamp: number; userAgent: string; fileId?: number;
}

const privatePhoto = (pathname: string): string => `/api/private-media?pathname=${encodeURIComponent(pathname)}`;
const PRIVATE_PATHS: Record<PlanId, readonly string[]> = {
  basic: ["BSIC-01.jpg", "BSIC-02.jpg", "BSIC-03.jpg", "BSIC-04.jpg", "BSIC-05.jpg"].map(p => `userfx-album/BSIC/${p}`),
  pro: ["PRX0-01.jpg", "PRX0-02.jpg", "PRX0-03.jpg"].map(p => `userfx-album/PRX0/${p}`),
  vip: ["VIPX-01.jpg", "VIPX-02.jpg", "VIPX-03.jpg", "VIPX-04.jpg"].map(p => `userfx-album/VIPX/${p}`),
};

const ACCESS_META: Record<AccessPrefix, AccessMeta> = {
  BSIC: { type: "basic", planId: "basic", accessMode: "code" },
  PRX0: { type: "pro", planId: "pro", accessMode: "code" },
  VIPX: { type: "vip", planId: "vip", accessMode: "code" },
  SPCL: { type: "spcl", planId: "vip", accessMode: "telegram_identity" },
};

const ACCESS_RULES: Record<AccessType, AccessRules> = {
  basic: { videocall: true, upgrade: true, message: true, gallery: true, chat: false, profile: true, notes: false, report: true, telegramfx: true, priv: false, group: false, revoke: true },
  pro:   { videocall: true, upgrade: true, message: true, gallery: true, chat: true,  profile: true, notes: true,  report: true, telegramfx: true, priv: true,  group: false, revoke: true },
  vip:   { videocall: true, upgrade: true, message: true, gallery: true, chat: true,  profile: true, notes: true,  report: true, telegramfx: true, priv: true,  group: true,  revoke: true },
  spcl:  { videocall: true, upgrade: true, message: true, gallery: true, chat: true,  profile: true, notes: true,  report: true, telegramfx: true, priv: true,  group: true,  revoke: true },
};

const SIDE_ACTIONS: readonly SideAction[] = [
  { key: "chat", label: "Private Chat", description: "Open secure conversation" },
  { key: "videocall", label: "Live Video Call", description: "Jump back to the stage" },
  { key: "profile", label: "User Profile", description: "View active profile" },
  { key: "notes", label: "Private Notes", description: "Keep secure notes" },
  { key: "report", label: "Report User", description: "Flag this session" },
] as const;

function openExternal(url: string): void { window.open(url, "_blank", "noopener,noreferrer"); }
function safeSessionGet(key: string): string { try { return String(sessionStorage.getItem(key) || "").trim().toUpperCase(); } catch { return ""; } }
function safeSessionRemove(key: string): void { try { sessionStorage.removeItem(key); } catch { /* noop */ } }
function safeLocalStorageGet(key: string): string { try { return localStorage.getItem(key) || ""; } catch { return ""; } }
function safeLocalStorageSet(key: string, value: string): void { try { localStorage.setItem(key, value); } catch { /* noop */ } }

function parseAccessCode(value: string): ParsedAccessCode | null {
  const match = String(value || "").trim().toUpperCase().match(/^(BSIC|PRX0|VIPX|SPCL)-([A-HJ-NP-Z2-9]{4})$/);
  if (!match) return null;
  const prefix = match[1] as AccessPrefix;
  const meta = ACCESS_META[prefix];
  return { ...meta, prefix, suffix: match[2], code: `${prefix}-${match[2]}` };
}

function normalizePlanId(value: unknown): PlanId { return value === "pro" || value === "vip" ? value : "basic"; }
function normalizeAccessMode(value: unknown): AccessMode { return value === "telegram_identity" ? "telegram_identity" : "code"; }

function getAccessType(planId: PlanId, accessMode: AccessMode): AccessType {
  if (accessMode === "telegram_identity") return "spcl";
  if (planId === "vip") return "vip";
  if (planId === "pro") return "pro";
  return "basic";
}

function getFallbackCode(planId: PlanId, accessMode: AccessMode): string {
  if (accessMode === "telegram_identity") return "SPCL CODE";
  if (planId === "vip") return "VIPX CODE";
  if (planId === "pro") return "PRX0 CODE";
  return "BSIC CODE";
}

const TYPE_TO_PREFIX: Record<AccessType, AccessPrefix> = { basic: "BSIC", pro: "PRX0", vip: "VIPX", spcl: "SPCL" };

function getDisplayCode(planId: PlanId, accessMode: AccessMode): string {
  const stored = parseAccessCode(safeSessionGet(ACCESS_CODE_KEY));
  const type = getAccessType(planId, accessMode);
  if (stored && stored.prefix === TYPE_TO_PREFIX[type]) return stored.code;
  return getFallbackCode(planId, accessMode);
}

function buildPrivateFiles(planId: PlanId, accessMode: AccessMode): PrivateFile[] {
  let paths: readonly string[] = [];
  if (accessMode === "telegram_identity" || planId === "vip") {
    paths = [...PRIVATE_PATHS.basic, ...PRIVATE_PATHS.pro, ...PRIVATE_PATHS.vip];
  } else if (planId === "pro") {
    paths = [...PRIVATE_PATHS.basic, ...PRIVATE_PATHS.pro];
  } else {
    paths = PRIVATE_PATHS.basic;
  }
  return paths.map((pathname, index) => ({
    id: index + 1, src: privatePhoto(pathname), title: `PRIVATE FILE ${String(index + 1).padStart(2, "0")}`,
  }));
}

function getOrCreateDeviceId(): string {
  let id = safeLocalStorageGet(DEVICE_ID_KEY);
  if (id) return id;
  try {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  } catch { id = Math.random().toString(36).slice(2, 18).toUpperCase(); }
  safeLocalStorageSet(DEVICE_ID_KEY, id);
  return id;
}

function buildWatermarkStamp(code: string, deviceId: string): string { return `${code}·${deviceId.slice(0, 8)}`; }

function reportSecurityEvent(report: SecurityReport): void {
  try {
    const body = JSON.stringify(report);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(WATERMARK_ENDPOINT, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(WATERMARK_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", keepalive: true, body });
    }
  } catch { /* noop */ }
}

function detectScreenShare(): boolean {
  try { return typeof navigator.mediaDevices?.[SCREEN_SHARE_HINT] === "function" && Boolean(navigator.mediaDevices?.getDisplayMedia); } catch { return false; }
}

interface WatermarkProps { code: string; deviceId: string; fileId: number; }
const WatermarkOverlay: FC<WatermarkProps> = ({ code, deviceId, fileId }) => {
  const stamp = buildWatermarkStamp(code, deviceId);
  const cells = useMemo(() => Array.from({ length: 12 }), []);
  return (
    <div className="pvr-watermark" aria-hidden="true">
      {cells.map((_, i) => (
        <span key={i} className="pvr-watermark-cell">{stamp} · F{String(fileId).padStart(2, "0")}</span>
      ))}
    </div>
  );
};

const LoadingScreen: FC = () => (
  <main className="pvr-loading" role="status" aria-live="polite">
    <span className="pvr-loading-text">VERIFYING SECURE ACCESS…</span>
  </main>
);

interface ErrorScreenProps { onBack: () => void; }
const ErrorScreen: FC<ErrorScreenProps> = ({ onBack }) => (
  <main className="pvr-loading" role="alert" style={{ color: "#ff5b89" }}>
    <span>ACCESS DENIED</span>
    <button onClick={onBack} style={{ marginTop: "20px", background: "transparent", border: "1px solid #ff5b89", color: "#ff5b89", padding: "8px 16px", cursor: "pointer" }}>← BACK</button>
  </main>
);

interface SecurityBannerProps { visible: boolean; onDismiss: () => void; event: SecurityEvent | null; }
const SecurityBanner: FC<SecurityBannerProps> = ({ visible, onDismiss, event }) => {
  if (!visible) return null;
  const message =
    event === "keyboard_capture" ? "SCREEN CAPTURE DETECTED · ID LOGGED" :
    event === "screen_share_detected" ? "SCREEN SHARING DETECTED · SESSION FLAGGED" :
    event === "context_menu" ? "RIGHT-CLICK DISABLED · WATERMARKED" :
    "SUSPICIOUS ACTIVITY DETECTED · SESSION FLAGGED";

  return (
    <div className="pvr-security-banner" role="alert" style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(255, 0, 0, 0.2)", border: "1px solid #ff5b89", color: "#ff5b89", padding: "12px 24px", borderRadius: "8px", zIndex: 100, display: "flex", gap: "16px", alignItems: "center", backdropFilter: "blur(10px)" }}>
      <span aria-hidden="true">⚠</span>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
    </div>
  );
};

export default function PrivateRoom(): ReactElement {
  const [selected, setSelected] = useState<number>(0);
  const [files, setFiles] = useState<PrivateFile[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({ planId: "basic", accessMode: "code", accessCode: "BSIC CODE" });
  const [likes, setLikes] = useState<Record<number, boolean>>(() => {
    try { return JSON.parse(safeLocalStorageGet(LIKES_STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const [notesOpen, setNotesOpen] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [sessionReady, setSessionReady] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [securityBanner, setSecurityBanner] = useState<{ visible: boolean; event: SecurityEvent | null }>({ visible: false, event: null });
  const [contentHidden, setContentHidden] = useState<boolean>(false);
  const lastReportRef = useRef<number>(0);
  const blurTimerRef = useRef<number | null>(null);
  const blurDetectedRef = useRef<boolean>(false);

  const flagEvent = useCallback(
    (event: SecurityEvent, fileId?: number) => {
      const now = Date.now();
      if (now - lastReportRef.current < 1500) return;
      lastReportRef.current = now;
      reportSecurityEvent({ event, code: sessionInfo.accessCode, deviceId, timestamp: now, userAgent: navigator.userAgent, fileId });
      setSecurityBanner({ visible: true, event });
      setContentHidden(true);
      window.setTimeout(() => setContentHidden(false), 1400);
    },
    [deviceId, sessionInfo.accessCode],
  );

  useEffect(() => {
    if (!sessionReady) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (CAPTURE_KEYS.has(e.key)) { flagEvent("keyboard_capture", files[selected]?.id); return; }
      const isMac = navigator.platform.toLowerCase().includes("mac");
      if (isMac && e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) { flagEvent("keyboard_capture", files[selected]?.id); return; }
      if (e.shiftKey && e.metaKey && e.key.toLowerCase() === "s") { flagEvent("keyboard_capture", files[selected]?.id); return; }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true } as EventListenerOptions);
  }, [sessionReady, flagEvent, files, selected]);

  useEffect(() => {
    if (!sessionReady) return;
    const onBlur = () => {
      blurDetectedRef.current = true;
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = window.setTimeout(() => { blurDetectedRef.current = false; }, 400);
    };
    const onFocus = () => {
      if (blurDetectedRef.current) { flagEvent("window_blur", files[selected]?.id); blurDetectedRef.current = false; }
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flagEvent("visibility_drop", files[selected]?.id); };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    };
  }, [sessionReady, flagEvent, files, selected]);

  useEffect(() => {
    if (!sessionReady) return;
    const onContext = (e: MouseEvent) => { e.preventDefault(); flagEvent("context_menu", files[selected]?.id); };
    const devtoolsCheck = window.setInterval(() => {
      const wDiff = window.outerWidth - window.innerWidth;
      const hDiff = window.outerHeight - window.innerHeight;
      if (wDiff > 200 || hDiff > 200) flagEvent("devtools_hint", files[selected]?.id);
    }, 5000);
    document.addEventListener("contextmenu", onContext);
    return () => { document.removeEventListener("contextmenu", onContext); window.clearInterval(devtoolsCheck); };
  }, [sessionReady, flagEvent, files, selected]);

  useEffect(() => {
    if (!sessionReady) return;
    if (detectScreenShare()) {
      reportSecurityEvent({ event: "screen_share_detected", code: sessionInfo.accessCode, deviceId, timestamp: Date.now(), userAgent: navigator.userAgent });
    }
  }, [sessionReady, deviceId, sessionInfo.accessCode]);

  const accessType = getAccessType(sessionInfo.planId, sessionInfo.accessMode);
  const accessRules: AccessRules = ACCESS_RULES[accessType] || ACCESS_RULES.basic;
  const canUse = useCallback((feature: keyof AccessRules): boolean => accessRules[feature] !== false, [accessRules]);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    fetch("/api/access-session", { credentials: "same-origin", cache: "no-store" })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data: AccessSessionResponse) => {
        if (cancelled || !mountedRef.current) return;
        if (data?.authenticated !== true) { window.location.hash = "#/"; return; }
        const planId = normalizePlanId(data.planId);
        const accessMode = normalizeAccessMode(data.accessMode);
        const privateFiles = buildPrivateFiles(planId, accessMode);
        if (!privateFiles.length) { window.location.hash = "#/"; return; }
        setFiles(privateFiles); setSelected(0);
        setSessionInfo({ planId, accessMode, accessCode: getDisplayCode(planId, accessMode) });
        setSessionReady(true);
      })
      .catch(() => { if (!cancelled && mountedRef.current) setSessionError(true); });
    return () => { cancelled = true; mountedRef.current = false; };
  }, []);

  useEffect(() => { safeLocalStorageSet(LIKES_STORAGE_KEY, JSON.stringify(likes)); }, [likes]);

  const selectedFile = files[selected] ?? null;
  const totalLikes = useMemo(() => Object.values(likes).filter(Boolean).length, [likes]);

  useEffect(() => {
    if (!sessionReady || files.length === 0) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
      if (event.key === "ArrowRight") { event.preventDefault(); setSelected((i) => Math.min(i + 1, files.length - 1)); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); setSelected((i) => Math.max(i - 1, 0)); }
      else if (event.key === "Home") { event.preventDefault(); setSelected(0); }
      else if (event.key === "End") { event.preventDefault(); setSelected(files.length - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessionReady, files.length]);

  useEffect(() => { if (!selectedFile) return; setNoteDraft(safeLocalStorageGet(`${NOTE_PREFIX}${selectedFile.id}`)); }, [selectedFile]);
  useEffect(() => {
    if (!selectedFile || !notesOpen) return;
    const timer = window.setTimeout(() => { safeLocalStorageSet(`${NOTE_PREFIX}${selectedFile.id}`, noteDraft); }, 400);
    return () => window.clearTimeout(timer);
  }, [noteDraft, notesOpen, selectedFile]);

  const handleVideocall = useCallback(() => { if (canUse("videocall")) openExternal(VIDEOCALL_URL); }, [canUse]);
  const handleUpgrade = useCallback(() => { if (canUse("upgrade")) openExternal(GET_CODE_URL); }, [canUse]);
  const handleMessage = useCallback(() => { if (canUse("message")) openExternal(USER_URL); }, [canUse]);
  const handleOpenNotes = useCallback(() => { if (!canUse("notes") || !selectedFile) return; setNotesOpen(true); }, [canUse, selectedFile]);
  const handleCloseNotes = useCallback(() => { if (selectedFile) safeLocalStorageSet(`${NOTE_PREFIX}${selectedFile.id}`, noteDraft); setNotesOpen(false); }, [noteDraft, selectedFile]);
  
  const handleSideAction = useCallback((key: string) => {
    if (!canUse(key as keyof AccessRules)) return;
    const actions: Record<string, () => void> = {
      chat: () => openExternal(USER_URL),
      videocall: () => document.getElementById("videocall-stage")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      profile: () => openExternal(USER_URL),
      notes: handleOpenNotes,
      report: () => openExternal(SUPPORT_URL),
    };
    actions[key]?.();
  }, [canUse, handleOpenNotes]);

  const handlePermission = useCallback((key: string) => {
    if (!canUse(key as keyof AccessRules)) return;
    const actions: Record<string, () => void> = {
      telegramfx: () => openExternal(BOT_URL),
      gallery: () => document.querySelector(".pvr-gallery-section")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      chat: () => openExternal(USER_URL),
      priv: () => openExternal(USER_URL),
      group: () => openExternal(`${BOT_URL}?start=group`),
    };
    actions[key]?.();
  }, [canUse]);

  const handleRevoke = useCallback(() => {
    if (!canUse("revoke")) return;
    if (!window.confirm("EXIT PRIVATE ROOM?")) return;
    safeSessionRemove(ACCESS_CODE_KEY);
    window.location.hash = "#/";
  }, [canUse]);

  const handleBack = useCallback(() => { window.location.hash = "#/"; }, []);
  const handleSelectFile = useCallback((index: number) => { setSelected(index); }, []);
  const handleToggleLike = useCallback(() => { if (!selectedFile) return; setLikes((current) => ({ ...current, [selectedFile.id]: !current[selectedFile.id] })); }, [selectedFile]);

  if (sessionError) return <ErrorScreen onBack={handleBack} />;
  if (!sessionReady || !selectedFile) return <LoadingScreen />;

  return (
    <main className={`pvr-page${contentHidden ? " is-obscured" : ""}`} data-access={accessType} data-device={deviceId}>
      <SecurityBanner visible={securityBanner.visible} event={securityBanner.event} onDismiss={() => setSecurityBanner({ visible: false, event: null })} />
      
      {/* Top Bar */}
      <header className="pvr-topbar">
        <button className="pvr-back" type="button" onClick={handleBack}>
          ← USER FX
        </button>
        <span className="pvr-topbar-title">PRIVATE VAULT · ID18</span>
        <span className="pvr-live-dot" aria-label={`Access code: ${sessionInfo.accessCode}`}>
          {sessionInfo.accessCode}
        </span>
      </header>

      {/* Call Stage */}
      <section className="pvr-call-stage" id="videocall-stage" aria-labelledby="call-heading">
        <div className="pvr-call-copy">
          <span className="pvr-kicker">PRIVATE VIDEOCALL</span>
          <h1 id="call-heading">
            YOUR ROOM.<br /><em>YOUR CALL.</em>
          </h1>
          <p>The videocall stage is the first thing inside. Start here, then move through the private files below.</p>
          <div className="pvr-call-actions">
            <button className="pvr-get-in" type="button" onClick={handleVideocall} disabled={!canUse("videocall")}>
              GET IN
            </button>
            <button className="buttonupgrade" type="button" onClick={handleUpgrade} disabled={!canUse("upgrade")}>
              Unlock Pro
            </button>
            <button className="button-message" type="button" onClick={handleMessage} disabled={!canUse("message")}>
              <div className="content-avatar">
                <div className="status-user" aria-hidden="true" />
                <div className="avatar">
                  <svg className="user-img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12,12.5c-3.04,0-5.5,1.73-5.5,3.5s2.46,3.5,5.5,3.5,5.5-1.73,5.5-3.5-2.46-3.5-5.5-3.5Zm0-.5c1.66,0,3-1.34,3-3s-1.34-3-3-3-3,1.34-3,3,1.34,3,3,3Z" />
                  </svg>
                </div>
              </div>
              <div className="notice-content">
                <div className="username">User FX</div>
                <div className="lable-message">Message</div>
                <div className="user-id">@User18Fx</div>
              </div>
            </button>
          </div>
        </div>

        <div className="pvr-video-shell">
          <div className="pvr-video-screen">
            <span className="pvr-video-status">LIVE READY</span>
            <div className="pvr-video-center">
              <div className="pvr-camera-ring"><span aria-hidden="true" /></div>
              <strong>VIDEOCALL STAGE</strong>
              <small>PRIVATE SESSION READY</small>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="pvr-gallery-section" aria-labelledby="gallery-heading">
        <div className="pvr-section-head">
          <div>
            <span>PRIVATE COLLECTION</span>
            <h2 id="gallery-heading">SELECT A FILE</h2>
          </div>
          <div className="pvr-heart-wrap">
            <div className="heart-container" title="Like">
              <input type="checkbox" className="checkbox" checked={Boolean(likes[selectedFile.id])} onChange={handleToggleLike} disabled={!canUse("gallery")} aria-label={`Like private file (${totalLikes} likes)`} />
              <div className="svg-container">
                <svg viewBox="0 0 24 24" className="svg-outline" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z" />
                </svg>
                <svg viewBox="0 0 24 24" className="svg-filled" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z" />
                </svg>
                <svg className="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <polygon points="10,10 20,20" /><polygon points="10,50 20,50" />
                  <polygon points="20,80 30,70" /><polygon points="90,10 80,20" />
                  <polygon points="90,50 80,50" />
                  <polygon points="80,80 70,70" />
                </svg>
              </div>
            </div>
            <span className="pvr-heart-count">{totalLikes}</span>
          </div>
        </div>

        <div className="pvr-workspace">
          <div className="pvr-carousel" role="list" aria-label="Private files gallery">
            {files.map((file, index) => (
              <button 
                type="button" 
                role="listitem" 
                key={file.id} 
                className={`pvr-photo-card${selected === index ? " is-selected" : ""}`} 
                onClick={() => handleSelectFile(index)} 
                disabled={!canUse("gallery")} 
                aria-current={selected === index ? "true" : undefined} 
                aria-label={file.title}
              >
                <img src={file.src} alt={file.title} loading={index === 0 || index === selected ? "eager" : "lazy"} draggable={false} onContextMenu={(e) => e.preventDefault()} />
                <WatermarkOverlay code={sessionInfo.accessCode} deviceId={deviceId} fileId={file.id} />
                <span>{file.title}</span>
              </button>
            ))}
          </div>

          <aside className="pvr-side-menu" aria-label="File actions and permissions">
            <div className="pvr-selected-preview">
              <div className="pvr-preview-frame">
                <img src={selectedFile.src} alt={`Preview of ${selectedFile.title}`} draggable={false} onContextMenu={(e) => e.preventDefault()} />
                <WatermarkOverlay code={sessionInfo.accessCode} deviceId={deviceId} fileId={selectedFile.id} />
              </div>
              <div>
                <span>SELECTED</span>
                <strong>{selectedFile.title}</strong>
              </div>
            </div>

            <nav className="pvr-side-actions" aria-label="Quick actions">
              {SIDE_ACTIONS.map((action) => (
                <button 
                  key={action.key} 
                  type="button"
                  onClick={() => handleSideAction(action.key)}
                  disabled={!canUse(action.key as keyof AccessRules)}
                >
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </button>
              ))}
            </nav>

            <div className="pvr-permission-panel" aria-label="Access permissions">
              <button type="button" className="pvr-permission pvr-permission--wide" onClick={() => handlePermission("telegramfx")} disabled={!canUse("telegramfx")}>
                TelegramFX
              </button>
              <div className="pvr-permission-row">
                <button type="button" className="pvr-permission" onClick={() => handlePermission("gallery")} disabled={!canUse("gallery")}>Gallery</button>
                <button type="button" className="pvr-permission" onClick={() => handlePermission("chat")} disabled={!canUse("chat")}>Chat</button>
              </div>
              <div className="pvr-permission-row">
                <button type="button" className="pvr-permission" onClick={() => handlePermission("priv")} disabled={!canUse("priv")}>Priv</button>
                <button type="button" className="pvr-permission" onClick={() => handlePermission("group")} disabled={!canUse("group")}>Group</button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Notes Drawer (Inlined for simplicity in premium version) */}
      {notesOpen && (
        <aside className="pvr-notes is-open" aria-hidden={!notesOpen} aria-label="Private notes" style={{ position: "fixed", top: 0, right: 0, width: "300px", height: "100vh", background: "rgba(0,0,0,0.9)", borderLeft: "1px solid var(--gold)", zIndex: 100, padding: "24px", backdropFilter: "blur(20px)" }}>
          <header className="pvr-notes-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <span style={{ color: "var(--cyan)", fontSize: "0.7rem", letterSpacing: "0.2em" }}>PRIVATE NOTE</span>
              <strong style={{ display: "block", color: "#fff" }}>{selectedFile.title}</strong>
            </div>
            <button type="button" onClick={handleCloseNotes} aria-label="Close notes" style={{ background: "transparent", border: 0, color: "#fff", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
          </header>
          <textarea 
            className="pvr-notes-input" 
            value={noteDraft} 
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Write something private…" 
            rows={10} 
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-glass)", borderRadius: "8px", padding: "12px", color: "#fff", resize: "none" }}
          />
          <small style={{ color: "var(--text-muted)", display: "block", marginTop: "8px", fontSize: "0.7rem" }}>Autosaved locally</small>
        </aside>
      )}
    </main>
  );
}