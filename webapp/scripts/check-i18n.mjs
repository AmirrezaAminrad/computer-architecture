// Reports FA dictionary keys defined in more than one file, and t("...") literals with no FA entry.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const dictDir = path.join(root, "lib/strings");
const unq = (s) => JSON.parse(`"${s}"`);
const STR = String.raw`"((?:[^"\\\n]|\\.)+)"`;
const KEY_RE = new RegExp(String.raw`(?:^|[{,])\s*` + STR + String.raw`\s*:`, "gm");
const CALL_RE = new RegExp(String.raw`\b(?:t|ts|tf)\(\s*` + STR, "g");

const owners = new Map();
for (const f of fs.readdirSync(dictDir).filter((f) => /\.tsx?$/.test(f))) {
  const src = fs.readFileSync(path.join(dictDir, f), "utf8");
  for (const m of src.matchAll(KEY_RE)) {
    const k = unq(m[1]);
    owners.set(k, [...(owners.get(k) ?? []), f]);
  }
}
const dupes = [...owners].filter(([, files]) => files.length > 1);

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? e.name === "strings" ? [] : walk(path.join(d, e.name))
      : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : [],
  );
const missing = new Set();
for (const f of walk(root)) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(CALL_RE)) {
    const k = unq(m[1]);
    if (!owners.has(k)) missing.add(`${path.relative(root, f)}: ${k}`);
  }
}

console.log(`FA keys: ${owners.size}`);
if (dupes.length) console.log(`\nDuplicate keys (${dupes.length}):\n` + dupes.map(([k, f]) => `  ${k}  [${f.join(", ")}]`).join("\n"));
if (missing.size) console.log(`\nUntranslated t() literals (${missing.size}):\n` + [...missing].map((x) => "  " + x).join("\n"));
process.exit(dupes.length || missing.size ? 1 : 0);
