"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { useFx } from "@/client/fx";
import { useGame, useNow } from "@/client/game";
import { PERSONALITY_META, PET_RULES } from "@/lib/game/config";
import { ITEMS, findCombo } from "@/lib/game/items";
import { petLevelInfo, petStage } from "@/lib/game/selectors";
import { PetAvatar } from "./PetAvatar";
import { Bar } from "./ui";

export function moodLabel(m: number) {
  if (m >= 85) return "Unhinged (happy)";
  if (m >= 65) return "Vibing";
  if (m >= 45) return "Mid";
  return "Needs attention";
}

export function hungerLabel(h: number) {
  if (h >= 85) return "Stuffed";
  if (h >= 60) return "Well fed (+10% pet XP)";
  if (h >= 35) return "Peckish";
  return "Hungry";
}

/** Shared pet widget with feeding + patting. `big` is used on the Pet Lab page. */
export function PetCard({ big = false }: { big?: boolean }) {
  const { state, act, pending } = useGame();
  const fx = useFx();
  const now = useNow();
  const [react, setReact] = useState(0);
  const [flying, setFlying] = useState<{ id: number; emoji: string } | null>(null);
  const [hearts, setHearts] = useState<number[]>([]);
  const [foodOpen, setFoodOpen] = useState(false);
  const petRef = useRef<HTMLDivElement>(null);
  if (!state) return null;

  const pet = state.pet;
  const info = petLevelInfo(state);
  const stage = petStage(state);
  const meta = PERSONALITY_META[pet.personality];
  const foods = Object.values(state.inventory).filter((e) => ITEMS[e.itemId]?.kind === "food");
  const combo = findCombo(pet.mutations);
  const patReady = now - pet.lastPatAt >= PET_RULES.patCooldownMs;

  const feed = async (itemId: string) => {
    setFoodOpen(false);
    setFlying({ id: Date.now(), emoji: ITEMS[itemId].emoji });
    fx.sfx("feed");
    const r = await act({ type: "feedPet", itemId });
    if (r.ok) {
      setReact((k) => k + 1);
      fx.burstAt(petRef.current, ["#e8ff3a", "#39ff88", "#ff2e97"], 35);
    }
  };

  const pat = async () => {
    setHearts((h) => [...h.slice(-5), Date.now()]);
    fx.sfx("pat");
    setReact((k) => k + 1);
    await act({ type: "patPet" });
  };

  return (
    <div className={big ? "" : "card p-4"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="label !text-sm">
            {meta.emoji} {meta.name}
          </div>
          <div className="truncate font-display text-xl text-white">{pet.name}</div>
          <div className="text-xs text-muted">
            Stage {stage.stage}: <span className="text-acid">{stage.name}</span>
            {combo && <span className="ml-1 text-hot">· {combo.name}</span>}
          </div>
        </div>
        <div className="rounded-lg border border-acid/40 bg-acid/10 px-2 py-1 text-center font-display text-acid">
          <div className="font-pixel text-xs leading-none">LVL</div>
          <div className="text-xl leading-none">{pet.level}</div>
        </div>
      </div>

      <div ref={petRef} className={`relative mx-auto my-2 flex items-center justify-center ${big ? "h-72" : "h-48"}`}>
        <div className="pointer-events-none absolute inset-x-0 -top-1 z-10 flex justify-center">
          <AnimatePresence>
            {fx.speech && (
              <motion.div
                key={fx.speech.id}
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative max-w-[90%] rounded-2xl border border-white/20 bg-white px-3 py-1.5 text-center text-sm font-semibold text-black shadow-lg"
                role="status"
              >
                {fx.speech.text}
                <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={pat} className="rounded-full focus-visible:outline-acid" aria-label={`Pat ${pet.name}${patReady ? "" : " (pet XP on cooldown)"}`} title="Click to pat">
          <PetAvatar {...pet} size={big ? 260 : 170} reactKey={react} title={`${pet.name}, ${stage.name}`} />
        </button>
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.span
              key={h}
              aria-hidden
              className="pointer-events-none absolute text-2xl"
              initial={{ opacity: 1, y: 0, x: (h % 60) - 30 }}
              animate={{ opacity: 0, y: -90 }}
              transition={{ duration: 1 }}
              onAnimationComplete={() => setHearts((x) => x.filter((v) => v !== h))}
            >
              💖
            </motion.span>
          ))}
          {flying && (
            <motion.span
              key={flying.id}
              aria-hidden
              className="pointer-events-none absolute text-4xl"
              initial={{ y: 120, scale: 1.4, opacity: 1 }}
              animate={{ y: 10, scale: 0.4, opacity: 0, rotate: 360 }}
              transition={{ duration: 0.6, ease: "easeIn" }}
              onAnimationComplete={() => setFlying(null)}
            >
              {flying.emoji}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <div className="mb-1 flex justify-between">
            <span className="text-muted">Pet XP</span>
            <span className="font-mono text-acid">
              {info.into}/{info.needed}
            </span>
          </div>
          <Bar value={info.into} max={info.needed} color="#e8ff3a" label="Pet XP" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex justify-between">
              <span className="text-muted">Hunger</span>
              <span className="text-white/80">{hungerLabel(pet.hunger)}</span>
            </div>
            <Bar value={pet.hunger} max={100} color="#ffb02e" label="Hunger" />
          </div>
          <div>
            <div className="mb-1 flex justify-between">
              <span className="text-muted">Mood</span>
              <span className="text-white/80">{moodLabel(pet.mood)}</span>
            </div>
            <Bar value={pet.mood} max={100} color="#ff2e97" label="Mood" />
          </div>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <button className="btn-neon" onClick={() => setFoodOpen((o) => !o)} aria-expanded={foodOpen} disabled={pending.has("feedPet")}>
          🍗 Feed
        </button>
        <button className="btn-ghost" onClick={pat}>
          💖 Pat {patReady ? "" : "(cd)"}
        </button>
        <AnimatePresence>
          {foodOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl border border-line bg-panel2 p-2 shadow-xl"
              role="menu"
              aria-label="Choose food"
            >
              {foods.length === 0 ? (
                <p className="p-2 text-center text-sm text-muted">No food! Buy snacks in Inventory → Shop, or earn them from quests & the roulette.</p>
              ) : (
                <div className="grid gap-1">
                  {foods.map((f) => {
                    const def = ITEMS[f.itemId];
                    return (
                      <button key={f.itemId} role="menuitem" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10" onClick={() => feed(f.itemId)}>
                        <span className="text-xl">{def.emoji}</span>
                        <span className="flex-1">{def.name}</span>
                        <span className="font-mono text-xs text-acid">+{def.food?.petXp} PXP</span>
                        <span className="chip">×{f.qty}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
