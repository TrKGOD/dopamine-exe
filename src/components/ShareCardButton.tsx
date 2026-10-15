"use client";

import { useState } from "react";
import { useFx } from "@/client/fx";
import { useGame } from "@/client/game";
import { renderCard, shareOrDownload, type CardSpec } from "@/client/shareCard";

export function ShareCardButton({ spec, target, filename, label = "Share card", className = "btn-ghost" }: { spec: () => CardSpec; target: string; filename: string; label?: string; className?: string }) {
  const { act } = useGame();
  const fx = useFx();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const s = spec();
          const blob = await renderCard(s);
          const how = await shareOrDownload(blob, filename, `${s.title} — ${s.subtitle ?? ""} #DOPAMINEEXE`);
          fx.toast(how === "shared" ? "Shared! The rot spreads." : "Card downloaded as PNG.", "good", "🖼️");
          await act({ type: "share", target }, { silent: true });
        } catch (e) {
          if ((e as Error).name !== "AbortError") fx.toast("Couldn't create the card.", "bad");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Rendering…" : `🖼️ ${label}`}
    </button>
  );
}
