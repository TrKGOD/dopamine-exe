import { NextResponse } from "next/server";
import { publicState, tick } from "@/lib/game/engine";
import { visibleSubmissions } from "@/lib/server/game";
import { getSession } from "@/lib/server/session";
import { withPlayer } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession(true);
  if (!session) return NextResponse.json({ error: "no_session" }, { status: 401 });
  const state = await withPlayer(session.id, session.publicId, (p) => {
    tick(p, Date.now());
    return structuredClone(publicState(p));
  });
  const community = await visibleSubmissions(session.id);
  return NextResponse.json({ state, community, serverNow: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
