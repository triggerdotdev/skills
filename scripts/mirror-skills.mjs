#!/usr/bin/env node
// Mirrors the Trigger.dev monorepo skills into this repo for skills.sh.
//
// Reads sync-map.json:
//   sources[] — monorepo locations to mirror. A directory publishes every
//               trigger-* skill inside it (new upstream skills auto-publish);
//               a path ending in a skill dir publishes just that one.
//   renames{} — monorepo skill name -> published name, only to preserve
//               skills.sh install history. Applied as a global text
//               substitution across every mirrored file so the frontmatter
//               `name:` and all cross-skill references stay consistent.
//
// We mirror the FULL guides from packages/trigger-sdk/skills, NOT the thin
// pointer skills in packages/cli-v3/skills. Anything already here that the
// mirror doesn't produce is removed.
//
// Usage: node scripts/mirror-skills.mjs <path-to-monorepo-checkout>

import { readFileSync, writeFileSync, readdirSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join, relative, basename } from "node:path";

const MONO = process.argv[2];
if (!MONO) throw new Error("Usage: node scripts/mirror-skills.mjs <monorepo checkout dir>");

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const { sources, renames = {} } = JSON.parse(readFileSync(join(ROOT, "sync-map.json"), "utf8"));
if (!Array.isArray(sources) || sources.length === 0) throw new Error("sync-map.json has no sources.");

// Resolve sources to concrete skill directories (absolute paths).
const isSkillDir = (p) => existsSync(join(p, "SKILL.md"));
const skillDirs = [];
for (const src of sources) {
  const abs = join(MONO, src);
  if (isSkillDir(abs)) {
    skillDirs.push(abs);
  } else if (existsSync(abs)) {
    for (const d of readdirSync(abs, { withFileTypes: true })) {
      if (d.isDirectory() && d.name.startsWith("trigger-") && isSkillDir(join(abs, d.name))) {
        skillDirs.push(join(abs, d.name));
      }
    }
  } else {
    throw new Error(`Source not found: ${src} — refusing to wipe the mirror.`);
  }
}
if (skillDirs.length === 0) throw new Error(`No skills found under sources — refusing to wipe the mirror.`);

// Substitutions: renames (longest source first to avoid partial overlaps) plus
// the SDK version placeholder, resolved the same way the SDK build resolves it.
let sdkVersion = "latest";
try {
  sdkVersion = JSON.parse(readFileSync(join(MONO, "packages/trigger-sdk/package.json"), "utf8")).version || "latest";
} catch {
  /* keep "latest" */
}
const subs = Object.entries(renames)
  .sort((a, b) => b[0].length - a[0].length)
  .concat([["{{TRIGGER_SDK_VERSION}}", sdkVersion]]);
const applySubs = (text) => subs.reduce((t, [from, to]) => t.split(from).join(to), text);

// Wipe existing mirrored skills.
for (const d of readdirSync(ROOT, { withFileTypes: true })) {
  if (d.isDirectory() && d.name.startsWith("trigger-")) rmSync(join(ROOT, d.name), { recursive: true, force: true });
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

const TEXT = /\.(md|mdx|txt|json|ya?ml|ts|tsx|js|jsx)$/;
const published = [];
const seen = new Set();
for (const srcDir of skillDirs) {
  const name = renames[basename(srcDir)] ?? basename(srcDir);
  if (seen.has(name)) {
    console.log(`::warning::duplicate skill name '${name}' — keeping first, skipping ${srcDir}`);
    continue;
  }
  seen.add(name);
  for (const file of walk(srcDir)) {
    const dest = join(ROOT, name, relative(srcDir, file));
    mkdirSync(join(dest, ".."), { recursive: true });
    writeFileSync(dest, TEXT.test(file) ? applySubs(readFileSync(file, "utf8")) : readFileSync(file));
  }
  published.push(name);
}

// Heads-up: a CLI-only skill (no SDK-bundled full version) that we don't
// publish — the one case that needs a human to decide (like trigger-getting-started).
const sdkSet = new Set();
try {
  for (const d of readdirSync(join(MONO, "packages/trigger-sdk/skills"), { withFileTypes: true }))
    if (d.isDirectory()) sdkSet.add(d.name);
} catch {
  /* ignore */
}
try {
  for (const d of readdirSync(join(MONO, "packages/cli-v3/skills"), { withFileTypes: true })) {
    if (!d.isDirectory() || !d.name.startsWith("trigger-")) continue;
    const outName = renames[d.name] ?? d.name;
    if (!sdkSet.has(d.name) && !seen.has(outName)) {
      console.log(`::warning::CLI-only skill not published (no SDK full version): packages/cli-v3/skills/${d.name}`);
    }
  }
} catch {
  /* ignore */
}

console.log(`Mirrored ${published.length} skills: ${published.sort().join(", ")}`);
