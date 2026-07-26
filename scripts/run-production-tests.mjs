import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { access } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const probeOnly = process.argv.includes("--probe-only");

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolveExit) => {
    const finish = (exited) => {
      clearTimeout(timeout);
      child.off("exit", onExit);
      child.off("error", onError);
      resolveExit(exited);
    };
    const onExit = () => finish(true);
    const onError = () => finish(false);
    const timeout = setTimeout(() => finish(false), timeoutMs);
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

async function reservePort() {
  const server = createServer();
  server.unref();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a test port.");
  await new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
  return address.port;
}

async function assertDeploymentOutputIsStateless() {
  const stateDirectory = resolve(root, "dist", "server", ".wrangler", "state");
  try {
    await access(stateDirectory);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`Production preview persisted local state inside deployment output: ${stateDirectory}`);
}

function inlineElementSources(html, tagName) {
  const expression = new RegExp(
    `<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}\\s*>`,
    "gi",
  );
  return [...html.matchAll(expression)]
    .filter((match) => tagName !== "script" || !/\bsrc\s*=/i.test(match[1]))
    .map((match) => match[2])
    .filter(Boolean);
}

function sha256Source(value) {
  return createHash("sha256").update(value).digest("base64");
}

function cspDirective(policy, name) {
  return policy.split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${name} `)) ?? "";
}

async function stopProcessTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    if (child.exitCode === null && child.signalCode === null) {
      const killer = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      if (!(await waitForExit(killer, 10_000))) killer.kill();
      if (!(await waitForExit(child, 5_000))) {
        child.kill("SIGKILL");
        await waitForExit(child, 2_000);
      }
    }
    child.stdout?.destroy();
    child.stderr?.destroy();
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ESRCH")) throw error;
    return;
  }
  await Promise.race([
    once(child, "exit"),
    new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000)),
  ]);
  if (child.exitCode === null && child.signalCode === null) {
    process.kill(-child.pid, "SIGKILL");
  }
}

function waitForServer(child) {
  return new Promise((resolveReady, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for the production preview."));
    }, 120_000);
    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout?.off("data", onData);
      child.off("error", onError);
      child.off("exit", onExit);
    };
    const onData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      output = `${output}${text}`.slice(-2_000);
      if (output.includes("Production preview ready")) {
        cleanup();
        resolveReady();
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onExit = (code, signal) => {
      cleanup();
      reject(new Error(`Production preview exited early (${code ?? signal}).`));
    };
    child.stdout?.on("data", onData);
    child.once("error", onError);
    child.once("exit", onExit);
  });
}

async function verifyProductionSurface(baseUrl) {
  const home = await fetch(new URL("/", baseUrl), {
    headers: { accept: "text/html" },
  });
  const homeContentType = home.headers.get("content-type") ?? "";
  if (home.status !== 200 || !/^text\/html\b/i.test(homeContentType)) {
    throw new Error(`Production health check failed (${home.status}, ${homeContentType || "no content type"}).`);
  }
  const html = await home.text();
  const contentSecurityPolicy = home.headers.get("content-security-policy") ?? "";
  const scriptDirective = cspDirective(contentSecurityPolicy, "script-src");
  const styleDirective = cspDirective(contentSecurityPolicy, "style-src");
  if (
    !scriptDirective
    || !styleDirective
    || /unsafe-inline/.test(scriptDirective)
    || /unsafe-inline/.test(styleDirective)
    || !contentSecurityPolicy.includes("style-src-attr 'unsafe-inline'")
  ) {
    throw new Error("Production CSP did not isolate inline scripts and style elements.");
  }
  for (const [tagName, directive] of [
    ["script", scriptDirective],
    ["style", styleDirective],
  ]) {
    for (const source of inlineElementSources(html, tagName)) {
      const token = `'sha256-${sha256Source(source)}'`;
      if (!directive.includes(token)) {
        throw new Error(`Production CSP is missing the ${tagName} hash ${token}.`);
      }
    }
  }
  for (const [name, expected] of [
    ["permissions-policy", "camera=(), geolocation=(), microphone=()"],
    ["referrer-policy", "strict-origin-when-cross-origin"],
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "DENY"],
  ]) {
    if (home.headers.get(name) !== expected) {
      throw new Error(`Production response is missing the expected ${name} header.`);
    }
  }

  const imageUrl = new URL("/_vinext/image", baseUrl);
  imageUrl.searchParams.set("url", "/og.png");
  imageUrl.searchParams.set("w", "640");
  imageUrl.searchParams.set("q", "75");
  const image = await fetch(imageUrl, { headers: { accept: "image/webp,image/*" } });
  const imageContentType = image.headers.get("content-type") ?? "";
  const imageBytes = await image.arrayBuffer();
  if (image.status !== 200 || !/^image\//i.test(imageContentType) || imageBytes.byteLength === 0) {
    throw new Error(`Image endpoint failed (${image.status}, ${imageContentType || "no content type"}, ${imageBytes.byteLength} bytes).`);
  }
}

async function main() {
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[what-ui] Starting production HTTP tests at ${baseUrl}`);
  const server = spawn(
    process.execPath,
    ["scripts/start-production.mjs", "--local", "--port", String(port)],
    {
      cwd: root,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        BROWSER_ALLOWED_HOSTS: "",
        OPENAI_API_KEY: "",
      },
      stdio: ["ignore", "pipe", "inherit"],
      windowsHide: true,
    },
  );

  try {
    await waitForServer(server);
    await verifyProductionSurface(baseUrl);
    if (probeOnly) {
      console.log("[what-ui] Production security and image probes passed.");
      return;
    }
    console.log("[what-ui] Production Worker is ready; running HTTP contracts.");
    const tests = spawn(
      process.execPath,
      [
        "--test",
        "--test-concurrency=1",
        "tests/identify-route.test.mjs",
        "tests/rendered-html.test.mjs",
      ],
      {
        cwd: root,
        env: { ...process.env, WHAT_UI_TEST_BASE_URL: baseUrl },
        stdio: "inherit",
        windowsHide: true,
      },
    );
    const [code, signal] = await once(tests, "exit");
    if (code !== 0) {
      throw new Error(`Production tests failed (${code ?? signal}).`);
    }
  } finally {
    await stopProcessTree(server);
    await assertDeploymentOutputIsStateless();
  }
}

main().catch((error) => {
  console.error(`[what-ui] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
