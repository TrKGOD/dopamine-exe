"use client";

import { STATIC_MODE } from "@/client/backend";
import { motion } from "framer-motion";
import { useFx } from "@/client/fx";
import { useGame, useNow } from "@/client/game";
import { Bar, RarityTag, SectionTitle } from "@/components/ui";
import { CATEGORY_META } from "@/lib/content/posts";
import { FEED_RULES, PROGRESSION_RULES, SEASON, type QuestDef } from "@/lib/game/config";
import { ClickerMissions } from "@/components/clicker/ClickerMissions";
import { rewardText } from "@/lib/game/format";
import { questView } from "@/lib/game/selectors";
import { formatDuration, nextDailyReset, nextWeeklyReset } from "@/lib/game/time";
import { CATEGORIES } from "@/lib/game/types";

export default function MissionsPage() {
  const { state, act, pending } = useGame();
  const fx = useFx();
  const now = useNow();
  if (!state) return null;
  const quests = questView(state);

  const questList = (period: QuestDef["period"]) => (
    <ul className="space-y-2">
      {quests
        .filter((q) => q.period === period)
        .map((q) => (
          <motion.li layout key={q.id} className={`card p-3 ${q.complete && !q.claimed ? "border-neon shadow-neon" : ""} ${q.claimed ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  {q.claimed ? "✅" : q.complete ? "🎁" : "▫️"} {q.title}
                </div>
                <div className="text-xs text-muted">{q.description}</div>
                <div className="mt-1 text-xs text-acid">Reward: {rewardText(q.reward)}</div>
              </div>
              <button
                className="btn-neon shrink-0 !px-3"
                disabled={!q.complete || q.claimed || pending.has("claimQuest")}
                onClick={async (e) => {
                  fx.burstAt(e.currentTarget, undefined, 40);
                  fx.sfx("achievement");
                  await act({ type: "claimQuest", questId: q.id });
                }}
              >
                {q.claimed ? "Claimed" : q.complete ? "Claim" : `${q.progress}/${q.target}`}
              </button>
            </div>
            <div className="mt-2">
              <Bar value={q.progress} max={q.target} color={q.complete ? "#39ff88" : "#2ef2ff"} label={q.title} />
            </div>
          </motion.li>
        ))}
    </ul>
  );

  const nextTier = SEASON.tiers.find((t) => !state.season.claimedTiers.includes(t.tier));
  const maxPts = SEASON.tiers[SEASON.tiers.length - 1].points;

  return (
    <div>
      <SectionTitle kicker="quests · season · mastery · rules" title="MISSIONS" />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="daily-h">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="daily-h" className="h-display text-xl text-neon">
              Daily
            </h2>
            <span className="font-mono text-xs text-muted">resets in {formatDuration(nextDailyReset(now) - now)}</span>
          </div>
          {questList("daily")}
        </section>
        <section aria-labelledby="weekly-h">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="weekly-h" className="h-display text-xl text-volt">
              Weekly
            </h2>
            <span className="font-mono text-xs text-muted">resets in {formatDuration(nextWeeklyReset(now) - now)}</span>
          </div>
          {questList("weekly")}
        </section>
      </div>

      <section className="card mt-6 p-4" aria-labelledby="season-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="season-h" className="h-display text-xl text-acid">
            {SEASON.name}
          </h2>
          <span className="font-mono text-sm">
            {state.season.points} pts {nextTier ? `· next tier at ${nextTier.points}` : "· all tiers cleared 👑"}
          </span>
        </div>
        <p className="mb-3 text-xs text-muted">Earn 1 season point per {SEASON.xpPerPoint} XP. Tier rewards are granted automatically.</p>
        <Bar value={state.season.points} max={maxPts} color="#e8ff3a" label="Season progress" />
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {SEASON.tiers.map((t) => {
            const got = state.season.claimedTiers.includes(t.tier);
            return (
              <li key={t.tier} className={`rounded-xl border p-2 text-center text-xs ${got ? "border-acid bg-acid/10" : "border-line"}`}>
                <div className="font-pixel text-base text-muted">TIER {t.tier}</div>
                <div className="font-semibold">{t.label}</div>
                <div className="text-muted">{got ? "✅ claimed" : `${t.points} pts`}</div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-6" aria-labelledby="doom-h">
        <h2 id="doom-h" className="h-display mb-3 text-xl text-neon">
          ☢️ DOOMCLICKER missions <span className="text-sm text-muted">(one-time)</span>
        </h2>
        <ClickerMissions />
      </section>

      <section className="card mt-6 p-4" aria-labelledby="mastery-h">
        <h2 id="mastery-h" className="h-display mb-1 text-xl text-ice">
          Category mastery
        </h2>
        <p className="mb-3 text-xs text-muted">
          Tiers at {FEED_RULES.masteryTiers.map((t) => t.views).join(" / ")} unique posts per category: {FEED_RULES.masteryTiers.map((t) => `${t.label} (${rewardText(t.reward)})`).join(", ")}.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const m = CATEGORY_META[c];
            const v = state.feed.categoryViews[c] ?? 0;
            const tier = FEED_RULES.masteryTiers.filter((t) => state.feed.masteryClaimed.includes(`${c}:${t.tier}`)).length;
            const discovered = state.feed.discovered.includes(c);
            return (
              <div key={c} className="rounded-xl border border-line p-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {discovered ? m.emoji : "❔"} {discovered ? m.label : "Undiscovered"}
                  </span>
                  <span className="font-pixel text-base" style={{ color: m.color }}>
                    {tier > 0 ? FEED_RULES.masteryTiers[tier - 1].label : "—"}
                  </span>
                </div>
                <Bar value={v} max={FEED_RULES.masteryTiers[FEED_RULES.masteryTiers.length - 1].views} color={m.color} label={`${m.label} mastery`} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="card mt-6 p-4" aria-labelledby="rules-h">
        <h2 id="rules-h" className="h-display mb-3 text-xl text-hot">
          Progression rules (no secrets)
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {[...PROGRESSION_RULES, { label: "Player level up", value: "+25 🧠, +1 💎" }].map((r) => (
              <tr key={r.label} className="border-t border-white/5">
                <td className="py-1.5 pr-3 text-white/85">{r.label}</td>
                <td className="py-1.5 text-right font-mono text-acid">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          {STATIC_MODE ? "This static demo runs the game engine in your browser and saves to localStorage." : "All rewards are decided on the server. Replaying requests, refreshing or changing your device clock doesn't duplicate anything."} <RarityTag rarity="mythical" /> items exist, but they&apos;re cosmetic only.
        </p>
      </section>
    </div>
  );
}
