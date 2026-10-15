"use client";

export interface CardSpec {
  kicker: string;
  title: string;
  subtitle?: string;
  lines: string[];
  accent: string;
  svg?: SVGSVGElement | null;
  emoji?: string;
}

function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "600");
  clone.setAttribute("height", "600");
  // animations are irrelevant in a still image
  clone.querySelectorAll("[class]").forEach((el) => el.removeAttribute("class"));
  const data = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Draws a 1080×1350 shareable card and returns it as a PNG blob. */
export async function renderCard(spec: CardSpec): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-display") || "Impact";
  const pixel = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel") || "monospace";

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0f0d17");
  g.addColorStop(1, "#07060b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // scanlines
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  // frame
  ctx.strokeStyle = spec.accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  // glow blob
  const rg = ctx.createRadialGradient(W / 2, 560, 50, W / 2, 560, 480);
  rg.addColorStop(0, spec.accent + "55");
  rg.addColorStop(1, "transparent");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#39ff88";
  ctx.font = `60px ${display}`;
  ctx.fillText("DOPAMINE.EXE", W / 2, 130);
  ctx.fillStyle = "#8f89a8";
  ctx.font = `40px ${pixel}`;
  ctx.fillText(spec.kicker.toUpperCase(), W / 2, 185);

  if (spec.svg) {
    try {
      const img = await svgToImage(spec.svg);
      ctx.drawImage(img, W / 2 - 300, 240, 600, 600);
    } catch {
      /* fall back to emoji */
    }
  } else if (spec.emoji) {
    ctx.font = "320px serif";
    ctx.fillText(spec.emoji, W / 2, 680);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `72px ${display}`;
  ctx.fillText(spec.title.slice(0, 22), W / 2, 930);
  if (spec.subtitle) {
    ctx.fillStyle = spec.accent;
    ctx.font = `44px ${pixel}`;
    ctx.fillText(spec.subtitle.toUpperCase(), W / 2, 990);
  }
  ctx.fillStyle = "#ece9f7";
  ctx.font = `38px ${pixel}`;
  spec.lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, W / 2, 1070 + i * 50));
  ctx.fillStyle = "#8f89a8";
  ctx.font = `28px ${pixel}`;
  ctx.fillText("fictional rewards · no real money · pure brainrot", W / 2, H - 60);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

/** Share via the native share sheet when files are supported, otherwise download. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text, title: "DOPAMINE.EXE" });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
