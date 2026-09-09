import "./FxAccessBtn.css";

const ROSA = "/assets/iconos/rosa.png";

type FxAccessBtnProps = {
  onOpen: () => void;
  disabled?: boolean;
};

export function FxAccessBtn({ onOpen, disabled = false }: FxAccessBtnProps) {
  return (
      <button type="button" className="smkl-access-button" onClick={onOpen} disabled={disabled} aria-haspopup="dialog" aria-controls="fx-access-modal">
      <span className="smkl-access-button__smoke" />
      <span className="smkl-access-button__rose" aria-hidden="true">
      <img className="smkl-access-button__rose-normal" src="/assets/iconos/rosa.png" alt="" draggable={false}/>
      <img className="smkl-access-button__rose-hover" src="/assets/iconos/rosaHover.png" alt="" draggable={false}/>
      </span>
      <span className="smkl-access-button__status" aria-hidden="true" />
      <span className="smkl-access-button__seam smkl-access-button__seam--l" aria-hidden="true"/>
      <span className="smkl-access-button__seam smkl-access-button__seam--r" aria-hidden="true"/>
      <span className="smkl-access-button__content">
      <span className="smkl-access-button__title">
       GET ACCESS
      </span>
      <span className="smkl-access-button__brand">
      <i /> 
      USER FX
      <i />
      </span>
      </span>
      <span className="smkl-access-button__arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24">
      <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </button>
  );
}