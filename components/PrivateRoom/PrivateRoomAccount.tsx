import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import PrivateRoom from "./PrivateRoom";
import "./PrivateRoomAccount.css";
import "./PrivateRoomCamera.css";

type ProfileVisibility = "private" | "members" | "public";
type OnlineVisibility = "hidden" | "members" | "public";
type CameraVisibility = "private" | "public";

type AccountProfile = {
  displayName: string;
  bio: string;
  visibility: ProfileVisibility;
  onlineVisibility: OnlineVisibility;
  mediaVisibility: ProfileVisibility;
};

type AccountData = {
  accountId: string;
  telegramUsername: string | null;
  planId: "basic" | "pro" | "vip";
  accessMode: string;
  accessLabel: string | null;
  memberAccess: boolean;
  profile: AccountProfile;
};

type AccountResponse = {
  ok?: boolean;
  authenticated?: boolean;
  account?: AccountData;
  error?: string;
};

type ProfileViewProps = {
  account: AccountData;
  profile: AccountProfile;
  accessLabel: string;
  cameraLive: boolean;
  cameraVisibility: CameraVisibility;
  onClose: () => void;
  onEdit: () => void;
  onGoOnline: () => void;
};

type CameraStudioProps = {
  stream: MediaStream | null;
  visibility: CameraVisibility;
  live: boolean;
  requesting: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
  onVisibilityChange: (visibility:CameraVisibility) => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onStart: () => void;
  onStop: () => void;
};

const DEV_PROFILE_KEY = "userfx_dev_account_profile";

const EMPTY_PROFILE:AccountProfile = {
  displayName:"",
  bio:"",
  visibility:"private",
  onlineVisibility:"members",
  mediaVisibility:"private",
};

function getAccessLabel(account:AccountData) {
  if (account.accessMode === "telegram_identity") return "SPCL";
  if (account.planId === "vip") return "VIPX";
  if (account.planId === "pro") return "PRX0";
  return "BSIC";
}

function getInitials(account:AccountData) {
  const source = account.profile.displayName || account.telegramUsername || "FX";
  const clean = source.replace(/^@/,"").trim();
  return clean.slice(0,2).toUpperCase() || "FX";
}

function getProfileName(account:AccountData,profile:AccountProfile) {
  return profile.displayName || account.telegramUsername || "USER FX MEMBER";
}

function getDevProfile():AccountProfile {
  try {
    const stored = JSON.parse(localStorage.getItem(DEV_PROFILE_KEY) || "{}");
    return {...EMPTY_PROFILE,...stored};
  } catch {
    return EMPTY_PROFILE;
  }
}

function createDevAccount():AccountData {
  return {
    accountId:"usr_DEV_USER18FX",
    telegramUsername:"@User18Fx",
    planId:"vip",
    accessMode:"telegram_identity",
    accessLabel:"SPCL",
    memberAccess:true,
    profile:getDevProfile(),
  };
}

/* ========   MEMBER PROFILE VIEW =========================== */
function ProfileView({
  account,
  profile,
  accessLabel,
  cameraLive,
  cameraVisibility,
  onClose,
  onEdit,
  onGoOnline,
}:ProfileViewProps) {
  const statusHidden = profile.onlineVisibility === "hidden";
  const visibleOnline = cameraLive && !statusHidden;
  const profileName = getProfileName(account,profile);

  return (
    <>
      <button
        type="button"
        className="pvr-profile-view-backdrop"
        onClick={onClose}
        aria-label="Close member profile"
      ></button>

      <section className="pvr-profile-view" aria-label="USER FX member profile">
        {/* ─────   PROFILE HEADER ─────── */}
        <header className="pvr-profile-view-head">
          <div>
            <span>USER FX · MEMBER PROFILE</span>
            <strong>{accessLabel} ACCESS</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Close profile">
            ✕
          </button>
        </header>

        {/* ─────   PROFILE HERO ─────── */}
        <div className="pvr-profile-hero">
          <div className="pvr-profile-avatar">
            {getInitials({...account,profile})}
            <span className={visibleOnline ? "is-online" : "is-hidden"}></span>
          </div>

          <div className="pvr-profile-copy">
            <div className="pvr-profile-status-row">
              <span className={`pvr-profile-status ${visibleOnline ? "is-online" : "is-hidden"}`}>
                {statusHidden
                  ? "○ STATUS HIDDEN"
                  : cameraLive
                    ? "● ONLINE"
                    : "○ OFFLINE"}
              </span>
              <span>{profile.visibility.toUpperCase()}</span>
            </div>

            <h1>{profileName}</h1>
            <p className="pvr-profile-username">
              {account.telegramUsername || "PRIVATE MEMBER"}
            </p>
            <p className="pvr-profile-bio">
              {profile.bio || "No bio yet."}
            </p>
          </div>
        </div>

        {/* ─────   PROFILE META ─────── */}
        <div className="pvr-profile-meta">
          <div>
            <span>ACCESS</span>
            <strong>{accessLabel}</strong>
          </div>
          <div>
            <span>PROFILE</span>
            <strong>{profile.visibility.toUpperCase()}</strong>
          </div>
          <div>
            <span>MEDIA</span>
            <strong>{profile.mediaVisibility.toUpperCase()}</strong>
          </div>
          <div>
            <span>STATUS</span>
            <strong>{profile.onlineVisibility.toUpperCase()}</strong>
          </div>
        </div>

        {/* ─────   CAMERA STATUS ─────── */}
        <div className="pvr-profile-camera">
          <div className="pvr-profile-camera-screen">
            <span>CAMERA</span>
            <strong>{cameraLive ? "LIVE" : "OFFLINE"}</strong>
            <small>
              {cameraLive
                ? `${cameraVisibility.toUpperCase()} PROFILE CAM`
                : "PRIVATE VIDEO PROFILE"}
            </small>
          </div>

          <button type="button" onClick={onGoOnline}>
            {cameraLive ? "MANAGE CAM" : "GO ONLINE"}
          </button>
        </div>

        {/* ─────   MEDIA ─────── */}
        <section className="pvr-profile-media" aria-label="Member media">
          <div className="pvr-profile-media-head">
            <div>
              <span>PRIVATE MEDIA</span>
              <strong>PROFILE COLLECTION</strong>
            </div>
            <small>{profile.mediaVisibility.toUpperCase()}</small>
          </div>

          <div className="pvr-profile-media-tabs">
            <button type="button" className="is-active">PHOTOS <span>0</span></button>
            <button type="button">VIDEOS <span>0</span></button>
            <button type="button">ALBUMS <span>0</span></button>
          </div>

          <div className="pvr-profile-media-empty">
            <span>NO MEDIA POSTED YET</span>
            <small>Photos, videos and albums will appear here.</small>
          </div>
        </section>

        {/* ─────   PROFILE ACTIONS ─────── */}
        <footer className="pvr-profile-actions">
          <button type="button" className="pvr-profile-edit" onClick={onEdit}>
            EDIT PROFILE
          </button>
          <span>ID · {account.accountId.slice(-10).toUpperCase()}</span>
        </footer>
      </section>
    </>
  );
}

/* ========   CAMERA STUDIO =========================== */
function CameraStudio({
  stream,
  visibility,
  live,
  requesting,
  cameraEnabled,
  micEnabled,
  error,
  onClose,
  onRetry,
  onVisibilityChange,
  onToggleCamera,
  onToggleMic,
  onStart,
  onStop,
}:CameraStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;

    if (stream) {
      void videoRef.current.play().catch(() => {});
    }
  },[stream]);

  return (
    <>
      <button
        type="button"
        className="pvr-camera-backdrop"
        onClick={onClose}
        aria-label="Close camera studio"
      ></button>

      <section className="pvr-camera-studio" aria-label="USER FX camera studio">
        {/* ─────   CAMERA HEADER ─────── */}
        <header className="pvr-camera-head">
          <div>
            <span>USER FX · CAMERA STUDIO</span>
            <strong>{live ? "CAM ACTIVE" : requesting ? "CONNECTING..." : "PREVIEW"}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Close camera studio">
            ✕
          </button>
        </header>

        {/* ─────   CAMERA PREVIEW ─────── */}
        <div className={`pvr-camera-preview ${cameraEnabled ? "" : "is-camera-off"}`}>
          <video ref={videoRef} autoPlay muted playsInline></video>

          <div className="pvr-camera-badges">
            <span className={live ? "is-live" : ""}>
              {live ? "● CAM ACTIVE" : "● PREVIEW"}
            </span>
            <span>{visibility.toUpperCase()}</span>
            <span className={micEnabled ? "" : "is-muted"}>
              {micEnabled ? "MIC ON" : "MIC OFF"}
            </span>
          </div>

          {requesting && (
            <div className="pvr-camera-placeholder">
              <strong>CONNECTING CAMERA</strong>
              <span>ALLOW CAMERA + MICROPHONE ACCESS</span>
            </div>
          )}

          {!requesting && error && (
            <div className="pvr-camera-placeholder is-error">
              <strong>CAMERA NOT AVAILABLE</strong>
              <span>{error}</span>
            </div>
          )}

          {!requesting && !error && !stream && (
            <div className="pvr-camera-placeholder">
              <strong>CAMERA OFFLINE</strong>
              <span>CONNECT YOUR CAMERA TO CONTINUE</span>
            </div>
          )}

          {!requesting && !error && stream && !cameraEnabled && (
            <div className="pvr-camera-placeholder">
              <strong>CAMERA PAUSED</strong>
              <span>TURN CAMERA ON TO RESTORE VIDEO</span>
            </div>
          )}
        </div>

        <div className="pvr-camera-layout">
          {/* ─────   CAMERA SETTINGS ─────── */}
          <div className="pvr-camera-settings">
            <span>WHO CAN SEE YOUR CAM</span>

            <div className="pvr-camera-visibility">
              <button
                type="button"
                className={visibility === "private" ? "is-active" : ""}
                onClick={() => onVisibilityChange("private")}
              >
                PRIVATE
              </button>
              <button
                type="button"
                className={visibility === "public" ? "is-active" : ""}
                onClick={() => onVisibilityChange("public")}
              >
                PUBLIC
              </button>
            </div>

            <div className="pvr-camera-device-controls">
              <button
                type="button"
                className={cameraEnabled ? "" : "is-off"}
                onClick={onToggleCamera}
                disabled={!stream}
              >
                CAMERA {cameraEnabled ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                className={micEnabled ? "" : "is-off"}
                onClick={onToggleMic}
                disabled={!stream}
              >
                MIC {micEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* ─────   CAMERA ACTION ─────── */}
          <div className="pvr-camera-actions">
            <span>PROFILE CAMERA</span>

            {error ? (
              <button type="button" className="pvr-camera-start" onClick={onRetry}>
                TRY AGAIN
              </button>
            ) : live ? (
              <button type="button" className="pvr-camera-end" onClick={onStop}>
                END CAM
              </button>
            ) : (
              <button
                type="button"
                className="button-with-icon pvr-camera-start pvr-camera-enter"
                onClick={onStart}
                disabled={!stream || !cameraEnabled || requesting}
                aria-label="Enter camera"
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}
              >
                <svg
                  className="icon"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  style={{width:"22px",height:"22px",flex:"0 0 22px"}}
                >
                  <path
                    fill="currentColor"
                    d="M12 39c-.549 0-1.095-.15-1.578-.447A3.008 3.008 0 0 1 9 36V12c0-1.041.54-2.007 1.422-2.553a3.014 3.014 0 0 1 2.919-.132l24 12a3.003 3.003 0 0 1 0 5.37l-24 12c-.42.21-.885.315-1.341.315z"
                  ></path>
                </svg>
                <span className="text">ENTER</span>
              </button>
            )}
          </div>
        </div>

        <footer className="pvr-camera-foot">
          <strong>{visibility.toUpperCase()} MODE</strong>
          <span>CAMERA + MICROPHONE ARE CONTROLLED FROM THIS SESSION.</span>
        </footer>
      </section>
    </>
  );
}

export default function PrivateRoomAccount() {
  const [account,setAccount] = useState<AccountData | null>(null);
  const [profile,setProfile] = useState<AccountProfile>(EMPTY_PROFILE);
  const [open,setOpen] = useState(false);
  const [profileViewOpen,setProfileViewOpen] = useState(false);
  const [cameraOpen,setCameraOpen] = useState(false);
  const [cameraStream,setCameraStream] = useState<MediaStream | null>(null);
  const [cameraVisibility,setCameraVisibility] = useState<CameraVisibility>("private");
  const [cameraLive,setCameraLive] = useState(false);
  const [cameraRequesting,setCameraRequesting] = useState(false);
  const [cameraEnabled,setCameraEnabled] = useState(false);
  const [micEnabled,setMicEnabled] = useState(false);
  const [cameraError,setCameraError] = useState("");
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  /* ─────   LOCAL DEV ACCOUNT ─────── */
  const loadDevAccount = useCallback(() => {
    if (!import.meta.env.DEV) return false;
    const devAccount = createDevAccount();
    setAccount(devAccount);
    setProfile(devAccount.profile);
    return true;
  },[]);

  /* ─────   LOAD ACCOUNT ─────── */
  useEffect(() => {
    let cancelled = false;

    fetch("/api/account",{
      method:"GET",
      headers:{Accept:"application/json"},
      credentials:"same-origin",
      cache:"no-store",
    })
      .then((response) =>
        response.json().then((data:AccountResponse) => ({response,data})),
      )
      .then(({response,data}) => {
        if (cancelled) return;
        if (!response.ok || !data?.authenticated || !data.account) {
          loadDevAccount();
          return;
        }
        setAccount(data.account);
        setProfile({...EMPTY_PROFILE,...data.account.profile});
      })
      .catch(() => {
        if (!cancelled) loadDevAccount();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {cancelled = true;};
  },[loadDevAccount]);

  /* ─────   STOP CAMERA STREAM ─────── */
  const stopCameraStream = useCallback(() => {
    const current = streamRef.current;

    if (current) {
      current.getTracks().forEach((track) => track.stop());
    }

    streamRef.current = null;
    setCameraStream(null);
    setCameraLive(false);
    setCameraEnabled(false);
    setMicEnabled(false);
  },[]);

  /* ─────   REQUEST CAMERA + MICROPHONE ─────── */
  const requestCamera = useCallback(async () => {
    setOpen(false);
    setProfileViewOpen(false);
    setCameraOpen(true);
    setCameraError("");
    setCameraRequesting(true);
    setCameraLive(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraRequesting(false);
      setCameraError("CAMERA API IS NOT AVAILABLE IN THIS BROWSER");
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraStream(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video:{
          facingMode:"user",
          width:{ideal:1280},
          height:{ideal:720},
        },
        audio:true,
      });

      streamRef.current = stream;
      setCameraStream(stream);
      setCameraEnabled(stream.getVideoTracks().some((track) => track.enabled));
      setMicEnabled(stream.getAudioTracks().some((track) => track.enabled));

      stream.getTracks().forEach((track) => {
        track.addEventListener("ended",() => {
          if (track.kind === "video") {
            setCameraEnabled(false);
            setCameraLive(false);
          }
          if (track.kind === "audio") {
            setMicEnabled(false);
          }
        },{once:true});
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";

      setCameraError(
        name === "NotAllowedError"
          ? "CAMERA OR MICROPHONE PERMISSION WAS DENIED"
          : name === "NotFoundError"
            ? "NO CAMERA OR MICROPHONE WAS FOUND"
            : name === "NotReadableError"
              ? "CAMERA IS ALREADY IN USE BY ANOTHER APP"
              : "COULD NOT START CAMERA + MICROPHONE",
      );
    } finally {
      setCameraRequesting(false);
    }
  },[]);

  /* ─────   CAMERA CLEANUP ─────── */
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  },[]);

  /* ─────   PRIVATE ROOM · PROFILE ACTION ─────── */
  useEffect(() => {
    const handleProfileAction = (event:MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest(".pvr-side-actions button") as HTMLButtonElement | null;
      if (!button) return;

      const label = button.querySelector("strong")?.textContent?.trim().toUpperCase();
      if (label !== "PROFILE") return;

      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setCameraOpen(false);
      setProfileViewOpen(true);
    };

    document.addEventListener("click",handleProfileAction,true);
    return () => document.removeEventListener("click",handleProfileAction,true);
  },[]);

  /* ─────   LOCK PAGE BEHIND PANELS ─────── */
  useEffect(() => {
    if (!open && !profileViewOpen && !cameraOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  },[cameraOpen,open,profileViewOpen]);

  /* ─────   PROFILE INPUT ─────── */
  const handleTextChange = useCallback((event:ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name,value} = event.target;
    setProfile((current) => ({...current,[name]:value}));
    setMessage("");
  },[]);

  const handleSelectChange = useCallback((event:ChangeEvent<HTMLSelectElement>) => {
    const {name,value} = event.target;
    setProfile((current) => ({...current,[name]:value} as AccountProfile));
    setMessage("");
  },[]);

  /* ─────   SAVE PROFILE ─────── */
  const handleSave = useCallback(async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setMessage("");

      if (import.meta.env.DEV && account?.accountId === "usr_DEV_USER18FX") {
        localStorage.setItem(DEV_PROFILE_KEY,JSON.stringify(profile));
        setAccount((current) => current ? {...current,profile} : current);
        setMessage("PROFILE SAVED");
        return;
      }

      const response = await fetch("/api/account",{
        method:"PATCH",
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
        },
        credentials:"same-origin",
        cache:"no-store",
        body:JSON.stringify({profile}),
      });

      const data:AccountResponse = await response.json().catch(() => ({}));

      if (!response.ok || !data?.account) {
        throw new Error(data?.error || "PROFILE UPDATE FAILED");
      }

      setAccount(data.account);
      setProfile({...EMPTY_PROFILE,...data.account.profile});
      setMessage("PROFILE SAVED");
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "PROFILE UPDATE FAILED",
      );
    } finally {
      setSaving(false);
    }
  },[account,profile,saving]);

  const handleOpenProfile = useCallback(() => {
    setOpen(false);
    setCameraOpen(false);
    setMessage("");
    setProfileViewOpen(true);
  },[]);

  const handleEditProfile = useCallback(() => {
    setProfileViewOpen(false);
    setCameraOpen(false);
    setMessage("");
    setOpen(true);
  },[]);

  const handleGoOnline = useCallback(() => {
    void requestCamera();
  },[requestCamera]);

  const handleCloseCamera = useCallback(() => {
    stopCameraStream();
    setCameraError("");
    setCameraRequesting(false);
    setCameraOpen(false);
    setProfileViewOpen(true);
  },[stopCameraStream]);

  const handleToggleCamera = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const next = !cameraEnabled;
    stream.getVideoTracks().forEach((track) => {track.enabled = next;});
    setCameraEnabled(next);
  },[cameraEnabled]);

  const handleToggleMic = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const next = !micEnabled;
    stream.getAudioTracks().forEach((track) => {track.enabled = next;});
    setMicEnabled(next);
  },[micEnabled]);

  const handleStartCam = useCallback(() => {
    if (!cameraStream || !cameraEnabled) return;
    setCameraLive(true);
  },[cameraEnabled,cameraStream]);

  const handleStopCam = useCallback(() => {
    setCameraLive(false);
  },[]);

  /* ─────   ESCAPE PANELS ─────── */
  useEffect(() => {
    if (!profileViewOpen && !open && !cameraOpen) return;

    const handleEscape = (event:KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (cameraOpen) {
        handleCloseCamera();
        return;
      }

      setProfileViewOpen(false);
      setOpen(false);
    };

    window.addEventListener("keydown",handleEscape);
    return () => window.removeEventListener("keydown",handleEscape);
  },[cameraOpen,handleCloseCamera,open,profileViewOpen]);

  const accessLabel = account ? getAccessLabel(account) : "";

  return (
    <>
      <PrivateRoom />

      {!loading && account && (
        <>
          {/* ─────   ACCOUNT BUTTON ─────── */}
          <button
            type="button"
            className={`pvr-account-launcher ${open ? "is-open" : ""}`}
            onClick={() => {
              setOpen((current) => !current);
              setMessage("");
              setProfileViewOpen(false);
            }}
            aria-expanded={open}
            aria-controls="pvr-account-panel"
          >
            <span className="pvr-account-avatar">
              {getInitials({...account,profile})}
            </span>
            <span className="pvr-account-launcher-copy">
              <small>{accessLabel}</small>
              <strong>PROFILE</strong>
            </span>
            <span className={`pvr-account-online ${cameraLive ? "" : "is-offline"}`} aria-hidden="true"></span>
          </button>

          {/* ========   ACCOUNT PROFILE =========================== */}
          <aside
            id="pvr-account-panel"
            className={`pvr-account-panel ${open ? "is-open" : ""}`}
            aria-hidden={!open}
          >
            <div className="pvr-account-head">
              <div>
                <span>USER FX · PRIVATE ACCOUNT</span>
                <strong>{account.telegramUsername || "PRIVATE MEMBER"}</strong>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close profile">
                ✕
              </button>
            </div>

            <div className="pvr-account-identity">
              <div className="pvr-account-avatar pvr-account-avatar--large">
                {getInitials({...account,profile})}
              </div>
              <div>
                <span className="pvr-account-access">{accessLabel} ACCESS</span>
                <strong>{getProfileName(account,profile)}</strong>
                <small>ID · {account.accountId.slice(-10).toUpperCase()}</small>
              </div>
            </div>

            <button className="pvr-account-view" type="button" onClick={handleOpenProfile}>
              VIEW PROFILE
            </button>

            <form className="pvr-account-form" onSubmit={handleSave}>
              <label>
                <span>DISPLAY NAME</span>
                <input
                  type="text"
                  name="displayName"
                  value={profile.displayName}
                  onChange={handleTextChange}
                  placeholder="Your name"
                  maxLength={40}
                  autoComplete="off"
                />
              </label>

              <label>
                <span>BIO</span>
                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={handleTextChange}
                  placeholder="Private profile bio..."
                  maxLength={280}
                  rows={4}
                />
                <small>{profile.bio.length}/280</small>
              </label>

              <div className="pvr-account-selects">
                <label>
                  <span>PROFILE</span>
                  <select name="visibility" value={profile.visibility} onChange={handleSelectChange}>
                    <option value="private">PRIVATE</option>
                    <option value="members">MEMBERS</option>
                    <option value="public">PUBLIC</option>
                  </select>
                </label>

                <label>
                  <span>ONLINE STATUS</span>
                  <select name="onlineVisibility" value={profile.onlineVisibility} onChange={handleSelectChange}>
                    <option value="hidden">HIDDEN</option>
                    <option value="members">MEMBERS</option>
                    <option value="public">PUBLIC</option>
                  </select>
                </label>

                <label>
                  <span>MEDIA</span>
                  <select name="mediaVisibility" value={profile.mediaVisibility} onChange={handleSelectChange}>
                    <option value="private">PRIVATE</option>
                    <option value="members">MEMBERS</option>
                    <option value="public">PUBLIC</option>
                  </select>
                </label>
              </div>

              <button className="pvr-account-save" type="submit" disabled={saving}>
                {saving ? "SAVING..." : "SAVE PROFILE"}
              </button>

              {message && (
                <p className={`pvr-account-message ${message === "PROFILE SAVED" ? "is-ok" : "is-error"}`}>
                  {message}
                </p>
              )}
            </form>
          </aside>

          {open && (
            <button
              type="button"
              className="pvr-account-backdrop"
              onClick={() => setOpen(false)}
              aria-label="Close profile"
            ></button>
          )}

          {profileViewOpen && (
            <ProfileView
              account={account}
              profile={profile}
              accessLabel={accessLabel}
              cameraLive={cameraLive}
              cameraVisibility={cameraVisibility}
              onClose={() => setProfileViewOpen(false)}
              onEdit={handleEditProfile}
              onGoOnline={handleGoOnline}
            />
          )}

          {cameraOpen && (
            <CameraStudio
              stream={cameraStream}
              visibility={cameraVisibility}
              live={cameraLive}
              requesting={cameraRequesting}
              cameraEnabled={cameraEnabled}
              micEnabled={micEnabled}
              error={cameraError}
              onClose={handleCloseCamera}
              onRetry={requestCamera}
              onVisibilityChange={setCameraVisibility}
              onToggleCamera={handleToggleCamera}
              onToggleMic={handleToggleMic}
              onStart={handleStartCam}
              onStop={handleStopCam}
            />
          )}
        </>
      )}
    </>
  );
}