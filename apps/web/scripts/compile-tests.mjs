import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
await rm(join(root, ".tmp-test-build"), { recursive: true, force: true });

async function runNode(args) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit" });
  const code = await new Promise((resolve) => {
    child.on("exit", (nextCode) => resolve(nextCode ?? 1));
  });
  if (code !== 0) {
    process.exit(code);
  }
}

async function emitChessCoreShim() {
  const sourceRoot = join(root, "..", "..", "packages", "chess-core", "src");
  const outputRoot = join(root, ".tmp-test-build", "node_modules", "@chess-trainer", "chess-core");
  const files = ["index.ts", "headers.ts", "pgn.ts", "hash.ts"];

  await mkdir(outputRoot, { recursive: true });

  for (const file of files) {
    const sourcePath = join(sourceRoot, file);
    const source = await readFile(sourcePath, "utf8");
    const rewrittenSource = source.replace(/from "\.\/([^"]+)"/g, 'from "./$1.js"');
    const output = ts.transpileModule(rewrittenSource, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020
      },
      fileName: file
    });
    await writeFile(join(outputRoot, file.replace(/\.ts$/, ".js")), output.outputText);
  }

  await writeFile(
    join(outputRoot, "package.json"),
    JSON.stringify(
      {
        name: "@chess-trainer/chess-core",
        private: true,
        type: "module",
        exports: {
          ".": "./index.js"
        }
      },
      null,
      2
    ) + "\n"
  );
}

await runNode(["./node_modules/typescript/bin/tsc", "-p", "tsconfig.test.json", "--pretty", "false"]);
await emitChessCoreShim();
