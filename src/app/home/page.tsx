"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/client/game";
import { DoNotClick } from "@/components/AppShell";
import { PetAvatar } from "@/components/PetAvatar";
import { RouletteMini } from "@/components/RightPanel";
import { Bar, Stat } from "@/components/ui";
import { CATEGORY_META, SEED_POSTS } from "@/lib/content/posts";
import { PERSONALITY_META } from "@/lib/game/config";
import { playerLevelInfo, questView } from "@/lib/game/selectors";
import { CATEGORIES } from "@/lib/game/types";

const TICKER = [
  "⚠ capybara containment at 34%",
  "🧠 braincells trading at an all-time low",
  "📉 attention span: 2.1 seconds and falling",
  "🎡 the wheel hungers",
  "🤵 the CEO is watching your engagement",
  "🐸 frog council in session",
  "📼 the internet is held together by duct tape",
  "✨ touching grass is now a premium feature (it's free)",
];

const PILLARS = [
  { href: "/", emoji: "📱", title: "Doomscroll", text: "A vertical feed of original memes & looping clips. New posts and categories give XP — re-watching gives nothing." },
  { href: "/pet", emoji: "🧪", title: "Raise a menace", text: "Feed, pat, dress up and evolve your creature through 5 stages. Mix mutations for secret combos." },
  { href: "/roulette", emoji: "🎡", title: "Spin (free)", text: "One free spin every 2 minutes. Odds printed on the wheel. Cosmetics only — never real money." },
  { href: "/inventory", emoji: "🎒", title: "Collect", text: "Hats, auras, titles, badges, mutations and capsules across six rarity tiers." },
];

export default function HomePage() {
  const { state } = useGame();
  if (!state) return null;
  const lvl = playerLevelInfo(state);
  const quests = questView(state);
  const doneQuests = quests.filter((q) => q.claimed).length;

  return (
    <div className="space-y-6">
      <section className="card-hi relative overflow-hidden p-6 md:p-10">
        <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-volt/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-neon/20 blur-3xl" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="font-pixel text-xl text-neon">&gt; welcome back, {state.displayName}</p>
            <h1 className="mt-2 font-display text-5xl uppercase leading-[0.9] md:text-7xl">
              <span className="glitch text-white" data-text="DOPAMINE">
                DOPAMINE
              </span>
              <span className="text-hot">.EXE</span>
            </h1>
            <p className="mt-3 max-w-lg text-lg text-white/80">The internet brainrot simulator. Scroll cursed memes, raise a deranged pet, spin a wheel of fictional loot and survive random chaos events.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/" className="btn-neon text-base">
                ▶ Enter the feed
              </Link>
              <Link href="/roulette" className="btn-volt text-base">
                🎡 Spin
              </Link>
              <Link href="/pet" className="btn-ghost text-base">
                🧪 Pet Lab
              </Link>
            </div>
          </div>
          <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 160, damping: 12 }} className="mx-auto">
            <PetAvatar {...state.pet} size={220} title={`${state.pet.name} the ${PERSONALITY_META[state.pet.personality].name}`} />
            <p className="text-center font-display text-white">{state.pet.name}</p>
          </motion.div>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-line bg-black/50 py-2" aria-hidden>
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-pixel text-xl text-acid">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Player level" value={`LV ${state.level}`} color="#e8ff3a" />
        <Stat label="Posts discovered" value={`${state.feed.viewed.length}/${SEED_POSTS.length}`} color="#2ef2ff" />
        <Stat label="Quests today" value={`${doneQuests}/${quests.length} claimed`} color="#39ff88" />
        <Stat label="Achievements" value={state.achievements.length} color="#ffb02e" />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Level {state.level} progress</span>
          <span className="font-mono">
            {lvl.into}/{lvl.needed} XP
          </span>
        </div>
        <Bar value={lvl.into} max={lvl.needed} label="Player level progress" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PILLARS.map((p, i) => (
          <motion.div key={p.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Link href={p.href} className="card group flex h-full gap-4 p-4 transition hover:-translate-y-1 hover:border-neon/60">
              <span className="text-4xl transition group-hover:scale-125 group-hover:rotate-6">{p.emoji}</span>
              <span>
                <span className="h-display block text-lg text-white">{p.title}</span>
                <span className="text-sm text-white/70">{p.text}</span>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="label mb-2">Category journal</div>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => {
              const d = state.feed.discovered.includes(c);
              const m = CATEGORY_META[c];
              return (
                <div key={c} className={`flex flex-col items-center rounded-xl border p-2 text-center text-[11px] ${d ? "" : "border-dashed opacity-50"}`} style={d ? { borderColor: m.color } : undefined} title={d ? m.label : "Undiscovered category"}>
                  <span className="text-2xl">{d ? m.emoji : "❔"}</span>
                  {d ? m.label : "???"}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <RouletteMini />
          <div className="card p-4">
            <p className="mb-3 text-sm text-white/75">There is a button. It is labelled very clearly. Please respect the label.</p>
            <DoNotClick />
          </div>
        </div>
      </div>
    </div>
  );
}
