"use client";

import { motion } from "framer-motion";
import { useGame } from "@/client/game";
import { Bar, RarityTag, SectionTitle } from "@/components/ui";
import { RARITY_META } from "@/lib/game/config";
import { achievementView } from "@/lib/game/selectors";
import { rewardText } from "@/lib/game/format";

export default function AchievementsPage() {
  const { state } = useGame();
  if (!state) return null;
  const list = achievementView(state).sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.current / b.target - a.current / a.target);
  const unlocked = list.filter((a) => a.unlocked).length;

  return (
    <div>
      <SectionTitle kicker={`${unlocked}/${list.length} unlocked`} title="ACHIEVEMENTS" />
      <div className="mb-6">
        <Bar value={unlocked} max={list.length} color="#ffb02e" label="Achievements unlocked" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a, i) => {
          const color = RARITY_META[a.rarity].color;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
              className={`card p-4 ${a.unlocked ? "" : "opacity-70"}`}
              style={a.unlocked ? { borderColor: color, boxShadow: `0 0 22px -10px ${color}` } : undefined}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl ${a.unlocked ? "" : "grayscale"}`} style={{ borderColor: color + "88" }}>
                  {a.unlocked ? a.emoji : "🔒"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-muted">{a.description}</div>
                  <div className="mt-1">
                    <RarityTag rarity={a.rarity} />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-acid">{rewardText(a.reward)}</span>
                  <span className="font-mono text-muted">
                    {a.current}/{a.target}
                  </span>
                </div>
                <Bar value={a.current} max={a.target} color={a.unlocked ? color : "#2ef2ff"} label={a.name} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
