import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function hasOption(longName, shortName) {
  return args.some((arg) => (
    arg === `--${longName}`
    || arg === `-${shortName}`
    || arg.startsWith(`--${longName}=`)
  ));
}

function optionValue(longName, shortName, fallback) {
  const equalsArg = args.find((arg) => arg.startsWith(`--${longName}=`));
  if (equalsArg) return equalsArg.slice(equalsArg.indexOf("=") + 1);
  const index = args.findIndex((arg) => arg === `--${longName}` || arg === `-${shortName}`);
  return index >= 0 ? args[index + 1] : fallback;
}

function canConnect(host, port) {
  return new Promise((resolveConnection) => {
    const socket = createConnection({ host, port });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.end();
      resolveConnection(true);
    });
    const unavailable = () => {
      socket.destroy();
      resolveConnection(false);
    };
    socket.once("error", unavailable);
    socket.once("timeout", unavailable);
  });
}

function previewUrl(host, port) {
  const urlHost = host.includes(":") ? `[${host}]` : host;
  return `http://${urlHost}:${port}`;
}

async function isHealthy(url) {
  try {
    const response = await fetch(url, {
      headers: { accept: "text/html" },
      redirect: "manual",
      signal: AbortSignal.timeout(2_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    await response.body?.cancel();
    if (response.status !== 200 || !/^text\/html\b/i.test(contentType)) return false;

    const asset = await fetch(new URL("/favicon.svg", url), {
      headers: { accept: "image/svg+xml" },
      redirect: "manual",
      signal: AbortSignal.timeout(2_000),
    });
    const assetContentType = asset.headers.get("content-type") ?? "";
    await asset.body?.cancel();
    return asset.status === 200 && /^image\/svg\+xml\b/i.test(assetContentType);
  } catch {
    return false;
  }
}

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

async function stopProcessTree(child, signal = "SIGTERM") {
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

  const exitPromise = once(child, "exit");
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ESRCH")) throw error;
    return;
  }

  await Promise.race([
    exitPromise,
    new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000)),
  ]);
  if (child.exitCode === null && child.signalCode === null) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ESRCH")) throw error;
      return;
    }
    await exitPromise;
  }
}

async function main() {
  const host = optionValue("ip", "i", "127.0.0.1");
  const port = Number(optionValue("port", "p", process.env.PORT ?? "3000"));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${port}`);
  }
  const probeHost = host === "0.0.0.0" ? "127.0.0.1" : host === "::" ? "::1" : host;
  const healthUrl = previewUrl(probeHost, port);
  if (await canConnect(probeHost, port)) {
    throw new Error(`Port ${port} on ${host} is already in use`);
  }

  const packagePath = fileURLToPath(import.meta.resolve("wrangler/package.json"));
  const manifest = JSON.parse(await readFile(packagePath, "utf8"));
  const binEntry = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.wrangler;
  if (!binEntry) throw new Error("Wrangler executable was not found");

  const stateRoot = resolve(".wrangler", "production-preview");
  const forwardedArgs = [...args];
  if (!hasOption("ip", "i")) forwardedArgs.push("--ip", host);
  if (!hasOption("port", "p")) forwardedArgs.push("--port", String(port));
  const child = spawn(process.execPath, [
    resolve(dirname(packagePath), binEntry),
    "dev",
    "--config",
    "dist/server/wrangler.json",
    "--show-interactive-dev-session=false",
    ...forwardedArgs,
  ], {
    env: {
      ...process.env,
      MINIFLARE_REGISTRY_PATH: resolve(stateRoot, "registry"),
      WRANGLER_LOG_PATH: resolve(stateRoot, "logs"),
      WRANGLER_WRITE_LOGS: "false",
      XDG_CONFIG_HOME: stateRoot,
    },
    stdio: ["inherit", "pipe", "inherit"],
    detached: process.platform !== "win32",
    windowsHide: true,
  });
  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));

  let requestedSignal;
  const signalHandlers = new Map();
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const handler = () => {
      requestedSignal = signal;
      void stopProcessTree(child, signal);
    };
    signalHandlers.set(signal, handler);
    process.once(signal, handler);
  }

  let childError;
  let exitResult;
  child.once("error", (error) => {
    childError = error;
  });
  const exitPromise = new Promise((resolveExit) => {
    child.once("exit", (code, signal) => {
      exitResult = { code, signal };
      resolveExit(exitResult);
    });
  });

  try {
    const deadline = Date.now() + 120_000;
    let healthy = false;
    while (!childError && !exitResult && Date.now() < deadline && !healthy) {
      healthy = await isHealthy(healthUrl);
      if (healthy) break;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
    if (childError) throw childError;
    if (exitResult) {
      throw new Error(`Wrangler exited before startup (${exitResult.code ?? exitResult.signal})`);
    }
    if (!healthy) throw new Error(`Timed out waiting for a healthy production preview at ${healthUrl}`);

    console.log(`[what-ui] Production preview ready at ${healthUrl}`);
    const { code, signal } = await exitPromise;
    if (!requestedSignal && code) process.exitCode = code;
    else if (!requestedSignal && signal && !["SIGINT", "SIGTERM"].includes(signal)) process.exitCode = 1;
  } finally {
    for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
    await stopProcessTree(child);
  }
}

try {
  await main();
} catch (error) {
  console.error(`[what-ui] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
