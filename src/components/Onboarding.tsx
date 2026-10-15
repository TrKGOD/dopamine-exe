"use client";

import { STATIC_MODE } from "@/client/backend";
import { motion } from "framer-motion";
import { useState } from "react";
import { useFx } from "@/client/fx";
import { useGame } from "@/client/game";
import { PERSONALITY_META, STARTER_PERSONALITIES } from "@/lib/game/config";
import type { Personality } from "@/lib/game/types";
import { PetAvatar } from "./PetAvatar";

const NAMES = ["Blorbo", "Gerald", "Chompy", "Sir Nibbles", "Kevin", "Mr. Crumbs", "Bingus", "Dave (Evil)"];

export function Onboarding() {
  const { act } = useGame();
  const fx = useFx();
  const [personality, setPersonality] = useState<Personality>("gremlin");
  const [name, setName] = useState("Blorbo");
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length >= 1 && name.trim().length <= 20;

  return (
    <div className="app-bg flex h-[100dvh] items-center justify-center overflow-y-auto p-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="card-hi w-full max-w-2xl p-6 md:p-8">
        <p className="font-pixel text-xl text-neon">&gt; C:\INTERNET\DOPAMINE.EXE /hatch</p>
        <h1 className="glitch h-display mt-2 text-4xl text-white md:text-6xl" data-text="HATCH YOUR GREMLIN">
          HATCH YOUR GREMLIN
        </h1>
        <p className="mt-2 text-white/70">
          Welcome to the most chaotic corner of the internet. Pick a starter creature. It will follow you through memes, roulette spins and questionable life choices.
          More personalities unlock as you level up.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Starter personality">
          {STARTER_PERSONALITIES.map((p) => {
            const m = PERSONALITY_META[p];
            const active = p === personality;
            return (
              <button
                key={p}
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setPersonality(p);
                  fx.sfx("click");
                }}
                className={`card flex flex-col items-center gap-1 p-3 text-center transition ${active ? "border-neon shadow-neon" : "hover:border-white/30"}`}
              >
                <PetAvatar personality={p} level={1} equipped={{}} mutations={[]} mood={80} size={110} animate={active} />
                <span className="font-display text-sm text-white">{m.name}</span>
                <span className="text-xs text-muted">{m.blurb}</span>
              </button>
            );
          })}
        </div>

        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid || busy) return;
            setBusy(true);
            fx.sfx("evolve");
            const r = await act({ type: "onboard", name: name.trim(), personality });
            if (r.ok) fx.burst(undefined, undefined, undefined, 120);
            setBusy(false);
          }}
        >
          <label className="flex-1">
            <span className="label">Name your creature</span>
            <div className="mt-1 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                className="w-full rounded-xl border border-line bg-black/40 px-3 py-2 text-white outline-none focus:border-neon"
                aria-invalid={!valid}
              />
              <button type="button" className="btn-ghost shrink-0" onClick={() => setName(NAMES[Math.floor(Math.random() * NAMES.length)])} aria-label="Random name">
                🎲
              </button>
            </div>
          </label>
          <button className="btn-neon h-11 text-base" disabled={!valid || busy}>
            {busy ? "HATCHING…" : "HATCH IT →"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">
          All rewards are fictional and non-redeemable. No real money, ever. {STATIC_MODE ? "Progress is saved only in this browser (localStorage)." : "Progress is saved on this server and tied to an anonymous cookie in this browser."}
        </p>
      </motion.div>
    </div>
  );
}
