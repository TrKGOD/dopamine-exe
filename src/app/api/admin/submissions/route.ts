import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { submissions, updateSubmission } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Moderation API. Disabled unless ADMIN_TOKEN is set. */
function authorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const all = await submissions();
  return NextResponse.json({ submissions: all.map(({ ownerId: _o, ...s }) => s) });
}

const Body = z.object({ id: z.string().regex(/^s[a-f0-9]{12}$/), status: z.enum(["approved", "rejected", "pending"]), note: z.string().max(200).optional() });

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const updated = await updateSubmission(parsed.data.id, { status: parsed.data.status, moderationNote: parsed.data.note });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
}
