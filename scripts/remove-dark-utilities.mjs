import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "/home/ubuntu/multi-company-erp-dashboard/client/src";
const extensions = new Set([".ts", ".tsx", ".css"]);
let changed = 0;

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (extensions.has(path.slice(path.lastIndexOf(".")))) {
      const before = readFileSync(path, "utf8");
      const after = before.replace(/\bdark:[^\s"'`<>]+/g, "").replace(/[ \t]{2,}/g, " ");
      if (after !== before) {
        writeFileSync(path, after);
        changed += 1;
      }
    }
  }
}

walk(root);
console.log(`Removed stale dark utility tokens from ${changed} source files.`);
