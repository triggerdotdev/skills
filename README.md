![Trigger.dev logo](https://content.trigger.dev/github-header-banner.jpg)

# Trigger.dev agent skills

Agent skills for building AI agents, workflows and durable background tasks with [Trigger.dev](https://trigger.dev).

> **This repo is an automatic mirror.** The skills are maintained in the [Trigger.dev monorepo](https://github.com/triggerdotdev/trigger.dev/tree/main/packages/cli-v3/skills) and shipped inside the `@trigger.dev/sdk` package. A workflow syncs them here so they're installable via [skills.sh](https://skills.sh). **Do not edit skills in this repo** — edit them in the monorepo and the change flows here automatically. See [AGENTS.md](./AGENTS.md).

## Installation

```bash
# Install all skills
npx skills add triggerdotdev/skills

# Or install a specific skill (see the list below)
npx skills add triggerdotdev/skills --skill trigger-setup
```

Already using Trigger.dev? These same skills ship with the SDK and can be installed straight into your coding agent with `npx trigger.dev@latest install-mcp`.

## Available skills

<!-- SKILLS:START -->

### `trigger-authoring-chat-agent`

Author and run a durable AI chat agent with chat.agent from @trigger.dev/sdk/ai: the per-turn run loop, why you MUST spread ...chat.toStreamTextOptions() first, returning a StreamTextResult vs calling chat.pipe(), the two server actions (chat.createStartSessionAction + auth.createPublicToken), and wiring useChat to useTriggerChatTransport. Load this when building, modifying, or debugging a chat backend (the agent task or its lifecycle hooks) or its React transport, when declaring typed tools or custom data parts, or when migrating a plain AI SDK streamText route to chat.agent.

```bash
npx skills add triggerdotdev/skills --skill trigger-authoring-chat-agent
```

### `trigger-chat-agent-advanced`

Advanced and operational chat.agent capabilities for Trigger.dev, loaded on demand. Load this when working on the raw Sessions primitive (sessions / SessionHandle), a custom chat transport or the realtime wire protocol, durable sub-agents (AgentChat, chat.stream.writer), human-in-the-loop, steering, actions, background injection (chat.defer / chat.inject), fast starts (preload, Head Start via @trigger.dev/sdk/chat-server), context resilience (compaction, recovery boot, OOM, large payloads), chat.local run-scoped state, offline testing with mockChatAgent, or prerelease/version upgrades. For the everyday chat.agent({...}) definition and the useTriggerChatTransport happy path, use the trigger-authoring-chat-agent skill instead.

```bash
npx skills add triggerdotdev/skills --skill trigger-chat-agent-advanced
```

### `trigger-cost-savings`

Analyze Trigger.dev tasks, schedules, and runs for cost optimization opportunities. Use when asked to reduce spend, optimize costs, audit usage, right-size machines, or review task efficiency. Combines static source analysis with live run analysis via the Trigger.dev MCP tools (list_runs, get_run_details, get_current_worker).

```bash
npx skills add triggerdotdev/skills --skill trigger-cost-savings
```

### `trigger-realtime`

Trigger.dev client/frontend surface: subscribe to runs in realtime (runs.subscribeToRun and the @trigger.dev/react-hooks hook useRealtimeRun), consume metadata and AI/text streams in React (useRealtimeStream), trigger tasks from the browser (useTaskTrigger, useRealtimeTaskTrigger), and mint scoped frontend credentials with auth.createPublicToken / auth.createTriggerPublicToken. Load when wiring a frontend (React/Next.js/Remix) or backend-for-frontend to show live run progress, status badges, token streams, trigger buttons, or wait-token approval UIs. NOT for writing the backend task itself (streams.define / metadata.set is trigger-tasks territory); this is the consumer side.

```bash
npx skills add triggerdotdev/skills --skill trigger-realtime
```

### `trigger-setup`

Bootstrap Trigger.dev into an existing project from scratch: authenticate the CLI, install @trigger.dev/sdk and @trigger.dev/build, write trigger.config.ts with the project ref and task dirs, scaffold a /trigger directory with a first task, wire tsconfig and .gitignore, set TRIGGER_SECRET_KEY, and run the dev server. Load this when a project has no trigger.config.ts yet and the user asks to "add Trigger.dev", "set up Trigger.dev", "initialize Trigger.dev", or get a first task running, including in a monorepo. Once the project is set up and you are writing task code, switch to the trigger-tasks skill.

```bash
npx skills add triggerdotdev/skills --skill trigger-setup
```

### `trigger-tasks`

Covers writing backend Trigger.dev tasks with @trigger.dev/sdk: defining task() and schemaTask(), the run function and its ctx, retries, waits, queues and concurrency, idempotency keys, run metadata, logging, triggering other tasks (and the Result shape), scheduled/cron tasks, and the essentials of trigger.config.ts. Load this whenever you are authoring or editing code inside a /trigger directory, defining a task, or writing backend code that triggers tasks. Realtime/React hooks and AI chat are covered by separate skills.

```bash
npx skills add triggerdotdev/skills --skill trigger-tasks
```

<!-- SKILLS:END -->

## What is Trigger.dev?

Trigger.dev is a durable execution platform for AI agents, workflows and background tasks. Long-running TypeScript functions with automatic retries, queuing, and real-time observability.

**Key features:**

- **Durable execution** — Tasks survive restarts and scale automatically
- **Automatic retries** — Exponential backoff with configurable retry policies
- **Concurrency control** — Queues and rate limiting built-in
- **Long waits** — Tasks can wait for up to a year
- **Real-time** — Subscribe to task progress from anywhere
- **Multi-environment** — Dev, staging, and production from one dashboard
- **No infrastructure to manage** — our cloud product is fully managed
- **Open-source** — The platform can also be self-hosted on your own infrastructure

## Resources

- [Documentation](https://trigger.dev/docs)
- [GitHub](https://github.com/triggerdotdev/trigger.dev)
- [Discord](https://trigger.dev/discord)
