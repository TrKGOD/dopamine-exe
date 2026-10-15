"use client";

import { PERSONALITY_META, RARITY_META, stageForLevel } from "@/lib/game/config";
import { ITEMS } from "@/lib/game/items";
import type { PublicProfile } from "@/lib/server/profiles";
import { PetAvatar } from "./PetAvatar";
import { RarityTag } from "./ui";

export function ProfileView({ profile }: { profile: PublicProfile }) {
  const title = profile.title ? ITEMS[profile.title] : undefined;
  const stage = stageForLevel(profile.pet.level);
  return (
    <div>
      <div className="flex items-center gap-4">
        <PetAvatar personality={profile.pet.personality} level={profile.pet.level} equipped={profile.pet.equipped} mutations={profile.pet.mutations} size={120} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-xl text-white">{profile.displayName}</span>
            {profile.demo && <span className="chip !border-acid/50 text-acid">DEMO</span>}
          </div>
          {title && <div className="text-sm" style={{ color: RARITY_META[title.rarity].color }}>« {title.name} »</div>}
          <div className="text-xs text-muted">
            Level {profile.level} · {profile.weeklyXp} XP this week
          </div>
          <div className="mt-1 text-xs text-white/80">
            Pet: <b>{profile.pet.name}</b> — {PERSONALITY_META[profile.pet.personality].name}, {stage.name} (LV {profile.pet.level})
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl border border-line p-2">
          <div className="font-display text-lg text-ice">{profile.uniqueViews}</div>posts seen
        </div>
        <div className="rounded-xl border border-line p-2">
          <div className="font-display text-lg text-volt">{profile.itemCount}</div>items
        </div>
        <div className="rounded-xl border border-line p-2">
          <div className="font-display text-lg text-[#ffb02e]">{profile.achievementCount}</div>achievements
        </div>
      </div>
      {profile.badges.length > 0 && (
        <div className="mt-4">
          <div className="label mb-1 !text-sm">Badges</div>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <span key={b} className="chip" title={ITEMS[b]?.description}>
                {ITEMS[b]?.emoji} {ITEMS[b]?.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile.showcase.length > 0 && (
        <div className="mt-4">
          <div className="label mb-1 !text-sm">Collection showcase</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {profile.showcase.map((id) => {
              const it = ITEMS[id];
              if (!it) return null;
              return (
                <div key={id} className="flex flex-col items-center gap-1 rounded-xl border p-2 text-center" style={{ borderColor: RARITY_META[it.rarity].color + "88" }} title={it.name}>
                  <span className="text-2xl">{it.emoji}</span>
                  <RarityTag rarity={it.rarity} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
