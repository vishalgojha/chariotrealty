// Lets the checks in this folder import the app's modules under plain Node by
// teaching it the "@/…" path alias that Next.js resolves at build time.
import { register } from "node:module";

register("./alias-hook.mjs", import.meta.url);