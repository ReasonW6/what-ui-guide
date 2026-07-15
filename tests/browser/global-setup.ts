import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const port = 4173;
const clientRoot = resolve(fileURLToPath(new URL("../../dist/client/", import.meta.url)));
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function requestHeaders(request: IncomingMessage) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

async function fetchAsset(input: Request | string): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input.url, `http://${host}:${port}`);
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const path = resolve(clientRoot, `.${pathname}`);
  if (path !== clientRoot && !path.startsWith(`${clientRoot}${sep}`)) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const body = await readFile(path);
    return new Response(new Uint8Array(body), {
      headers: { "content-type": contentTypes[extname(path).toLowerCase()] ?? "application/octet-stream" },
    });
  } catch (error) {
    if (["EISDIR", "ENOENT"].includes((error as NodeJS.ErrnoException).code ?? "")) {
      return new Response("Not Found", { status: 404 });
    }
    throw error;
  }
}

async function send(response: Response, request: IncomingMessage, outgoing: ServerResponse) {
  outgoing.statusCode = response.status;
  response.headers.forEach((value, name) => outgoing.setHeader(name, value));
  if (request.method === "HEAD" || !response.body) {
    outgoing.end();
    return;
  }
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

export default async function globalSetup() {
  const workerUrl = new URL("../../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("browser-test", `${process.pid}-${Date.now()}`);
  const worker = (await import(workerUrl.href)).default;
  const server = createServer((request, response) => {
    void (async () => {
      try {
        const url = new URL(request.url ?? "/", `http://${host}:${port}`);
        const asset = await fetchAsset(url.href);
        if (asset.status !== 404) {
          await send(asset, request, response);
          return;
        }

        const rendered = await worker.fetch(
          new Request(url, { headers: requestHeaders(request), method: request.method }),
          { ASSETS: { fetch: fetchAsset } },
          { passThroughOnException() {}, waitUntil() {} },
        );
        await send(rendered, request, response);
      } catch (error) {
        console.error(error);
        if (!response.headersSent) response.statusCode = 500;
        response.end("Internal Server Error");
      }
    })();
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, resolveListen);
  });

  return async () => {
    await new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    });
  };
}
