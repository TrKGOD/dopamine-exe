import { NextResponse } from "next/server";
import { ITEMS } from "@/lib/game/items";
import { demoProfiles, realProfiles } from "@/lib/server/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  if (!/^[a-z0-9-]{4,32}$/.test(publicId)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const profile =
    demoProfiles().find((p) => p.publicId === publicId) ??
    (await realProfiles((id) => ITEMS[id]?.rarity)).find((p) => p.publicId === publicId);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ profile });
}
