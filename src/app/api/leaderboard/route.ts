import { NextResponse } from "next/server";
import { ITEMS } from "@/lib/game/items";
import { communityChallenge, demoProfiles, realProfiles } from "@/lib/server/profiles";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession(false);
  const real = await realProfiles((id) => ITEMS[id]?.rarity);
  const entries = [...real, ...demoProfiles()].sort((a, b) => b.weeklyXp - a.weeklyXp || b.level - a.level).slice(0, 50);
  return NextResponse.json(
    { entries, me: session?.publicId ?? null, challenge: await communityChallenge(), realPlayers: real.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
