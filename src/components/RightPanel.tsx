"use client";

import Link from "next/link";
import { useGame, useNow } from "@/client/game";
import { ROULETTE_COOLDOWN_MS } from "@/lib/game/config";
import { getItem } from "@/lib/game/items";
import { playerLevelInfo, questView } from "@/lib/game/selectors";
import { formatDuration } from "@/lib/game/time";
import { CATEGORIES } from "@/lib/game/types";
import { PetCard } from "./PetCard";
import { Bar, RarityTag, Stat } from "./ui";

export function RouletteMini() {
  const { state } = useGame();
  const now = useNow();
  if (!state) return null;
  const left = state.roulette.nextSpinAt - now;
  const ready = left <= 0;
  return (
    <Link href="/roulette" className={`card flex items-center gap-3 p-3 transition hover:border-neon/60 ${ready ? "shadow-neon" : ""}`}>
      <div className={`text-3xl ${ready ? "animate-[spin_3s_linear_infinite]" : ""}`}>🎡</div>
      <div className="flex-1">
        <div className="label !text-sm">Roulette</div>
        {ready ? (
          <div className="font-display text-neon">SPIN READY</div>
        ) : (
          <>
            <div className="font-mono text-sm text-white" aria-live="off">
              next spin in {formatDuration(left)}
            </div>
            <Bar value={ROULETTE_COOLDOWN_MS - left} max={ROULETTE_COOLDOWN_MS} color="#a855ff" label="Roulette cooldown" />
          </>
        )}
      </div>
    </Link>
  );
}

export function RightPanel() {
  const { state } = useGame();
  if (!state) return null;
  const lvl = playerLevelInfo(state);
  const quests = questView(state)
    .filter((q) => !q.claimed)
    .sort((a, b) => Number(b.complete) - Number(a.complete))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-3 p-4">
      <PetCard />

      <div className="card p-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="label !text-sm">
            {state.displayName} · LV {state.level}
          </span>
          <span className="font-mono text-neon">
            {lvl.into}/{lvl.needed} XP
          </span>
        </div>
        <Bar value={lvl.into} max={lvl.needed} label="Player XP" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Posts seen" value={state.feed.viewed.length} color="#2ef2ff" />
          <Stat label="Categories" value={`${state.feed.discovered.length}/${CATEGORIES.length}`} color="#a855ff" />
          <Stat label="Braincells" value={`🧠 ${state.coins}`} color="#39ff88" />
          <Stat label="Tokens" value={`💎 ${state.tokens}`} color="#a855ff" />
        </div>
      </div>

      <RouletteMini />

      <div className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="label !text-sm">Current quests</span>
          <Link href="/missions" className="text-xs text-neon hover:underline">
            all →
          </Link>
        </div>
        {quests.length === 0 ? (
          <p className="text-sm text-muted">All quests claimed. Touch grass? (optional)</p>
        ) : (
          <ul className="space-y-2">
            {quests.map((q) => (
              <li key={q.id}>
                <div className="flex justify-between text-sm">
                  <span className={q.complete ? "text-neon" : "text-white/90"}>
                    {q.complete ? "✅ " : ""}
                    {q.title}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {q.progress}/{q.target}
                  </span>
                </div>
                <Bar value={q.progress} max={q.target} color={q.complete ? "#39ff88" : "#2ef2ff"} label={q.title} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-3">
        <div className="label mb-2 !text-sm">Recent unlocks</div>
        {state.recent.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet. Go scroll something.</p>
        ) : (
          <ul className="space-y-1.5">
            {state.recent.slice(0, 5).map((r, i) => (
              <li key={r.at + ":" + i} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{r.itemId ? getItem(r.itemId)?.emoji : "🏆"}</span>
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                <RarityTag rarity={r.rarity} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
