import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CATEGORIES } from "@/lib/game/types";
import { submissionToPost, visibleSubmissions } from "@/lib/server/game";
import { autoModerate, sniffMedia } from "@/lib/server/moderation";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSession, sameOrigin } from "@/lib/server/session";
import { UPLOAD_DIR, addSubmission, withPlayer, type Submission } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

const Fields = z.object({
  caption: z.string().trim().min(3).max(150),
  category: z.enum(CATEGORIES),
});

export async function GET() {
  const session = await getSession(true);
  if (!session) return NextResponse.json({ posts: [] });
  return NextResponse.json({ posts: await visibleSubmissions(session.id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await sameOrigin())) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const session = await getSession(false);
  if (!session) return NextResponse.json({ error: "no_session" }, { status: 401 });
  if (!rateLimit("submit:" + session.id, 3, 10 * 60_000)) {
    return NextResponse.json({ error: "Slow down, auteur. Max 3 submissions per 10 minutes." }, { status: 429 });
  }
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "File too large (max 8 MB)." }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }
  const fields = Fields.safeParse({ caption: form.get("caption"), category: form.get("category") });
  if (!fields.success) return NextResponse.json({ error: "Caption must be 3–150 characters and category must be valid." }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach an image or video." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "File must be between 1 byte and 8 MB." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const media = sniffMedia(buf);
  if (!media) return NextResponse.json({ error: "Only PNG, JPEG, GIF, WebP, MP4 or WebM files are accepted." }, { status: 415 });

  const id = "s" + crypto.randomBytes(6).toString("hex");
  const filename = `${id}.${media.ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buf);

  const owner = await withPlayer(session.id, session.publicId, (p) => ({ name: p.displayName, publicId: p.publicId }));
  const mod = autoModerate(fields.data.caption);
  const sub: Submission = {
    id,
    ownerId: session.id,
    ownerName: owner.name,
    ownerPublicId: owner.publicId,
    createdAt: Date.now(),
    caption: fields.data.caption,
    category: fields.data.category,
    file: filename,
    mime: media.mime,
    kind: media.kind,
    status: mod.status,
    moderationNote: mod.note,
  };
  await addSubmission(sub);
  return NextResponse.json({ post: submissionToPost(sub, session.id), status: sub.status, note: mod.note });
}
