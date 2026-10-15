"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "@/client/game";
import { CLICKER_RULES } from "@/lib/game/clickerConfig";

const FLUSH_MS = 1000;
const HEARTBEAT_MS = 10_000;

/**
 * Batches clicks and keeps the server's production clock fresh while the page
 * is open. Exactly one interval per mounted page; the server caps and dedupes
 * anything a second tab might send.
 */
export function useClickerSync() {
  const { act } = useGame();
  const pending = useRef(0);
  const [pendingCount, setPendingCount] = useState(0);
  const sending = useRef(false);
  const lastSync = useRef(0);

  const flush = useCallback(
    async (force = false) => {
      if (sending.current) return;
      if (pending.current === 0 && !force) return;
      const clicks = Math.min(pending.current, CLICKER_RULES.maxClicksPerSync);
      pending.current -= clicks;
      setPendingCount(pending.current);
      sending.current = true;
      lastSync.current = Date.now();
      try {
        const r = await act({ type: "clickerSync", clicks }, { silent: true });
        if (!r.ok && r.error === "network") {
          pending.current += clicks; // retry later, nothing was counted
          setPendingCount(pending.current);
        }
      } finally {
        sending.current = false;
      }
    },
    [act],
  );

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (pending.current > 0) void flush();
      else if (Date.now() - lastSync.current >= HEARTBEAT_MS) void flush(true);
    }, FLUSH_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    void flush(true); // sync immediately on open (also surfaces offline earnings)
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  const addClick = useCallback(() => {
    pending.current += 1;
    setPendingCount(pending.current);
  }, []);

  /** Hand pending clicks to another action (e.g. a purchase) so they apply first, atomically. */
  const takePending = useCallback(() => {
    const n = Math.min(pending.current, CLICKER_RULES.maxClicksPerSync);
    pending.current -= n;
    setPendingCount(pending.current);
    return n;
  }, []);

  const restorePending = useCallback((n: number) => {
    pending.current += n;
    setPendingCount(pending.current);
  }, []);

  return { pendingCount, addClick, takePending, restorePending };
}

/** Fast local clock for smooth counters, only while the clicker page is mounted. */
export function useFastNow(ms = 200) {
  const { offset } = useGame();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now + offset;
}
