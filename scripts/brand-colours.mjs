import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Keeps the vector artwork in step with the palette.
 *
 * The crest, bunting, mascot and the icon written for the browser tab draw
 * their colours as hex literals rather than as `var(--color-*)`, and they have
 * to. Tailwind v4 drops any `@theme` colour that no utility class references,
 * so a `var()` pointing at one resolves to nothing and SVG `fill` falls back to
 * black. Pointing the crest's border at `var(--color-brand-red)` painted it
 * black for exactly this reason: nothing in the site uses a `brand-red`
 * utility, so the token never reached the browser. A file served as an asset,
 * rather than compiled, could not use a token at all.
 *
 * The cost of literals is that editing a token in globals.css leaves the
 * artwork on the old colour with nothing to say so. This guard closes that gap
 * from the other side: every literal meant to track a token is listed below,
 * and the check fails when the two drift apart.
 *
 * Colours the artwork owns outright are listed separately, so that a hex
 * appearing in the artwork that is in neither list is reported rather than
 * quietly becoming a fourth source of truth.
 *
 *   node scripts/brand-colours.mjs
 */

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const stylesheet = path.join(root, "apps/web/src/app/globals.css");

/**
 * Walked in full rather than listed file by file, so artwork added later is
 * covered without anyone having to remember this. Between them these cover
 * every place the site draws anything.
 *
 * `required` separates a folder that must be there from one that need not
 * exist yet. Without it a renamed folder leaves the guard reporting success
 * having read nothing, which is worse than no guard at all.
 */
const ARTWORK = [
  { dir: "packages/ui/src", required: true },
  { dir: "apps/web/src", required: true },
  { dir: "apps/web/public", required: false },
];
const DRAWN_IN = /\.(tsx|ts|svg)$/;

/** Literals that must stay equal to the token they are drawn from. */
const TRACKED = [
  { hex: "#304890", token: "navy" },
  { hex: "#1e2f5c", token: "navy-deep" },
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
// Eight digits before six, so a colour carrying an alpha channel is read whole
// rather than as a six-digit colour with two characters left over.
const HEX = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

/**
 * The same colours written the other way. A shadow needs an alpha channel, and
 * the CSS for one is usually written out in parts rather than as a hex value,
 * which would otherwise put it beyond everything below. The parts may be
 * separated by commas or by spaces, and a utility written inline uses
 * underscores, so all three are read alike.
 */
const RGB = /rgba?\(\s*(\d{1,3})[\s,_]+(\d{1,3})[\s,_]+(\d{1,3})/g;
const asHex = (red, green, blue) =>
  `#${[red, green, blue].map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;

const tokens = new Map();
for (const line of (await readFile(stylesheet, "utf8")).split("\n")) {
  const match = TOKEN.exec(line);
  if (match) tokens.set(match[1], match[2].toLowerCase());
}

const found = new Map();
const drawing = new Set();
const problems = [];

for (const { dir, required } of ARTWORK) {
  const base = path.join(root, dir);
  let entries;
  try {
    entries = await readdir(base, { recursive: true, withFileTypes: true });
  } catch {
    if (required)
      problems.push(`${dir} could not be read, so nothing in it was checked`);
    continue;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !DRAWN_IN.test(entry.name)) continue;
    const file = path.join(entry.parentPath ?? entry.path, entry.name);

    const name = path.relative(root, file).replaceAll(path.sep, "/");
    const lines = (await readFile(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      const drawn = [
        ...(line.match(HEX) ?? []),
        ...[...line.matchAll(RGB)].map(([, red, green, blue]) =>
          asHex(red, green, blue),
        ),
      ];

      for (const hex of drawn) {
        const key = hex.toLowerCase();
        if (!found.has(key)) found.set(key, []);
        found.get(key).push(`${name}:${index + 1}`);
        drawing.add(name);
      }
    });
  }
}

for (const { hex, token } of TRACKED) {
  const current = tokens.get(token);
  const sites = found.get(hex);

  // A colour listed here and drawn nowhere means the artwork moved on without
  // the list, and the entry has been guarding nothing since.
  if (!sites) {
    problems.push(
      `${hex} (--color-${token}) is drawn nowhere, so its entry guards nothing`,
    );
    continue;
  }

  if (current === undefined) {
    problems.push(
      `--color-${token} is gone from globals.css, but ${hex} is still drawn at ${sites.join(", ")}`,
    );
    continue;
  }

  if (current !== hex) {
    problems.push(
      `--color-${token} is now ${current}, but the artwork still draws ${hex} at ${sites.join(", ")}`,
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
  const literals = [...found.values()].reduce(
    (total, sites) => total + sites.length,
    0,
  );
  console.log(
    `✓ artwork colours match the palette (${literals} literal(s) in ${drawing.size} file(s))`,
  );
  process.exit(0);
}

console.error(`✗ ${problems.length} colour problem(s) in the artwork:`);
for (const problem of problems) console.error(`   - ${problem}`);
console.error(
  "  Update the artwork to match, or adjust the lists in scripts/brand-colours.mjs.",
);
process.exit(1);
