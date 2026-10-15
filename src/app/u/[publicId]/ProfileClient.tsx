"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { backend } from "@/client/backend";
import { useFx } from "@/client/fx";
import { ProfileView } from "@/components/ProfileView";
import { EmptyState, SectionTitle } from "@/components/ui";
import type { PublicProfile } from "@/lib/content/profiles";

export function ProfileClient({ publicId }: { publicId: string }) {
  const fx = useFx();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    let alive = true;
    backend
      .profile(publicId)
      .then((p) => {
        if (!alive) return;
        if (!p) return setStatus("missing");
        setProfile(p);
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
