"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "@/client/game";
import { EMPTY_INSTANCES, endInstance, isLikedInInstance, setInstanceLike, type ViewInstances } from "@/lib/content/viewInstances";

/**
 * Heart state that resets every time a post re-enters the feed, while the
 * persisted like is kept in sync with the server as an idempotent set.
 */
export function useInstanceLikes(activePostId: string | undefined) {
  const { act } = useGame();
  const [instances, setInstances] = useState<ViewInstances>(EMPTY_INSTANCES);
  const prevActive = useRef<string | undefined>(undefined);
  // mirror kept in a ref so two taps inside one render never read a stale heart
  const latest = useRef(instances);
  latest.current = instances;

  // when the active post changes, the previously active post's viewing instance ends
  useEffect(() => {
    const prev = prevActive.current;
    if (prev && prev !== activePostId) {
      latest.current = endInstance(latest.current, prev);
      setInstances(latest.current);
    }
    prevActive.current = activePostId;
  }, [activePostId]);

  // Coalesce rapid taps: at most one request in flight per post, the latest wish wins.
  const desired = useRef(new Map<string, boolean>());
  const inflight = useRef(new Set<string>());
  const sync = useCallback(
    async (postId: string, liked: boolean) => {
      desired.current.set(postId, liked);
      if (inflight.current.has(postId)) return;
      inflight.current.add(postId);
      try {
        for (;;) {
          const want = desired.current.get(postId)!;
          await act({ type: "likePost", postId, liked: want }, { silent: true });
          if (desired.current.get(postId) === want) break;
        }
      } finally {
        inflight.current.delete(postId);
        desired.current.delete(postId);
      }
    },
    [act],
  );

  const isLiked = useCallback((postId: string) => isLikedInInstance(instances, postId), [instances]);

  /** Toggle the heart of the post's current viewing instance; returns the new state. */
  const toggle = useCallback(
    (postId: string) => {
      const next = !isLikedInInstance(latest.current, postId);
      latest.current = setInstanceLike(latest.current, postId, next);
      setInstances(latest.current);
      void sync(postId, next);
      return next;
    },
    [sync],
  );

  return { isLiked, toggle };
}
