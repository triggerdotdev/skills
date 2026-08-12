# Agent skills — Trigger.dev

This repository is an **automatic mirror**. It exists so the Trigger.dev agent skills are discoverable and installable via [skills.sh](https://skills.sh) (`npx skills add triggerdotdev/skills`).

## Source of truth

Skills are authored and maintained in the Trigger.dev monorepo — **do not edit them here**, any change is overwritten on the next sync:

> [`triggerdotdev/trigger.dev`](https://github.com/triggerdotdev/trigger.dev)

The monorepo has two skill sets. We mirror the **full standalone guides** bundled in the SDK (`packages/trigger-sdk/skills`), not the thin pointer skills in `packages/cli-v3/skills` (those only make sense next to an installed SDK). The one exception is `trigger-setup`, sourced from `packages/cli-v3/skills/trigger-getting-started` — bootstrapping runs before the SDK exists, so it has no SDK-bundled version.

## How the sync works

`.github/workflows/sync-from-monorepo.yml` runs monthly (plus `workflow_dispatch`, plus `repository_dispatch` for instant syncs from the monorepo). It:

1. Clones the two monorepo skill dirs + the SDK `package.json`.
2. Runs `scripts/mirror-skills.mjs`, which reads **`sync-map.json`**:
   - `sources[]` — monorepo locations to mirror. A directory publishes **every** `trigger-*` skill inside it (so a new skill added to `packages/trigger-sdk/skills` upstream **auto-publishes here — no edit needed**); a path ending in a skill dir publishes just that one (used for `trigger-getting-started`, which only exists CLI-side).
   - `renames{}` — monorepo skill name → published name, used **only** to preserve the established skills.sh install history (renaming a skill resets its install counter). Applied as a global text substitution across every mirrored file, so the frontmatter `name:` and all cross-skill references stay consistent.
   - The `{{TRIGGER_SDK_VERSION}}` placeholder is resolved from the SDK `package.json`.
   - Any skill dir here that the mirror doesn't produce is removed. If a **CLI-only** skill appears upstream (no SDK-bundled full version, like `getting-started`), the sync logs a warning so a human can decide whether to add it to `sources`.
3. Runs `scripts/build-readme.mjs` to regenerate the "Available skills" block in `README.md` from each skill's frontmatter.
4. Force-pushes a single `sync/monorepo-skills` branch and opens **one** PR — or updates the existing open one, so there is never more than one sync PR to merge.

Merging that PR is the only manual step. The org blocks direct pushes to `main`, so the workflow can only open a PR; it never writes to `main`.

## Publishing / renaming

New skills under a sourced directory publish automatically. You only edit `sync-map.json` to:

- **Preserve install history** when a skill's monorepo name differs from an existing skills.sh name → add a `renames` entry (e.g. `"trigger-authoring-tasks": "trigger-tasks"`).
- **Add a CLI-only skill** the auto-mirror doesn't cover → add its path to `sources`.
