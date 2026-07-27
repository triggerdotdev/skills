# Batches & Query API

## Batches (Two-Phase Async API)

Low-level two-phase protocol for creating and populating batch runs via streaming NDJSON ingestion.

**When to use which API:**
- `tasks.batchTrigger()` -- normal batch triggering up to 1,000 items (preferred)
- Batches API -- batches > 1,000 items, progressive batch building, or streaming ingestion
- Do NOT use the batches API for standard batch operations; `tasks.batchTrigger()` handles serialization, chunking, and error handling automatically.

### Phase 1: batches.create(options)

Creates a batch record and returns a `batchId`. The batch is empty until items are streamed in Phase 2.

```ts
// POST /api/v3/batches
const response = await fetch("https://api.trigger.dev/api/v3/batches", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ runCount: 5000, idempotencyKey: "import-2024-03-19" }),
});
const batch = await response.json();
// batch.id -> "batch_abc123", batch.isCached -> false
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `runCount` | integer | Yes | Expected number of items. Must be >= 1. |
| `parentRunId` | string | No | Parent run friendly ID (for `batchTriggerAndWait`). |
| `resumeParentOnCompletion` | boolean | No | Resume parent when batch completes. Set `true` for `batchTriggerAndWait`. |
| `idempotencyKey` | string | No | If provided and a batch with this key exists, the existing batch is returned. |

```ts
interface CreateBatchResponse {
  id: string;           // Batch ID (starts with "batch_")
  runCount: number;
  isCached: boolean;    // true if returned from idempotency cache
  idempotencyKey?: string;
}
```

Errors: 400 (runCount <= 0 or exceeds max), 401, 422, 429 (rate limited).

### Phase 2: batches.streamItems(batchId, items)

Streams NDJSON items into an existing batch. Items are enqueued with backpressure as they arrive. The batch is sealed when the stream completes.

```ts
// POST /api/v3/batches/{batchId}/items
const items = [
  { index: 0, task: "process-user", payload: { userId: "user-1" } },
  { index: 1, task: "process-user", payload: { userId: "user-2" } },
  { index: 2, task: "process-user", payload: { userId: "user-3" } },
];
const ndjsonBody = items.map((item) => JSON.stringify(item)).join("\n");

const response = await fetch(
  `https://api.trigger.dev/api/v3/batches/${batch.id}/items`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}`,
      "Content-Type": "application/x-ndjson",
    },
    body: ndjsonBody,
  }
);
const result = await response.json();
// result.sealed -> true, result.itemsAccepted -> 3
```

**NDJSON item fields:** `index` (integer, zero-based position), `task` (string, task identifier), `payload` (object). All required.

```ts
interface StreamBatchItemsResponse {
  id: string;
  itemsAccepted: number;
  itemsDeduplicated: number; // Items already enqueued (skipped)
  sealed: boolean;           // true = batch complete, processing starts
  enqueuedCount?: number;    // Only when sealed=false
  expectedCount?: number;    // Only when sealed=false
}
```

Content-Type must be `application/x-ndjson` or `application/ndjson` (415 otherwise). When `sealed` is `false`, check `enqueuedCount` vs `expectedCount` and stream remaining items.

Errors: 400 (invalid JSON or item exceeds max size), 401, 415, 422.

### batches.retrieve(batchId)

```ts
// GET /api/v1/batches/{batchId}
const response = await fetch(`https://api.trigger.dev/api/v1/batches/${batchId}`, {
  headers: { Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}` },
});
const batch = await response.json();
```

```ts
interface RetrieveBatchResponse {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "PARTIAL_FAILED" | "ABORTED";
  idempotencyKey: string | null;
  createdAt: string;       // ISO 8601
  updatedAt: string;
  runCount: number;
  runs: string[];          // Array of run IDs
  successfulRunCount?: number; // Populated after completion
  failedRunCount?: number;
  errors?: Array<{            // Present for PARTIAL_FAILED batches
    index: number;
    taskIdentifier: string;
    error: object;
    errorCode?: string;
  }>;
}
```

### batches.retrieveResults(batchId)

Returns execution results for completed runs. Runs still executing are omitted. Returns 404 if batch does not exist.

```ts
// GET /api/v1/batches/{batchId}/results
const response = await fetch(`https://api.trigger.dev/api/v1/batches/${batchId}/results`, {
  headers: { Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}` },
});
const { id, items } = await response.json();

for (const item of items) {
  if (item.ok) {
    const output = item.outputType === "application/json"
      ? JSON.parse(item.output)
      : item.output;
    console.log(`Run ${item.id}:`, output);
  } else {
    console.error(`Run ${item.id} failed:`, item.error);
  }
}
```

```ts
interface BatchResultItem {
  ok: boolean;
  id: string;               // Run ID
  output?: string;          // Serialized output (when ok=true)
  outputType?: string;      // e.g. "application/json"
  error?: object;           // Error details (when ok=false)
  usage?: { durationMs: number };
  taskIdentifier?: string;
}

interface RetrieveBatchResultsResponse {
  id: string;
  items: BatchResultItem[];
}
```

---

## Query API (TRQL)

TRQL (Trigger.dev Query Language) is a SQL-style language for analyzing run data. Supports `SELECT`, `WHERE`, `GROUP BY`, `ORDER BY`, `LIMIT`.

### query.execute(trql, options?)

```ts
// POST /api/v1/query
import { query } from "@trigger.dev/sdk";

const result = await query.execute(
  "SELECT run_id, status FROM runs LIMIT 10"
);
```

**Type-safe queries:**

```ts
import { query, type QueryTable } from "@trigger.dev/sdk";

const result = await query.execute<
  QueryTable<"runs", "run_id" | "status" | "triggered_at">
>("SELECT run_id, status, triggered_at FROM runs LIMIT 10");

result.results.forEach((row) => {
  console.log(row.run_id, row.status); // Fully typed
});
```

**Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `scope` | `"environment" \| "project" \| "organization"` | `"environment"` | Data scope. |
| `period` | string | -- | Time shorthand: `"7d"`, `"30d"`, `"1h"`. Cannot combine with `from`/`to`. |
| `from` | ISO 8601 string | -- | Start of time range. Must pair with `to`. |
| `to` | ISO 8601 string | -- | End of time range. Must pair with `from`. |
| `format` | `"json" \| "csv"` | `"json"` | `"json"` returns `object[]`, `"csv"` returns CSV string. |

**Response:**

```ts
interface QueryResponseJson { format: "json"; results: Record<string, unknown>[]; }
interface QueryResponseCsv  { format: "csv";  results: string; }
```

### Example Queries

```ts
// Failed runs in the last 7 days
await query.execute(
  "SELECT run_id, status, triggered_at FROM runs WHERE status = 'Failed' LIMIT 50",
  { period: "7d" }
);

// Task success rates
await query.execute(
  `SELECT task_identifier, count() as total_runs, countIf(status = 'Failed') as failures
   FROM runs GROUP BY task_identifier`,
  { scope: "project", period: "30d" }
);

// Cost tracking
await query.execute(
  "SELECT task_identifier, COUNT(*) as runs, AVG(execution_duration) as avg_duration, SUM(total_cost) as cost FROM runs GROUP BY task_identifier",
  { scope: "environment", period: "30d" }
);

// CSV export
const csv = await query.execute(
  "SELECT run_id, status, triggered_at FROM runs",
  { format: "csv", period: "30d" }
);
const lines = csv.results.split("\n");

// Absolute time range
await query.execute(
  "SELECT task_identifier, count() as runs FROM runs GROUP BY task_identifier",
  { from: "2024-01-01T00:00:00Z", to: "2024-01-31T23:59:59Z" }
);
```

### Available Columns

`run_id`, `task_identifier`, `status`, `attempt_count`, `batch_id`, `completed_at`, `compute_cost`, `concurrency_key`, `delay_until`, `depth`, `dequeued_at`, `environment`, `environment_type`, `error`, `executed_at`, `execution_duration`, `expired_at`, `has_delay`, `idempotency_key`, `is_child_run`, `is_finished`, `is_root_run`, `is_test`, `machine`, `max_duration`, `output`, `parent_run_id`, `project`, `queue`, `queued_at`, `queued_duration`, `region`, `root_run_id`, `sdk_version`, `tags`, `task_version`, `total_cost`, `total_duration`, `triggered_at`, `ttl`, `usage_duration`

Key columns for cost analysis: `compute_cost`, `total_cost`, `execution_duration`, `total_duration`, `usage_duration`, `machine`.

### Errors

- **400** -- Invalid TRQL syntax or bad request parameters.
- **401** -- Missing or invalid API key.
- **500** -- Internal error during query execution.
