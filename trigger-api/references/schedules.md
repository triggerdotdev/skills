# Schedules API

Manage recurring schedules for scheduled tasks. Schedules trigger tasks on a cron-based cadence.

## DECLARATIVE vs IMPERATIVE Schedules

There are two types of schedules:

- **DECLARATIVE** -- defined in code via `schedules.task({ cron: "..." })`. Synced on `dev`/`deploy`. Read-only via the API (cannot update or delete through the Management API).
- **IMPERATIVE** -- created at runtime via `schedules.create()` or the dashboard. Full CRUD via the API.

The `update`, `del`, `activate`, and `deactivate` methods only work on IMPERATIVE schedules.

## schedules.create(options)

Create a new IMPERATIVE schedule.

```ts
// POST /api/v1/schedules
import { schedules } from "@trigger.dev/sdk";

const schedule = await schedules.create({
  task: "my-task",
  cron: "0 0 * * *",
  deduplicationKey: "my-schedule",
  timezone: "America/New_York",
});
```

### CreateScheduleOptions

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task` | `string` | Yes | The id of the scheduled task to trigger. |
| `cron` | `string` | Yes | Cron expression (5-field, no seconds). |
| `deduplicationKey` | `string` | Yes | Prevents duplicate schedules. If a schedule with this key already exists, it is updated instead of creating a new one. |
| `externalId` | `string` | No | Arbitrary external identifier (e.g., user ID, org ID). Useful for multi-tenant scheduling. |
| `timezone` | `string` | No | IANA timezone (e.g., `"America/New_York"`). Defaults to `"UTC"`. Respects daylight savings time. |

**Returns:** `ScheduleObject`

## schedules.retrieve(scheduleId)

Get a schedule by its ID. Works for both DECLARATIVE and IMPERATIVE schedules.

```ts
// GET /api/v1/schedules/{schedule_id}
import { schedules } from "@trigger.dev/sdk";

const schedule = await schedules.retrieve("sched_1234");
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scheduleId` | `string` | Yes | The schedule ID (prefixed with `sched_`). |

**Returns:** `ScheduleObject`

## schedules.update(scheduleId, options)

Update an existing schedule. **IMPERATIVE schedules only** -- will fail on DECLARATIVE schedules.

```ts
// PUT /api/v1/schedules/{schedule_id}
import { schedules } from "@trigger.dev/sdk";

const updatedSchedule = await schedules.update("sched_1234", {
  task: "my-updated-task",
  cron: "0 0 * * *",
  externalId: "org_456",
  timezone: "Europe/London",
});
```

### UpdateScheduleOptions

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task` | `string` | Yes | The id of the scheduled task to trigger. |
| `cron` | `string` | Yes | Cron expression (5-field, no seconds). |
| `externalId` | `string` | No | Arbitrary external identifier. |
| `timezone` | `string` | No | IANA timezone. Defaults to `"UTC"`. Respects daylight savings time. |

**Returns:** `ScheduleObject`

## schedules.del(scheduleId)

Delete a schedule permanently. **IMPERATIVE schedules only** -- will fail on DECLARATIVE schedules.

```ts
// DELETE /api/v1/schedules/{schedule_id}
import { schedules } from "@trigger.dev/sdk";

await schedules.del("sched_1234");
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scheduleId` | `string` | Yes | The schedule ID to delete. |

**Returns:** `void`

## schedules.list(options?)

List all schedules with optional pagination. Returns both DECLARATIVE and IMPERATIVE schedules.

```ts
// GET /api/v1/schedules
import { schedules } from "@trigger.dev/sdk";

const allSchedules = await schedules.list();

// With pagination
const page = await schedules.list({ page: 1, perPage: 20 });
console.log(page.data);          // ScheduleObject[]
console.log(page.pagination);    // { currentPage, totalPages, count }
```

### ListSchedulesOptions

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | `number` | No | Page number (1-based). |
| `perPage` | `number` | No | Number of schedules per page. |

### ListSchedulesResult

```ts
interface ListSchedulesResult {
  data: ScheduleObject[];
  pagination: {
    currentPage: number;
    totalPages: number;
    count: number;
  };
}
```

## schedules.activate(scheduleId)

Activate a previously deactivated schedule. **IMPERATIVE schedules only.**

```ts
// POST /api/v1/schedules/{schedule_id}/activate
import { schedules } from "@trigger.dev/sdk";

const schedule = await schedules.activate("sched_1234");
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scheduleId` | `string` | Yes | The schedule ID to activate. |

**Returns:** `ScheduleObject` (with `active: true`)

## schedules.deactivate(scheduleId)

Deactivate a schedule so it stops triggering. **IMPERATIVE schedules only.**

```ts
// POST /api/v1/schedules/{schedule_id}/deactivate
import { schedules } from "@trigger.dev/sdk";

const schedule = await schedules.deactivate("sched_1234");
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scheduleId` | `string` | Yes | The schedule ID to deactivate. |

**Returns:** `ScheduleObject` (with `active: false`)

## schedules.timezones() — SDK only

Get all supported IANA timezones. No REST equivalent — this method only works via the SDK.

```ts
import { schedules } from "@trigger.dev/sdk";

const { timezones } = await schedules.timezones();
// ["UTC", "Africa/Abidjan", "America/New_York", ...]
```

Optional query parameter `excludeUtc` (boolean, defaults to `false`) omits UTC from results.

**Returns:** `{ timezones: string[] }`

## ScheduleObject Reference

Every create, retrieve, update, activate, and deactivate call returns a `ScheduleObject`:

```ts
interface ScheduleObject {
  /** Unique ID, prefixed with "sched_" */
  id: string;
  /** The id of the scheduled task this schedule triggers */
  task: string;
  /** "DECLARATIVE" (defined in code) or "IMPERATIVE" (created via API/dashboard) */
  type: "DECLARATIVE" | "IMPERATIVE";
  /** Whether the schedule is currently active */
  active: boolean;
  /** Deduplication key used to prevent duplicate schedules */
  deduplicationKey: string | null;
  /** Arbitrary external ID (e.g., user ID, org ID) */
  externalId: string | null;
  /** Cron generator details */
  generator: {
    type: "CRON";
    /** The cron expression, e.g. "0 0 * * *" */
    expression: string;
    /** Human-readable description, e.g. "Every day at midnight" */
    description: string;
  };
  /** IANA timezone, e.g. "America/New_York". Defaults to "UTC". */
  timezone: string;
  /** ISO 8601 datetime of the next scheduled run */
  nextRun: string;
  /** Environments this schedule is active in */
  environments: ScheduleEnvironment[];
}

interface ScheduleEnvironment {
  id: string;
  type: string;
  userName: string;
}
```

## Common Patterns

### Multi-tenant Scheduling with externalId and deduplicationKey

Use `externalId` to associate schedules with your domain entities (users, orgs, teams) and `deduplicationKey` to ensure idempotent creation:

```ts
import { schedules } from "@trigger.dev/sdk";

// Create a per-user daily report schedule
// If called again with the same deduplicationKey, updates instead of duplicating
async function ensureUserSchedule(userId: string, tz: string) {
  return schedules.create({
    task: "daily-user-report",
    cron: "0 9 * * *",
    timezone: tz,
    externalId: userId,
    deduplicationKey: `${userId}-daily-report`,
  });
}
```

### Bulk Schedule Management

List, filter, and manage schedules in bulk:

```ts
import { schedules } from "@trigger.dev/sdk";

// Deactivate all imperative schedules
const result = await schedules.list();
for (const schedule of result.data) {
  if (schedule.type === "IMPERATIVE" && schedule.active) {
    await schedules.deactivate(schedule.id);
  }
}

// Clean up schedules for a deleted user
for (const schedule of result.data) {
  if (schedule.externalId === "deleted_user_123" && schedule.type === "IMPERATIVE") {
    await schedules.del(schedule.id);
  }
}
```

### Updating a Schedule's Cron or Timezone

```ts
import { schedules } from "@trigger.dev/sdk";

// Change frequency from daily to weekly on Mondays at 9am
const updated = await schedules.update("sched_1234", {
  task: "weekly-digest",
  cron: "0 9 * * 1",
  timezone: "Europe/Berlin",
});
console.log(updated.generator.description); // "Every Monday at 9:00 AM"
console.log(updated.nextRun);               // next scheduled ISO datetime
```
