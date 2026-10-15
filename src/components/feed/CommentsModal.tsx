"use client";

import { useState } from "react";
import { useGame } from "@/client/game";
import type { Post } from "@/lib/content/posts";
import { Modal } from "../ui";

const KEY = "dopamine.comments.v1";
type Local = Record<string, { text: string; at: number }[]>;

export function readLocalComments(): Local {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Local;
  } catch {
    return {};
  }
}

export function CommentsModal({ post, onClose, local, setLocal }: { post: Post | null; onClose: () => void; local: Local; setLocal: (l: Local) => void }) {
  const { state } = useGame();
  const [text, setText] = useState("");
  const mine = post ? local[post.id] ?? [] : [];
  const clean = text.replace(/[\u0000-\u001f<>]/g, "").trim();

  const submit = () => {
    if (!post || clean.length < 1 || clean.length > 140) return;
    const next = { ...local, [post.id]: [...mine, { text: clean, at: Date.now() }].slice(-30) };
    setLocal(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    setText("");
  };

  return (
    <Modal open={!!post} onClose={onClose} title="Comments">
      <p className="mb-3 text-xs text-muted">Demo comments are fictional. Your comments are stored on this device only.</p>
      <ul className="max-h-[45dvh] space-y-3 overflow-y-auto pr-1">
        {post?.comments.map((c, i) => (
          <li key={"s" + i} className="flex gap-2 text-sm">
            <span className="font-semibold text-ice">@{c.user}</span>
            <span className="text-white/85">{c.text}</span>
          </li>
        ))}
        {mine.map((c) => (
          <li key={c.at} className="flex gap-2 text-sm">
            <span className="font-semibold text-neon">@{state?.displayName ?? "you"}</span>
            <span className="text-white/85">{c.text}</span>
          </li>
        ))}
        {post && post.comments.length + mine.length === 0 && <li className="text-sm text-muted">No comments yet. Be the first to yap.</li>}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="comment-input">
          Add a comment
        </label>
        <input id="comment-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={140} placeholder="say something unhinged…" className="flex-1 rounded-xl border border-line bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon" />
        <button className="btn-neon" disabled={clean.length < 1}>
          Post
        </button>
      </form>
    </Modal>
  );
}
