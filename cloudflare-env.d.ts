/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface Env {
    API_RATE_LIMITER?: RateLimit;
    ASSETS?: Fetcher;
    BROWSER?: BrowserRun;
    BROWSER_ALLOWED_HOSTS?: string;
    CAPTURE_RATE_LIMITER?: RateLimit;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
    CUSTOM_PROVIDER_ALLOWED_HOSTS?: string;
    CUSTOM_PROVIDER_RATE_LIMITER?: RateLimit;
    IMAGES?: ImagesBinding;
    MANAGED_RATE_LIMITER?: RateLimit;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
  }
}
