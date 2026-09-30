// Records which commit this build came from, so a running container can be
// checked against the repository instead of guessed at. Deploys are
// asynchronous and a request can arrive before a new build finishes, which has
// twice made a stale container look like a code bug.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
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

const sha = resolveSha();
const target = join(process.cwd(), "lib", "build-info.generated.ts");
writeFileSync(
  target,
  `// Generated at build time by scripts/write-build-info.mjs. Do not edit.\nexport const BUILD_SHA = ${JSON.stringify(sha)};\n`,
);
console.log(`[build-info] recorded commit ${sha}`);
