// Resolves the "@/…" path alias for plain Node, so the checks in this folder can
// import the real modules instead of asserting against their source text.
// Next.js does this at build time; Node needs to be told.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = pathToFileURL(new URL("..", import.meta.url).pathname + "/");

export function resolve(specifier, context, next) {
  if (!specifier.startsWith("@/")) return next(specifier, context);

  const base = new URL(specifier.slice(2), root);
  for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = new URL(base.href + suffix);
    if (existsSync(fileURLToPath(candidate))) {
      return next(candidate.href, context);
    }
  }
  return next(specifier, context);
}