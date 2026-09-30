// Records which commit this build came from, so a running container can be
// checked against the repository instead of guessed at. Deploys are
// asynchronous and a request can arrive before a new build finishes, which has
// twice made a stale container look like a code bug.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
// files that decide behaviour is recorded too. It can be recomputed from a
// checkout to prove which code a container is actually running.
const FINGERPRINTED = ["lib/agent.ts", "lib/inventory.ts", "app/api/agent/chat/route.ts", "app/api/properties/route.ts"];

function fingerprint() {
  const hash = createHash("sha256");
  for (const file of FINGERPRINTED) {
    try {
      hash.update(file);
      hash.update(readFileSync(join(process.cwd(), file)));
    } catch {
      hash.update(`${file}:missing`);
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
