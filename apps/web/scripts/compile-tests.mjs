import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
await rm(join(root, ".tmp-test-build"), { recursive: true, force: true });

const args = ["./node_modules/.bin/tsc", "-p", "tsconfig.test.json", "--pretty", "false"];
const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
