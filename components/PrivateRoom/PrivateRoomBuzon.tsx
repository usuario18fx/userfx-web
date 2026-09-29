import { useState } from "react";
import { createPortal } from "react-dom";
import "./PrivateRoomRoutePage.css";

const CONTACTS = [
  {name:"@User18Fx",status:"FRIEND · ONLINE",preview:"Private message thread",initials:"FX"},
  {name:"@GreenGrower",status:"MEMBER · OFFLINE",preview:"No new messages",initials:"GG"},
];

export default function PrivateRoomBuzon() {
  const [target,setTarget] = useState<HTMLElement | null>(() => document.querySelector<HTMLElement>(".pvr-live-home"));

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
        <button type="button" onClick={() => { window.location.hash = "#/private-room"; }}>
          MYROOM
        </button>
      </header>
      <div className="pvr-buzon-layout">
        <aside className="pvr-buzon-contacts">
          <header>
            <strong>
              MESSAGES
            </strong>
            <span>
              {CONTACTS.length}
            </span>
          </header>
          {CONTACTS.map((contact) => (
            <button key={contact.name} type="button" className="pvr-buzon-contact-card">
              <span className="pvr-buzon-contact-avatar">
                {contact.initials}
              </span>
              <span>
                <strong>
                  {contact.name}
                </strong>
                <small>
                  {contact.preview}
                </small>
              </span>
              <i>
                {contact.status}
              </i>
            </button>
          ))}
        </aside>
        <section className="pvr-buzon-chat">
          <div className="pvr-buzon-chat-empty">
            <span>
              PRIVATE MESSAGES
            </span>
            <strong>
              SELECT A CONTACT
            </strong>
            <p>
              Your conversations with RoomFX members will appear here.
            </p>
          </div>
          <div className="pvr-buzon-compose">
            <input type="text" placeholder="Write a private message..." />
            <button type="button">
              SEND
            </button>
          </div>
        </section>
      </div>
    </section>,
    target,
  );
}
