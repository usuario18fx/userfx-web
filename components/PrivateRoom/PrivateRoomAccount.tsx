import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import PrivateRoom from "./PrivateRoom";
import "./PrivateRoomAccount.css";

type ProfileVisibility = "private" | "members" | "public";
type OnlineVisibility = "hidden" | "members" | "public";

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
  onClose: () => void;
  onEdit: () => void;
  onGoOnline: () => void;
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
  onClose,
  onEdit,
  onGoOnline,
}:ProfileViewProps) {
  const onlineVisible = profile.onlineVisibility !== "hidden";
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
            <span className={onlineVisible ? "is-online" : "is-hidden"}></span>
          </div>

          <div className="pvr-profile-copy">
            <div className="pvr-profile-status-row">
              <span className={`pvr-profile-status ${onlineVisible ? "is-online" : "is-hidden"}`}>
                {onlineVisible ? "● ONLINE" : "○ STATUS HIDDEN"}
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
            <strong>OFFLINE</strong>
            <small>PRIVATE VIDEO PROFILE</small>
          </div>

          <button type="button" onClick={onGoOnline}>
            GO ONLINE
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

export default function PrivateRoomAccount() {
  const [account,setAccount] = useState<AccountData | null>(null);
  const [profile,setProfile] = useState<AccountProfile>(EMPTY_PROFILE);
  const [open,setOpen] = useState(false);
  const [profileViewOpen,setProfileViewOpen] = useState(false);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");

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
      setProfileViewOpen(true);
    };

    document.addEventListener("click",handleProfileAction,true);
    return () => document.removeEventListener("click",handleProfileAction,true);
  },[]);

  /* ─────   ESCAPE PROFILE ─────── */
  useEffect(() => {
    if (!profileViewOpen && !open) return;

    const handleEscape = (event:KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setProfileViewOpen(false);
      setOpen(false);
    };

    window.addEventListener("keydown",handleEscape);
    return () => window.removeEventListener("keydown",handleEscape);
  },[open,profileViewOpen]);

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
    setMessage("");
    setProfileViewOpen(true);
  },[]);

  const handleEditProfile = useCallback(() => {
    setProfileViewOpen(false);
    setMessage("");
    setOpen(true);
  },[]);

  const handleGoOnline = useCallback(() => {
    setProfileViewOpen(false);
    window.setTimeout(() => {
      document.getElementById("videocall-stage")?.scrollIntoView({
        behavior:"smooth",
        block:"start",
      });
    },60);
  },[]);

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
            onClick={() => {setOpen((current) => !current);setMessage("");setProfileViewOpen(false);}}
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
            <span className="pvr-account-online" aria-hidden="true"></span>
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
              onClose={() => setProfileViewOpen(false)}
              onEdit={handleEditProfile}
              onGoOnline={handleGoOnline}
            />
          )}
        </>
      )}
    </>
  );
}
