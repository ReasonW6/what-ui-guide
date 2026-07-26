import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadRequestBudgetModule() {
  const source = await readFile(
    new URL("../lib/request-budget.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

class FakeStatement {
  constructor(store, query) {
    this.store = store;
    this.query = query;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    if (/CREATE TABLE IF NOT EXISTS request_budget_counters/.test(this.query)) {
      this.store.schemaRuns += 1;
      return {};
    }
    assert.match(this.query, /DELETE FROM request_budget_counters/);
    const [now] = this.values;
    for (const [bucket, row] of this.store.rows) {
      if (row.expiresAt <= now) this.store.rows.delete(bucket);
    }
    this.store.cleanupRuns += 1;
    return {};
  }

  async first() {
    assert.match(this.query, /INSERT INTO request_budget_counters/);
    const [bucket, windowStart, expiresAt, limit, now] = this.values;
    const existing = this.store.rows.get(bucket);
    if (!existing || existing.expiresAt <= now) {
      this.store.rows.set(bucket, { count: 1, expiresAt, windowStart });
      return { count: 1 };
    }
    if (existing.count >= limit) return null;
    existing.count += 1;
    return { count: existing.count };
  }
}

class FakeStore {
  rows = new Map();
  schemaRuns = 0;
  cleanupRuns = 0;

  prepare(query) {
    return new FakeStatement(this, query);
  }
}

test("durable request budgets enforce and reset an atomic window", async () => {
  const { consumeRequestBudget } = await loadRequestBudgetModule();
  const store = new FakeStore();
  store.rows.set("expired-client", {
    count: 1,
    expiresAt: 999,
    windowStart: 0,
  });
  const options = {
    bucket: "api:client",
    limit: 2,
    windowMs: 60_000,
  };

  assert.deepEqual(
    await consumeRequestBudget(store, { ...options, now: 1_000 }),
    { allowed: true, remaining: 1, resetAt: 60_000 },
  );
  assert.deepEqual(
    await consumeRequestBudget(store, { ...options, now: 2_000 }),
    { allowed: true, remaining: 0, resetAt: 60_000 },
  );
  assert.deepEqual(
    await consumeRequestBudget(store, { ...options, now: 3_000 }),
    { allowed: false, remaining: 0, resetAt: 60_000 },
  );
  assert.deepEqual(
    await consumeRequestBudget(store, { ...options, now: 60_001 }),
    { allowed: true, remaining: 1, resetAt: 120_000 },
  );
  assert.equal(store.schemaRuns, 1);
  assert.equal(store.cleanupRuns, 1);
  assert.equal(store.rows.has("expired-client"), false);
});

test("managed budgets require an explicit bounded positive integer", async () => {
  const { boundedBudgetInteger } = await loadRequestBudgetModule();
  assert.equal(boundedBudgetInteger(undefined, 10_000), null);
  assert.equal(boundedBudgetInteger("0", 10_000), null);
  assert.equal(boundedBudgetInteger("10001", 10_000), null);
  assert.equal(boundedBudgetInteger("2.5", 10_000), null);
  assert.equal(boundedBudgetInteger(" 250 ", 10_000), 250);
});

test("rate-limit identities are stable hashes instead of stored IP addresses", async () => {
  const { hashedRateLimitKey } = await loadRequestBudgetModule();
  const first = await hashedRateLimitKey("203.0.113.7");
  assert.equal(first, await hashedRateLimitKey("203.0.113.7"));
  assert.notEqual(first, await hashedRateLimitKey("203.0.113.8"));
  assert.match(first, /^[0-9a-f]{32}$/);
  assert.doesNotMatch(first, /203|113/);
});

test("deployment configuration wires D1 and never restores isolate-local counters", async () => {
  const [hostingText, vite, route, types, readme] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/identify/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare-env.d.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);
  assert.equal(JSON.parse(hostingText).d1, "DB");
  assert.match(vite, /d1_databases:\s*d1/);
  assert.match(types, /DB\?:\s*D1Database/);
  assert.match(route, /consumeRequestBudget/);
  assert.match(route, /x-rate-limit-scope", "durable-d1"/);
  assert.doesNotMatch(route, /localRateBuckets|new Map<.*Rate/);
  assert.match(readme, /MANAGED_AI_DAILY_LIMIT/);
});
