"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useFx } from "@/client/fx";
import { ProfileView } from "@/components/ProfileView";
import { EmptyState, SectionTitle } from "@/components/ui";
import type { PublicProfile } from "@/lib/server/profiles";

export default function PublicProfilePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = use(params);
  const fx = useFx();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    let alive = true;
    fetch(`/api/profile/${encodeURIComponent(publicId)}`)
      .then(async (r) => {
        if (!alive) return;
        if (!r.ok) return setStatus("missing");
        setProfile((await r.json()).profile);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("missing"));
    return () => {
      alive = false;
    };
  }, [publicId]);

  return (
    <div>
      <SectionTitle kicker="public pet showcase" title="PROFILE">
        <button
          className="btn-ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              fx.toast("Profile link copied.", "good", "🔗");
            } catch {
              fx.toast("Couldn't copy link.", "bad");
            }
          }}
        >
          🔗 Copy link
        </button>
      </SectionTitle>
      {status === "loading" && <div className="card h-48 animate-pulse" aria-busy="true" />}
      {status === "missing" && (
        <EmptyState emoji="👻" title="Profile not found">
          This player may have vanished into the feed. <Link href="/leaderboard" className="text-neon underline">Back to leaderboard</Link>
        </EmptyState>
      )}
      {status === "ok" && profile && (
        <div className="card-hi p-5">
          <ProfileView profile={profile} />
        </div>
      )}
    </div>
  );
}
