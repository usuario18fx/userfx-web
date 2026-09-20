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

export default function PrivateRoomAccount() {
  const [account,setAccount] = useState<AccountData | null>(null);
  const [profile,setProfile] = useState<AccountProfile>(EMPTY_PROFILE);
  const [open,setOpen] = useState(false);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");

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
        if (!response.ok || !data?.authenticated || !data.account) return;
        setAccount(data.account);
        setProfile({...EMPTY_PROFILE,...data.account.profile});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {cancelled = true;};
  },[]);

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
  },[profile,saving]);

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
            onClick={() => {setOpen((current) => !current);setMessage("");}}
            aria-expanded={open}
            aria-controls="pvr-account-panel"
          >
            <span className="pvr-account-avatar">
              {getInitials(account)}
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
                {getInitials(account)}
              </div>
              <div>
                <span className="pvr-account-access">{accessLabel} ACCESS</span>
                <strong>{profile.displayName || account.telegramUsername || "USER FX MEMBER"}</strong>
                <small>ID · {account.accountId.slice(-10).toUpperCase()}</small>
              </div>
            </div>

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
        </>
      )}
    </>
  );
}
