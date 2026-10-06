# UserFX · MyRoom, Stage and Buzón

The supplied `themed-video-calling-platform.zip` (Moodroom) has been adapted to
the existing Vite application. MyRoom, Stage and Buzón replace the previous
screens through their existing component paths and hash navigation.

## Included

- MyRoom: persistent room link, preview before entering, five seats, entrance
  requests, host approval, camera and microphone controls, room chat and a social
  feed below the video. Only the host can publish/delete posts; approved guests
  can read them without joining a call.
- Stage: member room with one large main camera and five guest seats, live
  participants, spotlight selection, video, audio and chat. Participants and
  upcoming events remain below the Stage, including the existing Friday
  session at 22:00 UTC. This is
  the existing display schedule, not a new event booking backend.
- Buzón: actual incoming/outgoing entrance requests and their current status;
  approved requests open the corresponding room and conversation.
- Cine, Arcade and Vintage: scoped black, silver and FX accent themes.
- Profiles: member-only directory with opt-in visibility, name/location/interests
  search and live filter. Existing accounts are edited using `/api/account`;
  private profiles and hidden online status are respected. Directory presence
  indicates the host is connected, with an on-camera label when applicable.
- Social feed: optional public HTTPS image URL, one like per account across
  devices, and up to 30 private comments per post for paid members. Approved
  SPCL guests can read posts and react, but cannot read or write comments.
- Theater: a remembered wide video view in MyRoom and Stage. Stage participants
  and upcoming events move below the video. The feed stays below MyRoom video.
- Chat: closed by default in both rooms. The video's CHAT control opens an
  overlay inside the video, including fullscreen; close or Escape returns focus
  to the control. New incoming messages display an unread count. Membership and
  host approval rules remain enforced on the server.
- Authentication: the existing vault cookie, account and access rules. No
  parallel registration or public guest identity is introduced.
- SPCL: entrance requests remain available; private chat retains the existing
  paid membership requirement.
- Navigation: the original full My Room header, including camera, Rewards,
  profile, membership and logout, now controls the new room views. All route
  buttons stay on the current origin; INICIO returns to the same app's home.
  Profile and membership use the current authenticated account. Rewards shows
  an empty state; no rewards service existed behind the previous button.
  Header appearance lives in `components/PrivateRoom/PR-TopNav.css`:
  `.pvr-club-cam` uses `--cam-background/text/border/dot/live` (original
  dark button and gray status dot), `.pvr-club-reward` uses
  `--reward-background/hover/text/coin/coin-border` (original blue gift), and
  `.pvr-club-logout` uses `--logout-background/text/border/hover/hover-text/hover-border`
  (original dark red). Edit these variables in their labeled existing blocks;
  do not append competing overrides. Profile and crown retain their original
  `.pvr-club-profile` and `.pvr-club-membership` gradient styles.
- Gallery: the configured private album (five BASIC, three PRO and four VIP
  files), opened explicitly from closed album cards. BSIC opens only BASIC,
  PRX0 only PRO and VIPX only VIP. SPCL grants club entrance, not photo access,
  including for existing SPCL sessions whose historical plan field says VIP.
  The protected media endpoint rejects SPCL and every mismatched album code.
  Photos are fetched only after opening the matching collection, through the
  existing protected media endpoint. The viewer supports arrow keys, Escape
  and retry for unavailable files. Sample films, invented activity and the
  upload dialog that did not persist files have been removed. No private video
  or upload service is added; the existing album API supports JPEG files.

## Architecture

| Existing entry | Implementation |
| --- | --- |
| `#/private-room` | MyRoom |
| `#/private-room?room=room_…` | Invitation / approved guest room |
| `#/private-room/stage` | Stage |
| `#/private-room/buzon` | Invitations |
| `#/private-room/profiles` | Opt-in member directory |
| `#/private-room/gallery` | Protected album in the shared room shell |
| `/api/room-live` | Rewritten to `api/account.js?roomfx=1` for authenticated room requests |
| `lib/room-live.js` | Redis storage and server authorization |
| `lib/room-social.js` | Social interactions and directory visibility |
| `components/PrivateRoom/RoomFX/` | Network UI, preview and WebRTC hook |

The vault gate, Telegram handoff and gallery remain in the original project.
Access UI and responsive styles live in `components/PrivateRoom/PR-DirectGate.*`;
the portal in `components/FxAccess/FxAccessModal/` opens that gate through explicit
props, and `VaultHome.tsx` mounts one modal. Telegram identity generation, message
formatting and return links live in `api/telegram.js`. Historical source-rewriting
scripts and their npm commands have been removed. `scripts/` retains the local
API adapter, behavioral integration check and private-album upload utility.
The new room URL shares the account function through a Vercel rewrite, keeping
the deployment within the Hobby plan's 12-function limit.
The legacy MyRoom/Stage/Buzón files now delegate to the shared module; the old
CSS can remain in the repository without being imported by those wrappers.
Gallery no longer mounts `PR-LiveShell` or `PR-CameraEnhancer`. Query parameters
are ignored when selecting the page, so direct and button navigation resolve
to the same view. The C key toggles room chat without intercepting typed input.

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

The Vite middleware in `scripts/roomfx-vite.mjs` runs the real vault and room
handlers locally: `/api/access-session`, `/api/verify`, `/api/identity`,
`/api/telegram-eligibility`, `/api/handoff`, `/api/room-live`, `/api/account`
and `/api/private-media` (including binary responses).
The access gate and room API validate the same server-backed cookie. There is
no automatic development login or browser fetch override.

For local use, back up any existing `.env.local`, then pull the project's
Development variables with `vercel env pull .env.local` (after `vercel link`)
and restart `npm run dev`. `REDIS_URL` is required; `CODE_ENGINE_NAMESPACE`
defaults to the existing `userfx:vault` namespace. SPCL lookup also requires
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. They remain server-only and must
not receive a `VITE_` prefix. Open `http://localhost:5173/#/private-room` and
verify an access code or Telegram identity in that browser. Cookies from the
hosted site do not authenticate localhost. A SPCL code is still single-use;
request a fresh one from the bot when needed. Production uses its existing API
handlers and never reads a client-side access flag as authorization.
Paid-code verification confirms `/api/access-session` before opening the room
so the newly issued cookie is associated with its persistent account.

Server configuration trims surrounding whitespace and copied BOM characters
before using the Supabase URL and service key. The local adapter also reports
missing credentials or `[SENSITIVE]` placeholders by variable name, without
printing their values. A placeholder downloaded from Vercel cannot authenticate
to Redis or Supabase; retain the real local credentials from your backup rather
than overwriting them with placeholders. Restart Vite after changing server
environment variables.
Local album requests also need `BLOB_READ_WRITE_TOKEN` from the project's
private Blob store. It is loaded server-side without a `VITE_` prefix; media
authorization, plan checks and server watermarks remain in `api/private-media.js`.

## Storage and boundaries

- Presence expires after 30 seconds without a heartbeat; peer records after 35.
- Signaling is scoped to room and recipient, capped to 120 records per peer,
  and expires after 60 seconds.
- Chat is capped at 100 messages per room and retained for 30 days after its
  most recent activity.
- MyRoom posts are newest first, capped at 50 and retained for 90 days after
  the most recent publication. Text is limited to 2000 characters; optional
  image links to 1000. No file upload or server-side image fetching is added.
  Images load directly from their HTTPS source without a referrer.
- Likes are explicit/idempotent and keyed by account, not a mutable device ID.
  Comments are limited to 400 characters, capped at 30 per post. Interactions
  expire within the parent feed's retention and are deleted with their post.
  Parent membership and interaction writes are atomic. Stage has no feed.
- The member directory lists at most 60 profiles from the 200 most recently
  active opt-ins (last 90 days). Private profiles are excluded except in their
  owner's view; opting out takes effect on the next refresh. Hidden online
  status suppresses presence, camera state and viewer counts for others.
  Directory links never bypass host approval. Location is capped at 60
  characters and comma-separated interests at 160. No public profile endpoint
  or global Admin role is introduced.
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
remote video, camera controls, chat overlay open/close and unread state, feed
publication/persistence/guest access/deletion, account-level likes and paid
comments, directory search and visibility, theater layout, Stage participants and events,
direct and button navigation on the same origin, full header controls,
profile editing and 320/390/768/1280px layouts. The Gallery checks cover
BASIC/PRO/VIP album isolation, closed collections without photo requests,
SPCL denial (including historical VIP-tagged sessions), direct-media rejection,
keyboard navigation and unavailable-file states. Viewer image responses are
mocked; live Blob downloads require the configured private-store credentials. Synthetic camera verification does not replace testing two
physical devices on different networks or TURN infrastructure.

Local access checks use disposable Redis codes and a mocked Supabase allowlist
through the real Vite API handlers. They cover anonymous/invalid-code rejection,
paid-code and mobile SPCL login, HttpOnly cookies, reloads, MyRoom/Stage entrance,
sign-out, SPCL single-use handling and cross-origin write rejection. No live
Telegram message or shared account is used for these checks.
The mobile home modal is checked for a single portal, unchanged URL while open,
Back/close behavior and verified entrance into MyRoom. The actual Telegram
message builder is checked with a mocked reply for code text and encoded
username in the return URL.
