# Agent Skills

This repository contains skills for building durable background tasks and AI agents with Trigger.dev.

## Skills Structure

```
trigger-setup/
├── SKILL.md              # Getting started
└── references/
    ├── project-structure.md
    └── environment-setup.md

trigger-tasks/
├── SKILL.md              # Core task patterns
└── references/
    ├── basic-tasks.md
    ├── advanced-tasks.md
    └── scheduled-tasks.md

trigger-config/
├── SKILL.md              # Build configuration
└── references/
    └── config.md

trigger-agents/
├── SKILL.md              # AI agent patterns
└── references/
    ├── orchestration.md
    ├── waitpoints.md
    ├── streaming.md
    └── ai-tool.md

trigger-realtime/
├── SKILL.md              # Realtime subscriptions
└── references/
    └── realtime.md
```

## Skill Format

Each skill follows the [Agent Skills specification](https://skills.sh):

```markdown
---
name: skill-name
description: When to use this skill and what it does
---

# Skill Title

Instructions for the agent...
```

## When to Load Skills

- **trigger-setup**: When adding Trigger.dev to a project for the first time
- **trigger-tasks**: When creating background jobs, async workflows, or scheduled tasks
- **trigger-config**: When setting up `trigger.config.ts` or adding build extensions
- **trigger-agents**: When building LLM-powered workflows, orchestration, or multi-step AI agents
- **trigger-realtime**: When building React UIs that show task progress or stream data

## Key Patterns

### Always Use SDK v4

```ts
// ✅ Correct
import { task } from "@trigger.dev/sdk";

export const myTask = task({
  id: "my-task",
  run: async (payload) => { ... }
});

// ❌ Never use (deprecated v2)
client.defineJob({ ... });
```

### Check Result Before Output

```ts
const result = await childTask.triggerAndWait(payload);

// ✅ Correct
if (result.ok) {
  console.log(result.output);
}

// ❌ Wrong - result is not the output
console.log(result.someProperty);
```

### Never Promise.all with Waits

```ts
// ❌ Not supported
await Promise.all([
  childTask.triggerAndWait(p1),
  childTask.triggerAndWait(p2),
]);

// ✅ Use batchTriggerAndWait instead
const results = await childTask.batchTriggerAndWait([
  { payload: p1 },
  { payload: p2 },
]);
```
