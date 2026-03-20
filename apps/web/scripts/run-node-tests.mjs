import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

async function collectTests(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTests(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(fullPath);
    }
  }
  return files;
}

const testDir = fileURLToPath(new URL("../.tmp-test-build/src", import.meta.url));
const compiledFiles = await collectTests(testDir);
const scriptTestDir = fileURLToPath(new URL("../scripts", import.meta.url));
const scriptFiles = (await collectTests(scriptTestDir)).filter((file) => file.endsWith(".test.mjs"));
const files = [...compiledFiles, ...scriptFiles];
if (files.length === 0) {
  throw new Error("No compiled test files found.");
}

const args = ["--test"];
if (process.env.TEST_NAME) {
  args.push("--test-name-pattern", process.env.TEST_NAME);
}
args.push(...files);

const child = spawn(process.execPath, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
