import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import "./PrivateRoomMyRoom.css";

type MediaKind = "image" | "video";
type MyRoomPost = {
  id:string;
  username:string;
  text:string;
  createdAt:string;
  mediaUrl?:string;
  mediaKind?:MediaKind;
  likes:number;
  liked:boolean;
  comments:string[];
};

type OnlineMember = {
  name:string;
  role:string;
  initials:string;
};

const POSTS_KEY = "userfx_myroom_posts";
const ONLINE_MEMBERS:OnlineMember[] = [
  {name:"User18Fx",role:"HOST",initials:"FX"},
  {name:"GreenGrower",role:"MEMBER",initials:"GG"},
  {name:"Dalyva",role:"MEMBER",initials:"DA"},
  {name:"420Fresh",role:"MEMBER",initials:"42"},
  {name:"PlanetaVerde",role:"MEMBER",initials:"PV"},
];

function getUsername() {
  try {
    return localStorage.getItem("userfx_telegram_username") || "@User18Fx";
  } catch {
    return "@User18Fx";
  }
}

function loadPosts():MyRoomPost[] {
  try {
    const saved = JSON.parse(localStorage.getItem(POSTS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function persistPosts(posts:MyRoomPost[]) {
  try {
    const safePosts = posts.map((post) => ({...post,mediaUrl:post.mediaUrl?.startsWith("data:") ? undefined : post.mediaUrl,mediaKind:post.mediaUrl?.startsWith("data:") ? undefined : post.mediaKind}));
    localStorage.setItem(POSTS_KEY,JSON.stringify(safePosts));
  } catch {
  }
}

export default function PrivateRoomMyRoom() {
  const [target,setTarget] = useState<HTMLElement | null>(null);
  const [text,setText] = useState("");
  const [mediaUrl,setMediaUrl] = useState("");
  const [mediaKind,setMediaKind] = useState<MediaKind | null>(null);
  const [posts,setPosts] = useState<MyRoomPost[]>(loadPosts);
  const [commentOpen,setCommentOpen] = useState<string | null>(null);
  const [commentText,setCommentText] = useState("");
  const [search,setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const username = useMemo(getUsername,[]);

  useEffect(() => {
    const resolveTarget = () => {
      const node = document.querySelector<HTMLElement>(".pvr-live-home");
      if (node) setTarget(node);
    };
    resolveTarget();
    const observer = new MutationObserver(resolveTarget);
    observer.observe(document.body,{childList:true,subtree:true});
    return () => observer.disconnect();
  },[]);

  useEffect(() => {
    persistPosts(posts);
  },[posts]);

  function handleMedia(event:ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const kind:MediaKind = file.type.startsWith("video/") ? "video" : "image";
    const reader = new FileReader();
    reader.onload = () => {
      setMediaUrl(String(reader.result || ""));
      setMediaKind(kind);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handlePost(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = text.trim();
    if (!clean && !mediaUrl) return;
    const post:MyRoomPost = {
      id:`post-${Date.now()}`,
      username,
      text:clean,
      createdAt:"JUST NOW",
      mediaUrl:mediaUrl || undefined,
      mediaKind:mediaKind || undefined,
      likes:0,
      liked:false,
      comments:[],
    };
    setPosts((current) => [post,...current]);
    setText("");
    setMediaUrl("");
    setMediaKind(null);
  }

  function toggleLike(id:string) {
    setPosts((current) => current.map((post) => post.id === id ? {...post,liked:!post.liked,likes:post.likes + (post.liked ? -1 : 1)} : post));
  }

  function addComment(id:string) {
    const clean = commentText.trim();
    if (!clean) return;
    setPosts((current) => current.map((post) => post.id === id ? {...post,comments:[...post.comments,clean]} : post));
    setCommentText("");
  }

  if (!target) return null;

  return createPortal(
    <section className="pvr-myroom-shell" aria-label="MyRoom social dashboard">
      <aside className="pvr-myroom-left">
        <div className="pvr-myroom-brand">
          <span>
            FX
          </span>
          <div>
            <strong>
              ROOMFX
            </strong>
            <small>
              PRIVATE ROOM
            </small>
          </div>
        </div>
        <nav className="pvr-myroom-menu" aria-label="MyRoom navigation">
          <button type="button" className="is-active">
            MYROOM
          </button>
          <button type="button">
            STAGE
          </button>
          <button type="button">
            GALLERY
          </button>
          <button type="button">
            BUZON
          </button>
        </nav>
        <div className="pvr-myroom-profile-mini">
          <div className="pvr-myroom-avatar">
            FX
          </div>
          <div>
            <strong>
              {username}
            </strong>
            <span>
              ONLINE
            </span>
          </div>
        </div>
      </aside>
      <main className="pvr-myroom-main">
        <header className="pvr-myroom-topbar">
          <div>
            <span>
              PRIVATE SOCIAL
            </span>
            <h1>
              MYROOM
            </h1>
          </div>
          <label className="pvr-myroom-search">
            <span>
             ⌕
            </span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search in RoomFX..." />
          </label>
        </header>
        <form className="pvr-myroom-composer" onSubmit={handlePost}>
          <div className="pvr-myroom-composer-row">
            <div className="pvr-myroom-avatar">
              FX
            </div>
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="What's happening inside your room?" rows={2} />
          </div>
          {mediaUrl && (
            <div className="pvr-myroom-preview">
              {mediaKind === "video" ? (
                <video src={mediaUrl} controls playsInline />
              ) : (
                <img src={mediaUrl} alt="Post preview" />
              )}
              <button type="button" onClick={() => { setMediaUrl(""); setMediaKind(null); }}>
                REMOVE
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMedia} hidden />
          <div className="pvr-myroom-composer-actions">
            <button type="button" onClick={() => fileRef.current?.click()}>
              PHOTO
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}>
              VIDEO
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}>
              MEDIA
            </button>
            <button type="submit" className="pvr-myroom-post-button" disabled={!text.trim() && !mediaUrl}>
              POST
            </button>
          </div>
        </form>
        <section className="pvr-myroom-feed" aria-label="MyRoom feed">
          {posts.length === 0 && (
            <article className="pvr-myroom-post pvr-myroom-demo-post">
              <header>
                <div className="pvr-myroom-avatar">
                  FX
                </div>
                <div>
                  <strong>
                    {username}
                  </strong>
                  <span>
                    ROOMFX · PRIVATE
                  </span>
                </div>
              </header>
              <p>
                Welcome to MYROOM. Share a status, photo, video or private update with your RoomFX circle.
              </p>
              <div className="pvr-myroom-demo-media">
                <span>
                  YOUR MEDIA WILL APPEAR HERE
                </span>
              </div>
              <footer>
                <button type="button">
                  LIKE
                </button>
                <button type="button">
                  COMMENT
                </button>
                <button type="button">
                  SHARE
                </button>
              </footer>
            </article>
          )}
          {posts.filter((post) => !search.trim() || `${post.username} ${post.text}`.toLowerCase().includes(search.toLowerCase())).map((post) => (
            <article key={post.id} className="pvr-myroom-post">
              <header>
                <div className="pvr-myroom-avatar">
                  FX
                </div>
                <div>
                  <strong>
                    {post.username}
                  </strong>
                  <span>
                    {post.createdAt} · PRIVATE ROOM
                  </span>
                </div>
              </header>
              {post.text && (
                <p>
                  {post.text}
                </p>
              )}
              {post.mediaUrl && post.mediaKind === "image" && (
                <img src={post.mediaUrl} alt="Shared post" className="pvr-myroom-post-media" />
              )}
              {post.mediaUrl && post.mediaKind === "video" && (
                <video src={post.mediaUrl} controls playsInline className="pvr-myroom-post-media" />
              )}
              <div className="pvr-myroom-post-stats">
                <span>
                  {post.likes} LIKES
                </span>
                <span>
                  {post.comments.length} COMMENTS
                </span>
              </div>
              <footer>
                <button type="button" className={post.liked ? "is-active" : ""} onClick={() => toggleLike(post.id)}>
                  {post.liked ? "LIKED" : "LIKE"}
                </button>
                <button type="button" onClick={() => setCommentOpen((current) => current === post.id ? null : post.id)}>
                  COMMENT
                </button>
                <button type="button" onClick={() => navigator.clipboard?.writeText(window.location.href).catch(() => {})}>
                  SHARE
                </button>
              </footer>
              {commentOpen === post.id && (
                <div className="pvr-myroom-comments">
                  {post.comments.map((comment,index) => (
                    <div key={`${post.id}-comment-${index}`}>
                      <strong>
                        {username}
                      </strong>
                      <span>
                        {comment}
                      </span>
                    </div>
                  ))}
                  <div className="pvr-myroom-comment-form">
                    <input type="text" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Write a comment..." />
                    <button type="button" onClick={() => addComment(post.id)}>
                      SEND
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      </main>
      <aside className="pvr-myroom-right">
        <section className="pvr-myroom-panel">
          <header>
            <strong>
              USERS ONLINE
            </strong>
            <span>
              {ONLINE_MEMBERS.length}
            </span>
          </header>
          <div className="pvr-myroom-online-list">
            {ONLINE_MEMBERS.map((member) => (
              <div key={member.name} className="pvr-myroom-online-user">
                <div className="pvr-myroom-avatar">
                  {member.initials}
                </div>
                <div>
                  <strong>
                    {member.name}
                  </strong>
                  <span>
                    {member.role}
                  </span>
                </div>
                <i />
              </div>
            ))}
          </div>
        </section>
        <section className="pvr-myroom-panel pvr-myroom-live-panel">
          <header>
            <strong>
              LIVE NOW
            </strong>
            <span>
              0
            </span>
          </header>
          <div className="pvr-myroom-live-empty">
            <strong>
              NO LIVE CAMS
            </strong>
            <span>
              Public cameras from RoomFX members will appear here.
            </span>
          </div>
        </section>
      </aside>
    </section>,
    target,
  );
}
