import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const workerUrl = new URL("../worker/index.ts", import.meta.url);

function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

async function loadSecurityHeaderWrapper() {
  const source = await readFile(workerUrl, "utf8");
  const start = source.indexOf("const securityHeaders");
  const end = source.indexOf("function imageOutputFormat");
  assert.notEqual(start, -1, "worker must declare its shared security headers");
  assert.notEqual(end, -1, "worker must keep security wrapping before image handling");

  const compiled = ts.transpileModule(
    [
      source.slice(start, end),
      "export { withSecurityHeaders };",
    ].join("\n"),
    {
      fileName: "worker-security.ts",
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    },
  );
  const errors = (compiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], ts.formatDiagnostics(errors, {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  }));
  return import(dataUrl(compiled.outputText));
}

test("worker adds HSTS to HTTPS responses without advertising it over HTTP", async () => {
  const { withSecurityHeaders } = await loadSecurityHeaderWrapper();
  const secure = await withSecurityHeaders(
    new Request("https://example.com/"),
    new Response("secure"),
  );
  assert.equal(
    secure.headers.get("strict-transport-security"),
    "max-age=31536000; includeSubDomains",
  );

  const insecure = await withSecurityHeaders(
    new Request("http://example.com/"),
    new Response("insecure"),
  );
  assert.equal(insecure.headers.get("strict-transport-security"), null);
});

test("worker hashes actual inline script and style elements without broad inline permission", async () => {
  const { withSecurityHeaders } = await loadSecurityHeaderWrapper();
  const script = "window.__NEXT_DATA__ = {page:'/'};";
  const style = ".test { color: tomato; }";
  const html = `<!doctype html><script>${script}</script><style>${style}</style>`;
  const response = await withSecurityHeaders(
    new Request("https://example.com/"),
    new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }),
  );
  const policy = response.headers.get("content-security-policy") ?? "";
  const hash = (value) => createHash("sha256").update(value).digest("base64");

  assert.ok(policy.includes(`'sha256-${hash(script)}'`));
  assert.ok(policy.includes(`'sha256-${hash(style)}'`));
  assert.doesNotMatch(
    policy.match(/script-src [^;]*/)?.[0] ?? "",
    /unsafe-inline/,
  );
  assert.doesNotMatch(
    policy.match(/style-src [^;]*/)?.[0] ?? "",
    /unsafe-inline/,
  );
  assert.match(policy, /style-src-attr 'unsafe-inline'/);
  assert.equal(await response.text(), html);
});

test("Browser Run binding is declared consistently for remote Quick Actions", async () => {
  const [vite, types, readme] = await Promise.all([
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare-env.d.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(
    vite,
    /browser:\s*\{\s*binding:\s*"BROWSER",\s*remote:\s*true\s*\}/,
  );
  assert.match(types, /BROWSER:\s*BrowserRun;/);
  assert.match(readme, /remote:\s*true/);
  assert.match(readme, /BROWSER_ALLOWED_HOSTS/);
});
