import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Keeps the vector artwork in packages/ui in step with the palette.
 *
 * The crest, bunting and mascot write their colours as hex literals rather than
 * as `var(--color-*)`, and they have to. Tailwind v4 drops any `@theme` colour
 * that no utility class references, so a `var()` pointing at one resolves to
 * nothing and SVG `fill` falls back to black. Pointing the crest's border at
 * `var(--color-brand-red)` painted it black for exactly this reason: nothing in
 * the site uses a `brand-red` utility, so the token never reached the browser.
 *
 * The cost of literals is that editing a token in globals.css leaves the
 * artwork on the old colour with nothing to say so. This guard closes that gap
 * from the other side: every literal meant to track a token is listed below,
 * and the check fails when the two drift apart.
 *
 * Colours the artwork owns outright are listed separately, so that a hex
 * appearing in packages/ui that is in neither list is reported rather than
 * quietly becoming a fourth source of truth.
 *
 *   node scripts/brand-colours.mjs
 */

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const stylesheet = path.join(root, "apps/web/src/app/globals.css");
const artwork = path.join(root, "packages/ui/src");

/** Literals that must stay equal to the token they are drawn from. */
const TRACKED = [
  { hex: "#304890", token: "navy" },
  { hex: "#ffc93c", token: "gold" },
  { hex: "#c8102e", token: "brand-red" },
  { hex: "#d81b76", token: "magenta" },
  { hex: "#a01458", token: "magenta-deep" },
  { hex: "#ef6c33", token: "class-nursery" },
  { hex: "#3ea845", token: "class-prep" },
];

/** Colours the artwork owns, which deliberately have no token. */
const INDEPENDENT = new Map([
  [
    "#f2b31a",
    "crest gold, sampled from the printed mark and kept apart from interface gold",
  ],
  ["#ffffff", "white"],
  ["#d2601a", "mascot fur"],
  ["#efa76b", "mascot fur, lighter"],
  ["#fbead7", "mascot belly"],
  ["#9c6b3f", "mascot muzzle"],
  ["#6f4a2b", "mascot outline"],
]);

const TOKEN = /^\s*--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/;
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

const tokens = new Map();
for (const line of (await readFile(stylesheet, "utf8")).split("\n")) {
  const match = TOKEN.exec(line);
  if (match) tokens.set(match[1], match[2].toLowerCase());
}

const found = new Map();
for (const entry of await readdir(artwork)) {
  if (!entry.endsWith(".tsx")) continue;
  const lines = (await readFile(path.join(artwork, entry), "utf8")).split("\n");
  lines.forEach((line, index) => {
    for (const hex of line.match(HEX) ?? []) {
      const key = hex.toLowerCase();
      if (!found.has(key)) found.set(key, []);
      found.get(key).push(`${entry}:${index + 1}`);
    }
  });
}

const problems = [];

for (const { hex, token } of TRACKED) {
  const current = tokens.get(token);
  const sites = found.get(hex);

  if (current === undefined) {
    problems.push(
      `--color-${token} is gone from globals.css, but ${hex} is still drawn at ${sites?.join(", ") ?? "nowhere"}`,
    );
    continue;
  }

  if (current !== hex) {
    problems.push(
      `--color-${token} is now ${current}, but the artwork still draws ${hex} at ${sites?.join(", ") ?? "nowhere"}`,
    );
  }
}

for (const [hex, sites] of found) {
  const isTracked = TRACKED.some((entry) => entry.hex === hex);
  if (isTracked || INDEPENDENT.has(hex)) continue;
  problems.push(
    `${hex} at ${sites.join(", ")} matches no token and is not listed as artwork-owned`,
  );
}

if (problems.length === 0) {
  const count = TRACKED.length + INDEPENDENT.size;
  console.log(`✓ artwork colours match the palette (${count} checked)`);
  process.exit(0);
}

console.error(`✗ ${problems.length} colour problem(s) in packages/ui:`);
for (const problem of problems) console.error(`   - ${problem}`);
console.error(
  "  Update the artwork to match, or adjust the lists in scripts/brand-colours.mjs.",
);
process.exit(1);
