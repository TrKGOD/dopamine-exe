/**
 * Moderation hooks. Every submission starts as "pending" and must be approved
 * through the admin API (or an external moderation service plugged in here)
 * before anyone other than its author can see it.
 */

const BLOCKLIST = [/\bn[i1]gg/i, /\bf[a4]gg?[o0]t/i, /\bk[i1]ll\s+yourself\b/i, /\bkys\b/i, /\bretard/i];

export function autoModerate(caption: string): { status: "pending" | "rejected"; note?: string } {
  if (BLOCKLIST.some((re) => re.test(caption))) return { status: "rejected", note: "Caption failed automatic screening." };
  if (/(https?:\/\/|www\.)/i.test(caption)) return { status: "rejected", note: "Links are not allowed in captions." };
  return { status: "pending", note: "Awaiting human review. Only you can see it until approved." };
}

/** Identify media by magic bytes — never trust the browser-provided MIME type. */
export function sniffMedia(b: Buffer): { mime: string; ext: string; kind: "image" | "video" } | null {
  const hex = (start: number, len: number) => b.subarray(start, start + len).toString("hex");
  const ascii = (start: number, len: number) => b.subarray(start, start + len).toString("latin1");
  if (b.length < 12) return null;
  if (hex(0, 8) === "89504e470d0a1a0a") return { mime: "image/png", ext: "png", kind: "image" };
  if (hex(0, 3) === "ffd8ff") return { mime: "image/jpeg", ext: "jpg", kind: "image" };
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return { mime: "image/gif", ext: "gif", kind: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { mime: "image/webp", ext: "webp", kind: "image" };
  if (ascii(4, 4) === "ftyp") return { mime: "video/mp4", ext: "mp4", kind: "video" };
  if (hex(0, 4) === "1a45dfa3") return { mime: "video/webm", ext: "webm", kind: "video" };
  return null;
}
