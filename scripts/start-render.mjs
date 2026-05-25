import { mkdir } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:../data/dev.db";
}

await mkdir(path.join(process.cwd(), "data", "uploads"), { recursive: true });

const setup = spawnSync("node", ["scripts/setup-db.mjs"], {
  stdio: "inherit",
  env: process.env
});

if (setup.status !== 0) {
  process.exit(setup.status ?? 1);
}

const port = process.env.PORT || "3000";
const server = spawn("node", ["scripts/run-with-db.mjs", "next", "start", "-H", "0.0.0.0", "-p", port], {
  stdio: "inherit",
  env: process.env
});

server.on("exit", (code) => {
  process.exit(code ?? 0);
});
