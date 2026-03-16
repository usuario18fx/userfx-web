html,
body,
#root {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
}

body {
    background: #000000;
    color: #ffffff;
    overflow: hidden;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}

* {
    box-sizing: border-box;
}

button,
input {
    font: inherit;
}

img {
    display: block;
}

/* ================= ROOT ================= */

.smkl-subRoot {
    /* puedes mover el glow general subiendo/bajando los porcentajes */
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: #fff;
    background:
        radial-gradient(circle at 50% 14%, #d4ff00, transparent 18%),
        linear-gradient(180deg, #000000 0%, #040404 48%, #090909 100%);
    isolation: isolate;
}

/* USER / VIP ACCENT MODES */

.smkl-subRoot.is-userMode,
.mode-user {
    /* USER = neón verde */
    --smkl-accent: #d4ff00;
    --smkl-accent-rgb: 212, 255, 0;
}

.smkl-subRoot.is-vipMode,
.mode-vip {
    /* VIP = dorado */
    --smkl-accent: #ffd037;
    --smkl-accent-rgb: 255, 213, 74;
}

.smkl-subBg {
    position: absolute;
    inset: 0;
    z-index: 0;
    background:
        linear-gradient(to right, rgba(255, 255, 255, 0.028) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
    background-size: 84px 84px;
    opacity: 0.2;
    pointer-events: none;
}

.smkl-subPaintGlow {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
        radial-gradient(circle at var(--mx, 50%) var(--my, 50%),
            rgba(var(--smkl-accent-rgb, 212, 255, 0), calc(0.11 + (var(--smkl-boost, 0) * 0.16))) 0%,
            rgba(var(--smkl-accent-rgb, 212, 255, 0), calc(0.05 + (var(--smkl-boost, 0) * 0.08))) 18%,
            rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.02) 34%,
            transparent 60%),
        radial-gradient(circle at 78% 50%,
            rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.08) 0%,
            rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.03) 18%,
            transparent 52%),
        radial-gradient(circle at 16% 82%,
            rgba(255, 255, 255, 0.035) 0%,
            transparent 28%);
    filter: blur(28px);
    opacity: 0.95;
}

.smkl-subRoot::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
        radial-gradient(circle at center,
            transparent 36%,
            rgba(0, 0, 0, 0.16) 62%,
            rgba(0, 0, 0, 0.86) 100%);
}

/* ================= HUD ================= */

.smkl-hudTape {
    position: fixed;
    left: 0;
    right: 0;
    height: 34px;
    z-index: 50;
    overflow: hidden;
    pointer-events: none;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.004)),
        rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.smkl-hudTape--top {
    top: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.smkl-hudTape--bottom {
    bottom: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.smkl-hudTapeInner {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    width: max-content;
    min-width: max-content;
    will-change: transform;
}

.smkl-hudTape--top .smkl-hudTapeInner {
    animation: smklTapeMoveLeft 35s linear infinite;
}

.smkl-hudTape--bottom .smkl-hudTapeInner {
    animation: smklTapeMoveRight 42s linear infinite;
}

.smkl-hudTapeTrack {
    display: flex;
    align-items: center;
    gap: 42px;
    flex-shrink: 0;
    padding-left: 22px;
    padding-right: 42px;
    white-space: nowrap;
}

.smkl-hudTapeChunk {
    white-space: nowrap;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.88);
    opacity: 0.85;
}

/* ================= LAYOUT ================= */

.smkl-subLayout {
    position: relative;
    z-index: 10;
    display: grid;
    grid-template-columns: 340px minmax(420px, 700px) 240px;
    align-items: center;
    justify-content: center;
    gap: 40px;
    width: 100%;
    height: 100%;
    padding: 90px 42px 64px;
    /* ⬅ mover todo el contenido arriba/abajo */
}

.smkl-subLeftCol,
.smkl-subCenterCol,
.smkl-subRightCol {
    position: relative;
    z-index: 12;
}

.smkl-subLeftCol {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
    min-width: 0;
}

.smkl-subCenterCol {
    display: flex;
    align-items: center;
    justify-content: center;
}

.smkl-subRightCol {
    display: flex;
    flex-direction: column;
    gap: 18px;
    align-items: stretch;
    justify-content: center;
}

.smkl-pageTitle {
    margin: 0;
    font-size: clamp(3rem, 5vw, 5.8rem);
    line-height: 0.9;
    font-weight: 900;
    letter-spacing: -0.08em;
    text-transform: uppercase;
    color: #fff;
    text-shadow:
        0 0 10px rgba(255, 255, 255, 0.08),
        0 0 24px rgba(255, 255, 255, 0.04),
        0 0 48px rgba(255, 255, 255, 0.03);
}

.smkl-switchDock {
    position: relative;
    z-index: 2;
    margin-top: 2px;
    padding: 10px 12px;
    border: 1px solid #010101;
    background: #000000;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(1px);
    border-radius: 9px;
}

.smkl-leftStackBtns {
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: min(100%, 260px);
    /* ⬅ ancho del dock de botones */
}

/* ================= cloud================= */
.smkl-subCloud {
    pointer-events: none;
    user-select: none;
    mix-blend-mode: screen;
    opacity: 0.8;
    filter:
        grayscale(0.04) saturate(0.94) brightness(0.98) drop-shadow(0 0 18px rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.08)) drop-shadow(0 20px 50px rgba(0, 0, 0, 0.46));
}

.smkl-subCloud--small {
    position: absolute;
    left: -40px;
    /* ⬅ mover nube izquierda/derecha */
    bottom: -30px;
    /* ⬅ mover nube arriba/abajo */
    width: 280px;
    max-width: 90%;
    animation: smklSubCloudFloat 8s ease-in-out infinite;
}

/* ================= CARD ================= */

.smkl-subCard {
    position: relative;
    width: min(100%, 620px);
    padding: 28px 28px 24px;
    border-radius: 28px;
    border: 1px solid rgba(0, 0, 0, 0);
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.008)),
        rgba(10, 10, 10, 0.72);
    box-shadow:
        inset 0 1px 0 rgba(0, 0, 0, 0),
        0 24px 70px rgba(0, 0, 0, 0.54),
        0 0 0 1px #000000;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    overflow: hidden;
}

.smkl-subCard::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
        radial-gradient(circle at 82% 12%,
            rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.11) 0%,
            rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.04) 16%,
            transparent 36%);
    opacity: 0.95;
}

.smkl-subCard::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
        repeating-linear-gradient(180deg,
            transparent 0px,
            transparent 8px,
            rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.04) 9px,
            transparent 10px,
            transparent 18px);
    mask-image: radial-gradient(circle at 84% 10%, black 0%, black 14%, transparent 48%);
    -webkit-mask-image: radial-gradient(circle at 84% 10%, black 0%, black 14%, transparent 48%);
    opacity: 0.28;
}

.smkl-subHeader,
.smkl-subForm,
.smkl-legal,
.smkl-success {
    position: relative;
    z-index: 2;
}

.smkl-subHeader {
    margin-bottom: 24px;
}

.smkl-subKicker {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.58);
}

.smkl-subHandle {
    margin: 10px 0 8px;
    font-size: clamp(2rem, 5vw, 3.4rem);
    line-height: 0.95;
    font-weight: 900;
    letter-spacing: -0.08em;
    color: #fff;
    text-transform: lowercase;
}

.smkl-subDesc {
    margin: 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 15px;
    line-height: 1.5;
}

.smkl-subForm {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.smkl-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.smkl-label {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.62);
}

.smkl-input {
    width: 100%;
    height: 56px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 0 16px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.028), rgba(255, 255, 255, 0.01)),
        rgba(0, 0, 0, 0.58);
    color: #fff;
    outline: none;
    transition:
        border-color 0.24s ease,
        box-shadow 0.24s ease,
        background 0.24s ease,
        opacity 0.24s ease;
}

.smkl-input::placeholder {
    color: rgba(255, 255, 255, 0.34);
}

.smkl-input:focus {
    border-color: rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.34);
    box-shadow:
        0 0 0 1px rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.12),
        0 0 24px #d4ff009f;
}

.smkl-input:disabled {
    opacity: 0.56;
    cursor: not-allowed;
}

.smkl-rememberContainer {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 2px;
    color: rgba(255, 255, 255, 0.72);
    font-size: 14px;
}

.smkl-rememberContainer input {
    width: 16px;
    height: 16px;
    accent-color: var(--smkl-accent);
}

.smkl-rememberText {
    line-height: 1.2;
}

.smkl-primaryBtn,
.smkl-googleBtn {
    position: relative;
    min-height: 58px;
    border-radius: 18px;
    border: 1px solid transparent;
    cursor: pointer;
    transition:
        transform 0.24s ease,
        box-shadow 0.24s ease,
        border-color 0.24s ease,
        opacity 0.24s ease;
}

.smkl-primaryBtn {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #000;
    background: linear-gradient(135deg,
            rgba(var(--smkl-accent-rgb, 212, 255, 0), 1) 0%,
            rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.86) 100%);
    box-shadow:
        0 12px 32px rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.20),
        0 0 0 1px rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.22);
}

.smkl-primaryBtn:hover:not(:disabled),
.smkl-googleBtn:hover:not(:disabled) {
    transform: translateY(-2px);
}

.smkl-primaryBtn:hover:not(:disabled) {
    box-shadow:
        0 16px 40px rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.24),
        0 0 0 1px rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.26);
}

.smkl-primaryBtn:disabled,
.smkl-googleBtn:disabled {
    opacity: 0.48;
    cursor: not-allowed;
    transform: none;
}

.smkl-googleBtn {
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.024), rgba(255, 255, 255, 0.008)),
        rgba(0, 0, 0, 0.56);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.08);
    font-size: 14px;
    font-weight: 700;
}

.smkl-googleBtn:hover:not(:disabled) {
    border-color: rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.24);
    box-shadow:
        0 10px 28px rgba(0, 0, 0, 0.28),
        0 0 0 1px rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.08);
}

.smkl-orRow {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    margin: 4px 0 0;
    color: rgba(255, 255, 255, 0.44);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
}

.smkl-orRow span {
    display: block;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
}

.smkl-legal {
    margin-top: 16px;
    color: rgba(255, 255, 255, 0.42);
    font-size: 12px;
    line-height: 1.5;
}

.smkl-success {
    margin-top: 12px;
    padding: 14px 16px;
    border-radius: 16px;
    background: rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.10);
    border: 1px solid rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.22);
    color: #fff;
    font-size: 14px;
}

/* ================= RIGHT MINI CARDS ================= */

.smkl-subMini {
    position: relative;
    min-height: 180px;
    border-radius: 22px;
    cursor: pointer;
    outline: none;
    transition:
        transform 0.24s ease,
        opacity 0.24s ease,
        box-shadow 0.24s ease;
}

.smkl-subMini:hover,
.smkl-subMini:focus-visible {
    transform: translateY(-3px);
}

.smkl-subMini .card-container {
    width: 100%;
    height: 100%;
    min-height: 180px;
}

.smkl-subMini .card {
    position: relative;
    width: 100%;
    min-height: 180px;
    height: 100%;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.026), rgba(255, 255, 255, 0.008)),
        rgba(0, 0, 0, 0.58);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 18px 50px rgba(0, 0, 0, 0.36);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
}

.smkl-subMini .card::before {
    content: "";
    position: absolute;
    inset: auto auto -20% -10%;
    width: 160px;
    height: 160px;
    border-radius: 999px;
    background: rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.12);
    filter: blur(34px);
    pointer-events: none;
}

.smkl-subMini .front-content,
.smkl-subMini .content {
    position: relative;
    z-index: 1;
}

.smkl-subMini .front-content {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 18px 18px 0;
}

.smkl-subMini .front-content p {
    margin: 0;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--smkl-accent);
}

.smkl-subMini .content {
    position: absolute;
    left: 18px;
    /* ⬅ mover texto horizontal dentro de la mini */
    right: 18px;
    bottom: 18px;
    /* ⬅ mover texto vertical dentro de la mini */
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.smkl-subMini .content strong {
    font-size: 1.3rem;
    font-weight: 900;
    line-height: 0.95;
    letter-spacing: -0.04em;
    color: #fff;
}

.smkl-subMini .content div {
    color: rgba(255, 255, 255, 0.62);
    font-size: 14px;
    line-height: 1.45;
}

.smkl-subMini.is-activeMode .card {
    border-color: rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.34);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 0 0 1px rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.14),
        0 0 28px rgba(var(--smkl-accent-rgb, 212, 255, 0), 0.10),
        0 18px 50px rgba(0, 0, 0, 0.36);
}

/* mini card extra de ACCOUNT, tono neutro blanco */
.smkl-subMini--account {
    /* ⬅ puedes subir/bajar brillo de la tercera card */
    --smkl-accent: rgba(255, 255, 255, 0.86);
    --smkl-accent-rgb: 255, 255, 255;
}

/* ================= ANIMATIONS ================= */

@keyframes smklTapeMoveLeft {
    from {
        transform: translate3d(0, 0, 0);
    }

    to {
        transform: translate3d(-50%, 0, 0);
    }
}

@keyframes smklTapeMoveRight {
    from {
        transform: translate3d(-50%, 0, 0);
    }

    to {
        transform: translate3d(0, 0, 0);
    }
}

@keyframes smklSubCloudFloat {

    0%,
    100% {
        transform: translate3d(0, 0, 0) scale(0.99);
    }

    50% {
        transform: translate3d(10px, -8px, 0) scale(1.02);
    }
}

/* ================= RESPONSIVE ================= */

@media (max-width: 1180px) {
    .smkl-subLayout {
        grid-template-columns: 300px minmax(380px, 1fr) 210px;
        gap: 26px;
        padding: 88px 28px 58px;
    }

    .smkl-pageTitle {
        font-size: clamp(2.6rem, 5vw, 4.8rem);
    }
}

@media (max-width: 980px) {
    .smkl-subLayout {
        grid-template-columns: 1fr;
        justify-items: center;
        align-content: start;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 82px 18px 72px;
        gap: 22px;
    }

    .smkl-subLeftCol,
    .smkl-subCenterCol,
    .smkl-subRightCol {
        width: min(100%, 680px);
    }

    .smkl-subLeftCol {
        align-items: stretch;
    }

    .smkl-subRightCol {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
    }

    .smkl-subCloud--small {
        display: none;
    }
}

@media (max-width: 640px) {
    body {
        overflow: auto;
    }

    .smkl-subLayout {
        padding: 74px 14px 72px;
        gap: 18px;
    }

    .smkl-pageTitle {
        font-size: clamp(2.4rem, 13vw, 4rem);
    }

    .smkl-subCard {
        padding: 22px 18px 18px;
        border-radius: 22px;
    }

    .smkl-subHandle {
        font-size: clamp(1.8rem, 10vw, 2.7rem);
    }

    .smkl-input,
    .smkl-primaryBtn,
    .smkl-googleBtn {
        min-height: 54px;
        height: 54px;
    }

    .smkl-subRightCol {
        grid-template-columns: 1fr;
    }

    .smkl-hudTapeChunk {
        font-size: 9px;
        letter-spacing: 0.14em;
    }
}

@media (prefers-reduced-motion: reduce) {

    .smkl-subCloud,
    .smkl-subPaintGlow,
    .smkl-subCard::after {
        animation: none !important;
        transition: none !important;
    }
}
