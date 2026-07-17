/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface Env {
    BROWSER?: BrowserRun;
    BROWSER_ALLOWED_HOSTS?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
    DB?: D1Database;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
  }
}
