import { useCallback, useEffect, useState } from "react";

import "./FxAccessBtn.css";

const ROSA = "/assets/iconos/rosa.png";

type FxAccessBtnProps = {
onOpen?: () => void;
disabled?: boolean;
};

type AccessTone = "spcl" | "paid" | null;

export function FxAccessBtn({ disabled = false }: FxAccessBtnProps) {
const [hasAccess,setHasAccess] = useState(false);
const [accessTone,setAccessTone] = useState<AccessTone>(null);

const refreshAccess = useCallback(async () => {
try {
const response = await fetch("/api/access-session",{
method:"GET",
headers:{Accept:"application/json"},
credentials:"same-origin",
cache:"no-store",
});

const session = await response.json().catch(() => ({}));

if (!response.ok || !session?.authenticated) {
setHasAccess(false);
setAccessTone(null);
delete document.documentElement.dataset.userfxAccessTone;
return;
}

const tone:AccessTone = session?.accessMode === "telegram_identity" ? "spcl" : "paid";

setHasAccess(true);
setAccessTone(tone);
document.documentElement.dataset.userfxAccessTone = tone;
} catch {
}
},[]);

useEffect(() => {
void refreshAccess();
window.addEventListener("focus",refreshAccess);

return () => {
window.removeEventListener("focus",refreshAccess);
};
},[refreshAccess]);

function handleOpen() {
window.location.hash = hasAccess ? "#/private-room" : "#/private-room-access";
}

const stateClass = accessTone ? ` is-${accessTone}` : "";

return (
<button type="button" className={`smkl-access-button${hasAccess ? " is-access-active" : ""}${stateClass}`} onClick={handleOpen} disabled={disabled}>
<span className="smkl-access-button__smoke" />
<span className="smkl-access-button__rose" aria-hidden="true">
<img className="smkl-access-button__rose-normal" src={ROSA} alt="" draggable={false} />
<img className="smkl-access-button__rose-hover" src="/assets/iconos/rosaHover.png" alt="" draggable={false} />
</span>
<span className="smkl-access-button__status" aria-hidden="true" />
<span className="smkl-access-button__seam smkl-access-button__seam--l" aria-hidden="true" />
<span className="smkl-access-button__seam smkl-access-button__seam--r" aria-hidden="true" />
<span className="smkl-access-button__content">
<span className="smkl-access-button__title">
{hasAccess ? "GET IN" : "GET MY CODE"}
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
