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
