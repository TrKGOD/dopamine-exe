"use client";

/**
 * Where game actions run.
 *
 * - "remote" (default): the Next.js API routes. Server-authoritative, multi-user.
 * - "local" (NEXT_PUBLIC_STATIC=1, used for GitHub Pages): the same pure engine
 *   runs in the browser and the save lives in localStorage. Fine for a single-player
 *   static demo, but anything in the browser can be tampered with — there is no
 *   anti-cheat, no shared leaderboard and no uploads in this mode.
 */
import type { Post } from "@/lib/content/posts";
import { COMMUNITY_CHALLENGE } from "@/lib/content/demo";
import { demoProfiles, toProfile, type PublicProfile } from "@/lib/content/profiles";
import { SEED_POSTS } from "@/lib/content/posts";
import { EnvelopeSchema } from "@/lib/game/actions";
import { applyEnvelope, createPlayer, normalizePlayer, publicState, tick, type ClientState } from "@/lib/game/engine";
import { weekKey } from "@/lib/game/time";
import type { GameEffect, PlayerState } from "@/lib/game/types";

export const STATIC_MODE = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Prefix a public asset path ("/memes/x.svg") with the deployment base path. */
export const withBase = (p: string) => (p.startsWith("/") && !p.startsWith("//") ? BASE_PATH + p : p);

export interface StateResponse {
  state: ClientState;
  community: Post[];
  serverNow: number;
}
export interface ActResponse {
  ok: boolean;
  error?: string;
  effects: GameEffect[];
  state?: ClientState;
  serverNow?: number;
}
export interface LeaderboardResponse {
  entries: PublicProfile[];
  me: string | null;
  realPlayers: number;
  challenge: { name: string; description: string; goal: number; progress: number; real: number; demoBaseline: number };
}

// ── Remote (Next.js API) ───────────────────────────────────────────────────
const remote = {
  async state(): Promise<StateResponse> {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  },
  async act(body: unknown): Promise<ActResponse> {
    const res = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.json().catch(() => ({ ok: false, error: "network", effects: [] }));
  },
  async reset(confirm: string): Promise<ActResponse> {
    const res = await fetch("/api/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });
    return res.json();
  },
  async leaderboard(): Promise<LeaderboardResponse> {
    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  },
  async profile(publicId: string): Promise<PublicProfile | null> {
    const res = await fetch(`/api/profile/${encodeURIComponent(publicId)}`);
    if (!res.ok) return null;
    return (await res.json()).profile;
  },
};

// ── Local (browser engine + localStorage) ─────────────────────────────────
const SAVE_KEY = "dopamine.save.v1";
const postCategory = new Map(SEED_POSTS.map((p) => [p.id, p.category]));

function randomHex(bytes: number) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const rng = () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
};

/** Read the save, recovering from missing or corrupted data without crashing. */
function loadLocal(): PlayerState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    /* storage blocked: play in memory */
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { version?: number; player?: PlayerState };
      if (parsed?.version === 1 && parsed.player && typeof parsed.player.id === "string") return normalizePlayer(parsed.player);
    } catch {
      /* fall through */
    }
    try {
      localStorage.setItem(`${SAVE_KEY}.corrupt-${Date.now()}`, raw);
    } catch {
      /* ignore */
    }
  }
  const p = createPlayer(crypto.randomUUID(), randomHex(6), Date.now());
  saveLocal(p);
  return p;
}

let memory: PlayerState | null = null;
function saveLocal(p: PlayerState) {
  memory = p;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, player: p }));
  } catch {
    /* quota or private mode: keep the in-memory copy */
  }
}

/** Always re-read before mutating so two tabs never overwrite each other's progress. */
function current(): PlayerState {
  try {
    if (localStorage.getItem(SAVE_KEY)) return loadLocal();
  } catch {
    /* ignore */
  }
  return memory ?? loadLocal();
}

const local = {
  async state(): Promise<StateResponse> {
    const p = current();
    tick(p, Date.now());
    saveLocal(p);
    return { state: structuredClone(publicState(p)), community: [], serverNow: Date.now() };
  },
  async act(body: unknown): Promise<ActResponse> {
    const parsed = EnvelopeSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: "invalid_action", effects: [] };
    // read → apply → write happens synchronously, so it is atomic across tabs
    const p = current();
    const out = applyEnvelope(p, parsed.data.nonce, parsed.data.action, { now: Date.now(), rng, postCategory: (id) => postCategory.get(id) });
    saveLocal(p);
    return { ...out, state: structuredClone(publicState(p)), serverNow: Date.now() };
  },
  async reset(confirm: string): Promise<ActResponse> {
    if (confirm !== "DELETE MY BRAINROT") return { ok: false, error: "confirm_required", effects: [] };
    const p = createPlayer(crypto.randomUUID(), randomHex(6), Date.now());
    saveLocal(p);
    return { ok: true, effects: [], state: structuredClone(publicState(p)), serverNow: Date.now() };
  },
  async leaderboard(): Promise<LeaderboardResponse> {
    const p = current();
    const mine = p.onboarded ? [toProfile(p)] : [];
    const entries = [...mine, ...demoProfiles()].sort((a, b) => b.weeklyXp - a.weeklyXp || b.level - a.level);
    const real = p.quests.weeklyKey === weekKey(Date.now()) ? p.quests.weekly.views ?? 0 : 0;
    return { entries, me: p.publicId, realPlayers: mine.length, challenge: { ...COMMUNITY_CHALLENGE, real, progress: COMMUNITY_CHALLENGE.demoBaseline + real } };
  },
  async profile(publicId: string): Promise<PublicProfile | null> {
    const p = current();
    if (publicId === "me" || publicId === p.publicId) return toProfile(p);
    return demoProfiles().find((d) => d.publicId === publicId) ?? null;
  },
};

export const backend = STATIC_MODE ? local : remote;
