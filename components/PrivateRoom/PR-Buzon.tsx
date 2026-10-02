          import { useEffect, useState } from "react";
          import { createPortal } from "react-dom";
          import "./PR-Stage.css";

          const CONTACTS = [
            { name: "@User18Fx", status: "FRIEND · ONLINE", preview: "Private message thread", initials: "FX" },
            { name: "@GreenGrower", status: "MEMBER · OFFLINE", preview: "No new messages", initials: "GG" },
          ];

          function openMembership() {
            document.querySelector<HTMLButtonElement>(".pvr-club-membership")?.click();
          }

          export default function PrivateRoomBuzon() {
            const [target, setTarget] = useState<HTMLElement | null>(() => document.querySelector<HTMLElement>(".pvr-live-home"));
            const [chatLocked, setChatLocked] = useState(false);

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
                  if (cancelled) return;
                  setChatLocked(Boolean(session?.authenticated && (session?.accessLabel === "SPCL" || session?.memberAccess === true)));
                })
                .catch(() => {
                  if (!cancelled) setChatLocked(false);
                });

              return () => {
                cancelled = true;
              };
            }, []);

            if (!target) {
              window.requestAnimationFrame(() => setTarget(document.querySelector<HTMLElement>(".pvr-live-home")));
            }

            if (!target) return null;

            return createPortal(
              <section className="pvr-route-page pvr-buzon-route" aria-label="Private Room mailbox">
                <header className="pvr-route-page-head">
                  <div>
                    <span>
                    USER FX · PRIVATE CONTACTS
                    </span>
                    <h1>
                    BUZON
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = "#/private-room";
                    }}>
                    MYROOM
                  </button>
                </header>
                <div className="pvr-buzon-layout">
                  <aside className="pvr-buzon-contacts">
                    <header>
                      <strong>
                      MESSAGES
                      </strong>
                      <span>{CONTACTS.length}</span>
                    </header>
                    {CONTACTS.map((contact) => (
                      <button key={contact.name} type="button" className="pvr-buzon-contact-card" disabled={chatLocked}>
                        <span className="pvr-buzon-contact-avatar">{contact.initials}</span>
                        <span>
                          <strong>{contact.name}</strong>
                          <small>{chatLocked ? "Paid membership required" : contact.preview}</small>
                        </span>
                        <i>{chatLocked ? "LOCKED" : contact.status}</i>
                      </button>
                    ))}
                  </aside>
                  <section className={`pvr-buzon-chat${chatLocked ? " is-locked" : ""}`}>
          <div className="pvr-buzon-chat-empty">
            {chatLocked ? (
              <>
                <button type="button" className="pvr-paid-lock" onClick={openMembership} aria-label="Unlock chat with a paid membership">
                  <span className="pvr-paid-lock-wrapper">
                    <span className="pvr-paid-lock-shackle" />
                    <svg className="pvr-paid-lock-body" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0 5C0 2.23858 2.23858 0 5 0H23C25.7614 0 28 2.23858 28 5V23C28 25.7614 25.7614 28 23 28H5C2.23858 28 0 25.7614 0 23V5ZM16 13.2361C16.6137 12.6868 17 11.8885 17 11C17 9.34315 15.6569 8 14 8C12.3431 8 11 9.34315 11 11C11 11.8885 11.3863 12.6868 12 13.2361V18C12 19.1046 12.8954 20 14 20C15.1046 20 16 19.1046 16 18V13.2361Z" fill="white" />
                    </svg>
                  </span>
                </button>
                <span>
                PAID FEATURE
                </span>
                <strong>
                CHAT LOCKED
                </strong>
                <p>
                SPCL access can enter the Private Room, but private chat requires a paid membership.
                </p>
                <button type="button" className="pvr-buzon-unlock" onClick={openMembership}>
                  VIEW MEMBERSHIP
                </button>
              </>
            ) : (
              <>
                <span>
                PRIVATE MESSAGES
                </span>
                <strong>
                SELECT A CONTACT
                </strong>
                <p>
                Your conversations with RoomFX members will appear here.
                </p>
              </>
            )}
          </div>
          <div className="pvr-buzon-compose">
            <input type="text" placeholder={chatLocked ? "Paid membership required" : "Write a private message..."} disabled={chatLocked} />
            <button type="button" disabled={chatLocked}>
              {chatLocked ? "LOCKED" : "SEND"}
            </button>
          </div>
        </section>
      </div>
    </section>,
    target,
  );
}
