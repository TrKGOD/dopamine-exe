"use client";

import { AnimatePresence, motion } from "framer-motion";
import { forwardRef, memo, useEffect, useRef, useState } from "react";
import { withBase } from "@/client/backend";
import { CATEGORY_META, type Post } from "@/lib/content/posts";
import { Scene } from "./Scenes";

export interface PostFlags {
  /** heart of the current viewing instance (resets when the post re-enters the feed) */
  liked: boolean;
  /** persisted like on the server, part of the aggregate count */
  persistedLiked: boolean;
  bookmarked: boolean;
  viewed: boolean;
}

interface Props {
  post: Post;
  index: number;
  active: boolean;
  /** media is only mounted for the active post and its neighbours */
  near: boolean;
  flags: PostFlags;
  muted: boolean;
  reduced: boolean;
  commentCount: number;
  onLike: (el: Element | null) => void;
  onBookmark: () => void;
  onShare: () => void;
  onComments: () => void;
  onToggleMute: () => void;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return String(n);
}

function MediaFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#050409] p-6 text-center">
      <div className="text-6xl">📼</div>
      <div className="glitch h-display text-2xl text-hot" data-text="MEDIA TOO POWERFUL">
        MEDIA TOO POWERFUL
      </div>
      <p className="text-sm text-muted">This clip failed to load. The caption is still funny though.</p>
    </div>
  );
}

function VideoMedia({ src, active, muted }: { src: string; active: boolean; muted: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) void v.play().catch(() => {});
    else v.pause();
  }, [active]);
  if (failed) return <MediaFallback />;
  return <video ref={ref} src={src} className="absolute inset-0 h-full w-full bg-black object-contain" muted={muted} loop playsInline preload="metadata" onError={() => setFailed(true)} />;
}

function ImageMedia({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (failed) return <MediaFallback />;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#050409]">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="max-h-full w-full max-w-[640px] object-contain" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </div>
  );
}

export const FeedPost = memo(function FeedPost({ post, index, active, near, flags, muted, reduced, commentCount, onLike, onBookmark, onShare, onComments, onToggleMute }: Props) {
  const cat = CATEGORY_META[post.category];
  const likeRef = useRef<HTMLButtonElement>(null);
  const [heart, setHeart] = useState(0);
  const likes = post.baseLikes + (flags.persistedLiked ? 1 : 0);
  const pending = post.submission && post.submission.status !== "approved";

  return (
    <section data-index={index} className="feed-item relative h-full w-full snap-start snap-always overflow-hidden" aria-roledescription="post" aria-label={`${cat.label} post by ${post.creator.name}: ${post.caption}`}>
      <div
        className={`feed-media absolute inset-0 ${active ? "" : "paused"}`}
        onDoubleClick={() => {
          if (!flags.liked) onLike(likeRef.current);
          setHeart((h) => h + 1);
        }}
      >
        {near ? (
          post.kind === "scene" && post.scene ? (
            <Scene spec={post.scene} active={active} reduced={reduced} />
          ) : post.kind === "video" && post.src ? (
            <VideoMedia src={post.src} active={active} muted={muted} />
          ) : post.kind === "image" && post.src ? (
            <ImageMedia src={withBase(post.src)} alt={post.caption} />
          ) : (
            <MediaFallback />
          )
        ) : (
          <div className="absolute inset-0 bg-[#050409]" />
        )}
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <AnimatePresence>
          {heart > 0 && (
            <motion.div key={heart} className="text-8xl" initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.4, opacity: 0 }} transition={{ duration: 0.7 }}>
              💖
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* gradient for legibility */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* caption block */}
      <div className="absolute bottom-20 left-0 right-20 p-4 md:bottom-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-sm text-black" style={{ background: `hsl(${post.creator.hue} 90% 60%)`, borderColor: `hsl(${post.creator.hue} 90% 80%)` }} aria-hidden>
            {post.creator.name[0]}
          </span>
          <span className="font-semibold text-white">{post.creator.handle}</span>
          {post.creator.verified && (
            <span className="text-ice" title="Verified (by vibes)" aria-label="verified">
              ✔
            </span>
          )}
          <span className="chip" style={{ color: cat.color, borderColor: cat.color + "66" }}>
            {cat.emoji} {cat.label}
          </span>
          {!flags.viewed && !pending && <span className="chip !border-acid/60 bg-acid/10 text-acid">NEW · +XP</span>}
          {pending && <span className="chip !border-hot/60 text-hot">PENDING REVIEW · only you</span>}
          {!post.submission && <span className="chip text-muted" title="Fictional seed content">demo</span>}
        </div>
        <p className="mt-2 max-w-xl text-[15px] leading-snug text-white drop-shadow">{post.caption}</p>
      </div>

      {/* action rail */}
      <div className="absolute bottom-24 right-2 flex flex-col items-center gap-3 md:bottom-8 md:right-4">
        <RailButton ref={likeRef} label={flags.liked ? "Unlike" : "Like"} active={flags.liked} activeColor="#ff2e97" icon={flags.liked ? "💖" : "🤍"} count={formatCount(likes)} onClick={() => onLike(likeRef.current)} />
        <RailButton label="Comments" icon="💬" count={formatCount(commentCount)} onClick={onComments} />
        <RailButton label={flags.bookmarked ? "Remove bookmark" : "Bookmark"} active={flags.bookmarked} activeColor="#e8ff3a" icon={flags.bookmarked ? "⭐" : "☆"} count={flags.bookmarked ? "saved" : "save"} onClick={onBookmark} />
        <RailButton label="Share" icon="↗" count="share" onClick={onShare} />
        <RailButton label={muted ? "Unmute" : "Mute"} icon={muted ? "🔇" : "🔊"} count={muted ? "muted" : "sound"} onClick={onToggleMute} />
      </div>
    </section>
  );
});

const RailButton = forwardRef<HTMLButtonElement, { label: string; icon: string; count: string; onClick: () => void; active?: boolean; activeColor?: string }>(function RailButton(
  { label, icon, count, onClick, active, activeColor },
  ref,
) {
  return (
    <button ref={ref} onClick={onClick} aria-label={label} aria-pressed={active} className="group flex flex-col items-center gap-0.5 text-white">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/50 text-2xl backdrop-blur transition group-hover:scale-110 group-active:scale-90"
        style={active ? { borderColor: activeColor, boxShadow: `0 0 16px ${activeColor}` } : undefined}
      >
        {icon}
      </span>
      <span className="text-[11px] font-semibold text-white/85 drop-shadow">{count}</span>
    </button>
  );
});
