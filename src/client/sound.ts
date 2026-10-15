"use client";

/**
 * All audio is synthesised with WebAudio — no files, no autoplay.
 * The context is only created after a user gesture triggers a sound.
 */

export type Sfx = "zap" | "click" | "coin" | "xp" | "level" | "evolve" | "tick" | "reveal" | "rare" | "mythic" | "error" | "chaos" | "feed" | "pat" | "open" | "achievement";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.5;

export function configureSound(on: boolean, vol: number) {
  enabled = on;
  volume = vol;
  if (master) master.gain.value = vol * 0.6;
  if (!on) stopBeat();
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "square", gain = 0.15, slideTo?: number) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(start: number, dur: number, gain = 0.1, hp = 4000) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + start;
  const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export function play(s: Sfx) {
  if (!enabled) return;
  switch (s) {
    case "zap":
      tone(880 + Math.random() * 220, 0, 0.04, "square", 0.04, 1600);
      break;
    case "click":
      tone(660, 0, 0.05, "square", 0.06);
      break;
    case "tick":
      tone(1400, 0, 0.025, "square", 0.05);
      break;
    case "coin":
      tone(988, 0, 0.07, "square", 0.08);
      tone(1319, 0.07, 0.16, "square", 0.08);
      break;
    case "xp":
      tone(523, 0, 0.06, "triangle", 0.1);
      tone(784, 0.05, 0.1, "triangle", 0.1);
      break;
    case "feed":
      noise(0, 0.08, 0.15, 1500);
      noise(0.12, 0.08, 0.15, 1500);
      tone(330, 0.24, 0.15, "triangle", 0.12, 660);
      break;
    case "pat":
      tone(440, 0, 0.12, "sine", 0.12, 520);
      break;
    case "open":
      tone(200, 0, 0.35, "sawtooth", 0.08, 900);
      noise(0.3, 0.2, 0.1);
      break;
    case "level":
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.18, "square", 0.09));
      break;
    case "evolve":
      tone(110, 0, 1.2, "sawtooth", 0.07, 880);
      [659, 784, 988, 1319].forEach((f, i) => tone(f, 1 + i * 0.1, 0.3, "triangle", 0.1));
      break;
    case "reveal":
      tone(392, 0, 0.12, "triangle", 0.1);
      tone(523, 0.1, 0.2, "triangle", 0.1);
      break;
    case "rare":
      [523, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.25, "triangle", 0.12));
      noise(0, 0.4, 0.05, 6000);
      break;
    case "mythic":
      [262, 392, 523, 784, 1047, 1568].forEach((f, i) => tone(f, i * 0.09, 0.5, "sawtooth", 0.06));
      noise(0, 0.9, 0.06, 7000);
      break;
    case "achievement":
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.2, "square", 0.07));
      break;
    case "error":
      tone(160, 0, 0.18, "sawtooth", 0.08, 110);
      break;
    case "chaos":
      [0, 0.25, 0.5].forEach((t) => tone(880, t, 0.18, "square", 0.06, 440));
      break;
  }
}

// ── Per-post procedural soundtrack (only plays when the user unmutes) ──────
let beatTimer: ReturnType<typeof setInterval> | null = null;

export function startBeat(seed: number) {
  stopBeat();
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const scales = [
    [220, 261.6, 293.7, 329.6, 392],
    [196, 233.1, 261.6, 311.1, 349.2],
    [174.6, 207.7, 233.1, 261.6, 311.1],
  ];
  const scale = scales[seed % scales.length];
  const bpm = 92 + (seed * 7) % 48;
  const stepMs = 60_000 / bpm / 2;
  let step = 0;
  beatTimer = setInterval(() => {
    const s = step % 16;
    if (s % 4 === 0) tone(90, 0, 0.18, "sine", 0.22, 40);
    if (s % 2 === 1) noise(0, 0.04, 0.035, 8000);
    if ((s * (seed + 3)) % 5 === 0) tone(scale[(s + seed) % scale.length] * 2, 0, 0.16, "triangle", 0.05);
    if (s === 0 || s === 8) tone(scale[seed % scale.length] / 2, 0, 0.5, "sawtooth", 0.03);
    step++;
  }, stepMs);
}

export function stopBeat() {
  if (beatTimer) clearInterval(beatTimer);
  beatTimer = null;
}
