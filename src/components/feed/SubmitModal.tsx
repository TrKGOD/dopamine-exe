"use client";

import { useEffect, useState } from "react";
import { useFx } from "@/client/fx";
import { useGame } from "@/client/game";
import { CATEGORY_META } from "@/lib/content/posts";
import { CATEGORIES, type Category } from "@/lib/game/types";
import { Modal } from "../ui";

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm";
const MAX = 8 * 1024 * 1024;

export function SubmitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addCommunityPost } = useGame();
  const fx = useFx();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<Category>("community");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setError(null);
    }
  }, [open]);

  const problems: string[] = [];
  if (!file) problems.push("Attach an image or short video.");
  else if (file.size > MAX) problems.push("File is larger than 8 MB.");
  else if (!ACCEPT.split(",").includes(file.type)) problems.push("Unsupported file type.");
  if (caption.trim().length < 3) problems.push("Caption needs at least 3 characters.");

  const submit = async () => {
    if (problems.length || !file) return;
    setStatus("sending");
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("caption", caption.trim());
    body.set("category", category);
    try {
      const res = await fetch("/api/submissions", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      if (data.status === "rejected") {
        setError(data.note ?? "Your submission was rejected by automatic screening.");
        setStatus("idle");
        return;
      }
      addCommunityPost(data.post);
      setStatus("done");
      fx.toast("Submitted! It's in the moderation queue.", "good", "📨");
      setFile(null);
      setCaption("");
    } catch (e) {
      setError((e as Error).message);
      setStatus("idle");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Submit to the feed">
      {status === "done" ? (
        <div className="space-y-3 text-center">
          <div className="text-5xl">📨</div>
          <p className="text-white">Your creation is pending review. It shows at the top of your feed (only to you) until a moderator approves it.</p>
          <button className="btn-neon" onClick={onClose} data-autofocus>
            Back to scrolling
          </button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="block">
            <span className="label">Image or video (PNG, JPG, GIF, WebP, MP4, WebM · max 8 MB)</span>
            <input type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neon file:px-3 file:py-1.5 file:font-semibold file:text-black" />
          </label>
          {preview && file && (
            <div className="flex max-h-56 justify-center overflow-hidden rounded-xl border border-line bg-black">
              {file.type.startsWith("video") ? <video src={preview} className="max-h-56" muted loop autoPlay playsInline /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="Preview" className="max-h-56 object-contain" />}
            </div>
          )}
          <label className="block">
            <span className="label">Caption ({caption.trim().length}/150)</span>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={150} rows={2} className="mt-1 w-full rounded-xl border border-line bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon" placeholder="describe your cursed masterpiece" />
          </label>
          <label className="block">
            <span className="label">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="mt-1 w-full rounded-xl border border-line bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                </option>
              ))}
            </select>
          </label>
          {(error || (file && problems.length > 0)) && (
            <p className="rounded-lg border border-hot/50 bg-hot/10 p-2 text-sm text-hot" role="alert">
              {error ?? problems[0]}
            </p>
          )}
          <p className="text-xs text-muted">Submissions are reviewed before anyone else can see them. No links, no hate, no stolen content. Keep it absurd.</p>
          <button className="btn-hot w-full" disabled={problems.length > 0 || status === "sending"}>
            {status === "sending" ? "Uploading…" : "Submit for review"}
          </button>
        </form>
      )}
    </Modal>
  );
}
