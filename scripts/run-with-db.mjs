import { spawn } from "node:child_process";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:../data/dev.db";
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Missing command.");
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: "inherit",
  shell: true,
  env: process.env
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
