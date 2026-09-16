import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import "./VaultInfoDevice.css";

/* ─── Types ─── */
type PlanId = "basic" | "pro" | "vip";
type AccessMode = "telegram_identity" | string;

interface PrivateFile {
  id: number;
  src: string;
  title: string;
}

interface AccessSession {
  authenticated: boolean;
  planId?: PlanId;
  accessMode?: AccessMode;
}

type LikesMap = Record<number, boolean>;

type SideIconKey = "chat" | "call" | "user" | "note" | "flag";

interface SideAction {
  icon: SideIconKey;
  label: string;
  desc: string;
}

/* ─── Constants ─── */
const LIKES_STORAGE_KEY = "userfx_private_likes";

const privatePhoto = (pathname: string): string =>
  `/api/private-media?pathname=${encodeURIComponent(pathname)}`;

const buildPaths = (folder: string, count: number): string[] =>
  Array.from(
    { length: count },
    (_, i) => `userfx-album/${folder}/${folder}-${String(i + 1).padStart(2, "0")}.jpg`
  );

const PRIVATE_PATHS: Record<PlanId, string[]> = {
  basic: buildPaths("BSIC", 5),
  pro: buildPaths("PRX0", 3),
  vip: buildPaths("VIPX", 4),
};

const PLAN_LABELS: Record<PlanId, string> = { basic: "BASIC", pro: "PRO", vip: "VIP" };

const SIDE_ACTIONS: SideAction[] = [
  { icon: "chat", label: "Chat", desc: "Open private chat" },
  { icon: "call", label: "Videocall", desc: "Jump to the call stage" },
  { icon: "user", label: "Profile", desc: "View active profile" },
  { icon: "note", label: "Notes", desc: "Keep private notes" },
  { icon: "flag", label: "Report", desc: "Flag for review" },
];

const SIDE_ICONS: Record<SideIconKey, ReactElement> = {
  chat: (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  call: (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  flag: (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
};

/* ─── Helpers ─── */
function buildPrivateFiles(planId?: PlanId, accessMode?: AccessMode): PrivateFile[] {
  const fullAccess = accessMode === "telegram_identity" || planId === "vip";
  const paths: string[] = fullAccess
    ? [...PRIVATE_PATHS.basic, ...PRIVATE_PATHS.pro, ...PRIVATE_PATHS.vip]
    : planId === "pro"
      ? [...PRIVATE_PATHS.basic, ...PRIVATE_PATHS.pro]
      : planId === "basic"
        ? PRIVATE_PATHS.basic
        : [];

  return paths.map((pathname, index) => ({
    id: index + 1,
    src: privatePhoto(pathname),
    title: `PRIVATE FILE ${String(index + 1).padStart(2, "0")}`,
  }));
}

function loadLikes(): LikesMap {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as LikesMap) : {};
  } catch {
    return {};
  }
}

const goHome = (): void => {
  window.location.hash = "#/";
};

/* ─── Sub-components ─── */
function MessageButton(): ReactElement {
  return (
    <button className="pvr-btn-msg" type="button" aria-label="Open chat with User FX">
      <div className="pvr-btn-msg__avatar-wrap">
        <div className="pvr-btn-msg__status" />
        <div className="pvr-btn-msg__avatar">
          <svg className="pvr-btn-msg__img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12,12.5c-3.04,0-5.5,1.73-5.5,3.5s2.46,3.5,5.5,3.5,5.5-1.73,5.5-3.5-2.46-3.5-5.5-3.5Zm0-.5c1.66,0,3-1.34,3-3s-1.34-3-3-3-3,1.34-3,3,1.34,3,3,3Z" />
          </svg>
        </div>
      </div>
      <div className="pvr-btn-msg__body">
        <div className="pvr-btn-msg__name">User FX</div>
        <div className="pvr-btn-msg__label">
          Message
          <span className="pvr-btn-msg__badge">3</span>
        </div>
        <div className="pvr-btn-msg__handle">@User18Fx</div>
      </div>
    </button>
  );
}

interface HeartButtonProps {
  checked: boolean;
  onChange: () => void;
  count: number;
}

function HeartButton({ checked, onChange, count }: HeartButtonProps): ReactElement {
  return (
    <div className="pvr-heart">
      <label className="pvr-heart__box" title="Like">
        <input
          type="checkbox"
          className="pvr-heart__input"
          checked={checked}
          onChange={onChange}
          aria-label="Like private file"
        />
        <svg viewBox="0 0 24 24" className="pvr-heart__outline" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z" />
        </svg>
        <svg viewBox="0 0 24 24" className="pvr-heart__filled" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z" />
        </svg>
        <svg className="pvr-heart__burst" width="100" height="100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <polygon points="10,10 20,20" />
          <polygon points="10,50 20,50" />
          <polygon points="20,80 30,70" />
          <polygon points="90,10 80,20" />
          <polygon points="90,50 80,50" />
          <polygon points="80,80 70,70" />
        </svg>
      </label>
      <span className="pvr-heart__count">{count}</span>
    </div>
  );
}

function UpgradeButton(): ReactElement {
  return (
    <button className="pvr-btn-upgrade" type="button" aria-label="Unlock Pro plan">
      <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" />
      </svg>
      Unlock Pro
    </button>
  );
}

interface NavArrowProps {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}

function NavArrow({ direction, onClick, disabled }: NavArrowProps): ReactElement {
  return (
    <button
      className={`pvr-nav-arrow pvr-nav-arrow--${direction}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous file" : "Next file"}
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d={direction === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/* ─── Main ─── */
export default function PrivateRoom(): ReactElement {
  const [selected, setSelected] = useState<number>(0);
  const [files, setFiles] = useState<PrivateFile[]>([]);
  const [likes, setLikes] = useState<LikesMap>(loadLikes);
  const [sessionReady, setSessionReady] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<boolean>(false);
  const [planId, setPlanId] = useState<PlanId | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [enterAnim, setEnterAnim] = useState<boolean>(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  /* Session check */
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch("/api/access-session", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AccessSession>;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data?.authenticated) {
          goHome();
          return;
        }
        const privateFiles = buildPrivateFiles(data.planId, data.accessMode);
        if (!privateFiles.length) {
          goHome();
          return;
        }
        setFiles(privateFiles);
        setPlanId(data.planId ?? "basic");
        setSelected(0);
        setSessionReady(true);
        requestAnimationFrame(() => setEnterAnim(true));
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setSessionError(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  /* Persist likes */
  useEffect(() => {
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
  }, [likes]);

  /* Reset preview fade on change */
  useEffect(() => {
    setImageLoaded(false);
  }, [selected]);

  /* Scroll selected card into view */
  useEffect(() => {
    const container = carouselRef.current;
    if (!container || !files.length) return;
    const card = container.children[selected] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selected, files.length]);

  /* Handlers */
  const handleSelect = useCallback((index: number) => setSelected(index), []);

  const handlePrev = useCallback(() => {
    setSelected((s) => Math.max(0, s - 1));
  }, []);

  const handleNext = useCallback(() => {
    setSelected((s) => Math.min(files.length - 1, s + 1));
  }, [files.length]);

  const toggleLike = useCallback(() => {
    const id = files[selected]?.id;
    if (!id) return;
    setLikes((cur) => ({ ...cur, [id]: !cur[id] }));
  }, [files, selected]);

  /* Keyboard navigation */
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrev, handleNext]);

  const selectedFile = files[selected] ?? null;
  const totalLikes = useMemo(() => Object.values(likes).filter(Boolean).length, [likes]);
  const planLabel = planId ? PLAN_LABELS[planId] : "BASIC";

  /* States */
  if (sessionError) {
    return (
      <main className="pvr-error">
        <div className="pvr-error__inner">
          <svg viewBox="0 0 24 24" width="48" height="48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="16" r="0.8" fill="currentColor" />
          </svg>
          <h2>ACCESS DENIED</h2>
          <p>Private session could not be established.</p>
          <button className="pvr-error__retry" type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!sessionReady || !selectedFile) {
    return (
      <main className="pvr-loading">
        <div className="pvr-loading__inner">
          <div className="pvr-loading__ring" />
          <span>VERIFYING PRIVATE ACCESS</span>
        </div>
      </main>
    );
  }

  return (
    <main className={`pvr-page${enterAnim ? " is-ready" : ""}`}>
      <header className="pvr-topbar">
        <button className="pvr-topbar__back" type="button" onClick={goHome} aria-label="Back to main">
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          USER FX
        </button>
        <span className="pvr-topbar__title">PRIVATE ROOM · ID18</span>
        <div className="pvr-topbar__right">
          <span className="pvr-topbar__plan">{planLabel}</span>
          <span className="pvr-topbar__dot" />
          <span className="pvr-topbar__status">ONLINE</span>
        </div>
      </header>

      <section className="pvr-hero" aria-label="Private videocall stage">
        <div className="pvr-hero__copy">
          <span className="pvr-hero__kicker">PRIVATE VIDEOCALL</span>
          <h1 className="pvr-hero__heading">
            YOUR ROOM.
            <br />
            <em>YOUR CALL.</em>
          </h1>
          <p className="pvr-hero__desc">
            The videocall stage is the first thing inside. Start here, then move through the private files below.
          </p>
          <div className="pvr-hero__actions">
            <button className="pvr-btn-enter" type="button">
              GET IN
            </button>
            <UpgradeButton />
            <MessageButton />
          </div>
        </div>
        <div className="pvr-hero__shell">
          <div className="pvr-hero__screen">
            <span className="pvr-hero__badge">READY</span>
            <div className="pvr-hero__center">
              <div className="pvr-hero__ring">
                <span className="pvr-hero__ring-inner" />
              </div>
              <strong>VIDEOCALL STAGE</strong>
              <small>PRIVATE SESSION READY</small>
            </div>
            <div className="pvr-hero__scanline" />
          </div>
        </div>
      </section>

      <section className="pvr-gallery" aria-label="Private file collection">
        <div className="pvr-gallery__head">
          <div className="pvr-gallery__head-left">
            <span className="pvr-gallery__label">PRIVATE COLLECTION</span>
            <h2 className="pvr-gallery__title">SELECT A FILE</h2>
          </div>
          <div className="pvr-gallery__head-right">
            <span className="pvr-gallery__counter">
              {selected + 1} / {files.length}
            </span>
            <HeartButton checked={Boolean(likes[selectedFile.id])} onChange={toggleLike} count={totalLikes} />
          </div>
        </div>

        <div className="pvr-gallery__body">
          <div className="pvr-carousel-wrap">
            <NavArrow direction="prev" onClick={handlePrev} disabled={selected === 0} />
            <div className="pvr-carousel" ref={carouselRef} role="listbox" aria-label="Private files">
              {files.map((file, index) => {
                const isSelected = selected === index;
                const isLiked = Boolean(likes[file.id]);
                return (
                  <button
                    type="button"
                    role="option"
                    key={file.id}
                    className={`pvr-card${isSelected ? " is-selected" : ""}${isLiked ? " is-liked" : ""}`}
                    aria-selected={isSelected}
                    onClick={() => handleSelect(index)}
                  >
                    <div className="pvr-card__img-wrap">
                      <img src={file.src} alt={file.title} loading={index < 3 ? "eager" : "lazy"} />
                      {isLiked && (
                        <span className="pvr-card__heart" aria-hidden="true">
                          ♥
                        </span>
                      )}
                    </div>
                    <span className="pvr-card__label">{file.title}</span>
                  </button>
                );
              })}
            </div>
            <NavArrow direction="next" onClick={handleNext} disabled={selected === files.length - 1} />
          </div>

          <aside className="pvr-sidebar" aria-label="File details and actions">
            <div className="pvr-preview">
              <div className={`pvr-preview__img-wrap${imageLoaded ? " is-loaded" : ""}`}>
                <img
                  key={selectedFile.id}
                  src={selectedFile.src}
                  alt={selectedFile.title}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
              <div className="pvr-preview__meta">
                <span className="pvr-preview__tag">SELECTED</span>
                <strong className="pvr-preview__name">{selectedFile.title}</strong>
              </div>
            </div>

            <nav className="pvr-actions" aria-label="File actions">
              {SIDE_ACTIONS.map(({ icon, label, desc }) => (
                <button type="button" key={label} className="pvr-actions__btn">
                  <span className="pvr-actions__icon">{SIDE_ICONS[icon]}</span>
                  <span className="pvr-actions__text">
                    <strong>{label}</strong>
                    <span>{desc}</span>
                  </span>
                </button>
              ))}
            </nav>

            <div className="pvr-perms" aria-label="Permission controls">
              <button type="button" className="pvr-perm pvr-perm--wide">
                TelegramFX
              </button>
              <div className="pvr-perms__row">
                <button type="button" className="pvr-perm">Gallery</button>
                <button type="button" className="pvr-perm">Chat</button>
              </div>
              <div className="pvr-perms__row">
                <button type="button" className="pvr-perm">Priv</button>
                <button type="button" className="pvr-perm">Group</button>
                <button type="button" className="pvr-perm pvr-perm--revoke">
                  REVOKE ALL
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}