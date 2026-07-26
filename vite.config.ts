import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";
const { d1 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_date: "2026-07-17",
  compatibility_flags: ["nodejs_compat"],
  assets: { binding: "ASSETS" },
  d1_databases: d1
    ? [{
        binding: d1,
        database_name: "what-ui-request-budgets",
        database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
      }]
    : [],
  images: { binding: "IMAGES" },
  browser: { binding: "BROWSER", remote: true },
  ratelimits: [
    { name: "API_RATE_LIMITER", namespace_id: "1784000449", simple: { limit: 30, period: 60 as const } },
    { name: "CAPTURE_RATE_LIMITER", namespace_id: "1784000450", simple: { limit: 4, period: 60 as const } },
    { name: "MANAGED_RATE_LIMITER", namespace_id: "1784000451", simple: { limit: 8, period: 60 as const } },
    { name: "CUSTOM_PROVIDER_RATE_LIMITER", namespace_id: "1784000452", simple: { limit: 10, period: 60 as const } },
  ],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
