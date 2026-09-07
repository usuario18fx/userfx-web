import "./FxAccessBtn.css";
type  FxAccessBtnProps = {
  onOpen: () => void;
  disabled?: boolean;
};
export function SmokelandiaAccessButton({
  onOpen, disabled = false,
}: FxAccessBtnProps) {
  return (
    <button type="button" className="smkl-access-button" onClick={onOpen} disabled={disabled} aria-haspopup="dialog" aria-controls="smokelandia-access-modal">
    <span className="smkl-access-button__smoke" />
    <span className="smkl-access-button__rose" aria-hidden="true">
    <svg viewBox="0 0 64 64">
    <path d="M32 50C18 50 10 41 12 29c2-11 11-18 20-18s18 7 20 18c2 12-6 21-20 21Z" />
    <path d="M32 44c-9 0-15-6-14-14 1-7 7-12 14-12s13 5 14 12c1 8-5 14-14 14Z" />
    <path d="M32 38c-5 0-9-4-8-9 1-4 4-7 8-7s7 3 8 7c1 5-3 9-8 9Z" />
    <path d="M32 33c-3 0-5-2-5-5s2-5 5-5 5 2 5 5-2 5-5 5Z" />
    <path d="M13 27c7 0 12 3 16 8M51 27c-7 0-12 3-16 8M20 16c2 7 6 11 12 13M44 16c-2 7-6 11-12 13" />
    </svg>
    </span>
    <span className="smkl-access-button__status" aria-hidden="true" />
    <span className="smkl-access-button__content">
    <span className="smkl-access-button__title">
      ᴜɴʟᴏᴄᴋ ᴀᴄᴄᴇꜱꜱ
    </span>
    <span className="smkl-access-button__brand">
      𝐅x🜲 𝐖𝐞𝐛𝐬𝐢𝐭𝐞
    </span>
    </span>
    <span className="smkl-access-button__arrow" aria-hidden="true">
    <svg viewBox="0 0 24 24">
    <path d="m9 5 7 7-7 7" />
    </svg>
    </span>
    </button>
    );
    }