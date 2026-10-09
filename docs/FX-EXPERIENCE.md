# UserFX experience

The default app now runs on Next.js 15, React 19, Tailwind 4,
Framer Motion 13 and Lenis. `npm run dev` opens port 5173.
`npm run build` includes TypeScript validation; `npm start` serves the build.

## Entry points

- `app/page.tsx`: the page entry.
- `components/FX/Experience.tsx`: preserves `#/private-room` links and browser
  handoffs. The private platform loads on demand; its Admin provider stays mounted.
- `components/FX/Hero.tsx`: independently drawn desktop and portrait artboards.
- `lib/design.ts`: geometry and the container-measured `--u` unit.
- `lib/motion.ts` and `components/FX/Motion.tsx`: shared variants, five depth
  planes, smooth scrolling, counters, spotlight and velocity marquees.
- `components/FX/Sections.tsx`: spaces, protocol, prefixes, real access prices,
  questions and newsletter.
- `lib/content.ts`: visible copy. Prices match the current Telegram bot.
- `app/globals.css`: black, ivory, gold and rose theme, connected backgrounds.
- `components/FX/Platform.css`: the same visual language on existing rooms,
  feeds, Gallery, Buzón and gate. Camera, logout, profile and rewards icons remain.
- `components/FX/SpaceMotion.tsx`: a short gold-lit title handover, then staggered
  panel movement, scale and focus. The header stays outside the animation; reduced
  motion shows every panel immediately. Navigation reuses the room bootstrap,
  while the keyed room surface still cleans up calls on a space or room change.

The older VaultHome files are retained as the design history, but the active
router renders the new FX landing. Nothing imports its old section overrides.

## Media and motion

`lib/assets.ts` holds the reference CDN and original FX assets. To host the latter
on a CDN set `NEXT_PUBLIC_FX_ASSET_BASE`; leave it empty to use the existing
`public` assets. Reference ornaments remain under `NEXT_PUBLIC_ASSET_BASE`.
The hero uses UserFX's public `video01.mp4` and sculpted FX emblem. Private album
files are not used as hero, card or prefix images.

The hero remains exactly one small viewport high. Scroll transforms five
wrappers; it never scrubs the film. `currentTime` is assigned only when returning
to the still. Portrait and desktop are selected by width **or** landscape shape.
Reduced motion disables Lenis, plane movement, marquee travel and decorative
loops. Anchors and all controls remain usable.

## Server functions

`pages/api/[endpoint].js` adapts the existing JSON handlers to one Next function
with a bounded body parser, keeping the deployment within its function limit.
It does not change their
session, owner, grant, Gallery or WebRTC checks. `/api/room-live` delegates to
the existing account handler. Telegram keeps raw-body parsing for its webhook.
Existing server environment variables stay server-only; none are renamed.

Newsletter submissions go to `/api/newsletter`: email validation, origin check,
rate limit and idempotent Redis storage. Missing storage returns an error;
the UI reports success only after persistence. No email is sent automatically.
Subscribers are keyed under `CODE_ENGINE_NAMESPACE:newsletter:subscriber:*`.

## Validation

Production build and TypeScript; existing `check-roomfx.mjs` and
`check-admin-access.mjs` against disposable Redis; responsive browser checks at
320, 390, 950, 1440 and landscape 844 px; still/film, course selector, keyboard
pricing switch, FAQ, menu focus/Escape, newsletter and private route gate.

These checks do not constitute a live Google OAuth or payment transaction.

The original handlers now live in `server/api/`. Only `pages/api/` exposes HTTP routes, so Vercel does not build a second set of legacy functions. Endpoint URLs and Telegram webhook remain unchanged.
