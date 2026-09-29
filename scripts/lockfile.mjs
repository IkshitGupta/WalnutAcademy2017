import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Keeps pnpm-lock.yaml portable.
 *
 * When the configured npm registry serves tarballs from a different host than
 * the registry base, as a corporate mirror typically does, pnpm records an
 * absolute `tarball:` URL for every package. That pins the lockfile to one
 * private host: it publishes the hostname, and `pnpm install` then fails for
 * anyone outside that network, CI included.
 *
 * For a registry package the integrity hash is npm's own and stays valid, so
 * the URL override can simply be dropped and pnpm will derive the URL from
 * whichever registry is configured. A resolution carrying a `tarball` but no
 * `integrity` is a direct remote tarball or similar, where the URL is the only
 * way to find the package. Those are reported and never touched.
 *
 * Any `pnpm add` or `pnpm remove` behind such a mirror reintroduces the
 * overrides, which is why the check runs as part of `pnpm test`.
 *
 *   node scripts/lockfile.mjs          check; exits 1 if overrides are present
 *   node scripts/lockfile.mjs --fix    strip the safe ones
 */

const lockfile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "pnpm-lock.yaml",
);

/**
 * A registry tarball always lives at `<registry>/<name>/-/<file>.tgz`, so the
 * URL is derivable from whichever registry is configured and the override adds
 * nothing. Deliberately matched on path shape rather than a list of known
 * hostnames, so no registry hostname needs to be written down here.
 */
const REGISTRY_TARBALL = /\/-\/[^/]+\.tgz$/;

const RESOLUTION = /^(\s*resolution: )\{(.+)\}(\s*)$/;

/**
 * pnpm writes resolutions as a single-line flow map whose values are integrity
 * hashes, URLs, directories or commit ids, none of which contain ", ".
 */
function parseFlowMap(body) {
  return body.split(", ").map((pair) => {
    const split = pair.indexOf(": ");
    return split === -1
      ? [pair, ""]
      : [pair.slice(0, split), pair.slice(split + 2)];
  });
}

function hostOf(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const fix = process.argv.includes("--fix");
const lines = (await readFile(lockfile, "utf8")).split("\n");

const stripped = [];
const kept = [];

const output = lines.map((line) => {
  const match = RESOLUTION.exec(line);
  if (!match) return line;

  const [, prefix, body, trailing] = match;
  const entries = parseFlowMap(body);

  const tarball = entries.find(([key]) => key === "tarball");
  if (!tarball) return line;

  const url = hostOf(tarball[1]);
  if (url === null) return line;

  // Without an integrity hash, or with a URL that is not a standard registry
  // tarball path, the URL is the only way to locate the package, so removing it
  // would break resolution rather than make it portable.
  const derivable =
    entries.some(([key]) => key === "integrity") &&
    REGISTRY_TARBALL.test(url.pathname);

  if (!derivable) {
    kept.push(`${url.host} (not a derivable registry tarball, left alone)`);
    return line;
  }

  stripped.push(url.host);
  const remaining = entries
    .filter(([key]) => key !== "tarball")
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
  return `${prefix}{${remaining}}${trailing}`;
});

if (kept.length > 0) {
  console.warn(`! ${kept.length} resolution(s) must keep an absolute URL:`);
  for (const note of new Set(kept)) console.warn(`   - ${note}`);
}

if (stripped.length === 0) {
  console.log("✓ lockfile is registry-agnostic");
  process.exit(0);
}

const hosts = [...new Set(stripped)];

if (!fix) {
  console.error(
    `✗ pnpm-lock.yaml pins ${stripped.length} package(s) to a private host: ${hosts.join(", ")}`,
  );
  console.error("  This breaks installs outside that network.");
  console.error("  Run `pnpm lockfile:fix` to strip the overrides.");
  process.exit(1);
}

await writeFile(lockfile, output.join("\n"));
console.log(
  `✓ stripped ${stripped.length} tarball override(s) (${hosts.join(", ")})`,
);
