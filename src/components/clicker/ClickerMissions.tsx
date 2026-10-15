"use client";

import { useFx } from "@/client/fx";
import { useGame } from "@/client/game";
import { Bar } from "@/components/ui";
import { formatBig } from "@/lib/game/clicker";
import { CLICKER_MISSIONS } from "@/lib/game/clickerConfig";
import { rewardText } from "@/lib/game/format";

/** One-time DOOMCLICKER missions; rewards go through the main game's reward system. */
export function ClickerMissions() {
  const { state, act, pending } = useGame();
  const fx = useFx();
  if (!state) return null;
  const c = state.clicker;
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {CLICKER_MISSIONS.map((m) => {
        const cur = Math.min(m.target, m.progress(c));
        const done = cur >= m.target;
        const claimed = c.missionsClaimed.includes(m.id);
        return (
          <li key={m.id} className={`card p-3 ${done && !claimed ? "border-neon shadow-neon" : ""} ${claimed ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {claimed ? "✅ " : done ? "🎁 " : ""}
                  {m.title}
                </div>
                <div className="text-xs text-muted">{m.description}</div>
                <div className="mt-0.5 text-xs text-acid">Reward: {rewardText(m.reward)}</div>
              </div>
              <button
                className="btn-neon shrink-0 !px-3 !py-1.5 text-xs"
                disabled={!done || claimed || pending.has("clickerClaimMission")}
                onClick={async (e) => {
                  fx.burstAt(e.currentTarget, undefined, 30);
                  await act({ type: "clickerClaimMission", missionId: m.id });
                }}
              >
                {claimed ? "Claimed" : done ? "Claim" : `${formatBig(cur)}/${formatBig(m.target)}`}
              </button>
            </div>
            <div className="mt-2">
              <Bar value={cur} max={m.target} color={done ? "#39ff88" : "#2ef2ff"} label={m.title} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
