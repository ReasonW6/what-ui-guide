/** Cloudflare Worker entry point for What UI?. */
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
  type ImageHandlers,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

const securityHeaders = {
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8_192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8_192));
  }
  return btoa(binary);
}

function inlineElementSources(html: string, tagName: "script" | "style"): string[] {
  const expression = new RegExp(
    `<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}\\s*>`,
    "gi",
  );
  return [...html.matchAll(expression)]
    .filter((match) => (
      tagName !== "script" || !/(?:^|\s)src\s*=/i.test(match[1])
    ))
    .map((match) => match[2])
    .filter(Boolean);
}

async function inlineSourceHashes(
  html: string,
  tagName: "script" | "style",
): Promise<string[]> {
  const sources = [...new Set(inlineElementSources(html, tagName))];
  return Promise.all(sources.map(async (source) => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(source),
    );
    return `'sha256-${bytesToBase64(new Uint8Array(digest))}'`;
  }));
}

async function contentSecurityPolicy(html: string | null): Promise<string> {
  const [scriptHashes, styleHashes] = html === null
    ? [[], []]
    : await Promise.all([
        inlineSourceHashes(html, "script"),
        inlineSourceHashes(html, "style"),
      ]);
  return [
    "default-src 'self'",
    ["script-src", "'self'", ...scriptHashes].join(" "),
    ["style-src", "'self'", ...styleHashes].join(" "),
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.siliconflow.cn",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

async function withSecurityHeaders(
  request: Request,
  response: Response,
): Promise<Response> {
  const headers = new Headers(response.headers);
  const isHtml = /^text\/html\b/i.test(headers.get("content-type") ?? "");
  const body = isHtml ? await response.text() : response.body;
  headers.set(
    "content-security-policy",
    await contentSecurityPolicy(isHtml ? body as string : null),
  );
  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value);
  }
  if (isHtml) {
    headers.delete("content-encoding");
    headers.delete("content-length");
  }
  if (new URL(request.url).protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return new Response(body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function imageOutputFormat(format: string): ImageOutputOptions["format"] {
  if (format === "image/avif" || format === "image/webp") return format;
  return "image/jpeg";
}

function assetRequest(path: string, request: Request): Request {
  const requestUrl = new URL(request.url);
  const assetUrl = new URL(path, requestUrl);
  if (assetUrl.origin !== requestUrl.origin || !assetUrl.pathname.startsWith("/")) {
    throw new Error("Image asset path must stay on the request origin.");
  }
  return new Request(assetUrl, {
    headers: { accept: request.headers.get("accept") ?? "*/*" },
  });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const assets = env.ASSETS;
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const fetchAsset = (path: string) => {
        const sourceRequest = assetRequest(path, request);
        return assets ? assets.fetch(sourceRequest) : fetch(sourceRequest);
      };
      const imageHandlers: ImageHandlers = { fetchAsset };
      const images = env.IMAGES;
      if (images) {
        imageHandlers.transformImage = async (body, { width, format, quality }) => {
          const result = await images
            .input(body)
            .transform(width > 0 ? { width } : {})
            .output({ format: imageOutputFormat(format), quality });
          return result.response();
        };
      }
      const response = await handleImageOptimization(request, imageHandlers, allowedWidths);
      return await withSecurityHeaders(request, response);
    }

    const response = await handler.fetch(request, env, ctx);
    return await withSecurityHeaders(request, response);
  },
};

export default worker;
