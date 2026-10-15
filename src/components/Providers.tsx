"use client";

import type { ReactNode } from "react";
import { FxProvider } from "@/client/fx";
import { GameProvider, NowProvider } from "@/client/game";
import { SettingsProvider } from "@/client/settings";
import { AppShell } from "./AppShell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <FxProvider>
        <GameProvider>
          <NowProvider>
            <AppShell>{children}</AppShell>
          </NowProvider>
        </GameProvider>
      </FxProvider>
    </SettingsProvider>
  );
}
