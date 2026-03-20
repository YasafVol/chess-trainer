import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildFitlGraphSnapshot,
  formatSnapshot,
  formatSnapshotModule,
  resolveGeneratedModulePath,
  resolveGeneratedSnapshotPath
} from "./fitlGraphSource.mjs";

const snapshot = await buildFitlGraphSnapshot();
const outputPath = resolveGeneratedSnapshotPath();
const modulePath = resolveGeneratedModulePath();
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, formatSnapshot(snapshot), "utf8");
await writeFile(modulePath, formatSnapshotModule(snapshot), "utf8");
console.log(`[fitl-graph] wrote ${outputPath}`);
console.log(`[fitl-graph] wrote ${modulePath}`);
