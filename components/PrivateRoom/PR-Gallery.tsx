          import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
          import "./PR-Gallery.css";

          type MultimediaType = "video" | "album" | "image";
          type TabKey = "all" | "videos" | "album" | "images";
type ViewMode = "user" | "admin";

          type MultimediaItem = {
            id: string;
            title: string;
            owner: string;
            duration: string;
            expiresIn: string;
            type: MultimediaType;
            isFavorite?: boolean;
            videoSrc?: string;
          };

          type Novedad = {
            id: string;
            user: string;
            action: string;
            time: string;
            expiresIn: string;
          };

          const TAB_TO_TYPE: Record<Exclude<TabKey, "all">, MultimediaType> = {
            videos: "video",
            album: "album",
            images: "image",
          };

          const MULTIMEDIA_ITEMS: MultimediaItem[] = [
            { id: "1", title: "Demo Reel 2025", owner: "ProdHouse", duration: "3:24", expiresIn: "12h", type: "video", isFavorite: true, videoSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
            { id: "2", title: "Soundtrack Final", owner: "Album", duration: "5:12", expiresIn: "2d", type: "album" },
            { id: "3", title: "Cover Art", owner: "DesignStudio", duration: "N/A", expiresIn: "5d", type: "image" },
            { id: "4", title: "BTS Episode", owner: "ContentHouse", duration: "8:45", expiresIn: "1d", type: "video", isFavorite: true, videoSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
            { id: "5", title: "Podcast Ep. 42", owner: "AlbumLab", duration: "42:00", expiresIn: "3d", type: "album" },
            { id: "6", title: "Shared Album Preview", owner: "User18Fx", duration: "0:15", expiresIn: "7d", type: "album", videoSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
          ];

          const NOVEDADES: Novedad[] = [
            { id: "1", user: "DarkVoid", action: "uploaded a new video", time: "2h ago", expiresIn: "3d" },
            { id: "2", user: "NeonPulse", action: "updated cover art", time: "5h ago", expiresIn: "7d" },
          ];

          const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
          const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];

          function getExpireColor(expiresIn: string) {
            const num = Number.parseInt(expiresIn, 10);
            if (Number.isNaN(num)) return "#a98c56";
            if (expiresIn.includes("h") && num < 24) return "#d7b66f";
            if (expiresIn.includes("d") && num <= 2) return "#c9954a";
            return "#7e6c50";
          }

          function typeIcon(type: MultimediaType) {
            if (type === "video") return "▶";
            if (type === "album") return "▤";
            return "▧";
          }

          export default function PrivateRoomGallery() {
            const [activeTab, setActiveTab] = useState<TabKey>("all");
            const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set(["ProdHouse"]));
            const [showProjection, setShowProjection] = useState(false);
            const [projectingItem, setProjectingItem] = useState<MultimediaItem | null>(null);
            const [galleryPlayerItem, setGalleryPlayerItem] = useState<MultimediaItem | null>(null);
            const [showUploadModal, setShowUploadModal] = useState(false);
            const [uploadError, setUploadError] = useState("");
            const [projPos, setProjPos] = useState(() => ({ x: Math.max(12, window.innerWidth - 370), y: 90 }));
            const dragState = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
            const [runtime, setRuntime] = useState({ isOwner: false, galleryVisible: true, sharedWith: 0, viewingGallery: 0 });
            const [viewMode, setViewMode] = useState<ViewMode>(() => document.documentElement.dataset.pvrViewMode === "admin" ? "admin" : "user");

            useEffect(() => {
              const handleViewMode = () => setViewMode(document.documentElement.dataset.pvrViewMode === "admin" ? "admin" : "user");
              window.addEventListener("userfx:private-room-view-mode", handleViewMode);
              return () => window.removeEventListener("userfx:private-room-view-mode", handleViewMode);
            }, []);

            async function applyRuntime(response: Response) {
              if (!response.ok) return;
              const data = await response.json();
              if (!data?.ok) return;
              setRuntime({
                isOwner: Boolean(data.isOwner),
                galleryVisible: data.galleryVisible !== false,
                sharedWith: Number(data.sharedWith || 0),
                viewingGallery: Number(data.viewingGallery || 0),
              });
            }

            async function refreshRuntime() {
              try {
                const response = await fetch("/api/admin-runtime", { credentials: "include", cache: "no-store" });
                await applyRuntime(response);
              } catch {}
            }

            async function runtimeAction(action: string) {
              try {
                const response = await fetch("/api/admin-runtime", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action }),
                });
                await applyRuntime(response);
              } catch {}
            }

            useEffect(() => {
              refreshRuntime();
              runtimeAction("gallery-heartbeat");
              const heartbeat = window.setInterval(() => runtimeAction("gallery-heartbeat"), 25000);
              return () => window.clearInterval(heartbeat);
            }, []);

            const filteredItems = useMemo(() => {
              if (activeTab === "all") return MULTIMEDIA_ITEMS;
              return MULTIMEDIA_ITEMS.filter((item) => item.type === TAB_TO_TYPE[activeTab]);
            }, [activeTab]);

            const favoriteVideos = useMemo(() => MULTIMEDIA_ITEMS.filter((item) => item.type === "video" && item.isFavorite), []);

            const groupedByOwner = useMemo(
              () =>
                filteredItems.reduce<Record<string, MultimediaItem[]>>((groups, item) => {
                  if (!groups[item.owner]) groups[item.owner] = [];
                  groups[item.owner].push(item);
                  return groups;
                }, {}),
              [filteredItems],
            );

            function toggleOwner(owner: string) {
              setExpandedOwners((current) => {
                const next = new Set(current);
                if (next.has(owner)) next.delete(owner);
                else next.add(owner);
                return next;
              });
            }

            function castToProjection(item: MultimediaItem) {
              setProjectingItem(item);
              setShowProjection(true);
            }

            function openGalleryPlayer(item: MultimediaItem) {
              if (!item.videoSrc) return;
              setGalleryPlayerItem(item);
            }

            function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, item: MultimediaItem) {
              if (!item.videoSrc || (event.key !== "Enter" && event.key !== " ")) return;
              event.preventDefault();
              openGalleryPlayer(item);
            }

            function handleFileSelected(file: File) {
              if (!ALLOWED_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
                setUploadError("UNSUPPORTED FORMAT · USE IMAGE, VIDEO OR AUDIO");
                return;
              }
              if (file.size > MAX_UPLOAD_BYTES) {
                setUploadError("FILE TOO LARGE · MAX 200MB");
                return;
              }
              setUploadError("");
              setShowUploadModal(false);
            }

            function onDragStart(event: MouseEvent<HTMLDivElement>) {
              dragState.current.dragging = true;
              dragState.current.offsetX = event.clientX - projPos.x;
              dragState.current.offsetY = event.clientY - projPos.y;

              const onMove = (moveEvent: globalThis.MouseEvent) => {
                if (!dragState.current.dragging) return;
                setProjPos({
                  x: Math.max(0, Math.min(window.innerWidth - 340, moveEvent.clientX - dragState.current.offsetX)),
                  y: Math.max(0, Math.min(window.innerHeight - 100, moveEvent.clientY - dragState.current.offsetY)),
                });
              };

              const onUp = () => {
                dragState.current.dragging = false;
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };

              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }

            function renderCard(item: MultimediaItem, style?: CSSProperties) {
              return (
                <article key={item.id} className={`mml-glass${item.videoSrc ? " is-playable" : ""}`} data-text={item.title} style={style} role={item.videoSrc ? "button" : undefined} tabIndex={item.videoSrc ? 0 : undefined} onClick={() => openGalleryPlayer(item)} onKeyDown={(event) => handleCardKeyDown(event, item)}>
        <div className="mml-glass-glow" />
        <div className="mml-glass-shine" />
        {item.duration !== "N/A" && <span className="mml-glass-duration">{item.duration}</span>}
        <div className="mml-glass-iconWrap">
          <span className="mml-typeIcon">{typeIcon(item.type)}</span>
        </div>
        {item.videoSrc && <span className="mml-gallery-play-hint">PLAY</span>}
        {item.type === "video" && item.isFavorite && (
          <button
            type="button"
            className="mml-glass-castBtn"
            onClick={(event) => {
              event.stopPropagation();
              castToProjection(item);
            }}
            aria-label={`Play ${item.title} in projection`}>
            ◉
          </button>
        )}
      </article>
    );
  }

  const adminView = runtime.isOwner && viewMode === "admin";

  return (
    <section className="pvr-gallery-route" aria-label="Private Room Gallery">
      <header className="pvr-route-head">
        <div>
          <span>
          USER FX · PRIVATE COLLECTION
          </span>
          <h1>
          GALLERY
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            window.location.hash = "#/private-room";
          }}>
          MYROOM
        </button>
      </header>
      <div className={"mml-root" + (!runtime.galleryVisible && !adminView ? " is-hidden" : "")}>
        {!runtime.galleryVisible && !adminView ? (
          <section className="mml-gallery-hidden-notice" role="status">
            <span>
USER FX · PRIVATE COLLECTION
            </span>
            <strong>
ALBUM TEMPORARILY HIDDEN
            </strong>
            <p>
The owner has paused this shared gallery.
            </p>
          </section>
        ) : null}
        {adminView ? (
          <section className="mml-owner-control pvr-admin-only" aria-label="Owner gallery controls">
            <div className="mml-owner-control-title">
              <span>
OWNER · @User18Fx
              </span>
              <strong>
ALBUM CONTROL
              </strong>
            </div>
            <div className="mml-owner-control-stat">
              <span>
SHARED WITH
              </span>
              <strong>
{runtime.sharedWith}
              </strong>
            </div>
            <div className="mml-owner-control-stat">
              <span>
VIEWING NOW
              </span>
              <strong>
{runtime.viewingGallery}
              </strong>
            </div>
            <button type="button" className={runtime.galleryVisible ? "is-hide" : "is-show"} onClick={() => runtimeAction(runtime.galleryVisible ? "gallery-hide" : "gallery-show")}>
{runtime.galleryVisible ? "HIDE ALBUM" : "SHOW ALBUM"}
            </button>
          </section>
        ) : null}
        <div className="mml-navRow">
          <div className="mml-sectionNav" role="tablist" aria-label="Gallery filters">
            <button type="button" role="tab" aria-selected={activeTab === "all"} className={`mml-sectionBtn${activeTab === "all" ? " is-active" : ""}`} onClick={() => setActiveTab("all")}>
              ALL
            </button>
            <button type="button" role="tab" aria-selected={activeTab === "videos"} className={`mml-sectionBtn${activeTab === "videos" ? " is-active" : ""}`} onClick={() => setActiveTab("videos")}>
              VIDEOS
              <span className="mml-sectionBadge">{MULTIMEDIA_ITEMS.filter((item) => item.type === "video").length}</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === "album"} className={`mml-sectionBtn${activeTab === "album" ? " is-active" : ""}`} onClick={() => setActiveTab("album")}>
              ALBUM
              <span className="mml-sectionBadge">{MULTIMEDIA_ITEMS.filter((item) => item.type === "album").length}</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === "images"} className={`mml-sectionBtn${activeTab === "images" ? " is-active" : ""}`} onClick={() => setActiveTab("images")}>
              IMAGES
              <span className="mml-sectionBadge">{MULTIMEDIA_ITEMS.filter((item) => item.type === "image").length}</span>
            </button>
            <button
              type="button"
              className="mml-sectionBtn mml-sectionBtn--addOnly"
              onClick={() => {
                setUploadError("");
                setShowUploadModal(true);
              }}
              aria-label="Add content">
              +
            </button>
          </div>
          <button type="button" className={`mml-projectionToggle${showProjection ? " is-active" : ""}`} onClick={() => setShowProjection((current) => !current)} aria-expanded={showProjection}>
            PROJECTION
            <span className="mml-sectionBadge">{favoriteVideos.length}</span>
          </button>
        </div>
        <section className="mml-section">
          <div className="mml-sectionTitle">
          FEATURED MULTIMEDIA
          </div>
          <div className="mml-sectionDesc">TRENDING CONTENT · {filteredItems.length} ITEMS · VIDEOS OPEN IN GALLERY VIEW MODE</div>
          <div className="mml-fanContainer">
            {filteredItems.map((item) => renderCard(item))}
            <button type="button" className="mml-glass-add" onClick={() => setShowUploadModal(true)}>
              <span className="mml-glass-add-icon">
              +
              </span>
              <span className="mml-glass-add-label">
              ADD CONTENT
              </span>
            </button>
          </div>
        </section>
        <section className="mml-section mml-owner-section">
          <div className="mml-sectionTitle">
          BY OWNER
          </div>
          {Object.entries(groupedByOwner).map(([owner, items]) => {
            const isExpanded = expandedOwners.has(owner);
            return (
              <div key={owner} className="mml-ownerRow">
                <button type="button" className="mml-ownerHeader" onClick={() => toggleOwner(owner)} aria-expanded={isExpanded}>
                  <span className="mml-ownerAvatar">{owner.slice(0, 2).toUpperCase()}</span>
                  <span className="mml-ownerName">{owner}</span>
                  <span className="mml-ownerMeta">{items.length} ITEMS</span>
                  <span className="mml-ownerExpire" style={{ color: getExpireColor(items[0].expiresIn), borderColor: getExpireColor(items[0].expiresIn) }}>
                    {items[0].expiresIn}
                  </span>
                  <span className="mml-ownerChevron">{isExpanded ? "⌄" : "›"}</span>
                </button>
                {isExpanded && (
                  <div className="mml-ownerGallery">
                    <div className="mml-fanContainer mml-fanContainer--owner">{items.map((item) => renderCard(item, { width: "150px", height: "180px" }))}</div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
        <section className="mml-section mml-news-section">
          <div className="mml-sectionTitle">
          RECENT ACTIVITY
          </div>
          <div className="mml-novedades">
            {NOVEDADES.map((item) => (
              <article key={item.id} className="mml-novedadRow">
                <div className="mml-novedadAvatar">{item.user.slice(0, 2).toUpperCase()}</div>
                <div className="mml-novedadInfo">
                  <strong>{item.user}</strong>
                  <span>{item.action}</span>
                </div>
                <span className="mml-novedadTime">{item.time}</span>
                <span className="mml-novedadExpire" style={{ color: getExpireColor(item.expiresIn), borderColor: getExpireColor(item.expiresIn) }}>
                  {item.expiresIn}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
      {galleryPlayerItem?.videoSrc && (
        <div className="mml-gallery-player-layer" role="dialog" aria-modal="true" aria-label={`Playing ${galleryPlayerItem.title}`} onClick={() => setGalleryPlayerItem(null)}>
          <section className="mml-gallery-player" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>
                GALLERY VIEW MODE
                </span>
                <strong>{galleryPlayerItem.title}</strong>
                <small>
                  @{galleryPlayerItem.owner} · {galleryPlayerItem.type.toUpperCase()}
                </small>
              </div>
              <button type="button" onClick={() => setGalleryPlayerItem(null)} aria-label="Close Gallery player">
                ×
              </button>
            </header>
            <div className="mml-gallery-player-stage">
              <video key={galleryPlayerItem.id} src={galleryPlayerItem.videoSrc} controls autoPlay playsInline className="mml-gallery-player-video" />
            </div>
            <footer>
              <span>
              PRIVATE GALLERY PLAYBACK
              </span>
              <small>
              Playback stays inside Gallery.
              </small>
            </footer>
          </section>
        </div>
      )}
      {showProjection && (
        <aside className="mml-projectionPanel" style={{ left: projPos.x, top: projPos.y }} role="dialog" aria-label="Favorite video projection">
          <div className="mml-projectionPanel-header" onMouseDown={onDragStart}>
            <strong>
            PROJECTION // FAVS
            </strong>
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => {
                setShowProjection(false);
                setProjectingItem(null);
              }}
              aria-label="Close projection">
              ×
            </button>
          </div>
          <div className="mml-projectionPanel-stage">{projectingItem?.videoSrc ? <video key={projectingItem.id} src={projectingItem.videoSrc} controls autoPlay className="mml-projectionPanel-video" /> : <span>SELECT A FAVORITE VIDEO</span>}</div>
          <div className="mml-projectionPanel-list">
            {favoriteVideos.map((video) => (
              <button key={video.id} type="button" className={projectingItem?.id === video.id ? "is-playing" : ""} onClick={() => setProjectingItem(video)}>
                <span>
                ▶
                </span>
                <strong>{video.title}</strong>
                <small>{video.duration}</small>
              </button>
            ))}
          </div>
        </aside>
      )}
      {showUploadModal && (
        <div className="mml-uploadOverlay" onClick={() => setShowUploadModal(false)}>
          <div className="mml-uploadModal" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Upload content">
            <header>
              <span>
              UPLOAD CONTENT
              </span>
              <button type="button" onClick={() => setShowUploadModal(false)} aria-label="Close upload">
                ×
              </button>
            </header>
            <label className="mml-uploadDropzone">
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFileSelected(file);
                  event.target.value = "";
                }}
              />
              <span>
              DROP A FILE OR CLICK TO CHOOSE
              </span>
            </label>
            {uploadError && <p className="mml-uploadError">{uploadError}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
