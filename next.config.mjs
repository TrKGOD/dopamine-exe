/**
 * Two build targets:
 * - default: full Next.js server (API routes, server-authoritative game state)
 * - NEXT_PUBLIC_STATIC=1: static export for GitHub Pages (built by scripts/build-pages.mjs,
 *   which parks the API routes outside the router); the game runs in the browser.
 */
const isStatic = process.env.NEXT_PUBLIC_STATIC === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isStatic
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "X-Frame-Options", value: "SAMEORIGIN" },
              ],
            },
          ];
        },
      }),
};
export default nextConfig;
