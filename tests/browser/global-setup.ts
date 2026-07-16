import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const port = 4173;
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const productionServer = fileURLToPath(new URL("../../scripts/start-production.mjs", import.meta.url));

async function stopProcessTree(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;

  if (process.platform === "win32") {
    const killer = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    await once(killer, "exit");
    return;
  }

  const exitPromise = once(child, "exit");
  child.kill("SIGTERM");
  await Promise.race([
    exitPromise,
    new Promise((resolveDelay) => setTimeout(resolveDelay, 10_000)),
  ]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await exitPromise;
  }
}

export default async function globalSetup() {
  const child = spawn(
    process.execPath,
    [productionServer, "--port", String(port)],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  let output = "";
  const collect = (chunk: Buffer) => {
    output = `${output}${chunk.toString()}`.slice(-16_000);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);

  let startupTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolveReady, rejectReady) => {
      const checkReady = () => {
        if (output.includes("Production preview ready")) resolveReady();
      };
      child.stdout?.on("data", checkReady);
      child.stderr?.on("data", checkReady);
      child.once("error", rejectReady);
      child.once("exit", (code, signal) => {
        rejectReady(new Error(`Production server exited before startup (${code ?? signal}).\n${output}`));
      });
      startupTimeout = setTimeout(() => {
        rejectReady(new Error(`Timed out waiting for production server.\n${output}`));
      }, 120_000);
    });
  } catch (error) {
    await stopProcessTree(child);
    throw error;
  } finally {
    if (startupTimeout) clearTimeout(startupTimeout);
  }

  return async () => stopProcessTree(child);
}
