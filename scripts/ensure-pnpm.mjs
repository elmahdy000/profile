import { rmSync } from "node:fs";

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  rmSync(lockfile, { force: true });
}

if (!String(process.env.npm_config_user_agent || "").startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
