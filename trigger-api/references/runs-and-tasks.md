# Runs & Task Triggering

SDK methods for triggering tasks and managing runs via the Trigger.dev Management API.
All methods require a Secret API key (`TRIGGER_SECRET_KEY` env var or `configure()`).

---

## Task Triggering

### tasks.trigger(taskId, payload, options?)

Trigger a single task by its identifier. Returns the run ID.

```typescript
// POST /api/v1/tasks/{taskIdentifier}/trigger
import { tasks } from "@trigger.dev/sdk";

const handle = await tasks.trigger("my-task", { message: "Hello, world!" }, {
  idempotencyKey: "unique-key-123",
  concurrencyKey: "user123-task",
  queue: { name: "my-task-queue", concurrencyLimit: 5 },
  tags: ["user_123456"],
  delay: "1h",
  ttl: "1h42m",
  machine: "small-2x",
});
console.log(handle.id); // "run_1234"
```

Or trigger from a task handle: `await myTask.trigger({ message: "Hello" }, { idempotencyKey: "key-123" });`

**Response:** `{ id: string }` -- the triggered run ID.

---

### tasks.batchTrigger(taskId, items) -- same task batch

Batch trigger a single task with up to 1,000 payloads (500 in SDK < 4.3.1).

```typescript
// POST /api/v1/tasks/{taskIdentifier}/batch
const result = await myTask.batchTrigger([
  { payload: { message: "Hello, world!" } },
  { payload: { message: "Hello again!" } },
]);
console.log(result.batchId); // "batch_1234"
console.log(result.runs);    // ["run_1234", "run_5678"]
```

Each item can have its own options (see Trigger Options Reference below).

**Response:** `{ batchId: string; runs: string[] }`

---

### tasks.batchTrigger(items) -- cross-task batch

Batch trigger different tasks in a single request. Up to 1,000 items. Each item specifies its own task identifier.

```typescript
// POST /api/v1/tasks/batch
import { tasks } from "@trigger.dev/sdk";

const result = await tasks.batchTrigger([
  {
    task: "send-email",
    payload: { to: "user@example.com", subject: "Hello" },
    options: { tags: ["user_123456"] },
  },
  {
    task: "process-image",
    payload: { url: "https://example.com/image.png" },
    options: { machine: "large-1x" },
  },
]);
console.log(result.batchId); // "batch_1234"
console.log(result.runs);    // ["run_1234", "run_5678"]
```

**Constraints:** Max 1,000 items per batch (500 in SDK < 4.3.1). Max payload: 3MB per request. Each item requires a `task` field.

---

## Runs -- List & Filter

> **⚠️ `runs.list` is currently unreliable.** Prefer `query.execute` (TRQL) for fetching and filtering runs. TRQL supports `SELECT`, `WHERE`, `GROUP BY`, `ORDER BY`, and aggregation. See `references/batches-and-query.md` for full documentation and examples.

### runs.list(options)

List runs with filtering and cursor-based pagination.

```typescript
// GET /api/v1/runs
import { runs } from "@trigger.dev/sdk";

let page = await runs.list({ limit: 20 });
for (const run of page.data) {
  console.log(`Run ID: ${run.id}, Status: ${run.status}`);
}

// Manual pagination
while (page.hasNextPage()) {
  page = await page.getNextPage();
}

// Auto-pagination (async iterator)
for await (const run of runs.list({ limit: 20 })) {
  console.log(run.id);
}
```

**Filtered listing:**

```typescript
const response = await runs.list({
  status: ["QUEUED", "EXECUTING"],
  taskIdentifier: ["my-task", "my-other-task"],
  from: new Date("2024-04-01T00:00:00Z"),
  to: new Date(),
  tag: ["user_123456"],
  isTest: false,
});
```

#### Filter Parameters

| Parameter        | Type       | Description                                        |
|------------------|------------|----------------------------------------------------|
| `limit`          | `number`   | Runs per page. Min 10, max 100, default 25         |
| `status`         | `string[]` | Filter by run status (see enum below)              |
| `taskIdentifier` | `string[]` | Filter by task identifier(s)                       |
| `version`        | `string[]` | Filter by worker version                           |
| `from`           | `Date`     | Start date filter (`createdAt` >= from)            |
| `to`             | `Date`     | End date filter (`createdAt` <= to)                |
| `period`         | `string`   | Shorthand period filter, e.g. `"1d"`, `"7d"`      |
| `tag`            | `string[]` | Filter by attached tags                            |
| `bulkAction`     | `string`   | Filter by bulk action ID                           |
| `schedule`       | `string`   | Filter by schedule ID                              |
| `isTest`         | `boolean`  | Filter test vs production runs                     |

#### Run Status Enum

| Status             | Description                                    |
|--------------------|------------------------------------------------|
| `PENDING_VERSION`  | Waiting for a matching worker version          |
| `DELAYED`          | Triggered with delay, waiting to be enqueued   |
| `QUEUED`           | In queue, waiting for execution                |
| `EXECUTING`        | Currently running                              |
| `REATTEMPTING`     | Failed, scheduled for retry                    |
| `FROZEN`           | Paused/frozen mid-execution                    |
| `COMPLETED`        | Finished successfully                          |
| `CANCELED`         | Canceled by user or API                        |
| `FAILED`           | Task code threw an error                       |
| `CRASHED`          | Worker process crashed                         |
| `INTERRUPTED`      | Execution was interrupted                      |
| `SYSTEM_FAILURE`   | Internal system error                          |

---

## Runs -- Retrieve

### runs.retrieve(runId)

Retrieve full run details including status, payload, output, attempts, and related runs.

```typescript
// GET /api/v3/runs/{runId}
import { runs } from "@trigger.dev/sdk";

const run = await runs.retrieve("run_1234");

if (run.isSuccess) {
  console.log("Output:", run.output);
}
console.log("Status:", run.status);
console.log("Payload:", run.payload);

for (const attempt of run.attempts) {
  if (attempt.status === "FAILED") {
    console.log("Error:", attempt.error);
  }
}
```

**Notes:**
- Public API key auth omits `payload` and `output` for security.
- Large payloads/outputs return presigned URLs (`payloadPresignedUrl`, `outputPresignedUrl`) that expire in 5 minutes.
- `relatedRuns` includes `root`, `parent`, and `children` run objects when applicable.
- `schedule` is included if the run was triggered by a schedule.

---

### runs.retrieveEvents(runId) — REST only

Returns all OTel span events for a run. Useful for debugging and observability. Not exposed in the SDK's `runs` namespace — use raw HTTP.

```typescript
// GET /api/v1/runs/{runId}/events
const response = await fetch("https://api.trigger.dev/api/v1/runs/run_1234/events", {
  headers: { Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}` },
});
const { events } = await response.json();
```

Each event: `{ spanId, parentId?, runId?, message, startTime, duration, isError, isPartial, isCancelled, level, kind, attemptNumber?, taskSlug, events[] }`. Level enum: `TRACE | DEBUG | LOG | INFO | WARN | ERROR`. Kind enum: `UNSPECIFIED | INTERNAL | SERVER | CLIENT | PRODUCER | CONSUMER | UNRECOGNIZED | LOG`.

---

### runs.retrieveTrace(runId) — REST only

Returns the full OTel trace tree for a run including all spans and their children. Not exposed in the SDK's `runs` namespace — use raw HTTP.

```typescript
// GET /api/v1/runs/{runId}/trace
const response = await fetch("https://api.trigger.dev/api/v1/runs/run_1234/trace", {
  headers: { Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}` },
});
const { trace } = await response.json();
console.log(trace.traceId);  // OTel trace ID
console.log(trace.rootSpan); // Root span with nested children
```

Recursive tree structure. Each span: `{ id, parentId?, runId, data: { message, taskSlug, startTime, duration, isError, isPartial, isCancelled, level, attemptNumber?, properties, events[] }, children: SpanNode[] }`.

---

## Runs -- Mutations

### runs.cancel(runId)

Cancels an in-progress run. No effect if the run is already completed.

```typescript
// POST /api/v2/runs/{runId}/cancel
import { runs } from "@trigger.dev/sdk";
await runs.cancel("run_1234");
```

**Response:** `{ id: "run_1234" }`

---

### runs.replay(runId)

Creates a new run with the same payload and options as the original run.

```typescript
// POST /api/v1/runs/{runId}/replay
import { runs } from "@trigger.dev/sdk";
const handle = await runs.replay("run_1234");
console.log(handle.id); // New run ID
```

**Response:** `{ id: string }` -- the new run ID.

---

### runs.reschedule(runId, options)

Updates a delayed run with a new delay. Only valid when the run is in the `DELAYED` state.

```typescript
// POST /api/v1/runs/{runId}/reschedule
import { runs } from "@trigger.dev/sdk";

await runs.reschedule("run_1234", { delay: new Date("2024-06-29T20:45:56.340Z") });
// Or duration string:
await runs.reschedule("run_1234", { delay: "6h" });
```

**Request body:** `{ delay: string | Date }` -- duration string (`"1d"`, `"6h"`, `"10m"`) or ISO date.

**Response:** Full run object (same as `runs.retrieve`).

---

### runs.addTags(runId, tags) — REST only

Adds one or more tags to a run. Duplicate tags are ignored. Not exposed in the SDK's `runs` namespace — use raw HTTP.

```typescript
// POST /api/v1/runs/{runId}/tags
import { runs } from "@trigger.dev/sdk";
await runs.addTags("run_1234", ["tag-1", "tag-2"]);
```

**Response:** `{ message: string }` (e.g., `"Successfully set 2 new tags."`)

**Constraints:** Max 10 tags per run (returns `422` if exceeded). Each tag < 128 characters. Recommend namespaced tags: `user_1234567`, `org:9876543`.

---

### runs.updateMetadata(runId, metadata) — REST only

Replaces the metadata on a run. Metadata is arbitrary JSON. Not exposed in the SDK's `runs` namespace — use raw HTTP.

```typescript
// PUT /api/v1/runs/{runId}/metadata
import { runs } from "@trigger.dev/sdk";
await runs.updateMetadata("run_1234", { key: "value", progress: 0.5 });
```

From inside a running task, use `metadata.save({ key: "value" })` instead.

**Response:** `{ metadata: { ... } }` -- the updated metadata object.

---

## Run Object Reference

```typescript
interface RunObject {
  id: string;                  // "run_1234"
  status: RunStatus;
  taskIdentifier: string;      // "my-task"
  version?: string;            // "20240523.1"
  idempotencyKey?: string;
  isTest?: boolean;
  createdAt: string;           // ISO date-time
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  delayedUntil?: string;
  ttl?: string | number;       // "1h42m" or seconds
  expiredAt?: string;
  tags?: string[];             // Max 10, each < 128 chars
  metadata?: Record<string, unknown>;
  costInCents?: number;        // Compute cost (not DEV)
  baseCostInCents?: number;    // Invocation cost (not DEV)
  durationMs?: number;         // Compute duration, excludes waits
  depth?: number;              // 0 = root run
  batchId?: string;
  triggerFunction?: "trigger" | "triggerAndWait" | "batchTrigger" | "batchTriggerAndWait";
  // Only on runs.retrieve():
  payload?: object;
  payloadPresignedUrl?: string;   // If payload too large (expires 5min)
  output?: object;
  outputPresignedUrl?: string;    // If output too large (expires 5min)
  attempts: Attempt[];
  relatedRuns?: { root?: RunObject; parent?: RunObject; children?: RunObject[] };
  schedule?: {
    id: string;                   // "sched_1234"
    externalId?: string;
    deduplicationKey?: string;
    generator: { type: "CRON"; expression: string; description?: string };
  };
  // Boolean helpers (SDK only)
  isSuccess: boolean;
  isFailed: boolean;
  isCompleted: boolean;
}

interface Attempt {
  id: string;                  // "attempt_1234"
  status: "PENDING" | "EXECUTING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELED";
  error?: { message: string; name?: string; stackTrace?: string };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

type RunStatus =
  | "PENDING_VERSION" | "DELAYED" | "QUEUED" | "EXECUTING"
  | "REATTEMPTING" | "FROZEN" | "COMPLETED" | "CANCELED"
  | "FAILED" | "CRASHED" | "INTERRUPTED" | "SYSTEM_FAILURE";
```

---

## Trigger Options Reference

Options interface used by `tasks.trigger()` and batch trigger item options:

```typescript
interface TriggerOptions {
  queue?: {
    name?: string;              // Shared queue name
    concurrencyLimit?: number;  // 0-1000, limits concurrent executions
  };
  concurrencyKey?: string;      // Scope concurrency to a specific key
  idempotencyKey?: string;      // Prevents duplicate runs; returns existing run ID
  ttl?: string | number;        // "1h", "1h42m", or seconds (min 1)
  delay?: string | Date;        // "1h", "30d", "15m", "2w", "60s", or Date
  tags?: string | string[];     // Max 10 tags, each < 128 chars
  machine?: MachinePreset;      // Overrides task default machine
}

type MachinePreset =
  | "micro" | "small-1x" | "small-2x"
  | "medium-1x" | "medium-2x"
  | "large-1x" | "large-2x";
```

**Key constraints:**
- **Tags:** Max 10 per run, each < 128 characters. Use namespaced prefixes (`user_123`, `org:456`).
- **TTL:** Run is removed from queue and never executes if not started within this time.
- **Delay formats:** `"1h"`, `"30d"`, `"15m"`, `"2w"`, `"60s"`, or `Date` / ISO string.
- **Idempotency:** Existing key returns existing run ID without creating a duplicate.
- **Concurrency limit:** 0-1000. Omitting allows full environment concurrency.
