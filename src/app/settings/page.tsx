"use client";

import { useState, type ReactNode } from "react";
import { useFx } from "@/client/fx";
import { useGame } from "@/client/game";
import { useSettings, type Settings } from "@/client/settings";
import { Modal, SectionTitle } from "@/components/ui";
import { CHAOS_EVENTS, CHAOS_ROLL_CHANCE, CHAOS_ROLL_INTERVAL_MS, type ChaosId } from "@/lib/game/config";
import { chances } from "@/lib/game/rng";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 py-3 first:border-t-0">
      <div>
        <div className="font-semibold">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-7 w-12 rounded-full border transition ${on ? "border-neon bg-neon/30" : "border-line bg-white/5"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${on ? "left-6 bg-neon" : "left-0.5 bg-white/60"}`} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl border border-line p-1">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={`rounded-lg px-3 py-1 text-xs font-semibold ${value === o.v ? "bg-neon text-black" : "text-white/80 hover:bg-white/5"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, update, reducedMotion } = useSettings();
  const { state, setState } = useGame();
  const fx = useFx();
  const [resetOpen, setResetOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  if (!state) return null;
  const ids = Object.keys(CHAOS_EVENTS) as ChaosId[];
  const pct = chances(ids, (id) => CHAOS_EVENTS[id].weight);

  return (
    <div>
      <SectionTitle kicker="calibrate the chaos" title="SETTINGS" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4" aria-label="Audio and visuals">
          <h2 className="label mb-2">Audio & visuals</h2>
          <Row label="Sound effects" hint="Synthesised in your browser. Nothing ever autoplays.">
            <Toggle on={settings.sound} onChange={(v) => update({ sound: v })} label="Sound effects" />
          </Row>
          <Row label="Volume">
            <input type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => update({ volume: Number(e.target.value) })} onMouseUp={() => fx.sfx("coin")} aria-label="Volume" className="w-40 accent-[#39ff88]" />
          </Row>
          <Row label="Motion" hint={`Currently ${reducedMotion ? "reduced" : "full"}. "System" follows your OS setting.`}>
            <Segmented<Settings["motion"]> label="Motion" value={settings.motion} onChange={(v) => update({ motion: v })} options={[{ v: "system", l: "System" }, { v: "reduced", l: "Reduced" }, { v: "full", l: "Full" }]} />
          </Row>
          <Row label="Visual intensity" hint="Particles, glitch effects and event filters.">
            <Segmented<Settings["intensity"]> label="Visual intensity" value={settings.intensity} onChange={(v) => update({ intensity: v })} options={[{ v: "low", l: "Low" }, { v: "medium", l: "Medium" }, { v: "high", l: "High" }]} />
          </Row>
          <Row label="CRT scanlines">
            <Toggle on={settings.crt} onChange={(v) => update({ crt: v })} label="CRT scanlines" />
          </Row>
          <Row label="Random chaos events" hint={`Every ${CHAOS_ROLL_INTERVAL_MS / 1000}s there's a ${Math.round(CHAOS_ROLL_CHANCE * 100)}% chance. The DO NOT CLICK button still works when off.`}>
            <Toggle on={settings.chaos} onChange={(v) => update({ chaos: v })} label="Random chaos events" />
          </Row>
        </section>

        <section className="card p-4" aria-label="Chaos event log">
          <h2 className="label mb-2">Chaos event log</h2>
          {state.events.log.length === 0 ? (
            <p className="text-sm text-muted">No chaos yet. Suspiciously calm.</p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
              {state.events.log.map((l) => (
                <li key={l.at} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="flex-1 text-hot">{l.name}</span>
                  <span className="text-xs text-white/70">{l.outcome}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="label mb-1 mt-4 !text-sm">Event odds (when one triggers)</h3>
          <ul className="grid grid-cols-2 gap-1 text-xs">
            {ids.map((id, i) => (
              <li key={id} className="flex justify-between gap-2">
                <span>{CHAOS_EVENTS[id].name}</span>
                <span className="font-mono text-acid">{pct[i].toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4 lg:col-span-2" aria-label="Data and privacy">
          <h2 className="label mb-2">Data & privacy</h2>
          <p className="text-sm text-white/80">
            Your progress is stored on this server under an anonymous, signed cookie — no email, no password, no tracking. Public leaderboards only show your display name, level and cosmetics. Comments you write are kept on this device.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="btn-ghost"
              onClick={() => {
                const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "dopamine-save.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
              }}
            >
              ⬇ Export my data (JSON)
            </button>
            <button className="btn-ghost !border-hot/60 !text-hot" onClick={() => setResetOpen(true)}>
              ☢ Reset progress
            </button>
          </div>
        </section>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset everything?">
        <p className="text-sm text-white/80">This deletes your pet, items, quests and stats on this server. It cannot be undone. Type <b className="text-hot">DELETE MY BRAINROT</b> to confirm.</p>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-3 w-full rounded-xl border border-line bg-black/40 px-3 py-2 text-sm outline-none focus:border-hot" aria-label="Confirmation phrase" />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setResetOpen(false)}>
            Cancel
          </button>
          <button
            className="btn-hot"
            disabled={confirm !== "DELETE MY BRAINROT"}
            onClick={async () => {
              const res = await fetch("/api/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });
              const data = await res.json();
              if (data.ok) {
                setState(data.state);
                setResetOpen(false);
                setConfirm("");
              } else fx.toast("Reset failed.", "bad");
            }}
          >
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}
