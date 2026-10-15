# DOPAMINE.EXE — the internet brainrot simulator

A chaotic, fully playable web app: a vertical meme feed, a persistent virtual pet, a 2‑minute roulette, collectibles, quests, achievements, chaos events and leaderboards. Every reward is fictional and non‑redeemable — no real money, no cash‑out and no paid randomness.

## Quick start

Requires **Node.js 20+**.

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

Checks:

```bash
npm test           # engine unit tests (vitest)
npm run typecheck  # TypeScript
```

## GitHub Pages (static demo)

Live demo: **https://trkgod.github.io/dopamine-exe/**

Every push to `main` triggers `.github/workflows/pages.yml`, which runs the tests and `npm run build:pages` and publishes `out/`. To build the same thing locally:

```bash
npm run build:pages   # writes ./out with basePath /dopamine-exe
```

GitHub Pages only serves static files, so this build runs the **same game engine inside the browser** and saves progress to `localStorage` (`src/client/backend.ts`). Compared with the server version:

| | Server (`npm run build && npm start`) | GitHub Pages |
| --- | --- | --- |
| Progress | Server JSON store, anonymous cookie | Saved only in this browser |
| Anti‑cheat (cooldowns, rewards, click caps) | Enforced by the server | Same rules, but they run in the browser and can be tampered with |
| Leaderboard | Real players + DEMO | Only you + DEMO players |
| Uploads / moderation | Yes | Disabled |

For the full multiplayer version, deploy the server build to a Node host (Vercel, Render, Railway, a VPS).

## Environment variables

All of them are optional. Copy `.env.example` to `.env.local` to set them.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DOPAMINE_SECRET` | HMAC secret that signs the anonymous player cookie. | Generated on first run and saved to `data/secret`. |
| `ADMIN_TOKEN` | Bearer token for the moderation API (`/api/admin/submissions`). | Unset, so the admin API stays disabled. |
| `DATA_DIR` | Where the JSON database and uploads are stored. | `./data` |

## What's inside

| Area | Where |
| --- | --- |
| Game rules, rewards, odds, quests, achievements, events | `src/lib/game/config.ts`, `src/lib/game/items.ts` |
| Pure game engine (server‑authoritative) | `src/lib/game/engine.ts` |
| Action validation (zod) | `src/lib/game/actions.ts` |
| Persistence, per‑player locking, session cookie, rate limits | `src/lib/server/*` |
| API routes | `src/app/api/*` |
| Client state, effects/notifications, sound, settings | `src/client/*` |
| UI: shell, feed, pet art, chaos layer | `src/components/*` |
| Seed content (48 posts, demo players) | `src/lib/content/*`, `public/memes/*` |

### Server‑side integrity

- Every reward‑granting action goes through `POST /api/action`. The server validates it and applies it with the engine, and only the server's result is persisted.
- The roulette result and its cooldown come from server time and `crypto.randomInt`. The wheel animates to the slice the server picked.
- Each action carries a nonce, and replayed nonces are rejected. Each player's actions run one at a time behind a lock, so parallel requests can't double‑spend. For example, opening one capsule three times at once succeeds only once.
- Feed XP is given only for posts you haven't seen, at most one view reward every 1.2 s. Likes give XP once per post. Re‑watching gives nothing.
- Each player is limited to 40 actions per 10 seconds, and state‑changing routes check the request's `Origin` header.
- The browser receives state with server‑only fields removed. Leaderboards and profiles show only public, derived fields.

### Persistence

The game state lives in a versioned JSON file store (`data/db.json`):
- Writes are atomic, with a retry when OneDrive or another sync tool briefly locks the file.
- A corrupted file is backed up and replaced with a fresh one instead of crashing the app.
- Older saves are filled with the newest default fields when they load.

To run with many users in production, replace `src/lib/server/store.ts` with Postgres/Prisma and `ratelimit.ts` with Redis. The rest of the server uses only their exported functions.

### Content submissions & moderation

Users can upload an image or video (PNG/JPG/GIF/WebP/MP4/WebM, max 8 MB) with a caption and a category:
- Files are checked by magic bytes, not by the MIME type the browser reports.
- Captions are screened automatically.
- New submissions start as `pending`, and only their author can see them until a moderator approves them:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/admin/submissions
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"id":"s0123456789ab","status":"approved"}' http://localhost:3000/api/admin/submissions
```

## Gameplay rules (also shown in‑app under Missions)

- Watch a **new** post for 2 s: +5 XP, +2 🧠. A new category: +25 XP, +20 🧠. Category mastery at 2/4/6 posts.
- First like on a post: +2 XP.
- Free roulette spin every 120 s. The odds are listed on the page and each slice's size matches its probability.
- Capsules are earned through play only, and their exact per‑item probabilities are shown before you open one.
- Duplicate cosmetics turn into 💎 tokens. The shop has fixed prices in fictional currency.
- Pets never die and never reset. Hunger and mood have floors, and they only make the pet's lines sadder.
- Chaos events roll every 90 s (35% chance) while the tab is visible. You can turn them off in Settings, and visual effects can be hidden per event.

## DOOMCLICKER (idle reactor)

An idle clicker at `/doomclicker`. It has its own **reactor braincells** balance, kept separate from the main 🧠 wallet so idle-game numbers can't inflate the shop economy. Mission rewards pay out in main-game currency.

- **Where the code lives:**
  - Config and formulas: `src/lib/game/clickerConfig.ts`.
  - All balance changes: `src/lib/game/clicker.ts`, run on the server through `/api/action`.
- **Clicks:** the browser sends clicks in batches about once a second. The server accepts at most 20 per second (burst of 40) across all tabs.
- **Passive production:**
  - Gaps up to 90 s are paid immediately.
  - Longer gaps become a single offline summary you claim, capped at 8 h.
  - The server advances `lastTickAt` on every tick, so the same interval is never paid twice.
- **Purchases:** price is `base × scale^owned` per unit, and bulk buys use the geometric sum. Pending clicks are applied first, in the same atomic step.
- **Prestige:** unlocks at 1M braincells earned in the current run and awards `⌊3·√(run ÷ 1M)⌋` doom shards (+10% each).
  - Resets the balance, upgrades and run earnings.
  - Keeps the shards, lifetime stats, missions and achievements.
- **Pet integration:**
  - Each personality and evolution stage gives its own bonus.
  - Feeding the pet starts a 2‑minute Sugar Rush (+25%).
  - Bonuses from different sources multiply.
  - Cosmetics don't affect stats. Pet level unlocks reactor skins.
- **Migration:** saves from before DOOMCLICKER get a default `clicker` field the next time they load (`normalizePlayer`). Nothing needs to be run by hand.

## Feed likes

The heart belongs to a single **viewing instance** of a post. Every time a post scrolls back into view, its heart starts empty (`src/lib/content/viewInstances.ts`, `useInstanceLikes`).

The persisted like on the server (`feed.liked`) still feeds the aggregate count and the first-like XP. It is updated with an idempotent `likePost { liked: true|false }`, so liking a post again in a new viewing instance never undoes the stored like. Rapid taps are merged into at most one request in flight per post.

## Accessibility & performance

- **Motion and sound:**
  - Respects `prefers-reduced-motion`, with a manual override.
  - Visual intensity has low, medium and high levels.
  - The CRT overlay can be turned off.
  - All audio is synthesised, plays only after user actions, and has a global mute.
- **Keyboard and screen readers:**
  - The feed works with ↑/↓ or J/K. L likes, M mutes.
  - Dialogs trap focus and close on Esc, and focus states are visible.
  - There is a skip link and ARIA roles throughout.
- **Feed performance:**
  - Only the active post and its neighbours mount media.
  - Off‑screen scenes pause, canvas loops run only for the active post, and only one video plays at a time.
  - The whole app shares one interval for timers.
