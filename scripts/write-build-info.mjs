// Records which commit this build came from, so a running container can be
// checked against the repository instead of guessed at. Deploys are
// asynchronous and a request can arrive before a new build finishes, which has
// twice made a stale container look like a code bug.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

function resolveSha() {
  const fromEnv = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "";
  if (fromEnv.trim()) return fromEnv.trim().slice(0, 12);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
      .slice(0, 12);
  } catch {
    return "unknown";
  }
}

// Deploy images do not always carry git metadata, so a fingerprint of the
// source is recorded too. It can be recomputed from any checkout to prove
// which code a container is running. It covers every source file, not a
// hand-picked list: a fixed list silently keeps matching after a change
// elsewhere in the tree.
const ROOTS = ["app", "lib", "components", "scripts"];
const SOURCE = /\.(ts|tsx|mjs|js|json|css)$/;
const SKIP = /(build-info\.generated|tsbuildinfo|node_modules|\.next)/;

function sourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.test(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (SOURCE.test(entry)) found.push(full);
  }
  return found;
}

function fingerprint() {
  const hash = createHash("sha256");
  const root = process.cwd();
  for (const dir of ROOTS) {
    let files = [];
    try {
      files = sourceFiles(join(root, dir));
    } catch {
      hash.update(`${dir}:missing`);
      continue;
    }
    // Sorted so the result does not depend on directory order.
    for (const file of files.sort()) {
      hash.update(relative(root, file));
      hash.update(readFileSync(file));
    }
  }
  return hash.digest("hex").slice(0, 12);
}

const sha = resolveSha();
const print = fingerprint();
const target = join(process.cwd(), "lib", "build-info.generated.ts");
writeFileSync(
  target,
  `// Generated at build time by scripts/write-build-info.mjs. Do not edit.\n` +
    `export const BUILD_SHA = ${JSON.stringify(sha)};\n` +
    `export const BUILD_FINGERPRINT = ${JSON.stringify(print)};\n`,
);
console.log(`[build-info] commit ${sha} fingerprint ${print}`);
