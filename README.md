![Trigger.dev logo](https://content.trigger.dev/github-header-banner.jpg)

# Trigger.dev agent skills

Agent skills for building AI agents, workflows and durable background tasks with [Trigger.dev](https://trigger.dev).

## Installation

```bash
# Install all skills
npx skills add triggerdotdev/skills

# Or install specific skills
npx skills add triggerdotdev/skills --skill trigger-setup
npx skills add triggerdotdev/skills --skill trigger-tasks
npx skills add triggerdotdev/skills --skill trigger-config
npx skills add triggerdotdev/skills --skill trigger-agents
npx skills add triggerdotdev/skills --skill trigger-realtime
npx skills add triggerdotdev/skills --skill trigger-cost-savings
```

## Available Skills

### trigger-setup

Use when getting started with Trigger.dev:

- Installing the SDK
- Running `npx trigger init`
- Creating trigger.config.ts
- Project structure
- First task walkthrough
- Environment variables

### trigger-tasks

Use when creating background jobs, async workflows, or scheduled tasks. Core patterns for building durable tasks:

- Basic and schema-validated tasks
- Triggering tasks (single, batch, with wait)
- Waits and checkpointing
- Concurrency and queues
- Debouncing and idempotency
- Error handling and retries
- Scheduled tasks (cron)
- Metadata and progress tracking

### trigger-config

Use when setting up `trigger.config.ts` or adding build extensions:

- Build extensions (Prisma, Playwright, FFmpeg, Python)
- System packages and additional files
- Environment variable sync
- Telemetry integration
- Global lifecycle hooks

### trigger-agents

Use when building LLM-powered workflows, orchestration, or multi-step AI agents:

- Prompt chaining with validation gates
- Routing (classify → dispatch)
- Parallelization with batch operations
- Orchestrator-workers (fan-out/fan-in)
- Evaluator-optimizer loops
- Human-in-the-loop with waitpoints

### trigger-realtime

Use when subscribing to task runs in real-time from frontend or backend:

- Progress indicators and live dashboards
- React hooks for triggering and monitoring tasks
- Streaming AI/LLM responses to UI
- Wait tokens for human-in-the-loop workflows

### trigger-cost-savings

Use when analyzing tasks and runs for cost optimization. Requires [Trigger.dev MCP tools](https://trigger.dev/docs/mcp-introduction) for run analysis:

- Right-sizing machine presets
- Identifying excessive retries and missing abort conditions
- Finding missing debounce, idempotency, and maxDuration
- Detecting polling loops that should use waitpoints
- Analyzing run data for high-cost tasks and failure patterns
- Schedule frequency review

Install MCP tools: `npx trigger.dev@latest install-mcp`

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