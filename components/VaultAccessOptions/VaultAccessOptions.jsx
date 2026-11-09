import "./VaultAccessOptions.css";
const OPTIONS = [
  { name: "SPCL",
    role: "Identity",
    line: "Your identity, verified. Step into the rooms; albums and paid chat have separate access.",
    emoji: "♛",
  },
  { name: "BSIC",
    role: "Basic",
    line: "Your first look inside. Unlock the BASIC collection with your personal code.",
    emoji: "🌹",
  },
  { name: "PRX0",
    role: "Pro",
    line: "More to explore. Unlock the PRO collection and member chat with your verified access.",
    emoji: "🔥",
  },
  { name: "VIPX",
    role: "VIP",
    line: "Make it VIP. Explore the VIP collection with perks tied to your account while your access is active.",
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
