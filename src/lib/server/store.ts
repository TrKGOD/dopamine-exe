import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { createPlayer } from "../game/engine";
import type { PlayerState } from "../game/types";
import type { Category } from "../game/types";

/**
 * Tiny JSON-file persistence layer. Swap this module for Prisma/Postgres in
 * production: the rest of the server only uses the functions exported here.
 */

export interface Submission {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPublicId: string;
  createdAt: number;
  caption: string;
  category: Category;
  file: string; // stored filename inside uploads/
  mime: string;
  kind: "image" | "video";
  status: "pending" | "approved" | "rejected";
  moderationNote?: string;
}

interface DB {
  version: 1;
  players: Record<string, PlayerState>;
  submissions: Submission[];
}

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");

type Cache = { db: DB | null; loading: Promise<DB> | null; timer: NodeJS.Timeout | null; locks: Map<string, Promise<unknown>> };
const g = globalThis as unknown as { __dopamineStore?: Cache };
const cache: Cache = (g.__dopamineStore ??= { db: null, loading: null, timer: null, locks: new Map() });

async function loadDb(): Promise<DB> {
  if (cache.db) return cache.db;
  if (cache.loading) return cache.loading;
  cache.loading = (async () => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    let db: DB = { version: 1, players: {}, submissions: [] };
    try {
      const raw = await fs.readFile(DB_FILE, "utf8");
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.version === 1 && parsed.players) db = { ...db, ...parsed };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        // corrupted file: keep a backup and start clean instead of crashing
        const backup = DB_FILE.replace(/\.json$/, `.corrupt-${Date.now()}.json`);
        await fs.copyFile(DB_FILE, backup).catch(() => {});
        console.error("[store] db.json unreadable, backed up to", backup);
      }
    }
    cache.db = db;
    return db;
  })();
  return cache.loading;
}

function scheduleSave() {
  if (cache.timer) return;
  cache.timer = setTimeout(() => {
    cache.timer = null;
    void flush();
  }, 200);
}

async function flush() {
  if (!cache.db) return;
  const tmp = DB_FILE + ".tmp";
  const data = JSON.stringify(cache.db);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await fs.writeFile(tmp, data, "utf8");
      await fs.rename(tmp, DB_FILE);
      return;
    } catch (err) {
      // file sync tools (OneDrive, Dropbox) can briefly lock files on Windows
      if (attempt === 2) console.error("[store] save failed", err);
      await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
    }
  }
}

/** Fill in any fields missing from older saves so new features never crash old players. */
function normalizePlayer(p: PlayerState): PlayerState {
  const base = createPlayer(p.id, p.publicId, p.createdAt ?? Date.now());
  const merged = { ...base, ...p } as PlayerState;
  for (const key of ["pet", "feed", "roulette", "quests", "stats", "season", "weekly", "events"] as const) {
    (merged as unknown as Record<string, unknown>)[key] = { ...(base[key] as object), ...((p[key] as object) ?? {}) };
  }
  return merged;
}

const normalized = new WeakSet<PlayerState>();

/** Serialise all mutations of one player so concurrent requests cannot double-spend. */
export async function withPlayer<T>(id: string, publicId: string, fn: (p: PlayerState) => T | Promise<T>): Promise<T> {
  const prev = cache.locks.get(id) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  const chain = prev.then(() => next);
  cache.locks.set(id, chain);
  await prev;
  try {
    const db = await loadDb();
    let p = db.players[id];
    if (!p) {
      p = createPlayer(id, publicId, Date.now());
      db.players[id] = p;
    } else if (!normalized.has(p)) {
      p = normalizePlayer(p);
      normalized.add(p);
      db.players[id] = p;
    }
    const result = await fn(p);
    scheduleSave();
    return result;
  } finally {
    release();
    if (cache.locks.get(id) === chain) cache.locks.delete(id);
  }
}

export async function replacePlayer(id: string, p: PlayerState) {
  const db = await loadDb();
  db.players[id] = p;
  scheduleSave();
}

export async function allPlayers(): Promise<PlayerState[]> {
  const db = await loadDb();
  return Object.values(db.players);
}

export async function submissions(): Promise<Submission[]> {
  return (await loadDb()).submissions;
}

export async function addSubmission(s: Submission) {
  const db = await loadDb();
  db.submissions.unshift(s);
  scheduleSave();
}

export async function updateSubmission(id: string, patch: Partial<Submission>) {
  const db = await loadDb();
  const s = db.submissions.find((x) => x.id === id);
  if (!s) return null;
  Object.assign(s, patch);
  scheduleSave();
  return s;
}

export function readSecretFileSync(): string | null {
  try {
    return fsSync.readFileSync(path.join(DATA_DIR, "secret"), "utf8").trim() || null;
  } catch {
    return null;
  }
}

export function writeSecretFileSync(secret: string) {
  fsSync.mkdirSync(DATA_DIR, { recursive: true });
  fsSync.writeFileSync(path.join(DATA_DIR, "secret"), secret, { encoding: "utf8", mode: 0o600 });
}
