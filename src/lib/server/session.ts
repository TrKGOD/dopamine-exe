import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { readSecretFileSync, writeSecretFileSync } from "./store";

const COOKIE = "dx_pid";
const ONE_YEAR = 60 * 60 * 24 * 365;

let secret: string | null = null;
function getSecret(): string {
  if (secret) return secret;
  secret = process.env.DOPAMINE_SECRET || readSecretFileSync();
  if (!secret) {
    secret = crypto.randomBytes(32).toString("hex");
    writeSecretFileSync(secret);
  }
  return secret;
}

const sign = (id: string) => crypto.createHmac("sha256", getSecret()).update(id).digest("base64url").slice(0, 32);
/** Public id is derived, so leaderboards can never reveal the private session id. */
export const publicIdFor = (id: string) => crypto.createHmac("sha256", getSecret()).update("pub:" + id).digest("hex").slice(0, 12);

function verify(value: string | undefined): string | null {
  if (!value) return null;
  const [id, sig] = value.split(".");
  if (!id || !sig || !/^[a-f0-9-]{36}$/.test(id)) return null;
  const expected = sign(id);
  if (sig.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
}

/** Read the anonymous player identity, creating one if needed. */
export async function getSession(create = true): Promise<{ id: string; publicId: string } | null> {
  const jar = await cookies();
  let id = verify(jar.get(COOKIE)?.value);
  if (!id) {
    if (!create) return null;
    id = crypto.randomUUID();
    jar.set(COOKIE, `${id}.${sign(id)}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return { id, publicId: publicIdFor(id) };
}

/** Basic CSRF defence for state-changing requests: Origin must match Host when present. */
export async function sameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === h.get("host");
  } catch {
    return false;
  }
}
