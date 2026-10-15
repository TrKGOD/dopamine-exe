"use client";

import { useRef, useState } from "react";
import { useFx } from "@/client/fx";
import { useGame } from "@/client/game";
import { PetAvatar } from "@/components/PetAvatar";
import { PetCard } from "@/components/PetCard";
import { ShareCardButton } from "@/components/ShareCardButton";
import { RarityTag, SectionTitle } from "@/components/ui";
import { PERSONALITY_META, PET_RULES, PET_STAGES, RARITY_META } from "@/lib/game/config";
import { ITEMS, ITEM_LIST, MUTATION_COMBOS, findCombo } from "@/lib/game/items";
import { petStage } from "@/lib/game/selectors";
import { PERSONALITIES, SLOTS, type Slot } from "@/lib/game/types";

const SLOT_LABEL: Record<Slot, string> = { hat: "🎩 Hat", eyewear: "🕶️ Eyewear", aura: "✨ Aura", color: "🎨 Color" };

export default function PetLabPage() {
  const { state, act, pending } = useGame();
  const fx = useFx();
  const [name, setName] = useState("");
  const shareRef = useRef<HTMLDivElement>(null);
  if (!state) return null;
  const pet = state.pet;
  const stage = petStage(state);
  const combo = findCombo(pet.mutations);
  const ownedMutations = ITEM_LIST.filter((i) => i.kind === "mutation" && state.inventory[i.id]);

  return (
    <div>
      <SectionTitle kicker="genetics department (unlicensed)" title="PET LAB">
        <ShareCardButton
          target="card:pet"
          filename={`${pet.name}-dopamine.png`}
          label="Share evolution card"
          spec={() => ({
            kicker: "pet evolution card",
            title: pet.name,
            subtitle: `${PERSONALITY_META[pet.personality].name} · ${stage.name}`,
            lines: [`Pet level ${pet.level}`, combo ? `Mutation combo: ${combo.name}` : `${pet.formsSeen.length} forms discovered`, `Owner: ${state.displayName}`],
            accent: RARITY_META[stage.rarity].color,
            svg: shareRef.current?.querySelector("svg") ?? null,
          })}
        />
      </SectionTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card-hi p-5">
          <PetCard big />
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              const r = await act({ type: "renamePet", name: name.trim() });
              if (r.ok) setName("");
            }}
          >
            <label className="sr-only" htmlFor="pet-name">
              New pet name
            </label>
            <input id="pet-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder={`Rename ${pet.name}…`} className="flex-1 rounded-xl border border-line bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon" />
            <button className="btn-ghost" disabled={!name.trim()}>
              Rename
            </button>
          </form>
          <p className="mt-3 text-xs text-muted">
            Pets never die, never reset and never charge you money. Hunger drops slowly while you&apos;re away (min {PET_RULES.hungerFloor}%) — feeding them just makes them happy and grants pet XP. Well-fed pets (60%+) earn +10% pet XP.
          </p>
        </div>

        <div className="space-y-4">
          <section className="card p-4" aria-labelledby="slots-h">
            <h2 id="slots-h" className="label mb-3">
              Equipment
            </h2>
            <div className="space-y-3">
              {SLOTS.map((slot) => {
                const owned = ITEM_LIST.filter((i) => i.kind === slot && state.inventory[i.id]);
                const eq = pet.equipped[slot];
                return (
                  <div key={slot}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{SLOT_LABEL[slot]}</span>
                      {eq && (
                        <button className="text-xs text-muted underline hover:text-white" onClick={() => act({ type: "unequip", slot })}>
                          unequip
                        </button>
                      )}
                    </div>
                    {owned.length === 0 ? (
                      <p className="text-xs text-muted">None owned yet — spin the roulette or open capsules.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {owned.map((i) => (
                          <button
                            key={i.id}
                            onClick={() => {
                              fx.sfx("click");
                              void act({ type: "equip", itemId: i.id });
                            }}
                            aria-pressed={eq === i.id}
                            title={`${i.name} — ${i.description}`}
                            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition ${eq === i.id ? "bg-white/10" : "hover:bg-white/5"}`}
                            style={{ borderColor: eq === i.id ? RARITY_META[i.rarity].color : "#2a2540" }}
                          >
                            <span className="text-base">{i.emoji}</span>
                            {i.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-4" aria-labelledby="mut-h">
            <h2 id="mut-h" className="label mb-1">
              Mutations ({pet.mutations.length}/{PET_RULES.maxMutations} active)
            </h2>
            <p className="mb-3 text-xs text-muted">Activate two mutations to discover combos. Mutations drop from the roulette (1%) and the RARE MUTATION chaos event.</p>
            {ownedMutations.length === 0 ? (
              <p className="text-sm text-muted">No mutations yet. Your pet is disappointingly normal.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ownedMutations.map((m) => {
                  const on = pet.mutations.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      aria-pressed={on}
                      disabled={pending.has("toggleMutation:" + m.id)}
                      onClick={async () => {
                        const r = await act({ type: "toggleMutation", itemId: m.id });
                        if (r.ok) fx.sfx(on ? "click" : "rare");
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${on ? "bg-volt/20" : "hover:bg-white/5"}`}
                      style={{ borderColor: on ? "#a855ff" : "#2a2540" }}
                    >
                      <span className="text-xl">{m.emoji}</span>
                      {m.name}
                      <RarityTag rarity={m.rarity} />
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <div className="label mb-1 !text-sm">Combo journal</div>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {MUTATION_COMBOS.map((c) => {
                  const seen = pet.combosSeen.includes(c.id);
                  return (
                    <li key={c.id} className={`rounded-lg border px-2 py-1 ${combo?.id === c.id ? "border-hot text-hot" : "border-line"}`}>
                      {seen ? (
                        <>
                          <span className="font-semibold">{c.name}</span>
                          <span className="block text-xs text-muted">
                            {ITEMS[c.parts[0]].emoji} + {ITEMS[c.parts[1]].emoji} · {c.description}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">??? — undiscovered combo</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>
      </div>

      <section className="card mt-6 p-4" aria-labelledby="pers-h">
        <h2 id="pers-h" className="label mb-3">
          Personality
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PERSONALITIES.map((p) => {
            const m = PERSONALITY_META[p];
            const locked = state.level < m.unlockLevel;
            const current = pet.personality === p;
            return (
              <button
                key={p}
                disabled={locked || current}
                onClick={() => act({ type: "setPersonality", personality: p })}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center text-xs transition disabled:cursor-default ${current ? "border-neon bg-neon/10" : locked ? "border-line opacity-50" : "border-line hover:border-white/40"}`}
                aria-pressed={current}
              >
                <div className={locked ? "grayscale" : ""}>
                  <PetAvatar personality={p} level={pet.level} equipped={{}} mutations={[]} size={64} animate={false} />
                </div>
                <span className="font-semibold">{m.name}</span>
                <span className="text-muted">{locked ? `🔒 Player LV ${m.unlockLevel}` : current ? "current" : m.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card mt-6 p-4" aria-labelledby="evo-h">
        <h2 id="evo-h" className="label mb-3">
          Evolution path
        </h2>
        <ol className="grid gap-2 sm:grid-cols-5">
          {PET_STAGES.map((s) => {
            const reached = pet.level >= s.minLevel;
            return (
              <li key={s.stage} className={`rounded-xl border p-3 text-center ${s.stage === stage.stage ? "border-acid bg-acid/10" : reached ? "border-neon/40" : "border-line opacity-60"}`}>
                <div className="font-pixel text-lg text-muted">STAGE {s.stage}</div>
                <div className="font-display text-sm text-white">{s.name}</div>
                <div className="text-xs text-muted">Pet LV {s.minLevel}+</div>
                <RarityTag rarity={s.rarity} className="mt-1" />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card mt-6 p-4" aria-labelledby="journal-h">
        <h2 id="journal-h" className="label mb-1">
          Pet journal · forms discovered {pet.formsSeen.length}/{PERSONALITIES.length * PET_STAGES.length}
        </h2>
        <p className="mb-3 text-xs text-muted">A form is discovered when your pet is a given personality at a given stage. Switch personalities after evolving to fill the journal.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-center text-xs">
            <thead>
              <tr>
                <th className="p-1 text-left font-normal text-muted">Personality</th>
                {PET_STAGES.map((s) => (
                  <th key={s.stage} className="p-1 font-normal text-muted">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERSONALITIES.map((p) => (
                <tr key={p} className="border-t border-white/5">
                  <td className="p-1 text-left">
                    {PERSONALITY_META[p].emoji} {PERSONALITY_META[p].name}
                  </td>
                  {PET_STAGES.map((s) => {
                    const seen = pet.formsSeen.includes(`${p}:${s.stage}`);
                    return (
                      <td key={s.stage} className="p-1">
                        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-lg border ${seen ? "" : "border-dashed border-line"}`} style={seen ? { borderColor: RARITY_META[s.rarity].color } : undefined} title={seen ? `${PERSONALITY_META[p].name} — ${s.name}` : "Undiscovered"}>
                          {seen ? <PetAvatar personality={p} level={s.minLevel} equipped={{}} mutations={[]} size={48} animate={false} /> : <span className="text-lg text-muted">?</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* off-screen static render used for the share card */}
      <div ref={shareRef} aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
        <PetAvatar {...pet} size={600} animate={false} />
      </div>
    </div>
  );
}
