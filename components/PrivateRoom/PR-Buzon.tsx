import { useEffect, useState } from "react";
import "./PR-Buzon.css";

type PrivateRoomMood = "cine" | "vintage" | "arcade";

const CONTACTS = [
  { name: "@User18Fx", status: "ONLINE", preview: "Hey, welcome to my room.", initials: "FX" },
  { name: "@GreenGrower", status: "OFFLINE", preview: "Stage later?", initials: "GG" },
  { name: "@Dalyva", status: "ONLINE", preview: "Sent a private request.", initials: "DA" },
];

function readMood(): PrivateRoomMood {
  const value = document.documentElement.dataset.pvrMood;
  return value === "vintage" || value === "arcade" ? value : "cine";
}

function openMembership() {
  document.querySelector<HTMLButtonElement>(".pvr-club-membership")?.click();
}

function ContactList({ active, onSelect, locked }: { active: string; onSelect: (name: string) => void; locked: boolean }) {
  return (
    <aside className="pvr-buzon-contacts">
      <header>
        <span>
PRIVATE NETWORK
        </span>
        <strong>
MESSAGES
        </strong>
      </header>
      {CONTACTS.map((contact) => (
        <button key={contact.name} type="button" className={active === contact.name ? "is-active" : ""} onClick={() => onSelect(contact.name)} disabled={locked}>
          <span className="pvr-buzon-avatar">
{contact.initials}
          </span>
          <span>
            <strong>
{contact.name}
            </strong>
            <small>
{locked ? "Paid membership required" : contact.preview}
            </small>
          </span>
          <i>
{locked ? "LOCKED" : contact.status}
          </i>
        </button>
      ))}
    </aside>
  );
}

function Conversation({ active, locked }: { active: string; locked: boolean }) {
  return (
    <section className={"pvr-buzon-chat " + (locked ? "is-locked" : "")}>
      <header>
        <div>
          <span>
PRIVATE CONVERSATION
          </span>
          <strong>
{active}
          </strong>
        </div>
        <small>
{locked ? "LOCKED" : "● SECURE"}
        </small>
      </header>
      <div className="pvr-buzon-thread">
        {locked ? (
          <div className="pvr-buzon-lock">
            <span>
PAID FEATURE
            </span>
            <strong>
CHAT LOCKED
            </strong>
            <p>
Private conversations require a paid membership.
            </p>
            <button type="button" onClick={openMembership}>
VIEW MEMBERSHIP
            </button>
          </div>
        ) : (
          <>
            <p className="is-them">
              <strong>
{active}
              </strong>
              <span>
Hey, welcome to my room.
              </span>
            </p>
            <p className="is-me">
              <strong>
YOU
              </strong>
              <span>
Good to see you here.
              </span>
            </p>
          </>
        )}
      </div>
      <div className="pvr-buzon-compose">
        <input type="text" placeholder={locked ? "Paid membership required" : "Write a private message..."} disabled={locked} />
        <button type="button" disabled={locked}>
{locked ? "LOCKED" : "SEND"}
        </button>
      </div>
    </section>
  );
}

function ActivityRail() {
  return (
    <aside className="pvr-buzon-activity">
      <header>
        <span>
LIVE SOCIAL
        </span>
        <strong>
SIGNALS
        </strong>
      </header>
      <p>
<span>NOW</span> 2 friends online
      </p>
      <p>
<span>LIVE</span> Stage ready
      </p>
      <p>
<span>NEW</span> 1 album request
      </p>
      <button type="button" onClick={() => { window.location.hash = "#/private-room/stage"; }}>
OPEN STAGE
      </button>
    </aside>
  );
}

function AdminMailbox() {
  return (
    <aside className="pvr-buzon-admin pvr-admin-only">
      <span>
ADMIN · CONTROL
      </span>
      <strong>
MESSAGE MODERATION
      </strong>
      <div>
        <button type="button">
APPROVE
        </button>
        <button type="button">
RESTRICT
        </button>
        <button type="button">
BLOCK
        </button>
      </div>
    </aside>
  );
}

export default function PrivateRoomBuzon() {
  const [mood, setMood] = useState<PrivateRoomMood>(() => readMood());
  const [chatLocked, setChatLocked] = useState(false);
  const [active, setActive] = useState(CONTACTS[0].name);

  useEffect(() => {
    const handleMood = () => setMood(readMood());
    window.addEventListener("userfx:private-room-mood", handleMood);
    return () => window.removeEventListener("userfx:private-room-mood", handleMood);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/access-session", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((session) => {
        if (!cancelled) setChatLocked(Boolean(session?.authenticated && (session?.accessLabel === "SPCL" || session?.memberAccess === true)));
      })
      .catch(() => {
        if (!cancelled) setChatLocked(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={"pvr-buzon-experience pvr-buzon-experience--" + mood} aria-label="Private Room mailbox">
      {mood === "cine" ? (
        <div className="pvr-buzon-cine">
          <Conversation active={active} locked={chatLocked} />
          <ContactList active={active} onSelect={setActive} locked={chatLocked} />
          <AdminMailbox />
        </div>
      ) : mood === "vintage" ? (
        <div className="pvr-buzon-vintage">
          <ContactList active={active} onSelect={setActive} locked={chatLocked} />
          <div className="pvr-buzon-vintage-letter">
            <Conversation active={active} locked={chatLocked} />
            <AdminMailbox />
          </div>
        </div>
      ) : (
        <div className="pvr-buzon-arcade">
          <ContactList active={active} onSelect={setActive} locked={chatLocked} />
          <Conversation active={active} locked={chatLocked} />
          <ActivityRail />
          <AdminMailbox />
        </div>
      )}
    </main>
  );
}
