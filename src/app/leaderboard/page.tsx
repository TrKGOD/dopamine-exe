"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { backend, STATIC_MODE } from "@/client/backend";
import { useFx } from "@/client/fx";
import { useGame } from "@/client/game";
import { PetAvatar } from "@/components/PetAvatar";
import { ProfileView } from "@/components/ProfileView";
import { ShareCardButton } from "@/components/ShareCardButton";
import { Bar, EmptyState, Modal, SectionTitle } from "@/components/ui";
import { PERSONALITY_META } from "@/lib/game/config";
import { ITEMS, ITEM_LIST } from "@/lib/game/items";
import type { PublicProfile } from "@/lib/content/profiles";

interface Board {
  entries: PublicProfile[];
  me: string | null;
  realPlayers: number;
  challenge: { name: string; description: string; goal: number; progress: number; real: number; demoBaseline: number };
}

export default function LeaderboardPage() {
  const { state, act } = useGame();
  const fx = useFx();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<PublicProfile | null>(null);
  const [name, setName] = useState("");
  const petRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setBoard(await backend.leaderboard());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  if (!state) return null;
  const titles = ITEM_LIST.filter((i) => i.kind === "title" && state.inventory[i.id]);
  const myRank = board?.entries.findIndex((e) => e.publicId === board.me) ?? -1;

  return (
    <div>
      <SectionTitle kicker="weekly XP · resets every Monday (UTC)" title="LEADERBOARD" />

      {board && (
        <section className="card-hi mb-6 p-4" aria-labelledby="cc-h">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🤵</span>
            <div className="flex-1">
              <h2 id="cc-h" className="h-display text-lg text-hot">
                Community challenge: {board.challenge.name}
              </h2>
              <p className="text-sm text-white/75">{board.challenge.description}</p>
            </div>
          </div>
          <div className="mt-3">
            <Bar value={board.challenge.progress} max={board.challenge.goal} color="#ff2e97" label="Community challenge progress" />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>
                {board.challenge.progress.toLocaleString()} / {board.challenge.goal.toLocaleString()} posts
              </span>
              <span>
                real players: {board.challenge.real} · demo baseline: {board.challenge.demoBaseline}
              </span>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0" aria-label="Rankings">
          {error && !board ? (
            <EmptyState emoji="📡" title="Leaderboard unreachable">
              <button className="btn-neon mt-2" onClick={load}>
                Retry
              </button>
            </EmptyState>
          ) : !board ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-16 animate-pulse" />
              ))}
            </div>
          ) : (
            <ol className="space-y-2">
              {board.entries.map((p, i) => {
                const me = p.publicId === board.me;
                return (
                  <li key={p.publicId}>
                    <button onClick={() => setOpen(p)} className={`card flex w-full items-center gap-3 p-2 pr-4 text-left transition hover:border-white/30 ${me ? "border-neon shadow-neon" : ""}`}>
                      <span className={`w-8 text-center font-display text-xl ${i === 0 ? "text-[#ffb02e]" : i === 1 ? "text-[#c7ccd8]" : i === 2 ? "text-[#c08a5a]" : "text-muted"}`}>{i + 1}</span>
                      <PetAvatar personality={p.pet.personality} level={p.pet.level} equipped={p.pet.equipped} mutations={p.pet.mutations} size={48} animate={false} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">{p.displayName}</span>
                          {p.demo && <span className="chip !py-0 text-[10px] text-acid">DEMO</span>}
                          {me && <span className="chip !py-0 text-[10px] text-neon">YOU</span>}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {p.title ? `« ${ITEMS[p.title]?.name} » · ` : ""}LV {p.level} · {p.pet.name} the {PERSONALITY_META[p.pet.personality].name}
                        </span>
                      </span>
                      <span className="font-mono text-sm text-neon">{p.weeklyXp.toLocaleString()} XP</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          {STATIC_MODE && <p className="mt-3 text-xs text-acid">Static demo build: you are ranked against fictional DEMO players only. Run the server version for a shared leaderboard.</p>}
          <p className="mt-3 text-xs text-muted">Entries marked DEMO are fictional seed players. Only display names, levels and cosmetics are public — never account data.</p>
        </section>

        <aside className="card h-fit p-4" aria-label="Your public profile">
          <div className="label mb-2">Your profile {myRank >= 0 && `· rank #${myRank + 1}`}</div>
          <div ref={petRef} className="flex justify-center">
            <PetAvatar {...state.pet} size={140} />
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await act({ type: "setDisplayName", name: name.trim() });
              if (r.ok) {
                setName("");
                fx.toast("Display name updated.", "good");
                void load();
              }
            }}
          >
            <label className="sr-only" htmlFor="dn">
              Display name
            </label>
            <input id="dn" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder={state.displayName} className="min-w-0 flex-1 rounded-xl border border-line bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon" />
            <button className="btn-ghost" disabled={name.trim().length < 3}>
              Save
            </button>
          </form>
          <label className="mt-3 block text-sm">
            <span className="label !text-sm">Title</span>
            <select value={state.equippedTitle ?? ""} onChange={(e) => act({ type: "equipTitle", itemId: e.target.value || null })} className="mt-1 w-full rounded-xl border border-line bg-black/40 px-3 py-2">
              <option value="">No title</option>
              {titles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 text-xs text-muted">Badges are pinned from the Inventory (max 3).</div>
          <div className="mt-4 flex flex-col gap-2">
            <ShareCardButton
              target="card:profile"
              filename="dopamine-profile.png"
              label="Share profile card"
              spec={() => ({
                kicker: "player profile",
                title: state.displayName,
                subtitle: state.equippedTitle ? ITEMS[state.equippedTitle]?.name : `Level ${state.level}`,
                lines: [`Level ${state.level} · ${state.weekly.xp} XP this week`, `${Object.keys(state.inventory).length} items · ${state.achievements.length} achievements`, `Pet: ${state.pet.name} (LV ${state.pet.level})`],
                accent: "#39ff88",
                svg: petRef.current?.querySelector("svg") ?? null,
              })}
            />
            <Link href={STATIC_MODE ? "/u/me" : `/u/${state.publicId}`} className="btn-ghost">
              🔗 View public page
            </Link>
          </div>
        </aside>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.demo ? "Demo player" : "Player profile"} wide>
        {open && <ProfileView profile={open} />}
      </Modal>
    </div>
  );
}
