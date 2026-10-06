import { useEffect, useState, type FormEvent } from "react";
import { roomRequest, type Post, type Profile } from "./client";
import { Avatar, Icon } from "./shared";

export default function RoomFeed({ client, roomId, profile, approved, isOwner, onChat }: { client: string; roomId: string; profile: Profile; approved: boolean; isOwner: boolean; onChat: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!approved) { setPosts([]); setLoading(false); return; }
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const result = await roomRequest<{ posts: Post[] }>(client, roomId, "posts", { signal: controller.signal });
        if (!controller.signal.aborted) { setPosts(result.posts); setError(""); }
      } catch (cause) {
        if (!controller.signal.aborted) setError((cause as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [client, roomId, approved, revision]);
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await roomRequest(client, roomId, "posts", { method: "POST", body: { content: text.trim() } });
      setText(""); setRevision((current) => current + 1);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await roomRequest(client, roomId, "remove-post", { method: "POST", body: { id } });
      setRevision((current) => current + 1);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  return (
<section className="ufx-feed" aria-labelledby="ufx-feed-title">
<div className="ufx-section-head">
<div>
<span>
LIFE BETWEEN CONNECTIONS
</span>
<h2 id="ufx-feed-title">
Room feed
</h2>
</div>
<span>
<Icon name="shield" size={14} />
INVITED CIRCLE
</span>
</div>
{error &&
<p className="ufx-warning" role="alert">
{error}
</p>
}
{approved && isOwner &&
<form className="ufx-post-compose" onSubmit={(event) => void publish(event)}>
<Avatar name={profile.name} />
<div>
<label htmlFor="ufx-new-post">
SHARE A MOMENT WITH YOUR PEOPLE
</label>
<textarea id="ufx-new-post" rows={3} maxLength={2000} placeholder="What's happening in your world?" value={text} onChange={(event) => setText(event.target.value)} disabled={busy} />
<footer>
<span>
{text.length} / 2000
</span>
<button type="submit" className="ufx-primary" disabled={!text.trim() || busy}>
{busy ? "SAVING…" : "PUBLISH POST"}
<Icon name="arrow" size={15} />
</button>
</footer>
</div>
</form>
}
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
<Icon name="chat" size={25} />
<h3>
A moment worth sharing.
</h3>
<p>
{isOwner ? "Your first post starts your room's story." : "Your host's next update will appear here."}
</p>
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
ROOM POST
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
<footer>
<span>
<Icon name="shield" size={13} />
YOUR PRIVATE CIRCLE
</span>
<button type="button" onClick={onChat}>
<Icon name="chat" size={16} />
CHAT ABOUT THIS
</button>
</footer>
</article>
))}
</section>
  );
}
