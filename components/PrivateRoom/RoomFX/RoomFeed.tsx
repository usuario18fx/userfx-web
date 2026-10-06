import { useEffect, useRef, useState, type FormEvent } from "react";
import { roomRequest, type Post, type PostComment, type Profile } from "./client";
import { Avatar, Icon } from "./shared";

export default function RoomFeed({ client, roomId, profile, approved, isOwner, onChat }: { client: string; roomId: string; profile: Profile; approved: boolean; isOwner: boolean; onChat: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [working, setWorking] = useState("");
  const busy = !!working;
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const composer = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!approved) { setPosts([]); setLoading(false); return; }
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const result = await roomRequest<{ posts: Post[] }>(client, roomId, "posts", { signal: controller.signal });
        if (!controller.signal.aborted) { setPosts(result.posts); setLoadError(""); }
      } catch (cause) {
        if (!controller.signal.aborted) setLoadError((cause as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [client, roomId, approved, revision]);
  function previewImage() {
    try {
      const url = new URL(imageUrl.trim());
      if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local") || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":")) throw new Error("Invalid image link");
      setImagePreviewError(false);
      setImagePreview(url.href);
    } catch { setImagePreview(""); setImagePreviewError(true); }
  }
  function openComposer() {
    if (!composer.current) return;
    composer.current.open = true;
    composer.current.querySelector("textarea")?.focus();
  }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setWorking("publish"); setError("");
    try {
      await roomRequest(client, roomId, "posts", { method: "POST", body: { content: text.trim(), imageUrl: imageUrl.trim() } });
      setText(""); setImageUrl(""); setImagePreview(""); setImagePreviewError(false); setRevision((current) => current + 1);
      if (composer.current) composer.current.open = false;
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(""); }
  }
  async function remove(id: string) {
    if (busy) return;
    setWorking(id); setError("");
    try {
      await roomRequest(client, roomId, "remove-post", { method: "POST", body: { id } });
      setRevision((current) => current + 1);
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(""); }
  }
  async function like(post: Post) {
    if (busy) return;
    setWorking(post.id); setError("");
    try {
      const result = await roomRequest<{ likeCount: number; likedByMe: boolean }>(client, roomId, "post-like", { method: "POST", body: { id: post.id, liked: !post.likedByMe } });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, ...result } : item));
      setRevision((current) => current + 1);
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(""); }
  }
  async function comment(event: FormEvent<HTMLFormElement>, post: Post) {
    event.preventDefault();
    const content = comments[post.id]?.trim();
    if (!content || busy) return;
    const submitted = comments[post.id];
    setWorking(post.id); setError("");
    try {
      const result = await roomRequest<{ comment: PostComment }>(client, roomId, "post-comment", { method: "POST", body: { id: post.id, content } });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, comments: [...item.comments, result.comment].slice(-30) } : item));
      setComments((current) => current[post.id] === submitted ? { ...current, [post.id]: "" } : current);
      setRevision((current) => current + 1);
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(""); }
  }
  return (
<section className="ufx-feed ufx-feed-premium" aria-labelledby="ufx-feed-title">
<div className="ufx-section-head ufx-feed-heading">
<span className="ufx-feed-heading-icon"><Icon name="inbox" size={21} /></span>
<div>
<small className="ufx-feed-eyebrow">USER FX · MYROOM</small>
<h2 id="ufx-feed-title">
Publicaciones
</h2>
<span>Momentos que se quedan en tu círculo.</span>
</div>
<div className="ufx-feed-tally"><span className="ufx-feed-count" aria-label={`${posts.length} publicaciones`}>{loading ? "…" : posts.length}</span><small>PUBLICACIONES</small></div>
</div>
<div className="ufx-feed-body">
{(error || loadError) &&
<p className="ufx-warning" role="alert">
{error || loadError}
</p>
}
{approved && isOwner &&
<details ref={composer} className="ufx-post-editor">
<summary aria-label="Create room post">
<Avatar name={profile.name} />
<span className="ufx-post-editor-copy"><strong>Comparte un momento</strong><small>¿Qué quieres contar hoy, {profile.name}?</small></span>
<Icon name="arrow" size={16} />
</summary>
<form className="ufx-post-compose" onSubmit={(event) => void publish(event)}>
<div>
<div className="ufx-compose-caption"><span><Icon name="inbox" size={14} /> NUEVA PUBLICACIÓN</span><span><Icon name="shield" size={13} /> TU SALA</span></div>
<label htmlFor="ufx-new-post">
SHARE A MOMENT WITH YOUR PEOPLE
</label>
<textarea id="ufx-new-post" rows={3} maxLength={2000} placeholder="What's happening in your world?" value={text} onChange={(event) => setText(event.target.value)} disabled={busy} />
<label htmlFor="ufx-post-image" className="ufx-image-label">
IMAGE LINK · OPTIONAL
</label>
<div className="ufx-image-input-row">
<input id="ufx-post-image" type="url" maxLength={1000} placeholder="https://…" value={imageUrl} onChange={(event) => { setImageUrl(event.target.value); setImagePreview(""); setImagePreviewError(false); }} disabled={busy} />
<button type="button" className="ufx-image-preview-button" onClick={previewImage} disabled={busy || !imageUrl.trim()}><Icon name="gallery" size={15} /> Ver imagen</button>
</div>
{imagePreview && <figure className="ufx-image-preview"><img key={imagePreview} src={imagePreview} alt="Vista previa de la imagen de tu publicación" referrerPolicy="no-referrer" onError={() => { setImagePreview(""); setImagePreviewError(true); }} /><figcaption><Icon name="gallery" size={13} /> Vista previa</figcaption></figure>}
{imagePreviewError && <p className="ufx-warning" role="status">No se pudo mostrar la imagen. Revisa que el enlace sea público, HTTPS y lleve a una imagen.</p>}
<p className="ufx-image-note">
Use a public HTTPS image link. Images load from the linked site.
</p>
<footer>
<span className="ufx-compose-length"><meter min={0} max={2000} value={text.length} aria-label="Caracteres de la publicación" /><span>{text.length} / 2000</span></span>
<button type="submit" className="ufx-primary" disabled={!text.trim() || busy}>
{working === "publish" ? "SAVING…" : "PUBLISH POST"}
<Icon name="arrow" size={15} />
</button>
</footer>
</div>
</form>
</details>
}
{approved && !isOwner && <div className="ufx-feed-guest"><Avatar name={profile.name} /><span>Las publicaciones del anfitrión aparecen aquí.</span></div>}
{!approved ?
<div className="ufx-feed-empty">
<Icon name="shield" size={25} />
<h3>
Your host's world, by invitation.
</h3>
<p>
Posts appear once your entrance is approved.
</p>
</div>
 : loading ?
<p className="ufx-feed-status" role="status">
Opening the feed…
</p>
 : !posts.length ?
<div className="ufx-feed-empty">
<div className="ufx-feed-empty-art" aria-hidden="true"><span><Icon name="gallery" size={22} /></span><span><Icon name="inbox" size={27} /></span><i /></div>
<h3>
El muro está en blanco
</h3>
<p>
{isOwner ? "Una foto, una idea o ese momento que merece quedarse." : "La próxima publicación del anfitrión aparecerá aquí."}
</p>
{isOwner && <button type="button" className="ufx-feed-first-post" onClick={openComposer}><Icon name="inbox" size={15} /> Crear publicación <Icon name="arrow" size={14} /></button>}
</div>
 : posts.map((post) => (
<article key={post.id} className="ufx-post">
<header>
<Avatar name={post.authorName} />
<div>
<strong>
{post.authorName}
</strong>
<time dateTime={post.createdAt}>
{new Date(post.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
</time>
</div>
<span>
ANFITRIÓN
</span>
{isOwner &&
<button type="button" disabled={busy} aria-label="Delete post" onClick={() => void remove(post.id)}>
<Icon name="close" size={15} />
</button>
}
</header>
<p>
{post.content}
</p>
{post.imageUrl &&
<img className="ufx-post-image" src={post.imageUrl} alt="Image shared with this room" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; }} />
}
<footer>
<div className="ufx-post-reactions">
<button type="button" aria-label={post.likedByMe ? "Unlike post" : "Like post"} aria-pressed={post.likedByMe} disabled={busy} onClick={() => void like(post)}>
<Icon name="heart" size={16} />
<span className="ufx-reaction-label">Me gusta</span><span>{post.likeCount}</span>
</button>
<button type="button" aria-label="Post comments" aria-expanded={!!expanded[post.id]} onClick={() => setExpanded((current) => ({ ...current, [post.id]: !current[post.id] }))}>
<Icon name="chat" size={16} />
<span className="ufx-reaction-label">Comentarios</span><span>{profile.paidChat ? post.comments.length : "COMMENTS"}</span>
</button>
</div>
<button type="button" onClick={onChat}>
<Icon name="chat" size={16} />
IR AL CHAT
</button>
</footer>
{expanded[post.id] &&
<div className="ufx-post-comments">
{profile.paidChat ?
<>
{post.comments.map((item) => (
<article key={item.id}>
<Avatar name={item.authorName} />
<div>
<strong>
{item.authorName}
</strong>
<time dateTime={item.createdAt}>
{new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
</time>
<p>
{item.content}
</p>
</div>
</article>
))}
<form onSubmit={(event) => void comment(event, post)}>
<input type="text" maxLength={400} aria-label="Post comment" placeholder="Add to the conversation…" value={comments[post.id] || ""} onChange={(event) => setComments((current) => ({ ...current, [post.id]: event.target.value }))} disabled={busy} />
<button type="submit" aria-label="Send comment" disabled={busy || !comments[post.id]?.trim()}>
<Icon name="send" size={17} />
</button>
</form>
</>
 :
<p>
Private comments require a paid membership.
</p>
}
</div>
}
</article>
))}
</div>
</section>
  );
}
