import { NextResponse } from "next/server";
import { createPlayer, publicState } from "@/lib/game/engine";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSession, sameOrigin } from "@/lib/server/session";
import { withPlayer } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await sameOrigin())) return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 });
  const session = await getSession(false);
  if (!session) return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== "DELETE MY BRAINROT") return NextResponse.json({ ok: false, error: "confirm_required" }, { status: 400 });
  if (!rateLimit("reset:" + session.id, 3, 60_000)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const state = await withPlayer(session.id, session.publicId, (p) => {
    const fresh = createPlayer(session.id, session.publicId, Date.now());
    for (const k of Object.keys(p)) delete (p as unknown as Record<string, unknown>)[k];
    Object.assign(p, fresh);
    return structuredClone(publicState(p));
  });
  return NextResponse.json({ ok: true, state, effects: [], serverNow: Date.now() });
}
