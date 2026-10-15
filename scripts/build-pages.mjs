// Static export for GitHub Pages.
// API routes cannot be statically exported, so they are moved into a private
// folder (`_api`, ignored by the App Router) for the duration of the build.
import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const api = path.join(root, "src/app/api");
const parked = path.join(root, "src/app/_api");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/dopamine-exe";

if (existsSync(parked)) throw new Error("src/app/_api already exists — a previous build was interrupted; move it back to src/app/api first.");
renameSync(api, parked);
let status = 1;
try {
  const r = spawnSync(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_STATIC: "1", NEXT_PUBLIC_BASE_PATH: basePath, NEXT_TELEMETRY_DISABLED: "1" },
  });
  status = r.status ?? 1;
} finally {
  renameSync(parked, api);
}
process.exit(status);
