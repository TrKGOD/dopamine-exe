import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="text-6xl">🕳️</div>
      <h1 className="glitch h-display text-4xl text-hot" data-text="404: VIBE NOT FOUND">
        404: VIBE NOT FOUND
      </h1>
      <p className="text-white/70">This page fell into the feed and never came back.</p>
      <Link href="/" className="btn-neon">
        Back to the feed
      </Link>
    </div>
  );
}
