import { spawn } from "node:child_process";
import { once } from "node:events";
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
  for (const [name, expected] of [
    ["content-security-policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.siliconflow.cn; worker-src 'self' blob:; frame-src 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'"],
    ["permissions-policy", "camera=(), geolocation=(), microphone=()"],
    ["referrer-policy", "strict-origin-when-cross-origin"],
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "DENY"],
  ]) {
    if (home.headers.get(name) !== expected) {
      throw new Error(`Production response is missing the expected ${name} header.`);
    }
  }
  await home.body?.cancel();

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
    ["scripts/start-production.mjs", "--port", String(port)],
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
  }
}

main().catch((error) => {
  console.error(`[what-ui] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
