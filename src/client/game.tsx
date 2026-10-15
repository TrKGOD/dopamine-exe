"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Post } from "@/lib/content/posts";
import type { GameAction } from "@/lib/game/actions";
import type { ClientState } from "@/lib/game/engine";
import type { GameEffect } from "@/lib/game/types";
import { useFx } from "./fx";

export interface ActionResponse {
  ok: boolean;
  error?: string;
  effects: GameEffect[];
}

interface GameCtx {
  state: ClientState | null;
  community: Post[];
  loading: boolean;
  loadError: string | null;
  /** server clock offset so countdowns cannot be gamed by changing the local clock */
  offset: number;
  pending: Set<string>;
  act: (action: GameAction, opts?: { defer?: boolean; silent?: boolean }) => Promise<ActionResponse & { deferred?: GameEffect[] }>;
  refresh: () => Promise<void>;
  setState: (s: ClientState) => void;
  addCommunityPost: (p: Post) => void;
}

const Ctx = createContext<GameCtx | null>(null);

const ERRORS: Record<string, string> = {
  cooldown: "The wheel is still cooling down. Patience, gambler-adjacent friend.",
  not_owned: "You don't own that (anymore).",
  too_fast: "Whoa, speedrunner. Slow down a little.",
  insufficient_funds: "Not enough currency. Go farm some vibes.",
  already_owned: "You already own that one.",
  already_claimed: "Already claimed. Greedy little goblin.",
  incomplete: "Not done yet!",
  max_mutations: "Max 2 active mutations. Deactivate one first.",
  max_badges: "Max 3 badges. Your chest is full.",
  locked_personality: "That personality is still locked.",
  invalid_name: "That name won't work. 1–20 characters, no links.",
  rate_limited: "Too many actions. The server needs a breather.",
  network: "Connection hiccup. Your progress is safe — try again.",
  no_event: "That event already ended.",
};

export function errorMessage(code?: string) {
  return (code && ERRORS[code]) || "Something glitched. Try again.";
}

const SILENT_ERRORS = new Set(["duplicate", "too_fast", "not_yet", "event_active"]);

export function GameProvider({ children }: { children: ReactNode }) {
  const fx = useFx();
  const [state, setState] = useState<ClientState | null>(null);
  const [community, setCommunity] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const inflight = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setState(data.state);
      setCommunity(data.community ?? []);
      setOffset(data.serverNow - Date.now());
      setLoadError(null);
    } catch {
      setLoadError("Couldn't reach the DOPAMINE.EXE mainframe.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = useCallback<GameCtx["act"]>(
    async (action, opts) => {
      // one in-flight request per action+target prevents double-clicks firing twice
      const key = action.type + ("itemId" in action ? ":" + action.itemId : "") + ("postId" in action ? ":" + action.postId : "");
      if (inflight.current.has(key)) return { ok: false, error: "duplicate", effects: [] };
      inflight.current.add(key);
      setPending(new Set(inflight.current));
      try {
        const res = await fetch("/api/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nonce: crypto.randomUUID(), action }),
        });
        const data = await res.json().catch(() => ({ ok: false, error: "network", effects: [] }));
        if (data.state) setState(data.state);
        if (data.serverNow) setOffset(data.serverNow - Date.now());
        const effects: GameEffect[] = data.effects ?? [];
        if (!data.ok) {
          if (!opts?.silent && !SILENT_ERRORS.has(data.error)) fx.toast(errorMessage(data.error), "bad");
          return { ok: false, error: data.error, effects };
        }
        if (opts?.defer) return { ok: true, effects, deferred: effects };
        fx.process(effects);
        return { ok: true, effects };
      } catch {
        if (!opts?.silent) fx.toast(errorMessage("network"), "bad");
        return { ok: false, error: "network", effects: [] };
      } finally {
        inflight.current.delete(key);
        setPending(new Set(inflight.current));
      }
    },
    [fx],
  );

  const addCommunityPost = useCallback((p: Post) => setCommunity((c) => [p, ...c]), []);

  const value = useMemo(
    () => ({ state, community, loading, loadError, offset, pending, act, refresh, setState, addCommunityPost }),
    [state, community, loading, loadError, offset, pending, act, refresh, addCommunityPost],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGame outside provider");
  return c;
}

/** Non-null state for pages rendered after the shell has loaded. */
export function usePlayer() {
  const { state } = useGame();
  if (!state) throw new Error("state not loaded");
  return state;
}

// ── Shared clock: one interval for the whole app ─────────────────────────
const NowCtx = createContext<number>(0);

export function NowProvider({ children }: { children: ReactNode }) {
  const { offset } = useGame();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <NowCtx.Provider value={now + offset}>{children}</NowCtx.Provider>;
}

/** Server-synchronised current time, updated every second. */
export const useNow = () => useContext(NowCtx);
