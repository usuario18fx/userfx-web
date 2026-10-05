# UserFX · MyRoom, Stage and Buzón

The supplied `themed-video-calling-platform.zip` (Moodroom) has been adapted to
the existing Vite application. MyRoom, Stage and Buzón replace the previous
screens through their existing component paths and hash navigation.

## Included

- MyRoom: persistent room link, preview before entering, five seats, entrance
  requests, host approval, camera and microphone controls, room chat.
- Stage: member room with six seats, live participants, spotlight selection,
  video, audio and chat.
- Buzón: actual incoming/outgoing entrance requests and their current status;
  approved requests open the corresponding room and conversation.
- Cine, Arcade and Vintage: scoped black, silver and FX accent themes.
- Profile: edits the existing account using `/api/account`.
- Authentication: the existing vault cookie, account and access rules. No
  parallel registration or public guest identity is introduced.
- SPCL: entrance requests remain available; private chat retains the existing
  paid membership requirement.

## Architecture

| Existing entry | Implementation |
| --- | --- |
| `#/private-room` | MyRoom |
| `#/private-room?room=room_…` | Invitation / approved guest room |
| `#/private-room/stage` | Stage |
| `#/private-room/buzon` | Invitations |
| `#/private-room/gallery` | Existing Gallery integration |
| `api/room-live.js` | Authenticated presence, messages, signaling and requests |
| `lib/room-live.js` | Redis storage and server authorization |
| `components/PrivateRoom/RoomFX/` | Network UI, preview and WebRTC hook |

The vault gate, Telegram handoff and gallery remain in the original project.
The legacy MyRoom/Stage/Buzón files now delegate to the shared module; the old
CSS can remain in the repository without being imported by those wrappers.

The source ZIP used Next.js route handlers and PostgreSQL tables. Those routes
were not copied into Vite. RoomFX uses the project's configured Redis service,
with server-side vault validation on every request. The connected Supabase
project was inactive during integration, so no live schema changes were made.

## Environment

Existing `REDIS_URL` and `CODE_ENGINE_NAMESPACE` are reused in Vercel Preview
and Production. No new database or package dependency is required.

Optional `ROOMFX_ICE_SERVERS` is a server-side JSON array of WebRTC ICE servers:

```json
[
  { "urls": "stun:stun.l.google.com:19302" },
  {
    "urls": ["turn:YOUR_RELAY_HOST:3478?transport=udp", "turns:YOUR_RELAY_HOST:5349"],
    "username": "YOUR_SHORT_LIVED_USERNAME",
    "credential": "YOUR_SHORT_LIVED_CREDENTIAL"
  }
]
```

Use short-lived TURN credentials for a public deployment. ICE credentials are
necessarily delivered to authenticated participants to establish the call.
Without TURN, peer-to-peer calls depend on the participants' networks allowing
a direct connection. No TURN provider was provisioned during this integration.

The Vite middleware in `scripts/roomfx-vite.mjs` runs `/api/room-live` and
`/api/account` locally, using server-only environment variables. It requires an
actual local vault cookie and account. The existing development access-screen
fixture does not grant access to the new server API. Use `vercel dev` for the
complete local login flow, or use the deployed Preview with an existing access
code. Production never reads a client-side access flag as authorization.

## Storage and boundaries

- Presence expires after 30 seconds without a heartbeat; peer records after 35.
- Signaling is scoped to room and recipient, capped to 120 records per peer,
  and expires after 60 seconds.
- Chat is capped at 100 messages per room and retained for 30 days after its
  most recent activity.
- Entrance approval expires after 24 hours. Invitations expire after 30 days.
- Room metadata remains available for 90 days after its owner's activity.
- Atomic Redis admission enforces the five/six participant limits.
- The host's account is checked on approval; unapproved guests cannot read
  messages or signal devices. Camera access begins only through explicit user
  actions, and tracks stop when disabled, disconnected or navigated away.

## Source review

The original archive contained 31 files: Next.js UI, call hook, PostgreSQL
schema and API routes. The implementation retained its video/chat layout,
theme selection, device preview and peer-connection approach while replacing
the transport and identity model. Issues addressed include unauthenticated
room reads, browser-supplied guest session identities, unlimited retained
signaling, unchecked presence responses and simultaneous-offer collisions.

## Validation

Build: `npm run build`.

Scoped TypeScript check:

```bash
npx tsc --noEmit --strict --jsx react-jsx --module ESNext --moduleResolution bundler --target ES2022 --skipLibCheck components/PrivateRoom/RoomFX/*.ts components/PrivateRoom/RoomFX/*.tsx
```

The behavioral integration suite in `scripts/check-roomfx.mjs` uses an isolated
Redis namespace. Set `ROOMFX_TEST_REDIS_URL` to a disposable Redis instance,
then run `node scripts/check-roomfx.mjs`.

Browser checks use two separate authenticated browser contexts, synthetic
camera hardware and the real Redis-backed API. They cover room entrance,
remote video, camera controls, chat, navigation, profile editing and a 390px
mobile layout. Synthetic camera verification does not replace testing two
physical devices on different networks or TURN infrastructure.
