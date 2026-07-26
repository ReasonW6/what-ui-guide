export interface RequestBudgetStatement {
  bind(...values: readonly unknown[]): RequestBudgetStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface RequestBudgetStore {
  prepare(query: string): RequestBudgetStatement;
}

export interface RequestBudgetOptions {
  readonly bucket: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly now?: number;
}

export interface RequestBudgetDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
}

const schemaReady = new WeakMap<object, Promise<void>>();
const cleanupDueAt = new WeakMap<object, number>();
const cleanupIntervalMs = 15 * 60 * 1_000;

const createRequestBudgetTableSql = `
  CREATE TABLE IF NOT EXISTS request_budget_counters (
    bucket TEXT PRIMARY KEY NOT NULL,
    window_start INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count >= 0)
  )
`;

const consumeRequestBudgetSql = `
  INSERT INTO request_budget_counters (
    bucket,
    window_start,
    expires_at,
    request_count
  )
  VALUES (?1, ?2, ?3, 1)
  ON CONFLICT(bucket) DO UPDATE SET
    window_start = CASE
      WHEN request_budget_counters.expires_at <= ?5
      THEN excluded.window_start
      ELSE request_budget_counters.window_start
    END,
    expires_at = CASE
      WHEN request_budget_counters.expires_at <= ?5
      THEN excluded.expires_at
      ELSE request_budget_counters.expires_at
    END,
    request_count = CASE
      WHEN request_budget_counters.expires_at <= ?5
      THEN 1
      ELSE request_budget_counters.request_count + 1
    END
  WHERE
    request_budget_counters.expires_at <= ?5
    OR request_budget_counters.request_count < ?4
  RETURNING request_count AS count
`;

const cleanupExpiredRequestBudgetsSql = `
  DELETE FROM request_budget_counters
  WHERE expires_at <= ?1
`;

async function ensureRequestBudgetSchema(store: RequestBudgetStore): Promise<void> {
  const identity = store as object;
  let pending = schemaReady.get(identity);
  if (!pending) {
    pending = store.prepare(createRequestBudgetTableSql).run().then(() => undefined);
    schemaReady.set(identity, pending);
  }
  try {
    await pending;
  } catch (error) {
    schemaReady.delete(identity);
    throw error;
  }
}

async function cleanupExpiredRequestBudgets(
  store: RequestBudgetStore,
  now: number,
): Promise<void> {
  const identity = store as object;
  if ((cleanupDueAt.get(identity) ?? 0) > now) return;
  cleanupDueAt.set(identity, now + cleanupIntervalMs);
  try {
    await store.prepare(cleanupExpiredRequestBudgetsSql).bind(now).run();
  } catch {
    cleanupDueAt.delete(identity);
  }
}

export function boundedBudgetInteger(
  value: string | undefined,
  maximum: number,
): number | null {
  const normalized = value?.trim();
  if (!normalized || !/^[1-9]\d*$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) return null;
  return parsed;
}

export async function hashedRateLimitKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest).subarray(0, 16), (byte) => (
    byte.toString(16).padStart(2, "0")
  )).join("");
}

export async function consumeRequestBudget(
  store: RequestBudgetStore,
  options: RequestBudgetOptions,
): Promise<RequestBudgetDecision> {
  if (!options.bucket || options.bucket.length > 128) {
    throw new TypeError("Budget bucket must contain between 1 and 128 characters.");
  }
  if (!Number.isSafeInteger(options.limit) || options.limit < 1) {
    throw new TypeError("Budget limit must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1_000) {
    throw new TypeError("Budget window must be at least one second.");
  }

  await ensureRequestBudgetSchema(store);
  const now = options.now ?? Date.now();
  const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
  const resetAt = windowStart + options.windowMs;
  const row = await store
    .prepare(consumeRequestBudgetSql)
    .bind(options.bucket, windowStart, resetAt, options.limit, now)
    .first<{ readonly count: number }>();
  await cleanupExpiredRequestBudgets(store, now);
  if (!row) {
    return { allowed: false, remaining: 0, resetAt };
  }
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - row.count),
    resetAt,
  };
}
