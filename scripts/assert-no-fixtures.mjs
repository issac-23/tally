/**
 * Asserts that the dev fixture layer is absent from a production build.
 *
 * lib/dev/fixtures.ts stubs out Supabase entirely — no auth, no RLS, seeded
 * data for anyone who asks. It is guarded by a literal
 * `process.env.NODE_ENV !== "production"` check at both call sites, which
 * Next.js folds at build time so the module is never bundled. That guarantee
 * is the only thing standing between a dev convenience and an app that serves
 * fabricated data with no session, so it gets verified rather than trusted.
 *
 * Run after `next build`:
 *   npm run verify:no-fixtures
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BUILD_DIR = ".next";
const SENTINEL = "TALLY_DEV_FIXTURES_ACTIVE_SENTINEL";

// Next writes its own type/manifest files that legitimately reference source
// paths without bundling them. Only real output chunks matter here.
//
// `.next/dev` holds the dev server's own chunks, where the fixtures are
// *supposed* to appear. It shares a build directory with the production
// output, so anyone who has run `npm run dev` would otherwise fail this
// check on chunks the production server never loads.
const SKIP_DIRS = new Set([
  path.join(BUILD_DIR, "cache"),
  path.join(BUILD_DIR, "types"),
  path.join(BUILD_DIR, "dev"),
]);
const CODE_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);

async function collectFiles(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(full)) continue;
      found.push(...(await collectFiles(full)));
    } else if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
      found.push(full);
    }
  }
  return found;
}

try {
  await stat(BUILD_DIR);
} catch {
  console.error(
    `✗ ${BUILD_DIR}/ not found. Run \`npm run build\` before this check.`
  );
  process.exit(1);
}

const files = await collectFiles(BUILD_DIR);
const offenders = [];

for (const file of files) {
  const contents = await readFile(file, "utf8");
  if (contents.includes(SENTINEL) || contents.includes("createFixtureClient")) {
    offenders.push(file);
  }
}

if (files.length === 0) {
  console.error(`✗ no build output found under ${BUILD_DIR}/. Did the build succeed?`);
  process.exit(1);
}

if (offenders.length > 0) {
  console.error(
    `✗ dev fixtures leaked into the production build (${offenders.length} file(s)):`
  );
  for (const file of offenders.slice(0, 10)) console.error(`    ${file}`);
  console.error(
    `\n  The NODE_ENV guard in lib/supabase/ must stay a literal comparison,\n` +
      `  placed before the TALLY_DEV_FIXTURES check, or the bundler cannot\n` +
      `  eliminate the dynamic import.`
  );
  process.exit(1);
}

console.log(
  `✓ dev fixtures excluded from the production build (${files.length} chunks scanned)`
);
