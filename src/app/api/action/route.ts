import { NextResponse } from "next/server";
import { EnvelopeSchema } from "@/lib/game/actions";
import { RATE_LIMIT } from "@/lib/game/config";
import { applyEnvelope, publicState } from "@/lib/game/engine";
import type { PlayerState } from "@/lib/game/types";
import { engineCtx } from "@/lib/server/game";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSession, sameOrigin } from "@/lib/server/session";
import { withPlayer } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY = 4096;

export async function POST(req: Request) {
  if (!(await sameOrigin())) return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 });
  const session = await getSession(false);
  if (!session) return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });

  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const parsed = EnvelopeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });

  if (!rateLimit("act:" + session.id, RATE_LIMIT.maxActions, RATE_LIMIT.windowMs)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const ctx = await engineCtx(session.id);
  const { outcome, state } = await withPlayer(session.id, session.publicId, (p) => {
    // work on a copy; commit only after the engine finishes without throwing
    const draft: PlayerState = structuredClone(p);
    const outcome = applyEnvelope(draft, parsed.data.nonce, parsed.data.action, { ...ctx, now: Date.now() });
    Object.assign(p, draft);
    return { outcome, state: structuredClone(publicState(p)) };
  });

  return NextResponse.json({ ...outcome, state, serverNow: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
