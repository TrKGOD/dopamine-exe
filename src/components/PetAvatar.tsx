"use client";

import { motion, useAnimationControls } from "framer-motion";
import { memo, useEffect, useId } from "react";
import { PERSONALITY_META, stageForLevel } from "@/lib/game/config";
import { getItem } from "@/lib/game/items";
import type { Personality, Slot } from "@/lib/game/types";

export interface PetLook {
  personality: Personality;
  level: number;
  equipped: Partial<Record<Slot, string | undefined>>;
  mutations: string[];
  mood?: number;
}

interface Props extends PetLook {
  size?: number;
  animate?: boolean;
  /** change this value to trigger a happy squash reaction */
  reactKey?: number;
  className?: string;
  title?: string;
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const PetAvatar = memo(function PetAvatar({ personality, level, equipped, mutations, mood = 70, size = 200, animate = true, reactKey, className, title }: Props) {
  const uid = useId().replace(/:/g, "");
  const controls = useAnimationControls();
  const stage = stageForLevel(level).stage;
  const colorItem = equipped.color ? getItem(equipped.color) : undefined;
  const base = colorItem?.color ?? PERSONALITY_META[personality].color;
  const rainbow = equipped.color === "color_glitch";
  const chrome = equipped.color === "color_chrome";
  const dark = shade(base, -60);
  const light = shade(base, 50);
  const has = (m: string) => mutations.includes(m);
  const scale = [0.72, 0.8, 0.9, 1, 1.06][stage - 1];

  useEffect(() => {
    if (reactKey === undefined || reactKey === 0) return;
    void controls.start({ scaleY: [1, 0.8, 1.12, 0.96, 1], scaleX: [1, 1.15, 0.92, 1.03, 1], transition: { duration: 0.6 } });
  }, [reactKey, controls]);

  const fill = chrome ? `url(#chrome-${uid})` : `url(#body-${uid})`;
  const eyeY = personality === "entity" ? 100 : 92;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title ?? `${PERSONALITY_META[personality].name} pet`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id={`body-${uid}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={light} />
          <stop offset="60%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <linearGradient id={`chrome-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#9aa7bd" />
          <stop offset="50%" stopColor="#f2f6ff" />
          <stop offset="70%" stopColor="#6e7a91" />
          <stop offset="100%" stopColor="#dfe8f7" />
        </linearGradient>
        <radialGradient id={`void-${uid}`}>
          <stop offset="0%" stopColor="#000" />
          <stop offset="70%" stopColor="#2a0a4a" />
          <stop offset="100%" stopColor="#a855ff" stopOpacity="0" />
        </radialGradient>
        <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`pixel-${uid}`} x="0" y="0" width="100%" height="100%">
          <feFlood x="3" y="3" height="2" width="2" />
          <feComposite width="8" height="8" />
          <feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
          <feMorphology operator="dilate" radius="4" />
        </filter>
      </defs>

      {/* ── Aura (behind) ───────────────────────────── */}
      <Aura id={equipped.aura} uid={uid} animate={animate} />

      <g style={{ transformOrigin: "100px 170px" }} className={animate ? (personality === "entity" || stage === 5 ? "animate-floaty" : "animate-bob") : undefined}>
        <motion.g animate={controls} style={{ transformOrigin: "100px 170px" }}>
          <g
            transform={`translate(100 170) scale(${scale}) translate(-100 -170)`}
            opacity={has("mut_ghost") ? 0.6 : 1}
            filter={has("mut_pixel") ? `url(#pixel-${uid})` : undefined}
            style={rainbow && animate ? { animation: "overload-hue 4s linear infinite" } : undefined}
          >
            {/* crystal spikes behind body */}
            {has("mut_crystal") && (
              <g filter={`url(#glow-${uid})`}>
                {[-50, -25, 0, 25, 50].map((dx, i) => (
                  <polygon key={i} points={`${100 + dx - 8},${70 + Math.abs(dx) * 0.4} ${100 + dx},${30 + Math.abs(dx) * 0.5} ${100 + dx + 8},${70 + Math.abs(dx) * 0.4}`} fill="#7ff6ff" stroke="#e0ffff" strokeWidth="1.5" opacity="0.9" />
                ))}
              </g>
            )}
            {/* stage 5 wings */}
            {stage >= 5 && (
              <g opacity="0.85" fill={light} stroke={dark} strokeWidth="2">
                <path d="M55 110 C 10 70, 0 130, 30 140 C 20 120, 40 115, 55 125 Z" />
                <path d="M145 110 C 190 70, 200 130, 170 140 C 180 120, 160 115, 145 125 Z" />
              </g>
            )}

            <Body personality={personality} fill={fill} dark={dark} light={light} stage={stage} />

            {/* stage 4+ horns */}
            {stage >= 4 && personality !== "entity" && (
              <g fill="#ffe7a8" stroke="#5a3b00" strokeWidth="2">
                <path d="M72 58 Q 62 30 78 22 Q 74 40 84 54 Z" />
                <path d="M128 58 Q 138 30 122 22 Q 126 40 116 54 Z" />
              </g>
            )}
            {/* stage 3+ belly spots */}
            {stage >= 3 && personality !== "entity" && (
              <g fill={light} opacity="0.55">
                <circle cx="88" cy="140" r="5" />
                <circle cx="108" cy="148" r="4" />
                <circle cx="116" cy="134" r="3" />
              </g>
            )}

            <Face personality={personality} mood={mood} eyeY={eyeY} animate={animate} />

            {has("mut_thirdeye") && (
              <g>
                <ellipse cx="100" cy={eyeY - 26} rx="9" ry="6" fill="#fff" stroke="#000" strokeWidth="2" />
                <circle cx="100" cy={eyeY - 26} r="3.5" fill="#a855ff" />
              </g>
            )}
            {has("mut_laser") && (
              <g filter={`url(#glow-${uid})`} opacity="0.9">
                <line x1="84" y1={eyeY} x2="-40" y2={eyeY + 40} stroke="#ff2020" strokeWidth="5" strokeLinecap="round" />
                <line x1="116" y1={eyeY} x2="240" y2={eyeY + 40} stroke="#ff2020" strokeWidth="5" strokeLinecap="round" />
                <circle cx="84" cy={eyeY} r="7" fill="#ff4040" />
                <circle cx="116" cy={eyeY} r="7" fill="#ff4040" />
              </g>
            )}

            <Eyewear id={equipped.eyewear} eyeY={eyeY} />
            <Hat id={equipped.hat} personality={personality} uid={uid} />

            {/* stage 1: egg shell */}
            {stage === 1 && (
              <path d="M52 150 L 62 140 L 72 152 L 84 138 L 96 152 L 108 138 L 120 152 L 132 140 L 142 152 L 150 146 Q 152 185 100 188 Q 48 185 52 150 Z" fill="#f4eedc" stroke="#b9ae8c" strokeWidth="2.5" />
            )}
          </g>
          {has("mut_glitch") && animate && (
            <g opacity="0.5" style={{ mixBlendMode: "screen" }} className="animate-glitch">
              <rect x="40" y="80" width="120" height="6" fill="#ff2e97" />
              <rect x="50" y="130" width="100" height="4" fill="#2ef2ff" />
            </g>
          )}
        </motion.g>
      </g>
    </svg>
  );
});

function Body({ personality, fill, dark, light, stage }: { personality: Personality; fill: string; dark: string; light: string; stage: number }) {
  const stroke = { stroke: dark, strokeWidth: 3 };
  switch (personality) {
    case "gremlin":
      return (
        <g>
          <path d="M58 82 L 14 52 L 40 100 Z" fill={fill} {...stroke} />
          <path d="M142 82 L 186 52 L 160 100 Z" fill={fill} {...stroke} />
          <path d="M30 64 L 46 92" stroke={light} strokeWidth="3" />
          <ellipse cx="100" cy="118" rx="58" ry="56" fill={fill} {...stroke} />
          <path d="M80 172 l -6 12 M120 172 l 6 12" stroke={dark} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case "sigma":
    case "corporate":
      return (
        <g>
          <path d="M150 150 C 190 150, 190 110, 175 100" stroke="#f19aa8" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="62" cy="62" r="20" fill={fill} {...stroke} />
          <circle cx="62" cy="62" r="10" fill="#f6b6c1" />
          <circle cx="138" cy="62" r="20" fill={fill} {...stroke} />
          <circle cx="138" cy="62" r="10" fill="#f6b6c1" />
          <path d="M44 120 Q 44 64 100 64 Q 156 64 156 120 Q 156 178 100 178 Q 44 178 44 120 Z" fill={fill} {...stroke} />
          {personality === "sigma" && <path d="M70 128 Q 100 150 130 128 L 126 140 Q 100 160 74 140 Z" fill={dark} opacity="0.35" />}
          {personality === "corporate" && (
            <g>
              <path d="M94 134 L 106 134 L 112 170 L 100 180 L 88 170 Z" fill="#ff2e97" stroke="#7a0e44" strokeWidth="2" />
              <path d="M92 128 L 108 128 L 104 138 L 96 138 Z" fill="#c4106a" />
              <rect x="120" y="140" width="18" height="24" rx="3" fill="#fff" stroke="#444" strokeWidth="1.5" />
              <rect x="123" y="145" width="12" height="4" fill="#4f7cff" />
              <path d="M70 120 L 120 140" stroke="#4f7cff" strokeWidth="2" />
            </g>
          )}
          <path d="M80 176 l -6 10 M120 176 l 6 10" stroke={dark} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case "goblin":
      return (
        <g>
          <path d="M56 96 Q 10 90 4 120 Q 30 108 56 112 Z" fill={fill} {...stroke} />
          <path d="M144 96 Q 190 90 196 120 Q 170 108 144 112 Z" fill={fill} {...stroke} />
          <path d="M50 124 Q 50 66 100 66 Q 150 66 150 124 Q 150 178 100 178 Q 50 178 50 124 Z" fill={fill} {...stroke} />
          <path d="M100 96 Q 120 112 104 122 Q 98 118 96 112 Z" fill={dark} opacity="0.7" />
          <g transform="translate(140 150)">
            <path d="M0 0 Q -14 22 4 28 L 26 28 Q 42 22 28 0 Z" fill="#c9a04a" stroke="#6b4e10" strokeWidth="2" />
            <text x="14" y="22" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#5a3b00">$</text>
          </g>
        </g>
      );
    case "capybara":
      return (
        <g>
          <circle cx="62" cy="70" r="10" fill={fill} {...stroke} />
          <circle cx="138" cy="70" r="10" fill={fill} {...stroke} />
          <rect x="34" y="66" width="132" height="116" rx="52" fill={fill} {...stroke} />
          <rect x="66" y="96" width="68" height="44" rx="20" fill={dark} opacity="0.35" />
          <ellipse cx="90" cy="112" rx="4" ry="6" fill="#2b1a0e" />
          <ellipse cx="110" cy="112" rx="4" ry="6" fill="#2b1a0e" />
          <g fill="#e8ff3a">
            <circle cx="30" cy="60" r="2.5" />
            <circle cx="172" cy="44" r="2" />
            <circle cx="180" cy="120" r="2.5" />
            <path d="M24 130 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 z" />
          </g>
        </g>
      );
    case "radcat":
      return (
        <g>
          <path d="M52 92 L 50 40 L 86 68 Z" fill={fill} {...stroke} />
          <path d="M148 92 L 150 40 L 114 68 Z" fill={fill} {...stroke} />
          <path d="M56 60 L 74 72" stroke="#ff9ad5" strokeWidth="4" />
          <path d="M144 60 L 126 72" stroke="#ff9ad5" strokeWidth="4" />
          <ellipse cx="100" cy="122" rx="56" ry="56" fill={fill} {...stroke} />
          <g stroke="#39ff88" strokeWidth="4" opacity="0.85" strokeLinecap="round">
            <path d="M58 110 L 74 114" />
            <path d="M56 126 L 72 128" />
            <path d="M142 110 L 126 114" />
            <path d="M144 126 L 128 128" />
          </g>
          <g transform="translate(100 150)">
            <circle r="13" fill="#111" />
            {[0, 120, 240].map((r) => (
              <path key={r} transform={`rotate(${r})`} d="M0 0 L -6 -11 A 12 12 0 0 1 6 -11 Z" fill="#e8ff3a" />
            ))}
            <circle r="3" fill="#e8ff3a" />
          </g>
          <path d="M150 160 C 190 160, 180 110, 196 100" stroke={dark} strokeWidth="8" fill="none" strokeLinecap="round" />
        </g>
      );
    case "entity":
      return (
        <g>
          <line x1="86" y1="44" x2="70" y2="18" stroke="#ccc" strokeWidth="3" />
          <line x1="114" y1="44" x2="132" y2="18" stroke="#ccc" strokeWidth="3" />
          <circle cx="70" cy="18" r="4" fill="#ff2e97" />
          <circle cx="132" cy="18" r="4" fill="#2ef2ff" />
          <path d="M40 120 Q 6 90 14 70 Q 30 96 46 100 Z" fill="#fff" opacity="0.8" />
          <path d="M160 120 Q 194 90 186 70 Q 170 96 154 100 Z" fill="#fff" opacity="0.8" />
          <rect x="36" y="44" width="128" height="112" rx="16" fill="#d8d2c0" stroke="#6f6a5a" strokeWidth="3" />
          <rect x="48" y="56" width="104" height="80" rx="10" fill="#0b0f0b" stroke={fill} strokeWidth="3" />
          <rect x="48" y="56" width="104" height="80" rx="10" fill={fill} opacity="0.18" />
          <rect x="78" y="156" width="44" height="16" fill="#bdb6a3" stroke="#6f6a5a" strokeWidth="2" />
          <rect x="60" y="170" width="80" height="10" rx="4" fill="#a8a190" />
          <circle cx="146" cy="146" r="3" fill={stage > 2 ? "#39ff88" : "#ff2e97"} />
        </g>
      );
  }
}

function Face({ personality, mood, eyeY, animate }: { personality: Personality; mood: number; eyeY: number; animate: boolean }) {
  const happy = mood >= 75;
  const sad = mood < 40;
  const ink = personality === "entity" ? "#39ff88" : "#111";
  const cheek = personality === "entity" ? "transparent" : "#ff7aa8";
  const eyes = happy ? (
    <g fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round">
      <path d={`M76 ${eyeY + 2} Q 84 ${eyeY - 8} 92 ${eyeY + 2}`} />
      <path d={`M108 ${eyeY + 2} Q 116 ${eyeY - 8} 124 ${eyeY + 2}`} />
    </g>
  ) : (
    <g className={animate ? "animate-blink" : undefined} style={{ transformOrigin: `100px ${eyeY}px` }}>
      {personality === "capybara" ? (
        <g stroke={ink} strokeWidth="4" strokeLinecap="round">
          <line x1="76" y1={eyeY} x2="90" y2={eyeY} />
          <line x1="110" y1={eyeY} x2="124" y2={eyeY} />
        </g>
      ) : (
        <g>
          <circle cx="84" cy={eyeY} r="8" fill={personality === "entity" ? "none" : "#fff"} />
          <circle cx="116" cy={eyeY} r="8" fill={personality === "entity" ? "none" : "#fff"} />
          <circle cx="85" cy={eyeY + 1} r="4.5" fill={ink} />
          <circle cx="117" cy={eyeY + 1} r="4.5" fill={ink} />
          <circle cx="86.5" cy={eyeY - 1} r="1.5" fill="#fff" />
          <circle cx="118.5" cy={eyeY - 1} r="1.5" fill="#fff" />
        </g>
      )}
      {sad && (
        <g stroke={ink} strokeWidth="3" strokeLinecap="round">
          <line x1="74" y1={eyeY - 14} x2="92" y2={eyeY - 10} />
          <line x1="126" y1={eyeY - 14} x2="108" y2={eyeY - 10} />
        </g>
      )}
      {personality === "sigma" && !sad && (
        <g stroke={ink} strokeWidth="4" strokeLinecap="round">
          <line x1="74" y1={eyeY - 16} x2="94" y2={eyeY - 10} />
          <line x1="126" y1={eyeY - 16} x2="106" y2={eyeY - 10} />
        </g>
      )}
    </g>
  );

  const mouthY = eyeY + 22;
  const mouth =
    personality === "gremlin" ? (
      <g>
        <path d={`M72 ${mouthY - 4} Q 100 ${mouthY + 22} 128 ${mouthY - 4} Z`} fill="#300" stroke="#111" strokeWidth="2.5" />
        <path d={`M80 ${mouthY - 2} l 5 7 l 5 -6 l 5 7 l 5 -7 l 5 7 l 5 -7 l 5 6 l 5 -7`} fill="#fff" stroke="#fff" strokeWidth="1" />
      </g>
    ) : sad ? (
      <path d={`M88 ${mouthY + 6} Q 100 ${mouthY - 4} 112 ${mouthY + 6}`} stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    ) : personality === "capybara" ? (
      <path d={`M94 ${mouthY + 6} Q 100 ${mouthY + 10} 106 ${mouthY + 6}`} stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : personality === "sigma" ? (
      <path d={`M88 ${mouthY + 2} L 112 ${mouthY}`} stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
    ) : (
      <path d={`M86 ${mouthY} Q 100 ${mouthY + 12} 114 ${mouthY}`} stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    );

  return (
    <g>
      {eyes}
      {mouth}
      {personality === "goblin" && <path d={`M100 ${eyeY + 2} Q 132 ${eyeY + 14} 104 ${eyeY + 20} Z`} fill="#7bbf2a" stroke="#3d6610" strokeWidth="2.5" />}
      {(personality === "sigma" || personality === "corporate" || personality === "radcat") && (
        <g stroke={ink} strokeWidth="1.5" opacity="0.6">
          <line x1="66" y1={mouthY - 6} x2="44" y2={mouthY - 10} />
          <line x1="66" y1={mouthY - 2} x2="44" y2={mouthY} />
          <line x1="134" y1={mouthY - 6} x2="156" y2={mouthY - 10} />
          <line x1="134" y1={mouthY - 2} x2="156" y2={mouthY} />
        </g>
      )}
      {(personality === "sigma" || personality === "corporate" || personality === "radcat") && <ellipse cx="100" cy={mouthY - 8} rx="5" ry="3.5" fill="#f6889b" />}
      <circle cx="70" cy={eyeY + 14} r="6" fill={cheek} opacity="0.45" />
      <circle cx="130" cy={eyeY + 14} r="6" fill={cheek} opacity="0.45" />
    </g>
  );
}

function Eyewear({ id, eyeY }: { id?: string; eyeY: number }) {
  if (!id) return null;
  switch (id) {
    case "eye_nerd":
      return (
        <g fill="rgba(255,255,255,0.15)" stroke="#111" strokeWidth="4">
          <rect x="68" y={eyeY - 12} width="30" height="24" rx="4" />
          <rect x="102" y={eyeY - 12} width="30" height="24" rx="4" />
          <line x1="98" y1={eyeY - 2} x2="102" y2={eyeY - 2} />
          <rect x="94" y={eyeY - 6} width="12" height="6" fill="#fff" stroke="none" />
        </g>
      );
    case "eye_3d":
      return (
        <g stroke="#f4f4f4" strokeWidth="4">
          <rect x="68" y={eyeY - 11} width="30" height="22" rx="3" fill="rgba(255,40,40,0.65)" />
          <rect x="102" y={eyeY - 11} width="30" height="22" rx="3" fill="rgba(40,160,255,0.65)" />
          <line x1="98" y1={eyeY} x2="102" y2={eyeY} />
        </g>
      );
    case "eye_shades":
      return (
        <g>
          <path d={`M62 ${eyeY - 10} H 138 V ${eyeY - 4} H 132 V ${eyeY + 6} H 106 V ${eyeY - 2} H 94 V ${eyeY + 6} H 68 V ${eyeY - 4} H 62 Z`} fill="#000" />
          <rect x="72" y={eyeY - 4} width="6" height="4" fill="#fff" />
          <rect x="110" y={eyeY - 4} width="6" height="4" fill="#fff" />
        </g>
      );
    case "eye_visor":
      return (
        <g>
          <rect x="58" y={eyeY - 12} width="84" height="22" rx="11" fill="rgba(46,242,255,0.55)" stroke="#2ef2ff" strokeWidth="3" />
          <line x1="66" y1={eyeY - 2} x2="134" y2={eyeY - 2} stroke="#fff" strokeWidth="2" opacity="0.7" />
        </g>
      );
    case "eye_monocle":
      return (
        <g>
          <circle cx="116" cy={eyeY} r="13" fill="rgba(255,255,255,0.15)" stroke="#d4a017" strokeWidth="3.5" />
          <path d={`M128 ${eyeY + 6} Q 136 ${eyeY + 30} 124 ${eyeY + 48}`} stroke="#d4a017" strokeWidth="1.5" fill="none" />
        </g>
      );
    default:
      return null;
  }
}

function Hat({ id, personality, uid }: { id?: string; personality: Personality; uid: string }) {
  if (!id) return null;
  const y = personality === "entity" ? 44 : personality === "capybara" ? 68 : 66;
  switch (id) {
    case "hat_propeller":
      return (
        <g>
          <path d={`M66 ${y} Q 100 ${y - 40} 134 ${y} Z`} fill="#ff2e97" stroke="#7a0e44" strokeWidth="2.5" />
          <path d={`M100 ${y - 34} Q 100 ${y} 134 ${y} L 100 ${y} Z`} fill="#2ef2ff" opacity="0.8" />
          <rect x="60" y={y - 2} width="80" height="6" rx="3" fill="#e8ff3a" />
          <line x1="100" y1={y - 34} x2="100" y2={y - 44} stroke="#333" strokeWidth="3" />
          <g className="animate-[spin_0.6s_linear_infinite]" style={{ transformOrigin: `100px ${y - 44}px` }}>
            <ellipse cx="88" cy={y - 44} rx="12" ry="3" fill="#39ff88" />
            <ellipse cx="112" cy={y - 44} rx="12" ry="3" fill="#a855ff" />
          </g>
        </g>
      );
    case "hat_cone":
      return (
        <g>
          <path d={`M84 ${y + 2} L 100 ${y - 50} L 116 ${y + 2} Z`} fill="#ff7a1a" stroke="#7a3300" strokeWidth="2.5" />
          <path d={`M90 ${y - 18} L 110 ${y - 18} L 108 ${y - 26} L 92 ${y - 26} Z`} fill="#fff" />
          <rect x="76" y={y} width="48" height="8" rx="2" fill="#ff7a1a" stroke="#7a3300" strokeWidth="2" />
        </g>
      );
    case "hat_beanie":
      return (
        <g>
          <path d={`M60 ${y + 4} Q 60 ${y - 42} 100 ${y - 42} Q 140 ${y - 42} 140 ${y + 4} Z`} fill="#3b0a5c" stroke="#16031f" strokeWidth="2.5" />
          <rect x="56" y={y - 4} width="88" height="14" rx="6" fill="#5e1a8a" />
          <text x="100" y={y - 14} textAnchor="middle" fontSize="16">💀</text>
          <circle cx="100" cy={y - 46} r="8" fill="#a855ff" />
        </g>
      );
    case "hat_frog":
      return (
        <g>
          <path d={`M54 ${y + 4} Q 100 ${y - 10} 146 ${y + 4} Q 100 ${y + 14} 54 ${y + 4} Z`} fill="#3f9a3a" stroke="#1d4a1a" strokeWidth="2" />
          <path d={`M68 ${y} Q 68 ${y - 36} 100 ${y - 36} Q 132 ${y - 36} 132 ${y} Z`} fill="#55c24e" stroke="#1d4a1a" strokeWidth="2.5" />
          <circle cx="84" cy={y - 36} r="9" fill="#55c24e" stroke="#1d4a1a" strokeWidth="2" />
          <circle cx="116" cy={y - 36} r="9" fill="#55c24e" stroke="#1d4a1a" strokeWidth="2" />
          <circle cx="84" cy={y - 37} r="4" fill="#111" />
          <circle cx="116" cy={y - 37} r="4" fill="#111" />
          <path d={`M88 ${y - 18} Q 100 ${y - 10} 112 ${y - 18}`} stroke="#1d4a1a" strokeWidth="2" fill="none" />
        </g>
      );
    case "hat_wizard":
      return (
        <g>
          <path d={`M66 ${y + 2} L 108 ${y - 76} Q 112 ${y - 60} 134 ${y + 2} Z`} fill="#3346c8" stroke="#141c5a" strokeWidth="2.5" />
          <ellipse cx="100" cy={y + 2} rx="46" ry="8" fill="#2433a0" stroke="#141c5a" strokeWidth="2" />
          <text x="94" y={y - 22} fontSize="14" fill="#e8ff3a">★</text>
          <text x="104" y={y - 44} fontSize="10" fill="#e8ff3a">☾</text>
        </g>
      );
    case "hat_crown":
      return (
        <g filter={`url(#glow-${uid})`}>
          <path d={`M66 ${y + 4} L 70 ${y - 30} L 84 ${y - 10} L 100 ${y - 38} L 116 ${y - 10} L 130 ${y - 30} L 134 ${y + 4} Z`} fill="#ffcf3a" stroke="#8a6300" strokeWidth="2.5" />
          <circle cx="100" cy={y - 6} r="5" fill="#ff2e97" />
          <circle cx="80" cy={y - 2} r="3.5" fill="#2ef2ff" />
          <circle cx="120" cy={y - 2} r="3.5" fill="#39ff88" />
        </g>
      );
    case "hat_halo":
      return (
        <g filter={`url(#glow-${uid})`}>
          <ellipse cx="100" cy={y - 30} rx="34" ry="9" fill="none" stroke="#fff6b0" strokeWidth="6" />
          <text x="100" y={y - 44} textAnchor="middle" fontSize="8" fill="#fff6b0" fontFamily="monospace">(Not Responding)</text>
        </g>
      );
    case "hat_orb":
      return (
        <g filter={`url(#glow-${uid})`} className="animate-[spin_12s_linear_infinite]" style={{ transformOrigin: `100px ${y - 20}px` }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const a = (i / 7) * Math.PI * 2;
            return <circle key={i} cx={100 + Math.cos(a) * 44} cy={y - 20 + Math.sin(a) * 12} r="6" fill={["#ff2e97", "#ffb02e", "#e8ff3a", "#39ff88", "#2ef2ff", "#a855ff", "#ffffff"][i]} />;
          })}
        </g>
      );
    default:
      return null;
  }
}

function Aura({ id, uid, animate }: { id?: string; uid: string; animate: boolean }) {
  if (!id) return null;
  const spin = animate ? "animate-[spin_10s_linear_infinite]" : undefined;
  switch (id) {
    case "aura_stink":
      return (
        <g stroke="#9ad94a" strokeWidth="4" fill="none" opacity="0.7" strokeLinecap="round" className={animate ? "animate-floaty" : undefined}>
          <path d="M30 120 q 8 -10 0 -20 q -8 -10 0 -20" />
          <path d="M170 120 q 8 -10 0 -20 q -8 -10 0 -20" />
          <path d="M150 40 q 8 -10 0 -20" />
        </g>
      );
    case "aura_sparkle":
      return (
        <g fill="#fff6b0" className={animate ? "animate-pulse" : undefined}>
          {[[30, 60], [170, 50], [24, 140], [176, 150], [100, 18], [60, 180]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 7} L ${x + 2} ${y - 2} L ${x + 7} ${y} L ${x + 2} ${y + 2} L ${x} ${y + 7} L ${x - 2} ${y + 2} L ${x - 7} ${y} L ${x - 2} ${y - 2} Z`} />
          ))}
        </g>
      );
    case "aura_ring":
      return (
        <g filter={`url(#glow-${uid})`}>
          <circle cx="100" cy="115" r="86" fill="none" stroke="#2ef2ff" strokeWidth="3" strokeDasharray="14 8" className={spin} style={{ transformOrigin: "100px 115px" }} />
          <circle cx="100" cy="115" r="78" fill="none" stroke="#ff2e97" strokeWidth="1.5" opacity="0.7" />
        </g>
      );
    case "aura_fire":
      return (
        <g filter={`url(#glow-${uid})`} opacity="0.85" className={animate ? "animate-pulse" : undefined}>
          <path d="M30 180 Q 10 120 40 80 Q 40 120 60 120 Q 50 80 80 40 Q 84 90 100 90 Q 100 50 120 30 Q 130 90 140 110 Q 150 80 160 70 Q 196 130 170 180 Z" fill="#ff5a1a" />
          <path d="M50 180 Q 40 140 60 110 Q 66 140 80 140 Q 80 110 100 80 Q 110 130 120 130 Q 130 110 140 100 Q 164 150 150 180 Z" fill="#ffcf3a" />
        </g>
      );
    case "aura_galaxy":
      return (
        <g className={spin} style={{ transformOrigin: "100px 115px" }}>
          <ellipse cx="100" cy="115" rx="96" ry="80" fill="#2a0a4a" opacity="0.6" />
          {Array.from({ length: 24 }).map((_, i) => (
            <circle key={i} cx={100 + Math.cos(i * 2.4) * (30 + (i * 13) % 60)} cy={115 + Math.sin(i * 2.4) * (24 + (i * 7) % 50)} r={1 + (i % 3)} fill={["#fff", "#a855ff", "#2ef2ff", "#ff2e97"][i % 4]} />
          ))}
        </g>
      );
    case "aura_void":
      return (
        <g>
          <circle cx="100" cy="115" r="96" fill={`url(#void-${uid})`} />
          <circle cx="100" cy="115" r="90" fill="none" stroke="#a855ff" strokeWidth="2" strokeDasharray="2 10" className={spin} style={{ transformOrigin: "100px 115px" }} />
        </g>
      );
    default:
      return null;
  }
}
