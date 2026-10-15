import path from "node:path";
import type { Config } from "tailwindcss";

const config: Config = {
  // absolute glob so content scanning works regardless of the process cwd
  content: [path.join(__dirname, "src/**/*.{ts,tsx}").split(path.sep).join("/")],
  theme: {
    extend: {
      colors: {
        void: "#07060b",
        panel: "#0f0d17",
        panel2: "#161325",
        line: "#2a2540",
        muted: "#8f89a8",
        neon: "#39ff88",
        volt: "#a855ff",
        hot: "#ff2e97",
        acid: "#e8ff3a",
        ice: "#2ef2ff",
        r: {
          common: "#9aa3b5",
          uncommon: "#39ff88",
          rare: "#2ef2ff",
          epic: "#a855ff",
          legendary: "#ffb02e",
          mythical: "#ff2e97",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        pixel: ["var(--font-pixel)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(57,255,136,.5), 0 0 24px -4px rgba(57,255,136,.45)",
        volt: "0 0 0 1px rgba(168,85,255,.55), 0 0 24px -4px rgba(168,85,255,.5)",
        hot: "0 0 0 1px rgba(255,46,151,.55), 0 0 24px -4px rgba(255,46,151,.5)",
      },
      keyframes: {
        bob: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        blink: { "0%,92%,100%": { transform: "scaleY(1)" }, "95%": { transform: "scaleY(0.1)" } },
        glitch: {
          "0%,100%": { transform: "translate(0)", textShadow: "2px 0 #ff2e97, -2px 0 #2ef2ff" },
          "20%": { transform: "translate(-2px,1px)", textShadow: "-2px 0 #ff2e97, 2px 0 #2ef2ff" },
          "40%": { transform: "translate(2px,-1px)", textShadow: "3px 0 #a855ff, -1px 0 #39ff88" },
          "60%": { transform: "translate(-1px,0)" },
        },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        floaty: { "0%,100%": { transform: "translateY(0) rotate(-2deg)" }, "50%": { transform: "translateY(-10px) rotate(2deg)" } },
        shimmer: { from: { backgroundPosition: "0% 50%" }, to: { backgroundPosition: "200% 50%" } },
      },
      animation: {
        bob: "bob 2.4s ease-in-out infinite",
        blink: "blink 4s infinite",
        glitch: "glitch 2.5s steps(2) infinite",
        marquee: "marquee 30s linear infinite",
        floaty: "floaty 3s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
