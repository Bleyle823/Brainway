import { cloudflare } from "@cloudflare/vite-plugin";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Cloudflare plugin is build-only — including it in dev causes SSR virtual-module
// resolution conflicts with TanStack Start.
const isBuild = process.env.NODE_ENV === "production" || process.argv.includes("build");
/** BRAINWAY_VERCEL_DEPLOY is set by vercel.json buildCommand (works even if system env vars are disabled). VERCEL=1 requires “System environment variables” enabled in Vercel project settings. */
const useVercelNitro =
  process.env.BRAINWAY_VERCEL_DEPLOY === "1" || process.env.VERCEL === "1";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    ...(isBuild && useVercelNitro ? [nitro({ preset: "vercel" })] : []),
    react(),
    tsconfigPaths({
      // Only scan the project source — avoids spamming warnings from bun's global cache
      root: process.cwd(),
    }),
    tailwindcss(),
    ...(isBuild && !useVercelNitro ? [cloudflare()] : []),
  ],
  optimizeDeps: {
    // These packages use TanStack Start's virtual modules (#tanstack-router-entry etc.)
    // which are registered by the plugin at runtime — exclude them from esbuild pre-bundling
    exclude: [
      "@tanstack/start-server-core",
      "@tanstack/react-start-server",
      "@tanstack/react-start",
      "@tanstack/start-client-core",
    ],
  },
  ssr: {
    // Keep these as ESM so TanStack Start's virtual-module injection works at SSR time
    noExternal: ["@tanstack/react-start", "@tanstack/react-router"],
  },
});
