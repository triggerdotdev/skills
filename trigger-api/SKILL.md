---
name: trigger-api
description: Manage Trigger.dev resources via the Management API SDK. Use when listing runs, triggering tasks from backend code, managing schedules, environment variables, queues, waitpoints, or querying run data outside of task execution.
---

# Trigger.dev Management API

Manage runs, tasks, schedules, environment variables, queues, waitpoints, and deployments programmatically from your backend using the `@trigger.dev/sdk`.

## When to Use

- Listing, filtering, or monitoring runs from backend code
- Triggering tasks programmatically (outside of other tasks)
- Managing schedules (CRUD) via API instead of the dashboard
- Managing environment variables across environments
- Pausing/resuming queues or overriding concurrency limits
- Creating/completing waitpoint tokens from external systems
- Querying run data with TRQL
- Inspecting or promoting deployments

## Setup & Authentication

### Installation

```bash
npm i @trigger.dev/sdk@latest
```

### Secret Key (environment-scoped)

```ts
import { configure, query } from "@trigger.dev/sdk";

configure({
  secretKey: process.env["TRIGGER_SECRET_KEY"], // starts with tr_dev_, tr_stg_, or tr_prod_
});

const result = await query.execute("SELECT run_id, status FROM runs WHERE status = 'Completed' LIMIT 10");
```

If `TRIGGER_SECRET_KEY` is set in the environment, you can omit the `configure` call entirely.

### Personal Access Token (cross-project)

A PAT (`tr_pat_...`) is scoped to a user, not an environment. It requires `projectRef` on most methods:

```ts
configure({
  secretKey: process.env["TRIGGER_ACCESS_TOKEN"], // starts with tr_pat_
});

// projectRef is required as first argument when using PAT
const allRuns = await runs.list("proj_1234", {
  limit: 10,
  status: ["COMPLETED"],
});
```

### Auth Support by Endpoint

PAT authentication works **via the SDK only** — it does not work as a raw HTTP Bearer token.

| Resource | Secret Key | PAT (SDK only) |
|----------|-----------|----------------|
| tasks.trigger, tasks.batchTrigger | ✅ | |
| runs.list | ✅ | ❌ (broken) | ⚠️ unreliable — prefer `query.execute` (TRQL) |
| runs.retrieve, cancel, replay | ✅ | |
| envvars.* | ✅ | ✅ |
| schedules.* | ✅ | |

### Preview Branch Targeting

```ts
configure({
  secretKey: process.env["TRIGGER_ACCESS_TOKEN"],
  previewBranch: "feature-xyz",
});
```

For raw HTTP, set the `x-trigger-branch` header (only applies to the `preview` environment).

## Raw HTTP Usage

All Management API endpoints are accessible via REST. Use this when you don't have the SDK installed or are calling from a non-TypeScript environment.

```ts
// Base URL: https://api.trigger.dev
// Auth: Authorization: Bearer <secretKey>

const response = await fetch("https://api.trigger.dev/api/v1/query", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env["TRIGGER_SECRET_KEY"]}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "SELECT run_id, status, triggered_at FROM runs WHERE status = 'Completed' LIMIT 10",
    options: { period: "7d" },
  }),
});
const data = await response.json();
```

## Critical Rules

1. **Prefer `@trigger.dev/sdk`** — but raw HTTP works for any language
2. **secretKey scopes to one environment**; PAT requires `projectRef`
3. **All list methods support auto-pagination** with `for await` (SDK only)
4. **Handle `ApiError`** (SDK) or check HTTP status codes (raw)
5. **SDK auto-retries 3x** with exponential backoff by default

## Error Handling

```ts
import { runs, ApiError } from "@trigger.dev/sdk";

try {
  const run = await runs.retrieve("run_1234");
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.headers, error.body);
  }
}
```

### Custom Retry Configuration

```ts
// Global retry config
configure({
  requestOptions: {
    retry: {
      maxAttempts: 5,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 5000,
      factor: 1.8,
      randomize: true,
    },
  },
});

// Per-request retry override
const run = await runs.retrieve("run_1234", {
  retry: { maxAttempts: 1 }, // Disable retries
});
```

## Auto-Pagination

```ts
// Preferred: for-await iterates all pages automatically
for await (const run of runs.list({ limit: 10 })) {
  console.log(run.id, run.status);
}

// Manual pagination
let page = await runs.list({ limit: 10 });
for (const run of page.data) {
  console.log(run);
}
while (page.hasNextPage()) {
  page = await page.getNextPage();
}
```

## Advanced: Accessing Raw HTTP Responses

```ts
const { data: run, response: raw } = await runs.retrieve("run_1234").withResponse();
console.log(raw.status, raw.headers);

const response = await runs.retrieve("run_1234").asResponse();
```

## Quick Reference: All API Methods

| Resource | SDK Call | REST Endpoint | Reference |
|----------|---------|---------------|-----------|
| **Runs** | `runs.list(options)` | `GET /api/v1/runs` | `runs-and-tasks.md` |
| | `runs.retrieve(runId)` | `GET /api/v3/runs/{runId}` | `runs-and-tasks.md` |
| | `runs.retrieveEvents(runId)` *(REST only)* | `GET /api/v1/runs/{runId}/events` | `runs-and-tasks.md` |
| | `runs.retrieveTrace(runId)` *(REST only)* | `GET /api/v1/runs/{runId}/trace` | `runs-and-tasks.md` |
| | `runs.cancel(runId)` | `POST /api/v2/runs/{runId}/cancel` | `runs-and-tasks.md` |
| | `runs.replay(runId)` | `POST /api/v1/runs/{runId}/replay` | `runs-and-tasks.md` |
| | `runs.reschedule(runId, opts)` | `POST /api/v1/runs/{runId}/reschedule` | `runs-and-tasks.md` |
| | `runs.addTags(runId, tags)` *(REST only)* | `POST /api/v1/runs/{runId}/tags` | `runs-and-tasks.md` |
| | `runs.updateMetadata(runId, meta)` *(REST only)* | `PUT /api/v1/runs/{runId}/metadata` | `runs-and-tasks.md` |
| **Tasks** | `tasks.trigger(taskId, payload, opts?)` | `POST /api/v1/tasks/{taskId}/trigger` | `runs-and-tasks.md` |
| | `tasks.batchTrigger(taskId, items)` | `POST /api/v1/tasks/{taskId}/batch` | `runs-and-tasks.md` |
| | `tasks.batchTrigger(items)` | `POST /api/v1/tasks/batch` | `runs-and-tasks.md` |
| **Schedules** | `schedules.create(opts)` | `POST /api/v1/schedules` | `schedules.md` |
| | `schedules.list(opts?)` | `GET /api/v1/schedules` | `schedules.md` |
| | `schedules.retrieve(id)` | `GET /api/v1/schedules/{id}` | `schedules.md` |
| | `schedules.update(id, opts)` | `PUT /api/v1/schedules/{id}` | `schedules.md` |
| | `schedules.del(id)` | `DELETE /api/v1/schedules/{id}` | `schedules.md` |
| | `schedules.activate(id)` | `POST /api/v1/schedules/{id}/activate` | `schedules.md` |
| | `schedules.deactivate(id)` | `POST /api/v1/schedules/{id}/deactivate` | `schedules.md` |
| | `schedules.timezones()` | *(SDK only — no REST endpoint)* | `schedules.md` |
| **Env Vars** | `envvars.list(projRef, env)` | `GET /api/v1/projects/{ref}/envvars/{env}` | `queues-envvars-waitpoints.md` |
| | `envvars.retrieve(projRef, env, name)` | `GET /api/v1/projects/{ref}/envvars/{env}/{name}` | `queues-envvars-waitpoints.md` |
| | `envvars.create(projRef, env, opts)` | `POST /api/v1/projects/{ref}/envvars/{env}` | `queues-envvars-waitpoints.md` |
| | `envvars.update(projRef, env, name, opts)` | `PUT /api/v1/projects/{ref}/envvars/{env}/{name}` | `queues-envvars-waitpoints.md` |
| | `envvars.del(projRef, env, name)` | `DELETE /api/v1/projects/{ref}/envvars/{env}/{name}` | `queues-envvars-waitpoints.md` |
| | `envvars.upload(projRef, env, opts)` | `POST /api/v1/projects/{ref}/envvars/{env}/import` | `queues-envvars-waitpoints.md` |
| **Queues** | `queues.list()` | `GET /api/v1/queues` | `queues-envvars-waitpoints.md` |
| | `queues.retrieve(id)` | `GET /api/v1/queues/{id}` | `queues-envvars-waitpoints.md` |
| | `queues.pause(id)` | `POST /api/v1/queues/{id}/pause` | `queues-envvars-waitpoints.md` |
| | `queues.resume(id)` | `POST /api/v1/queues/{id}/resume` | `queues-envvars-waitpoints.md` |
| **Waitpoints** | `wait.createToken(opts?)` | `POST /api/v1/waitpoints/tokens` | `queues-envvars-waitpoints.md` |
| | `wait.retrieveToken(id)` | `GET /api/v1/waitpoints/tokens/{id}` | `queues-envvars-waitpoints.md` |
| | `wait.listTokens(opts?)` | `GET /api/v1/waitpoints/tokens` | `queues-envvars-waitpoints.md` |
| | `wait.completeToken(id, opts?)` | `POST /api/v1/waitpoints/tokens/{id}/complete` | `queues-envvars-waitpoints.md` |
| **Batches** | `batches.create(opts)` | `POST /api/v3/batches` | `batches-and-query.md` |
| | `batches.retrieve(id)` | `GET /api/v1/batches/{id}` | `batches-and-query.md` |
| | `batches.retrieveResults(id)` | `GET /api/v1/batches/{id}/results` | `batches-and-query.md` |
| **Query** | `query.execute(trql, opts?)` | `POST /api/v1/query` | `batches-and-query.md` |
| **Deployments** | *(REST only)* | `GET /api/v1/deployments/latest` | `queues-envvars-waitpoints.md` |
| | *(REST only)* | `GET /api/v1/deployments/{id}` | `queues-envvars-waitpoints.md` |
| | *(REST only)* | `POST /api/v1/deployments/{version}/promote` | `queues-envvars-waitpoints.md` |

## Most Common Patterns

### Trigger a Task

```ts
import { tasks } from "@trigger.dev/sdk";
import type { myTask } from "./trigger/tasks";

const handle = await tasks.trigger<typeof myTask>("my-task", {
  userId: "123",
  action: "process",
});
console.log("Run ID:", handle.id);
```

### List & Filter Runs

> **⚠️ `runs.list` is currently unreliable.** Use `query.execute` (TRQL) to fetch runs instead. TRQL is a SQL-like query language that supports filtering, aggregation, and sorting. See `references/batches-and-query.md` for full documentation.

```ts
import { query } from "@trigger.dev/sdk";

// Recent failed runs
const failed = await query.execute(
  "SELECT run_id, task_identifier, status, triggered_at FROM runs WHERE status = 'Failed' ORDER BY triggered_at DESC LIMIT 20",
  { period: "7d" }
);

// Runs for a specific task
const taskRuns = await query.execute(
  "SELECT run_id, status, execution_duration, total_cost FROM runs WHERE task_identifier = 'process-data' ORDER BY triggered_at DESC LIMIT 50",
  { period: "30d" }
);

// Summary by task
const summary = await query.execute(
  "SELECT task_identifier, COUNT(*) as runs, countIf(status = 'Failed') as failures, AVG(execution_duration) as avg_ms FROM runs GROUP BY task_identifier",
  { period: "7d" }
);
```

### Create a Schedule

```ts
import { schedules } from "@trigger.dev/sdk";

const schedule = await schedules.create({
  task: "daily-report",
  cron: "0 9 * * *",
  timezone: "America/New_York",
  externalId: "team-123",
  deduplicationKey: "team-123-daily",
});
```

### Manage Environment Variables

Environment slugs are `dev`, `staging`, `prod`, and `preview` — not the dashboard display names.

```ts
import { envvars } from "@trigger.dev/sdk";

// Bulk import
await envvars.upload("proj_1234", "dev", {
  variables: {
    API_KEY: "sk-abc123",
    DATABASE_URL: "postgres://...",
  },
  override: true,
});

// Single variable
await envvars.create("proj_1234", "prod", {
  name: "API_KEY",
  value: "sk-prod-xyz",
});
```

## Best Practices

1. **Use `query.execute` (TRQL) to fetch runs** — `runs.list` is currently unreliable; TRQL works and supports filtering, aggregation, and sorting
2. Use **secretKey** for single-environment automation; **PAT** for cross-environment tooling
3. Always configure **retry settings** for production scripts
4. Use `deduplicationKey` on schedules to prevent duplicates on redeploy
5. Use `runs.retrieve` to get full details on a specific run by ID (this works fine)
6. Check `run.isSuccess` / `run.isFailed` helpers instead of comparing status strings

See `references/` for full API documentation by resource group.
