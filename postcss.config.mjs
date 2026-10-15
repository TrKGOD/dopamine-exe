import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

// absolute config path so the app also builds when started from another cwd
export default { plugins: { tailwindcss: { config: path.join(dir, "tailwind.config.ts") }, autoprefixer: {} } };
