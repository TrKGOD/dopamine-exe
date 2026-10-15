import crypto from "node:crypto";
import { SEED_POSTS, type Post } from "../content/posts";
import type { EngineCtx } from "../game/engine";
import type { Category } from "../game/types";
import { submissions, type Submission } from "./store";

/** Cryptographically strong RNG for server-side reward rolls. */
export const serverRng = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;

export function submissionToPost(s: Submission, viewerId: string): Post {
  return {
    id: s.id,
    category: s.category,
    kind: s.kind,
    src: `/api/media/${s.file}`,
    caption: s.caption,
    creator: { handle: "@" + s.ownerName.toLowerCase().replace(/[^a-z0-9_.]/g, "_").slice(0, 20), name: s.ownerName, hue: parseInt(s.ownerPublicId.slice(0, 2), 16) || 200 },
    baseLikes: 0,
    comments: [],
    beat: parseInt(s.id.slice(-4), 16) || 7,
    submission: { status: s.status, mine: s.ownerId === viewerId },
  };
}

/** Submissions the viewer may see: approved ones, plus their own pending ones. */
export async function visibleSubmissions(viewerId: string): Promise<Post[]> {
  const all = await submissions();
  return all
    .filter((s) => s.status === "approved" || (s.ownerId === viewerId && s.status !== "rejected"))
    .slice(0, 100)
    .map((s) => submissionToPost(s, viewerId));
}

export async function engineCtx(viewerId: string): Promise<EngineCtx> {
  const subs = await visibleSubmissions(viewerId);
  const map = new Map<string, Category>(SEED_POSTS.map((p) => [p.id, p.category]));
  for (const s of subs) if (s.submission?.status === "approved") map.set(s.id, s.category);
  return { now: Date.now(), rng: serverRng, postCategory: (id) => map.get(id) };
}
