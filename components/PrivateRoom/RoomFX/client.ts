export type Mood = "cine" | "arcade" | "vintage";
export type Profile = { id: string; accountId: string; name: string; bio: string; avatarUrl?: string; coverUrl?: string; location: string; interests: string; visibility: string; onlineVisibility: string; planId: string; paidChat: boolean };
export type Participant = { id: string; name: string; cameraOn: boolean; micOn: boolean; isHost: boolean; joinedAt: string };
export type PostComment = { id: string; authorId: string; authorName: string; content: string; createdAt: string };
export type Post = { id: string; authorId: string; authorName: string; content: string; createdAt: string; imageUrl: string | null; likeCount: number; likedByMe: boolean; comments: PostComment[] };
export type DirectoryProfile = { roomId: string; name: string; bio: string; location: string; interests: string; isMine: boolean; isLive: boolean; cameraOn: boolean; viewers: number };
export type Message = { id: string; authorId: string; authorName: string; content: string; createdAt: string };
export type RoomHostProfile = { name: string; bio: string; location: string; avatarUrl: string; coverUrl: string };
export type Room = { id: string; ownerName: string; isOwner: boolean; approved: boolean; status: string; capacity: number; ownerProfile?: RoomHostProfile | null };
export type Invitation = { id: string; roomId: string; accountId: string; name: string; hostName: string; status: string; direction: "incoming" | "outgoing"; createdAt: string };
export type RoomState = { room: Room; participants: Participant[]; waiting: Invitation[] };

// One identity per mounted room; accounts remain stable across browser sessions.
export function createClientId() { return crypto.randomUUID(); }

export class RoomError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function roomRequest<T>(client: string, room: string, op: string, options: { method?: string; body?: unknown; after?: number; latest?: boolean; signal?: AbortSignal; keepalive?: boolean } = {}): Promise<T> {
  const params = new URLSearchParams({ client, room, op });
  if (options.after !== undefined) params.set("after", String(options.after));
  if (options.latest) params.set("latest", "1");
  const response = await fetch(`/api/room-live?${params}`, {
    method: options.method || "GET", credentials: "same-origin", cache: "no-store", signal: options.signal, keepalive: options.keepalive,
    headers: { Accept: "application/json", ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}) },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json().catch(() => ({ error: "The room service could not be reached." }));
  if (!response.ok) throw new RoomError(data.error || "Please try again.", response.status);
  return data;
}

export function roomLink(roomId: string) {
  return `${window.location.origin}${window.location.pathname}#/private-room?room=${encodeURIComponent(roomId)}`;
}

export function requestedRoom() {
  return new URLSearchParams(window.location.hash.split("?")[1] || "").get("room") || "";
}
