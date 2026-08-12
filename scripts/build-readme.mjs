#!/usr/bin/env node
// Regenerates the auto-managed skills block in README.md from each skill's
// SKILL.md frontmatter. Everything else in the README is hand-written.
// Run: node scripts/build-readme.mjs   (the sync workflow runs this for you)

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const START = "<!-- SKILLS:START -->";
const END = "<!-- SKILLS:END -->";

/** Parse `name` + `description` out of a SKILL.md frontmatter block. */
function parseFrontmatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const lines = match[1].split("\n");
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    if (key !== "name" && key !== "description") continue;
    // Folded/literal block scalar (`>` or `|`): collect following indented lines.
    if (rawValue === ">" || rawValue === "|" || rawValue === ">-" || rawValue === "|-") {
      const buf = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        buf.push(lines[++i].trim());
      }
      out[key] = buf.join(" ").replace(/\s+/g, " ").trim();
    } else {
      out[key] = rawValue.replace(/^["']|["']$/g, "").trim();
    }
  }
  return out.name ? out : null;
}

const skills = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("trigger-"))
  .map((d) => parseFrontmatter(readFileSync(join(ROOT, d.name, "SKILL.md"), "utf8")))
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

if (skills.length === 0) throw new Error("No skills found — refusing to write an empty README block.");

const block = skills
  .map(
    (s) =>
      `### \`${s.name}\`\n\n${s.description}\n\n` +
      "```bash\n" +
      `npx skills add triggerdotdev/skills --skill ${s.name}\n` +
      "```",
  )
  .join("\n\n");

const readmePath = join(ROOT, "README.md");
const readme = readFileSync(readmePath, "utf8");
const startIdx = readme.indexOf(START);
const endIdx = readme.indexOf(END);
if (startIdx === -1 || endIdx === -1) throw new Error(`README.md is missing ${START} / ${END} markers.`);

const next =
  readme.slice(0, startIdx + START.length) + "\n\n" + block + "\n\n" + readme.slice(endIdx);

writeFileSync(readmePath, next);
console.log(`Wrote ${skills.length} skills into README.md`);
