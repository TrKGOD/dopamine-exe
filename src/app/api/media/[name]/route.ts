import fs from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/server/session";
import { UPLOAD_DIR, submissions } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^s[a-f0-9]{12}\.(png|jpg|gif|webp|mp4|webm)$/.test(name)) return new Response("Not found", { status: 404 });
  const sub = (await submissions()).find((s) => s.file === name);
  if (!sub) return new Response("Not found", { status: 404 });
  if (sub.status !== "approved") {
    const session = await getSession(false);
    if (!session || session.id !== sub.ownerId) return new Response("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": sub.mime,
        "Content-Length": String(data.length),
        "Cache-Control": sub.status === "approved" ? "public, max-age=86400" : "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
