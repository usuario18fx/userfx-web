from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8").replace("\r\n", "\n")


def write(rel: str, content: str) -> None:
    path = ROOT / rel
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing expected block: {label}")
    return text.replace(old, new, 1)


def remove_css_rule(text: str, selector: str) -> str:
    pattern = re.compile(r"(?ms)^" + re.escape(selector) + r"\s*\{[^{}]*\}\s*")
    return pattern.sub("", text)


# ═══════════ VAULT HOME · REMOVE LEGACY ROBOT MODAL ═══════════
vault_path = "components/VaultHome/VaultHome.tsx"
vault = read(vault_path)

vault = vault.replace('import { FxAccessModal } from "../FxAccess/FxAccessModal/FxAccessModal";\n', "")
vault = vault.replace('    const [dm, setDm] = useState(false);\n', "")
vault = vault.replace('    const [fxAccessOpen, setFxAccessOpen] = useState(false);\n', "")
vault = vault.replace('    const inlineCodeRef = useRef<HTMLInputElement | null>(null);\n', "")

for stale_icon in (
    '  corona: "/assets/iconos/corona.png",\n',
    '  rosa: "/assets/iconos/rosa.png",\n',
    '  laurel: "/assets/iconos/laurel.png",\n',
    '  dossier: "/assets/iconos/icon.png",\n',
):
    vault = vault.replace(stale_icon, "")

vault = vault.replace(
    '          window.setTimeout(() => inlineCodeRef.current?.focus(), 150);',
    '          setCodeModal(true);',
)

handler_start = vault.find("  function handleInlineCodeChange(value: string)")
if handler_start == -1:
    handler_start = vault.find("function handleInlineCodeChange(value: string)")
if handler_start != -1:
    return_marker = vault.find("return (", handler_start)
    if return_marker == -1:
        raise RuntimeError("Could not find VaultHome return after inline code helper")
    line_start = vault.rfind("\n", 0, return_marker) + 1
    vault = vault[:handler_start] + vault[line_start:]

vault = re.sub(
    r'<FxAccessBtn\s+onOpen=\{\(\) => setFxAccessOpen\(true\)\}\s+disabled=\{false\}\s*/>',
    '<FxAccessBtn disabled={false} />',
    vault,
    count=1,
)

vault = "\n".join(line for line in vault.split("\n") if "<FxAccessModal" not in line)

dm_start = vault.find("{dm ? (")
code_start = vault.find("{codeModal ? (", dm_start if dm_start != -1 else 0)
if dm_start != -1 and code_start != -1:
    dm_line = vault.rfind("\n", 0, dm_start) + 1
    code_line = vault.rfind("\n", 0, code_start) + 1
    vault = vault[:dm_line] + vault[code_line:]

write(vault_path, vault)

# ═══════════ VAULT HOME CSS · SAFE SYNTAX REPAIR ═══════════
vault_css_path = "components/VaultHome/VaultHome.css"
vault_css = read(vault_css_path)
vault_css = vault_css.replace("  border-right: 4px;\n  border-bottom: 0;", "  border-right: 0;\n  border-bottom: 0;")
vault_css = vault_css.replace("11vw 126px #0279f9 31vw", "11vw 126px #0279f9, 31vw")
vault_css = vault_css.replace("89vw 137px #0279f9 1833px", "89vw 137px #0279f9, 1833px")
vault_css = vault_css.replace("31vw 38px #0279f9 52vw", "31vw 38px #0279f9, 52vw")
vault_css = vault_css.replace("1529px 954px #0279f9  11vw", "1529px 954px #0279f9, 11vw")
vault_css = vault_css.replace("center / 280pxrepeat;", "center / 280px repeat;")
write(vault_css_path, vault_css)

# ═══════════ DIRECT GATE · SINGLE SOURCE OF TRUTH ═══════════
gate_path = "components/PrivateRoom/PrivateRoomDirectGate.css"
gate = read(gate_path)

for selector in (
    ".pvr-direct-username",
    ".pvr-direct-username > span",
    ".pvr-direct-username input",
    ".pvr-direct-username > span::before",
    ".pvr-direct-username::after",
    ".pvr-direct-plan-emoji",
):
    gate = remove_css_rule(gate, selector)

identity_marker = "/* ═══════════ TELEGRAM IDENTITY · SINGLE SOURCE ═══════════ */"
if identity_marker in gate:
    gate = gate[: gate.index(identity_marker)].rstrip() + "\n"

identity_css = r'''
/* ═══════════ TELEGRAM IDENTITY · SINGLE SOURCE ═══════════ */
.pvr-direct-username {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 94px;
  align-items: center;
  min-height: 40px;
  border: 1px solid rgba(42, 171, 238, 0.34);
  background:
    linear-gradient(rgba(5, 9, 12, 0.7), rgba(5, 9, 12, 0.7)),
    url("/wallpaper.png") center / 180% auto no-repeat;
}

.pvr-direct-username > span {
  position: relative;
  z-index: 2;
  height: 100%;
  display: grid;
  place-items: center;
  border-right: 1px solid rgba(42, 171, 238, 0.67);
  background: transparent;
  color: transparent;
  -webkit-text-fill-color: transparent;
  font-size: 0;
  opacity: 1;
}

.pvr-direct-username > span::before {
  content: "";
  display: block;
  width: 18px;
  height: 18px;
  background: url("/assets/iconos/telegram.png") center / contain no-repeat;
  opacity: 1;
}

.pvr-direct-username input {
  position: relative;
  z-index: 1;
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 10px 0 28px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #fff7e9;
  -webkit-text-fill-color: #fff7e9;
  caret-color: #d4bc94;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 13px;
  font-weight: 800;
}

.pvr-direct-username::after {
  content: "@";
  position: absolute;
  z-index: 4;
  left: 44px;
  top: 50%;
  transform: translateY(-50%);
  color: #2aabee;
  -webkit-text-fill-color: #2aabee;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  opacity: 1;
  pointer-events: none;
}

.pvr-direct-plan-emoji {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
  font-size: 17px;
  line-height: 1;
  filter: none;
  text-shadow: none;
  color: initial;
  -webkit-text-fill-color: initial;
  opacity: 1;
}

@media (max-width: 650px) {
  .pvr-direct-username {
    grid-template-columns: 32px minmax(0, 1fr) 86px;
  }

  .pvr-direct-username::after {
    left: 41px;
  }

  .pvr-direct-username > span::before {
    width: 17px;
    height: 17px;
  }

  .pvr-direct-plan-emoji {
    width: 20px;
    height: 20px;
    font-size: 14px;
  }
}
'''.strip()

wallfx_marker = "/* ═══════════ WALLFX BACKDROP ═══════════ */"
if wallfx_marker in gate:
    gate = gate.replace(wallfx_marker, identity_css + "\n\n" + wallfx_marker, 1)
else:
    gate = gate.rstrip() + "\n\n" + identity_css + "\n"
write(gate_path, gate)

buttons_path = ROOT / "components/PrivateRoom/PrivateRoomDirectGateButtons.css"
if buttons_path.exists():
    buttons_path.unlink()

# ═══════════ PRIVATE ROOM SHELL · NAV / MEMBERS / MESSAGES ═══════════
shell_path = "components/PrivateRoom/PrivateRoomLiveShell.tsx"
shell = read(shell_path)
shell = shell.replace('import "./PrivateRoomDirectGateButtons.css";\n', "")

shell = replace_once(
    shell,
    'type ClubTab = "salon" | "live" | "group" | "members" | "gallery" | "messages" | "profile";',
    'type ClubTab = "home" | "live" | "stage" | "gallery" | "members" | "messages" | "profile";',
    "ClubTab",
)
shell = shell.replace('useState<ClubTab>("salon")', 'useState<ClubTab>("live")', 1)

old_home = '''  const goSalon = useCallback(() => {
    setActive("salon");
    dockCameraForBrowse();
    window.setTimeout(() => scrollToSelector("#videocall-stage"),30);
  },[]);'''
new_home = '''  const goHome = useCallback(() => {
    window.location.assign("https://user18fx.com");
  },[]);'''
shell = replace_once(shell, old_home, new_home, "goHome")

old_stage = '''  const goGroup = useCallback(() => {
    setActive("group");
    dockCameraForBrowse();
    window.setTimeout(() => scrollToSelector(".pvr-live-group"),30);
  },[]);'''
new_stage = '''  const goStage = useCallback(() => {
    setActive("stage");
    dockCameraForBrowse();
    window.setTimeout(() => scrollToSelector(".pvr-live-group"),30);
  },[]);'''
shell = replace_once(shell, old_stage, new_stage, "goStage")

old_messages = '''  const goMessages = useCallback(() => {
    setActive("messages");
    dockCameraForBrowse();
    window.setTimeout(() => clickSideAction("Chat"),30);
  },[]);'''
new_messages = '''  const goMessages = useCallback(() => {
    setActive("messages");
    dockCameraForBrowse();
    window.setTimeout(() => scrollToSelector(".pvr-live-messages"),30);
  },[]);'''
shell = replace_once(shell, old_messages, new_messages, "goMessages")

shell = shell.replace('className="pvr-club-brand" onClick={goSalon}', 'className="pvr-club-brand" onClick={goHome}', 1)

nav_start = shell.find('        <nav className="pvr-club-tabs"')
nav_end = shell.find('        </nav>', nav_start)
if nav_start == -1 or nav_end == -1:
    raise RuntimeError("Desktop PrivateRoom nav not found")
nav_end += len('        </nav>')
desktop_nav = '''        <nav className="pvr-club-tabs" aria-label="Private club navigation">
          <button type="button" className={active === "home" ? "is-active" : ""} onClick={goHome}>INICIO</button>
          <button type="button" className={active === "live" ? "is-active" : ""} onClick={goLive}>LIVE CAM</button>
          <button type="button" className={active === "stage" ? "is-active" : ""} onClick={goStage}>STAGE</button>
          <button type="button" className={active === "gallery" ? "is-active" : ""} onClick={goGallery}>GALLERY</button>
          <button type="button" className={active === "members" ? "is-active" : ""} onClick={goMembers}>MEMBERS</button>
          <button type="button" className={active === "messages" ? "is-active" : ""} onClick={goMessages}>MESSAGES</button>
        </nav>'''
shell = shell[:nav_start] + desktop_nav + shell[nav_end:]

membership_old = '<button type="button" className="pvr-club-membership" onClick={() => clickButton(".buttonupgrade")}>MEMBERSHIP</button>'
membership_new = '''<button type="button" className="pvr-club-membership" onClick={() => clickButton(".buttonupgrade")} aria-label="Membership">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" aria-hidden="true">
              <path d="M18 1.5l5.1 10.34 11.41 1.66-8.26 8.05 1.95 11.36L18 27.55 7.8 32.91l1.95-11.36-8.26-8.05 11.41-1.66L18 1.5z" />
            </svg>
          </button>'''
shell = replace_once(shell, membership_old, membership_new, "membership star")

mobile_start = shell.find('      <nav className="pvr-club-mobile-tabs"')
mobile_end = shell.find('      </nav>', mobile_start)
if mobile_start == -1 or mobile_end == -1:
    raise RuntimeError("Mobile PrivateRoom nav not found")
mobile_end += len('      </nav>')
mobile_nav = '''      <nav className="pvr-club-mobile-tabs" aria-label="Private club mobile navigation">
        <button type="button" className={active === "home" ? "is-active" : ""} onClick={goHome}>INICIO</button>
        <button type="button" className={active === "live" ? "is-active" : ""} onClick={goLive}>LIVE</button>
        <button type="button" className={active === "stage" ? "is-active" : ""} onClick={goStage}>STAGE</button>
        <button type="button" className={active === "gallery" ? "is-active" : ""} onClick={goGallery}>GALLERY</button>
        <button type="button" className={active === "members" ? "is-active" : ""} onClick={goMembers}>MEMBERS</button>
        <button type="button" className={active === "messages" ? "is-active" : ""} onClick={goMessages}>MESSAGES</button>
      </nav>'''
shell = shell[:mobile_start] + mobile_nav + shell[mobile_end:]

empty_member = '''          <div className="pvr-live-member-empty">
            <span className="pvr-live-member-dot"></span>
            <strong>MEMBER PRESENCE</strong>
            <small>Online members will appear here.</small>
          </div>'''
default_member = '''          <button type="button" className="pvr-live-member-card is-default" onClick={() => scrollToSelector(".pvr-live-messages")}>
            <span className="pvr-live-member-avatar">FX</span>
            <span>
              <strong>@User18Fx</strong>
              <small>FRIEND · DEFAULT CONTACT</small>
            </span>
            <i>MESSAGE</i>
          </button>'''
shell = replace_once(shell, empty_member, default_member, "default member")

messages_section = '''

      {/* ─────   MESSAGES ─────── */}
      <section className="pvr-live-messages" aria-label="Messages">
        <div className="pvr-live-section-head">
          <div>
            <span>MESSAGES</span>
            <strong>PRIVATE CONTACTS</strong>
          </div>
          <small>1 FRIEND</small>
        </div>

        <button type="button" className="pvr-message-contact" onClick={() => clickSideAction("Chat")}>
          <span className="pvr-message-avatar">FX</span>
          <span>
            <strong>@User18Fx</strong>
            <small>DEFAULT FRIEND · PRIVATE CHAT</small>
          </span>
          <i>OPEN</i>
        </button>
      </section>
'''
group_marker = '      {/* ========   GROUP SALON =========================== */}'
if 'className="pvr-live-messages"' not in shell:
    shell = replace_once(shell, group_marker, messages_section + "\n" + group_marker, "messages section")

write(shell_path, shell)

# ═══════════ PRIVATE ROOM THEME · STAR + MEMBER / MESSAGE UI ═══════════
luxury_path = "components/PrivateRoom/PrivateRoomLuxury.css"
luxury = read(luxury_path)
old_membership = '''.pvr-club-membership {
  padding:0 16px;
  border:1px solid var(--pvr-champagne);
  background:linear-gradient(180deg,#d4bc94,#b8955f);
  color:#1a150f;
  font:700 8px var(--pvr-body);
  letter-spacing:.15em;
}'''
new_membership = '''.pvr-club-membership {
  width:48px;
  min-width:48px;
  min-height:48px;
  display:grid;
  place-items:center;
  padding:0;
  border:0;
  border-radius:7px;
  background:linear-gradient(18deg,#ffd900,#ffc400d3,#c9b500d3,#ffd900,#ffc400d3,#d6c633f5,#c9b500d3,#ffc400d3,#887400) no-repeat;
  background-size:600%;
  background-position:left center;
  color:#000;
  cursor:pointer;
  transition:background .3s ease,transform .18s ease;
}

.pvr-club-membership:hover {
  background-size:410%;
  background-position:right center;
}

.pvr-club-membership:active {
  transform:scale(.96);
}

.pvr-club-membership svg {
  width:26px;
  height:26px;
  fill:#494836;
  transition:fill .3s ease,transform .3s ease;
}

.pvr-club-membership:hover svg {
  fill:#000;
  transform:scale(1.08);
}'''
luxury = replace_once(luxury, old_membership, new_membership, "membership CSS")

friend_css = r'''

/* ═══════════ MEMBERS + MESSAGES · DEFAULT FRIEND ═══════════ */
.pvr-live-member-card,
.pvr-message-contact {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 11px 12px;
  border: 1px solid rgba(196, 165, 116, 0.2);
  border-radius: 2px;
  background: #0e0c0a;
  color: var(--pvr-ivory);
  text-align: left;
  cursor: pointer;
}

.pvr-live-member-card:hover,
.pvr-message-contact:hover {
  border-color: rgba(196, 165, 116, 0.42);
  background: #15110e;
}

.pvr-live-member-avatar,
.pvr-message-avatar {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(196, 165, 116, 0.42);
  border-radius: 50%;
  background: #17130f;
  color: var(--pvr-champagne-soft);
  font-family: var(--pvr-display);
  font-size: 11px;
}

.pvr-live-member-card > span:nth-child(2),
.pvr-message-contact > span:nth-child(2) {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pvr-live-member-card strong,
.pvr-message-contact strong {
  color: var(--pvr-ivory);
  font-family: var(--pvr-display);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .06em;
}

.pvr-live-member-card small,
.pvr-message-contact small {
  color: var(--pvr-ivory-dim);
  font-size: 6px;
  font-weight: 700;
  letter-spacing: .12em;
}

.pvr-live-member-card i,
.pvr-message-contact i {
  color: var(--pvr-champagne);
  font-size: 6px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: .14em;
}

.pvr-live-messages {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid rgba(196, 165, 116, 0.18);
  border-radius: 3px;
  background: linear-gradient(180deg, #14110e, #0d0b09);
}

.pvr-message-contact {
  margin-top: 12px;
}

@media (max-width: 700px) {
  .pvr-live-member-card,
  .pvr-message-contact {
    grid-template-columns: 38px minmax(0, 1fr) auto;
    gap: 8px;
    padding: 9px;
  }

  .pvr-live-member-avatar,
  .pvr-message-avatar {
    width: 34px;
    height: 34px;
  }
}
'''

if "/* ═══════════ MEMBERS + MESSAGES · DEFAULT FRIEND ═══════════ */" not in luxury:
    luxury = luxury.rstrip() + friend_css + "\n"
write(luxury_path, luxury)

print("USER FX cleanup transformations applied.")
