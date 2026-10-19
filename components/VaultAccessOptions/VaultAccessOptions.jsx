import "./VaultAccessOptions.css";
const OPTIONS = [
  { name: "SPCL",
    role: "Identity",
    line: "Your identity access. Rooms open after verification; private albums and paid chat have their own access.",
    emoji: "♛",
  },
  { name: "BSIC",
    role: "Basic",
    line: "The Basic collection, linked to its own code. Start with a focused private experience.",
    emoji: "🌹",
  },
  { name: "PRX0",
    role: "Pro",
    line: "The Pro collection and paid member chat, with the benefits attached to your verified access.",
    emoji: "🔥",
  },
  { name: "VIPX",
    role: "VIP",
    line: "The VIP collection. Your benefits stay linked to your account and their active access window.",
    emoji: "👑",
      },];
const TITLES = { SPCL: "SPCL / IDENTITY", BSIC: "BASIC / BSIC", PRX0: "PRO / PRX0", VIPX: "VIP / VIPX" };
const IMAGES = { SPCL: "/assets/userfx-logo-sin.png", BSIC: "/assets/iconos/rosa.png", PRX0: "/assets/iconos/fuego.png", VIPX: "/assets/iconos/corona.png" };
// Original identity cards from components/FX/Sections.tsx (crown-scroll branch).
export default function VaultAccessOptions() {
  return (
    <section className="vault-access-options" aria-label="Vault access options">
      <ul className="vault-access-options__grid">
        {OPTIONS.map((option) => (
          <li key={option.name}>
            <a className="vault-access-options__card" href="#/private-room-access" aria-label={`Open ${TITLES[option.name]} access verification`}>
              <span className="vault-access-options__icon"><img src={IMAGES[option.name]} alt="" /></span>
              <h2>{TITLES[option.name]}</h2>
              <span className="vault-access-options__rule" aria-hidden="true" />
              <p>{option.line}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
