# Queues, Environment Variables, Waitpoints & Deployments

Management API for queues, environment variables, waitpoint tokens, and deployments.
All SDK methods use `TRIGGER_SECRET_KEY` by default. Override with `configure({ accessToken })`.

---

## Queues

```typescript
import { queues } from "@trigger.dev/sdk";
```

### queues.list(options?)

<!-- GET /api/v1/queues -->

List all queues in the environment with pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | `number` | No | Page number (1-based) |
| `perPage` | `number` | No | Queues per page |

```typescript
const allQueues = await queues.list();
const pagedQueues = await queues.list({ page: 1, perPage: 20 });
```

Response: `{ data: QueueObject[], pagination: { currentPage, totalPages, count } }`.

### queues.retrieve(queueIdOrName)

<!-- GET /api/v1/queues/{queueParam} -->

Get a queue by ID, or by type and name. The `type` parameter controls how the path param is interpreted: `"id"` (default), `"task"`, or `"custom"`.

```typescript
const queue = await queues.retrieve("queue_1234");
const taskQueue = await queues.retrieve({ type: "task", name: "my-task-id" });
const customQueue = await queues.retrieve({ type: "custom", name: "my-custom-queue" });
```

```typescript
interface QueueObject {
  id: string;                      // e.g. "queue_1234"
  name: string;                    // task ID or custom queue name
  type: "task" | "custom";
  running: number;                 // currently executing
  queued: number;                  // waiting to execute
  paused: boolean;
  concurrencyLimit: number | null;
  concurrency: {
    current: number | null;        // effective limit
    base: number | null;           // defined in code
    override: number | null;       // API override (if set)
    overriddenAt: string | null;   // ISO 8601
    overriddenBy: string | null;   // null when set via API
  };
}
```

### queues.pause(queueIdOrName) / queues.resume(queueIdOrName)

<!-- POST /api/v1/queues/{queueParam}/pause -->

Pause a queue to stop new runs from starting, or resume it. In-flight runs continue to completion.

```typescript
await queues.pause("queue_1234");
await queues.pause({ type: "task", name: "my-task-id" });
await queues.resume("queue_1234");
await queues.resume({ type: "task", name: "my-task-id" });
```

Returns `QueueObject` with updated `paused` state.

### queues.overrideConcurrencyLimit(queueIdOrName, limit)

<!-- POST /api/v1/queues/{queueParam}/concurrency/override -->

Temporarily override the concurrency limit (0--100,000). Useful for scaling up/down based on demand.

```typescript
await queues.overrideConcurrencyLimit("queue_1234", 5);
await queues.overrideConcurrencyLimit({ type: "task", name: "my-task-id" }, 20);
```

Returns `QueueObject`. The `concurrency.override` field reflects the new value.

### queues.resetConcurrencyLimit(queueIdOrName)

<!-- POST /api/v1/queues/{queueParam}/concurrency/reset -->

Reset the concurrency limit back to its base value defined in code. Returns 400 if no active override.

```typescript
await queues.resetConcurrencyLimit("queue_1234");
await queues.resetConcurrencyLimit({ type: "task", name: "my-task-id" });
```

Returns `QueueObject` with `concurrency.override` set to `null`.

---

## Environment Variables

All methods require `projectRef` (starts with `proj_`) and `env` (`"dev"` | `"staging"` | `"prod"` | `"preview"`).
These are API slugs, not dashboard display names. Inside a task, both are auto-inferred -- pass only the variable-specific args.

Auth: Secret API Key (`tr_dev_*`, `tr_prod_*`) or Personal Access Token (`tr_pat_*`).

```typescript
import { envvars } from "@trigger.dev/sdk";
```

```typescript
interface EnvVar { name: string; value: string; }
interface EnvVarValue { value: string; }
```

### envvars.list(projectRef, env)

<!-- GET /api/v1/projects/{projectRef}/envvars/{env} -->

Returns `EnvVar[]` -- all variables for the project/environment.

```typescript
const vars = await envvars.list("proj_yubjwjsfkxnylobaqvqz", "dev");
// Inside a task: await envvars.list()
```

### envvars.retrieve(projectRef, env, name)

<!-- GET /api/v1/projects/{projectRef}/envvars/{env}/{name} -->

Returns `EnvVarValue` for a single variable.

```typescript
const v = await envvars.retrieve("proj_yubjwjsfkxnylobaqvqz", "dev", "SLACK_API_KEY");
// Inside a task: await envvars.retrieve("SLACK_API_KEY")
```

### envvars.create(projectRef, env, { name, value })

<!-- POST /api/v1/projects/{projectRef}/envvars/{env} -->

Create a new variable. Returns 400 if it already exists.

```typescript
await envvars.create("proj_yubjwjsfkxnylobaqvqz", "dev", {
  name: "SLACK_API_KEY",
  value: "slack_123456",
});
// Inside a task: await envvars.create({ name: "SLACK_API_KEY", value: "slack_123456" })
```

Response: `{ success: boolean }`.

### envvars.update(projectRef, env, name, { value })

<!-- PUT /api/v1/projects/{projectRef}/envvars/{env}/{name} -->

Update an existing variable's value.

```typescript
await envvars.update("proj_yubjwjsfkxnylobaqvqz", "dev", "SLACK_API_KEY", {
  value: "slack_new_value",
});
// Inside a task: await envvars.update("SLACK_API_KEY", { value: "slack_new_value" })
```

Response: `{ success: boolean }`.

### envvars.del(projectRef, env, name)

<!-- DELETE /api/v1/projects/{projectRef}/envvars/{env}/{name} -->

Delete a variable. Returns 404 if it does not exist.

```typescript
await envvars.del("proj_yubjwjsfkxnylobaqvqz", "dev", "SLACK_API_KEY");
// Inside a task: await envvars.del("SLACK_API_KEY")
```

Response: `{ success: boolean }`.

### envvars.upload(projectRef, env, { variables, override })

<!-- POST /api/v1/projects/{projectRef}/envvars/{env}/import -->

Bulk-import multiple variables. Set `override: true` to overwrite existing (default `false`).

```typescript
await envvars.upload("proj_yubjwjsfkxnylobaqvqz", "dev", {
  variables: { SLACK_API_KEY: "slack_key_1234", DB_URL: "postgres://..." },
  override: false,
});
```

Response: `{ success: boolean }`. On validation failure: `{ error, issues?, variableErrors? }`.

---

## Waitpoints

Create and manage waitpoint tokens that pause task runs until completed by external events.

```typescript
import { wait } from "@trigger.dev/sdk";
```

### wait.createToken(options?)

<!-- POST /api/v1/waitpoints/tokens -->

Create a new waitpoint token. Returns an ID and a callback URL for external completion.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `timeout` | `string` | No | `"30s"`, `"1m"`, `"2h"`, `"3d"`, `"4w"`, or ISO 8601 datetime |
| `tags` | `string \| string[]` | No | Up to 10 tags, each under 128 chars. Namespace: `"user:123"` |
| `idempotencyKey` | `string` | No | Same key within TTL returns existing token (may already be completed) |
| `idempotencyKeyTTL` | `string` | No | How long the key is valid: `"30s"`, `"1m"`, `"2h"` |

```typescript
const token = await wait.createToken({
  timeout: "1h",
  tags: ["user:1234567"],
});
console.log(token.id);  // "waitpoint_abc123"
console.log(token.url); // HTTP callback URL (no auth needed)
```

```typescript
interface CreateWaitpointTokenResponse {
  id: string;        // e.g. "waitpoint_abc123"
  isCached: boolean; // true if returned from idempotency cache
  url: string;       // pre-signed callback URL
}
```

### wait.retrieveToken(waitpointId)

<!-- GET /api/v1/waitpoints/tokens/{waitpointId} -->

Retrieve a token's current status and output.

```typescript
const token = await wait.retrieveToken("waitpoint_abc123");
console.log(token.status); // "WAITING" | "COMPLETED" | "TIMED_OUT"
if (token.status === "COMPLETED") {
  console.log(token.output);
}
```

```typescript
interface WaitpointTokenObject {
  id: string;
  url: string;
  status: "WAITING" | "COMPLETED" | "TIMED_OUT";
  idempotencyKey: string | null;
  idempotencyKeyExpiresAt: string | null;  // ISO 8601
  timeoutAt: string | null;                // ISO 8601
  completedAt: string | null;              // ISO 8601
  output: string | null;                   // serialized (only when COMPLETED)
  outputType: string | null;               // e.g. "application/json"
  outputIsError: boolean | null;
  tags: string[];
  createdAt: string;                       // ISO 8601
}
```

### wait.listTokens(options?)

<!-- GET /api/v1/waitpoints/tokens -->

Paginated list of tokens, newest first. Cursor-based pagination. SDK returns an async iterable that auto-paginates.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | `string[]` | No | Filter: `"WAITING"`, `"COMPLETED"`, `"TIMED_OUT"` |
| `tags` | `string[]` | No | Filter by tags |
| `idempotencyKey` | `string` | No | Filter by idempotency key |
| `createdAt.period` | `string` | No | Shorthand: `"1h"`, `"24h"`, `"7d"` |
| `createdAt.from` | `string` | No | ISO 8601 lower bound |
| `createdAt.to` | `string` | No | ISO 8601 upper bound |
| `pageSize` | `number` | No | 1--100 tokens per page |

```typescript
for await (const token of wait.listTokens()) {
  console.log(token.id, token.status);
}

for await (const token of wait.listTokens({
  status: ["WAITING"],
  tags: ["user:1234567"],
})) {
  console.log(token.id);
}
```

### wait.completeToken(tokenIdOrObject, data?)

<!-- POST /api/v1/waitpoints/tokens/{waitpointId}/complete -->

Complete a token, unblocking any run waiting via `wait.forToken()`. Accepts Secret API Key or public access token (JWT). If already completed, returns `{ success: true }` (no-op).

```typescript
await wait.completeToken(token, {
  status: "approved",
  comment: "Looks good to me!",
});
await wait.completeToken(token, {}); // no data
```

### HTTP Callback: POST to token.url

<!-- POST /api/v1/waitpoints/tokens/{waitpointId}/callback/{callbackHash} -->

Complete via pre-signed URL. No API key needed -- `callbackHash` authenticates. The entire JSON body becomes the output data. Designed for webhooks.

```typescript
const token = await wait.createToken({ timeout: "1h" });
await sendApprovalRequestEmail({ callbackUrl: token.url });
const result = await wait.forToken<{ status: string }>(token);
```

### Token Lifecycle

- **WAITING** -- created, awaiting completion or timeout
- **COMPLETED** -- completed via `completeToken()` or HTTP callback
- **TIMED_OUT** -- timeout elapsed before completion

`wait.forToken()` returns `{ ok: true, output }` on completion or `{ ok: false }` on timeout.

---

## Deployments

REST-only (no SDK wrapper). Auth: `Authorization: Bearer <TRIGGER_SECRET_KEY>`.

### GET /api/v1/deployments/latest

Retrieve the latest unmanaged deployment for the authenticated project.

```typescript
const res = await fetch("https://api.trigger.dev/api/v1/deployments/latest", {
  headers: { Authorization: `Bearer ${secretKey}` },
});
const deployment = await res.json();
```

### GET /api/v1/deployments/{deploymentId}

Retrieve a specific deployment by ID. Includes worker info and task list when available.

```typescript
const res = await fetch(`https://api.trigger.dev/api/v1/deployments/${deploymentId}`, {
  headers: { Authorization: `Bearer ${secretKey}` },
});
const deployment = await res.json();
```

### POST /api/v1/deployments/{version}/promote

Promote a deployed version to be current for the environment.

```typescript
const res = await fetch(`https://api.trigger.dev/api/v1/deployments/${version}/promote`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
});
const result = await res.json(); // { id, version, shortCode }
```

```typescript
interface Deployment {
  id: string;
  status: DeploymentStatus;
  contentHash: string;
  shortCode: string;
  version: string;               // e.g. "20250228.1"
  imageReference: string | null;
  errorData: object | null;
  worker?: {
    id: string;
    version: string;
    tasks: { id: string; slug: string; filePath: string; exportName: string }[];
  } | null;
}

type DeploymentStatus =
  | "PENDING" | "INSTALLING" | "BUILDING" | "DEPLOYING"
  | "DEPLOYED" | "FAILED" | "CANCELED" | "TIMED_OUT";
```
