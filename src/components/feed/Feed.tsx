"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFx } from "@/client/fx";
import { useGame } from "@/client/game";
import { useSettings } from "@/client/settings";
import { startBeat, stopBeat } from "@/client/sound";
import { CATEGORY_META, SEED_POSTS, type Post } from "@/lib/content/posts";
import { FEED_RULES } from "@/lib/game/config";
import { CATEGORIES, type Category } from "@/lib/game/types";
import { Logo, SoundToggle, Wallet } from "../AppShell";
import { EmptyState } from "../ui";
import { CommentsModal, readLocalComments } from "./CommentsModal";
import { FeedPost } from "./FeedPost";
import { SubmitModal } from "./SubmitModal";

type Filter = Category | "all" | "saved";

export function Feed() {
  const { state, community, act } = useGame();
  const fx = useFx();
  const { reducedMotion, settings } = useSettings();
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [localComments, setLocalComments] = useState<Record<string, { text: string; at: number }[]>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  activeRef.current = active;

  useEffect(() => setLocalComments(readLocalComments()), []);

  // Snapshot "viewed" when the filter changes so the list doesn't reshuffle while scrolling.
  const viewedSnapshot = useMemo(() => new Set(state?.feed.viewed ?? []), [filter, community.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const posts = useMemo(() => {
    const all = [...community, ...SEED_POSTS];
    let list = all;
    if (filter === "saved") list = all.filter((p) => state?.feed.bookmarked.includes(p.id));
    else if (filter !== "all") list = all.filter((p) => p.category === filter);
    const mine = list.filter((p) => p.submission?.mine && p.submission.status !== "approved");
    const rest = list.filter((p) => !mine.includes(p));
    const fresh = rest.filter((p) => !viewedSnapshot.has(p.id));
    const seen = rest.filter((p) => viewedSnapshot.has(p.id));
    return [...mine, ...fresh, ...seen];
  }, [community, filter, viewedSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link: /?post=p12
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("post");
    if (!id) return;
    const i = posts.findIndex((p) => p.id === id);
    if (i > 0) requestAnimationFrame(() => scroller.current?.children[i]?.scrollIntoView());
    // only on first mount
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Active post detection
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll(".feed-item").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [posts]);

  useEffect(() => {
    setActive(0);
    scroller.current?.scrollTo({ top: 0 });
  }, [filter]);

  // Dwell-based view reward (server validates & throttles)
  const post = posts[active];
  const viewed = !!post && !!state?.feed.viewed.includes(post.id);
  useEffect(() => {
    if (!post || viewed || (post.submission && post.submission.status !== "approved")) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(async () => {
      const r = await act({ type: "viewPost", postId: post.id }, { silent: true });
      if (!r.ok && r.error === "too_fast") {
        retry = setTimeout(() => {
          if (posts[activeRef.current]?.id === post.id) void act({ type: "viewPost", postId: post.id }, { silent: true });
        }, FEED_RULES.minRewardGapMs + 200);
      }
    }, FEED_RULES.dwellMs);
    return () => {
      clearTimeout(t);
      if (retry) clearTimeout(retry);
    };
  }, [post?.id, viewed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-post soundtrack — only for the active post, only after the user unmutes
  useEffect(() => {
    if (!muted && settings.sound && post?.kind === "scene") startBeat(post.beat);
    else stopBeat();
  }, [muted, settings.sound, post?.id, post?.kind, post?.beat]);
  useEffect(() => () => stopBeat(), []);

  const scrollTo = useCallback(
    (i: number) => {
      const el = scroller.current?.children[Math.max(0, Math.min(posts.length - 1, i))] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    },
    [posts.length, reducedMotion],
  );

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (commentsFor || submitOpen || t.closest("input, textarea, select, [role=dialog]")) return;
      if (["ArrowDown", "PageDown", "j"].includes(e.key)) {
        e.preventDefault();
        scrollTo(activeRef.current + 1);
      } else if (["ArrowUp", "PageUp", "k"].includes(e.key)) {
        e.preventDefault();
        scrollTo(activeRef.current - 1);
      } else if (e.key === "l") {
        const p = posts[activeRef.current];
        if (p) void act({ type: "likePost", postId: p.id });
      } else if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [scrollTo, commentsFor, submitOpen, posts, act]);

  const share = async (p: Post) => {
    const url = `${window.location.origin}/?post=${p.id}`;
    const text = `${p.caption} — via DOPAMINE.EXE`;
    try {
      if (navigator.share) await navigator.share({ title: "DOPAMINE.EXE", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        fx.toast("Link copied. Spread the rot responsibly.", "good", "🔗");
      }
      await act({ type: "share", target: p.id }, { silent: true });
    } catch {
      /* user cancelled share sheet */
    }
  };

  if (!state) return null;
  const isPostApproved = (p: Post) => !p.submission || p.submission.status === "approved";

  return (
    <div className="relative h-full w-full">
      {/* top overlay */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent pb-6">
        <div className="pointer-events-auto flex items-center justify-between gap-2 px-3 pt-2 md:hidden">
          <Logo small />
          <div className="flex items-center gap-2">
            <Wallet compact />
            <SoundToggle />
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2 px-3 pt-2">
          <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Feed categories">
            {(["all", ...CATEGORIES, "saved"] as Filter[]).map((f) => {
              const meta = f === "all" ? { label: "For You", emoji: "✨", color: "#39ff88" } : f === "saved" ? { label: "Saved", emoji: "⭐", color: "#e8ff3a" } : CATEGORY_META[f];
              const discovered = f === "all" || f === "saved" || state.feed.discovered.includes(f);
              return (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${filter === f ? "bg-white text-black" : "border-white/20 bg-black/50 text-white/85 hover:border-white/50"}`}
                  style={filter === f ? { background: meta.color, borderColor: meta.color } : undefined}
                >
                  {meta.emoji} {meta.label}
                  {!discovered && <span className="ml-1 text-acid">•</span>}
                </button>
              );
            })}
          </div>
          <button className="btn-hot shrink-0 !px-3 !py-1.5 text-xs" onClick={() => setSubmitOpen(true)}>
            + Submit
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="flex h-full items-center justify-center p-6">
          <EmptyState emoji={filter === "saved" ? "⭐" : "🕳️"} title={filter === "saved" ? "No saved posts yet" : "Nothing here"}>
            {filter === "saved" ? "Tap ☆ on any post to bookmark it." : "Try another category."}
            <div className="mt-3">
              <button className="btn-neon" onClick={() => setFilter("all")}>
                Back to For You
              </button>
            </div>
          </EmptyState>
        </div>
      ) : (
        <div ref={scroller} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain" aria-label="Brainrot feed. Use arrow keys or J/K to move between posts." tabIndex={-1}>
          {posts.map((p, i) => (
            <FeedPost
              key={p.id}
              post={p}
              index={i}
              active={i === active}
              near={Math.abs(i - active) <= 1}
              reduced={reducedMotion}
              muted={muted}
              flags={{ liked: state.feed.liked.includes(p.id), bookmarked: state.feed.bookmarked.includes(p.id), viewed: state.feed.viewed.includes(p.id) }}
              commentCount={p.comments.length + (localComments[p.id]?.length ?? 0)}
              onLike={(el) => {
                if (!isPostApproved(p)) return fx.toast("You can react once it's approved.", "info");
                if (!state.feed.liked.includes(p.id)) {
                  fx.burstAt(el, ["#ff2e97", "#ffffff"], 18);
                  fx.sfx("pat");
                }
                void act({ type: "likePost", postId: p.id });
              }}
              onBookmark={() => {
                if (!isPostApproved(p)) return;
                fx.sfx("click");
                void act({ type: "bookmarkPost", postId: p.id });
              }}
              onShare={() => void share(p)}
              onComments={() => setCommentsFor(p)}
              onToggleMute={() => setMuted((m) => !m)}
            />
          ))}
        </div>
      )}

      {/* desktop up/down */}
      <div className="absolute right-4 top-24 z-10 hidden flex-col gap-2 lg:flex">
        <button className="btn-ghost h-10 w-10 !p-0" onClick={() => scrollTo(active - 1)} disabled={active === 0} aria-label="Previous post">
          ▲
        </button>
        <button className="btn-ghost h-10 w-10 !p-0" onClick={() => scrollTo(active + 1)} disabled={active >= posts.length - 1} aria-label="Next post">
          ▼
        </button>
      </div>

      {/* progress hint */}
      <div className="pointer-events-none absolute bottom-[4.5rem] left-1/2 z-10 -translate-x-1/2 font-pixel text-sm text-white/50 md:bottom-2" aria-live="polite">
        {active + 1}/{posts.length} · {state.feed.viewed.length} seen · <Link href="/missions" className="pointer-events-auto underline">rules</Link>
      </div>

      <CommentsModal post={commentsFor} onClose={() => setCommentsFor(null)} local={localComments} setLocal={setLocalComments} />
      <SubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}
