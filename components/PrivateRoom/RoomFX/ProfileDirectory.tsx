import { useEffect, useState } from "react";
import { roomRequest, type DirectoryProfile } from "./client";
import { Avatar, Icon } from "./shared";

export default function ProfileDirectory({ client, onEdit }: { client: string; onEdit: () => void }) {
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const result = await roomRequest<{ profiles: DirectoryProfile[] }>(client, "", "profiles", { signal: controller.signal });
        if (!controller.signal.aborted) { setProfiles(result.profiles); setError(""); }
      } catch (cause) { if (!controller.signal.aborted) setError((cause as Error).message); }
      finally { if (!controller.signal.aborted) setLoading(false); pending = false; }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [client, revision]);
  const needle = query.trim().toLocaleLowerCase();
  const visible = profiles.filter((person) => (!liveOnly || person.isLive) && `${person.name} ${person.location} ${person.interests}`.toLocaleLowerCase().includes(needle));
  return (
<section className="ufx-directory" aria-labelledby="ufx-directory-title">
<div className="ufx-section-head">
<div>
<span>
DISCOVER YOUR PEOPLE
</span>
<h2 id="ufx-directory-title">
Member profiles
</h2>
</div>
<button type="button" className="ufx-primary" onClick={onEdit}>
EDIT MY PROFILE
</button>
</div>
<p className="ufx-directory-note">
Only members who choose to share their profile appear here. Hosts still approve entrance to their rooms.
</p>
<div className="ufx-directory-tools">
<input type="search" aria-label="Search member profiles" placeholder="Name, location or interests…" value={query} onChange={(event) => setQuery(event.target.value)} />
<button type="button" aria-pressed={liveOnly} onClick={() => setLiveOnly((current) => !current)}>
{liveOnly ? "LIVE ONLY" : "ALL PROFILES"}
</button>
<button type="button" aria-label="Refresh profiles" onClick={() => setRevision((current) => current + 1)}>
<Icon name="people" />
</button>
</div>
{error &&
<p role="alert" className="ufx-warning">
{error}
</p>
}
{loading ?
<p role="status" className="ufx-feed-status">
Opening the directory…
</p>
 : !visible.length ?
<div className="ufx-feed-empty">
<Icon name="people" size={28} />
<h3>
Your next connection is on its way.
</h3>
<p>
{needle || liveOnly ? "Try a different search or show all profiles." : "Enable member visibility in your profile to share your room."}
</p>
</div>
 :
<div className="ufx-directory-grid">
{visible.map((person) => (
<a key={person.roomId} href={`#/private-room?room=${person.roomId}`} className="ufx-directory-card" aria-label={`Visit ${person.name}'s room`}>
<div className="ufx-directory-visual">
<Avatar name={person.name} large />
{person.isLive &&
<span className="ufx-directory-live">
{person.cameraOn ? "ON CAMERA" : "IN THE ROOM"}
</span>
}
</div>
<div className="ufx-directory-copy">
<h3>
{person.name}{person.isMine ? " · YOU" : ""}
</h3>
<p>
{person.bio || "A private space for a good conversation."}
</p>
{person.location &&
<small>
{person.location}
</small>
}
<div className="ufx-interest-tags">
{person.interests.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 4).map((value, index) => (
<span key={`${value}:${index}`}>
{value}
</span>
))}
</div>
<footer>
<span>
{person.isMine ? "MY ROOM" : "REQUEST ENTRANCE"}
</span>
{person.isLive &&
<span>
{person.viewers} VIEWERS
</span>
}
<Icon name="arrow" size={16} />
</footer>
</div>
</a>
))}
</div>
}
</section>
  );
}
