import { useEffect, useRef, useState } from "react";
import { Icon } from "./RoomFX/shared";
import "./PR-Gallery.css";

const COLLECTIONS = [
  { prefix: "BSIC", plan: "basic", label: "BASIC", count: 5 },
  { prefix: "PRX0", plan: "pro", label: "PRO", count: 3 },
  { prefix: "VIPX", plan: "vip", label: "VIP", count: 4 },
] as const;
const FILES = COLLECTIONS.flatMap((collection) => Array.from({ length: collection.count }, (_, index) => {
  const name = `${collection.prefix}-${String(index + 1).padStart(2, "0")}`;
  return { ...collection, name, src: `/api/private-media?pathname=${encodeURIComponent(`userfx-album/${collection.prefix}/${name}.jpg`)}` };
}));

export default function PrivateRoomGallery({ planId, onMembership, onUnlock }: { planId: string; onMembership: () => void; onUnlock: () => void }) {
  const [collection, setCollection] = useState("");
  const [selected, setSelected] = useState("");
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [retries, setRetries] = useState<Record<string, number>>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const accessible = FILES.filter((file) => file.plan === planId);
  const filtered = accessible.filter((file) => file.prefix === collection);
  const selectedIndex = accessible.findIndex((file) => file.name === selected);
  const active = accessible[selectedIndex];
  const viewerOpen = Boolean(active);

  useEffect(() => {
    if (!viewerOpen) return;
    dialog.current?.showModal();
    return () => opener.current?.focus();
  }, [viewerOpen]);

  function markFailed(name: string) {
    setFailed((current) => new Set(current).add(name));
  }
  function retry(name: string) {
    setFailed((current) => { const next = new Set(current); next.delete(name); return next; });
    setRetries((current) => ({ ...current, [name]: (current[name] || 0) + 1 }));
  }
  function navigate(direction: number) {
    setSelected(accessible[(selectedIndex + direction + accessible.length) % accessible.length].name);
  }
  function photo(file: (typeof FILES)[number], full = false) {
    return failed.has(file.name) ? (
      <div className="ufx-gallery-unavailable" role="status"><Icon name="gallery" size={28} /><strong>FILE UNAVAILABLE</strong><span>Check your access or try again.</span>{full && <button type="button" onClick={() => retry(file.name)}>TRY AGAIN</button>}</div>
    ) : (
      <img key={`${file.name}:${retries[file.name] || 0}`} src={`${file.src}&retry=${retries[file.name] || 0}`} alt={`UserFX private photograph ${file.name}`} loading={full ? "eager" : "lazy"} draggable={false} onError={() => markFailed(file.name)} />
    );
  }

  return (
    <section className="ufx-gallery" aria-label="Private Room Gallery">
      <div className="ufx-gallery-summary"><Icon name="shield" /><span>PRIVATE COLLECTION · {planId.toUpperCase()} ACCESS</span><span>{accessible.length ? "1 ALBUM UNLOCKED" : "ALBUM CODE REQUIRED"}</span></div>
      <div className="ufx-gallery-albums" role="group" aria-label="Gallery collections">
        {COLLECTIONS.map((item) => {
          const allowed = item.plan === planId;
          return <button key={item.prefix} type="button" className="ufx-gallery-album" aria-label={allowed ? `Open ${item.label} album` : `Unlock ${item.label} album with ${item.prefix} code`} aria-pressed={collection === item.prefix} onClick={() => allowed ? setCollection(collection === item.prefix ? "" : item.prefix) : onUnlock()}>
            <Icon name={allowed ? "gallery" : "shield"} size={30} /><strong>{item.label}</strong><span>{item.count} PRIVATE PHOTOS</span><small>{allowed ? (collection === item.prefix ? "CLOSE ALBUM" : "OPEN ALBUM") : `${item.prefix} CODE REQUIRED`}</small>
          </button>;
        })}
      </div>
      <div className="ufx-gallery-grid">
        {filtered.map((file) => <button key={file.name} type="button" className="ufx-gallery-card" aria-label={`Open private file ${file.name}`} onClick={() => { opener.current = document.activeElement as HTMLElement; setSelected(file.name); }}>
          <span className="ufx-gallery-photo">{photo(file)}</span><span className="ufx-gallery-caption"><strong>{file.name}</strong><span>{file.label}<Icon name="expand" size={14} /></span></span>
        </button>)}
      </div>
      <div className="ufx-membership-note"><Icon name="shield" /><p>Each private album requires its matching code. SPCL opens the club without unlocking photos.</p><button type="button" onClick={onMembership}>VIEW MEMBERSHIP</button></div>
      {active && <dialog ref={dialog} className="ufx-gallery-viewer" aria-label={`Private file ${active.name}`} onCancel={() => setSelected("")} onKeyDown={(event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); navigate(1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); navigate(-1); }
      }}>
        <header><div><span>USER FX · PRIVATE COLLECTION</span><strong>{active.name}</strong></div><button type="button" aria-label="Close private file" onClick={() => setSelected("")}><Icon name="close" /></button></header>
        <div className="ufx-gallery-full">{photo(active, true)}</div>
        <footer><button type="button" aria-label="Previous private file" onClick={() => navigate(-1)}>← PREVIOUS</button><span>{selectedIndex + 1} / {accessible.length}</span><button type="button" aria-label="Next private file" onClick={() => navigate(1)}>NEXT →</button></footer>
      </dialog>}
    </section>
  );
}
