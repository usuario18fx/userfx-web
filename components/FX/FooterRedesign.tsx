"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FX } from "@/lib/assets";
import { BOT_URL, ENTER_URL, FOOTER } from "@/lib/content";
import VisitorCounter from "@/components/VisitorCounter";
import "./FooterRedesign.css";

type SubscribeState = "idle" | "sending" | "success" | "error";

export default function SiteFooter() {
const [email, setEmail] = useState("");
const [status, setStatus] = useState<SubscribeState>("idle");
const abortRef = useRef<AbortController | null>(null);
<<<<<<< HEAD
const crownRef = useRef<HTMLSpanElement | null>(null);
=======
const crownRef = useRef<HTMLImageElement | null>(null);
>>>>>>> 35ea3c9 (Update FX UI and icons)
const [hasCrownAsset, setHasCrownAsset] = useState(false);
const [hasCrownlessLogo, setHasCrownlessLogo] = useState(true);

useEffect(() => () => abortRef.current?.abort(), []);

useEffect(() => {
<<<<<<< HEAD
    const crown = crownRef.current;
    if (!crown || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const moveOpposite = (clientX: number, clientY: number) => {
        const x = (clientX / window.innerWidth - 0.5) * 2;
        const y = (clientY / window.innerHeight - 0.5) * 2;
        crown.style.setProperty("--crown-x", `${-x * 72}px`);
        crown.style.setProperty("--crown-y", `${-y * 52}px`);
    };

    const onMouseMove = (event: MouseEvent) => {
        moveOpposite(event.clientX, event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === "pen") moveOpposite(event.clientX, event.clientY);
    };
    const reset = () => {
        crown.style.setProperty("--crown-x", "0px");
        crown.style.setProperty("--crown-y", "0px");
    };

    // Register even while images load; the crown floats independently via CSS.
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", reset);
    return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("mouseleave", reset);
    };
}, []);
=======
    if (!hasCrownAsset || !hasCrownlessLogo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const updateCrown = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !crownRef.current) return;
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        crownRef.current.style.setProperty("--crown-x", `${-x * 14}px`);
        crownRef.current.style.setProperty("--crown-y", `${-y * 11}px`);
    };

    window.addEventListener("pointermove", updateCrown, { passive: true });
    return () => window.removeEventListener("pointermove", updateCrown);
}, [hasCrownAsset, hasCrownlessLogo]);
>>>>>>> 35ea3c9 (Update FX UI and icons)

async function subscribe(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
if (status === "sending") return;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
setStatus("error");
return;
}
const controller = new AbortController();
abortRef.current?.abort();
abortRef.current = controller;
setStatus("sending");
const timeout = setTimeout(() => controller.abort(), 10000);
try {
const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }), signal: controller.signal });
if (!response.ok) throw new Error("Unable to subscribe");
setStatus("success");
setEmail("");
} catch {
setStatus("error");
} finally {
clearTimeout(timeout);
}
}

return (
<footer id="contact" className="ufx-footer" aria-label="UserFX footer">
<div className="ufx-footer-frame">
<div className="ufx-footer-meta">
<span className="ufx-footer-brand">
<img src={FX.logo} alt="" className="ufx-footer-brand-icon" />
USER FX
</span>
<span className="ufx-footer-edition">
PRIVATE ACCESS · EST. 18
</span>
</div>
<div className="ufx-footer-hero">
<div className="ufx-footer-hero-copy">
<p className="ufx-footer-kicker">
BEYOND THE PREVIEW / 004
</p>
<h2 className="ufx-footer-title">
<span>
YOUR SPACE.
</span>
<span className="ufx-footer-title-secondary">
YOUR RULES.
</span>
</h2>
<p className="ufx-footer-description">
One identity. Four ways to connect. Your private world begins when you choose to enter.
</p>
<div className="ufx-footer-actions">
<a href={ENTER_URL} className="ufx-footer-cta">
ENTER THE VAULT
<span className="ufx-footer-cta-arrow" aria-hidden="true">
↗
</span>
</a>
<a href={BOT_URL} target="_blank" rel="noreferrer" className="ufx-footer-secondary-link">
GET MY CODE ↗
</a>
</div>
</div>
<div className="ufx-footer-visual" aria-label="FX signature emblem">
<div className="ufx-footer-emblem-ring">
<div className="ufx-footer-logo-stack">
<img src={hasCrownlessLogo ? "/iconLogo.png" : "/assets/userfx-logo-sin.png"} alt="FX with rose emblem" className="ufx-footer-emblem" draggable={false} onError={() => setHasCrownlessLogo(false)} />
{hasCrownlessLogo && (
<<<<<<< HEAD
<span ref={crownRef} className={`ufx-footer-crown-anchor ${hasCrownAsset ? "is-ready" : ""}`} aria-hidden="true">
<img src="/iconCorona.png" alt="" className="ufx-footer-crown" draggable={false} onLoad={() => setHasCrownAsset(true)} onError={() => setHasCrownAsset(false)} />
</span>
=======
<img ref={crownRef} src="/iconCorona.png" alt="" aria-hidden="true" className={`ufx-footer-crown ${hasCrownAsset ? "is-ready" : ""}`} draggable={false} onLoad={() => setHasCrownAsset(true)} onError={() => setHasCrownAsset(false)} />
>>>>>>> 35ea3c9 (Update FX UI and icons)
)}
</div>
</div>
<span className="ufx-footer-visual-label">
USER FX / MEMBERS ONLY
</span>
</div>
</div>
<div className="ufx-footer-divider" />
<div className="ufx-footer-info">
<div className="ufx-footer-newsletter">
<p className="ufx-footer-small-label">
THE INNER CIRCLE
</p>
<h3>
A private signal.
</h3>
<p className="ufx-footer-info-copy">
Occasional updates from UserFX. No noise.
</p>
<form className="ufx-footer-form" onSubmit={subscribe} noValidate>
<label className="ufx-footer-sr-only" htmlFor="ufx-footer-email">
Email address
</label>
<input id="ufx-footer-email" type="email" placeholder="you@domain.com" value={email} autoComplete="email" maxLength={254} onChange={(event) => { setEmail(event.target.value); if (status !== "idle") setStatus("idle"); }} disabled={status === "sending"} aria-invalid={status === "error"} aria-describedby="ufx-footer-status" />
<button type="submit" disabled={status === "sending"} aria-label="Subscribe to updates">
↗
</button>
</form>
<p id="ufx-footer-status" className="ufx-footer-form-status" role={status === "error" ? "alert" : "status"}>
{status === "success" ? "You're on the list." : status === "error" ? "Please check your email or try again." : status === "sending" ? "Saving..." : "Subscribe anytime. Unsubscribe anytime."}
</p>
</div>
<div className="ufx-footer-links">
{FOOTER.columns.map((column) => (
<div key={column.title} className="ufx-footer-link-group">
<h3>
{column.title}
</h3>
<ul>
{column.links.map((link) => (
<li key={link.label}>
<a href={link.href} target={link.href.startsWith("https:") ? "_blank" : undefined} rel={link.href.startsWith("https:") ? "noreferrer" : undefined}>
{link.label}
</a>
</li>
))}
</ul>
</div>
))}
</div>
</div>
<div className="ufx-footer-bottom">
<span>
© {new Date().getFullYear()} USER FX. ALL RIGHTS RESERVED.
</span>
<VisitorCounter />
<span className="ufx-footer-bottom-right">
PRIVATE BY DESIGN
</span>
</div>
</div>
</footer>
);
}
