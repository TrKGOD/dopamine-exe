"use client";

import { memo, useEffect, useRef, type CSSProperties } from "react";
import type { SceneSpec } from "@/lib/content/posts";
import { PetAvatar } from "../PetAvatar";

/**
 * Procedural, copyright-free looping "clips". CSS scenes pause through the
 * parent's `.paused` class; canvas scenes only run their rAF loop while active.
 */
export const Scene = memo(function Scene({ spec, active, reduced }: { spec: SceneSpec; active: boolean; reduced: boolean }) {
  const hue = spec.hue ?? 140;
  const c1 = `hsl(${hue} 100% 60%)`;
  const c2 = `hsl(${(hue + 160) % 360} 100% 60%)`;
  const bg = `radial-gradient(ellipse at 50% 30%, hsl(${hue} 70% 14%), #050409 75%)`;
  const lines = (spec.text ?? "").split("\n");
  const Big = ({ className = "", style }: { className?: string; style?: CSSProperties }) => (
    <div className={`h-display text-center text-4xl text-white drop-shadow-[0_4px_0_rgba(0,0,0,.6)] sm:text-6xl ${className}`} style={style}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
  const Sub = () => (spec.sub ? <div className="mt-3 text-center font-pixel text-2xl text-white/80">{spec.sub}</div> : null);

  switch (spec.type) {
    case "dvd":
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: "#050409" }}>
          <div className="absolute inset-6">
            <div className="absolute" style={{ animation: "dvd-x 3.7s linear infinite alternate, dvd-y 2.9s linear infinite alternate", width: "9rem", height: "4rem" }}>
              <div className="flex h-16 w-36 items-center justify-center rounded-[50%] border-4 font-display text-lg" style={{ color: c1, borderColor: c1, animation: "dvd-hue 4s steps(6) infinite" }}>
                {spec.text}
              </div>
            </div>
          </div>
          <div className="absolute bottom-24 left-0 right-0 text-center font-pixel text-xl text-white/40">corner hits: 0 (this session)</div>
        </div>
      );

    case "vapor":
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(#12002b 0%, hsl(${hue} 80% 35%) 55%, #12002b 56%)` }}>
          <div className="absolute left-1/2 top-[18%] h-56 w-56 -translate-x-1/2 rounded-full" style={{ background: `repeating-linear-gradient(#ffcf3a 0 14px, #ff2e97 14px 18px)`, boxShadow: "0 0 80px #ff2e97" }} />
          <div
            className="absolute inset-x-0 bottom-0 h-[44%] origin-top"
            style={{
              transform: "perspective(300px) rotateX(60deg)",
              backgroundImage: `linear-gradient(${c2} 2px, transparent 2px), linear-gradient(90deg, ${c2} 2px, transparent 2px)`,
              backgroundSize: "48px 48px",
              animation: "grid-move 1s linear infinite",
            }}
          />
          <div className="absolute inset-x-0 top-[52%] -translate-y-full px-4">
            <Big style={{ textShadow: `4px 4px 0 ${c2}` }} />
            <Sub />
          </div>
        </div>
      );

    case "glitch":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4" style={{ background: bg }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute inset-x-0 h-6 opacity-30" style={{ background: i % 2 ? c1 : c2, animation: `bars ${2 + i}s linear ${i * 0.6}s infinite` }} />
          ))}
          <div className="glitch h-display text-center text-5xl text-white sm:text-7xl" data-text={spec.text?.replace("\n", " ")}>
            {lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
          <Sub />
        </div>
      );

    case "cube":
      return (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: bg, perspective: "800px" }}>
          <div className="relative h-40 w-40" style={{ transformStyle: "preserve-3d", animation: "cube-spin 6s linear infinite" }}>
            {["rotateY(0deg)", "rotateY(90deg)", "rotateY(180deg)", "rotateY(-90deg)", "rotateX(90deg)", "rotateX(-90deg)"].map((t, i) => (
              <div key={i} className="absolute inset-0 flex items-center justify-center border-2 font-display text-4xl" style={{ transform: `${t} translateZ(80px)`, borderColor: c1, background: `hsla(${hue + i * 30} 90% 50% / .25)`, color: "#fff" }}>
                {i % 2 ? spec.emoji : spec.text}
              </div>
            ))}
          </div>
        </div>
      );

    case "eyes":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-hidden px-4" style={{ background: bg }}>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-[50%] bg-white shadow-[0_0_20px_rgba(255,255,255,.3)]">
                <div className="h-7 w-7 rounded-full" style={{ background: `radial-gradient(circle, #000 35%, ${c1} 36%)`, animation: `look ${3 + (i % 3)}s ease-in-out ${i * 0.2}s infinite` }} />
              </div>
            ))}
          </div>
          <Big />
        </div>
      );

    case "board":
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: "repeating-linear-gradient(45deg,#7a5230 0 6px,#80583a 6px 12px)" }}>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden>
            {[
              [20, 30, 75, 55],
              [75, 55, 30, 95],
              [30, 95, 70, 125],
              [20, 30, 70, 125],
              [75, 55, 70, 125],
            ].map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e01b1b" strokeWidth="0.8" strokeDasharray="200" strokeDashoffset="200" style={{ animation: `dash 2.5s ease ${i * 0.5}s infinite alternate` }} />
            ))}
          </svg>
          {[
            ["BIRDS?", 20, 30, "#fff59d"],
            ["WIFI = SOUP", 75, 55, "#ffffff"],
            ["THE DRYER", 30, 95, "#c5e1a5"],
            ["PIGEON HQ", 70, 125, "#ffcc80"],
          ].map(([t, x, y, c], i) => (
            <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] p-2 font-pixel text-xl text-black shadow-lg" style={{ left: `${x}%`, top: `${(Number(y) / 160) * 100}%`, background: c as string }}>
              📌 {t}
            </div>
          ))}
          <div className="absolute inset-x-0 top-[42%] px-4">
            <Big className="!text-hot" style={{ animation: "stamp 3s ease infinite" }} />
          </div>
        </div>
      );

    case "pixelcat":
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(#0b0820 60%, hsl(${hue} 60% 22%) 60%)` }}>
          <div className="absolute inset-x-0 top-[18%] px-4">
            <Big className="font-pixel !text-6xl" />
            {spec.sub && (
              <div className="mt-2 text-center font-pixel text-3xl text-acid" style={{ animation: "blink-text 1s steps(1) infinite" }}>
                {spec.sub}
              </div>
            )}
          </div>
          <div className="absolute bottom-[38%] left-0 w-full" style={{ animation: "walk 6s linear infinite" }}>
            <svg width="120" height="84" viewBox="0 0 30 21" shapeRendering="crispEdges" aria-hidden>
              <g fill={c1}>
                <rect x="4" y="6" width="18" height="9" />
                <rect x="20" y="3" width="8" height="8" />
                <rect x="20" y="1" width="2" height="2" />
                <rect x="26" y="1" width="2" height="2" />
                <rect x="0" y="4" width="2" height="6" />
                <rect x="2" y="6" width="2" height="2" />
              </g>
              <rect x="22" y="5" width="1" height="2" fill="#000" />
              <rect x="25" y="5" width="1" height="2" fill="#000" />
              <g fill={c1} style={{ animation: "legs .3s steps(1) infinite" }}>
                <rect x="5" y="15" width="2" height="4" />
                <rect x="17" y="15" width="2" height="4" />
              </g>
              <g fill={c1} style={{ animation: "legs .3s steps(1) .15s infinite" }}>
                <rect x="9" y="15" width="2" height="4" />
                <rect x="13" y="15" width="2" height="4" />
              </g>
            </svg>
          </div>
        </div>
      );

    case "hud":
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: bg }}>
          <div className="absolute left-4 right-4 top-6 flex items-center gap-2 font-pixel text-xl text-white">
            HP
            <div className="h-4 flex-1 border-2 border-white">
              <div className="h-full bg-hot" style={{ width: "35%", animation: "pulse-big 1s ease infinite" }} />
            </div>
            <span className="text-acid">x47</span>
          </div>
          <div className="absolute inset-x-0 top-[34%] px-4">
            <Big style={{ color: c1, animation: "pulse-big 0.8s ease infinite" }} className="!text-6xl sm:!text-8xl" />
            {spec.sub && <div className="mt-3 text-center font-display text-2xl text-acid">{spec.sub}</div>}
          </div>
          <div className="absolute bottom-28 left-4 font-pixel text-lg text-white/60">FPS: 12 · PING: 999 · VIBES: MAX</div>
        </div>
      );

    case "blob":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4" style={{ background: "#07060b" }}>
          <div className="absolute h-80 w-80 opacity-80 blur-sm" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, animation: "morph 8s ease-in-out infinite" }} />
          <div className="relative">
            <Big />
            <Sub />
          </div>
        </div>
      );

    case "stonks":
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: "#03140a" }}>
          <svg className="absolute inset-x-0 bottom-[22%] h-[50%] w-full" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={i} x1="0" x2="100" y1={i * 12} y2={i * 12} stroke="#ffffff15" strokeWidth="0.3" />
            ))}
            <polyline points="0,55 12,50 20,52 30,40 38,44 50,30 58,34 70,18 80,22 92,6 100,2" fill="none" stroke={c1} strokeWidth="1.6" strokeDasharray="200" strokeDashoffset="200" style={{ animation: "dash 3s ease-out infinite" }} />
          </svg>
          <div className="absolute inset-x-0 top-[12%] px-4">
            <Big style={{ color: c1 }} />
            <Sub />
            <div className="mt-2 text-center font-display text-5xl text-neon">📈 +420.69%</div>
          </div>
        </div>
      );

    case "sunset":
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(#1a0533, hsl(${hue} 90% 50%) 70%, #ffcf3a)` }}>
          <div className="absolute left-1/2 top-[30%] h-48 w-48 -translate-x-1/2 rounded-full bg-[#ffe08a] shadow-[0_0_120px_#ffb02e]" style={{ animation: "sunset 12s ease-in-out infinite alternate" }} />
          <svg className="absolute bottom-0 h-[38%] w-full" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
            <path d="M0 40 L0 22 L14 10 L26 20 L40 6 L56 22 L70 12 L84 24 L100 14 L100 40 Z" fill="#12021f" />
          </svg>
          <div className="absolute inset-x-0 top-[12%] px-6" style={{ animation: "slowzoom 10s ease-in-out infinite alternate" }}>
            <div className="text-center font-serif text-3xl italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.8)] sm:text-5xl">
              {lines.map((l, i) => (
                <div key={i}>&ldquo;{l}&rdquo;</div>
              ))}
            </div>
            <div className="mt-3 text-center font-pixel text-xl text-white/80">— a guy, probably</div>
          </div>
        </div>
      );

    case "rain":
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: bg }}>
          {Array.from({ length: reduced ? 8 : 22 }).map((_, i) => (
            <span key={i} className="absolute top-0 text-4xl" style={{ left: `${(i * 37) % 100}%`, animation: `fall ${3 + (i % 5) * 0.6}s linear ${(i * 0.37) % 3}s infinite` }}>
              {spec.emoji}
            </span>
          ))}
          <div className="absolute inset-x-0 top-[40%] px-4">
            <Big />
          </div>
        </div>
      );

    case "capy":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4" style={{ background: `radial-gradient(circle at 50% 60%, #3d2a1a, #07060b 70%)` }}>
          <div className="relative">
            <div className="absolute left-1/2 top-[72%] h-24 w-72 -translate-x-1/2 rounded-[50%] border-4 border-[#222]" style={{ background: "repeating-radial-gradient(circle, #111 0 4px, #1c1c1c 4px 6px)", animation: "spin-slow 2s linear infinite" }} />
            <div className="relative" style={{ animation: "legs 1s ease-in-out infinite" }}>
              <PetAvatar personality="capybara" level={6} equipped={spec.sub ? {} : { eyewear: "eye_shades" }} mutations={[]} mood={90} size={220} animate={false} />
              {spec.sub && <span className="absolute left-1/2 top-2 -translate-x-1/2 text-5xl">🐦</span>}
            </div>
          </div>
          <Big className="mt-10" />
          <Sub />
        </div>
      );

    case "matrix":
    case "warp":
    case "life":
      return <CanvasScene spec={spec} active={active} reduced={reduced} />;
  }
});

function CanvasScene({ spec, active, reduced }: { spec: SceneSpec; active: boolean; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hue = spec.hue ?? 140;

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const resize = () => {
      c.width = c.clientWidth;
      c.height = c.clientHeight;
    };
    resize();
    const W = () => c.width;
    const H = () => c.height;
    let frame = 0;
    let raf = 0;

    // per-type state
    const cols = Math.ceil(W() / 16);
    const drops = Array.from({ length: cols }, (_, i) => (i * 7) % 40);
    const stars = Array.from({ length: 220 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
    const size = 10;
    const gw = Math.ceil(W() / size);
    const gh = Math.ceil(H() / size);
    let grid = Array.from({ length: gw * gh }, () => (Math.random() < 0.25 ? 1 : 0));

    const draw = () => {
      frame++;
      if (spec.type === "matrix") {
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(0, 0, W(), H());
        ctx.fillStyle = `hsl(${hue} 100% 55%)`;
        ctx.font = "16px monospace";
        const glyphs = "BRAINROT01アイウエオ#$%";
        for (let i = 0; i < drops.length; i++) {
          ctx.fillText(glyphs[(i + frame) % glyphs.length], i * 16, drops[i] * 16);
          if (drops[i] * 16 > H() && Math.random() > 0.975) drops[i] = 0;
          drops[i] += 0.5;
        }
      } else if (spec.type === "warp") {
        ctx.fillStyle = "rgba(5,4,9,0.35)";
        ctx.fillRect(0, 0, W(), H());
        for (const s of stars) {
          s.z -= 0.012;
          if (s.z <= 0.01) {
            s.z = 1;
            s.x = Math.random() * 2 - 1;
            s.y = Math.random() * 2 - 1;
          }
          const px = W() / 2 + (s.x / s.z) * W() * 0.4;
          const py = H() / 2 + (s.y / s.z) * H() * 0.4;
          const r = (1 - s.z) * 3;
          ctx.fillStyle = `hsl(${hue + (1 - s.z) * 80} 100% ${50 + (1 - s.z) * 40}%)`;
          ctx.fillRect(px, py, r, r);
        }
      } else if (spec.type === "life" && frame % 6 === 0) {
        const next = new Array(grid.length).fill(0);
        for (let y = 0; y < gh; y++)
          for (let x = 0; x < gw; x++) {
            let n = 0;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += grid[((y + dy + gh) % gh) * gw + ((x + dx + gw) % gw)];
            const alive = grid[y * gw + x];
            next[y * gw + x] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
          }
        grid = next;
        if (frame % 600 === 0) grid = grid.map((v) => (Math.random() < 0.08 ? 1 : v));
        ctx.fillStyle = "#050409";
        ctx.fillRect(0, 0, W(), H());
        ctx.fillStyle = `hsl(${hue} 100% 55%)`;
        for (let i = 0; i < grid.length; i++) if (grid[i]) ctx.fillRect((i % gw) * size, Math.floor(i / gw) * size, size - 1, size - 1);
      }
      raf = requestAnimationFrame(draw);
    };

    ctx.fillStyle = "#050409";
    ctx.fillRect(0, 0, W(), H());
    if (active && !reduced) raf = requestAnimationFrame(draw);
    else {
      // static first frame for inactive/reduced-motion posts
      for (let i = 0; i < 40; i++) {
        draw();
        cancelAnimationFrame(raf);
      }
    }
    return () => cancelAnimationFrame(raf);
  }, [active, reduced, spec.type, hue]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050409]">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="absolute inset-x-0 top-[38%] px-4">
        <div className="h-display text-center text-4xl text-white drop-shadow-[0_0_20px_rgba(0,0,0,1)] sm:text-6xl">{spec.text}</div>
        {spec.sub && <div className="mt-3 text-center font-pixel text-2xl text-white/80">{spec.sub}</div>}
      </div>
    </div>
  );
}
