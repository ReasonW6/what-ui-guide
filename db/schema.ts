export const requestBudgetSchemaSql = `
  CREATE TABLE IF NOT EXISTS request_budget_counters (
    bucket TEXT PRIMARY KEY NOT NULL,
    window_start INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count >= 0)
  )
`;
