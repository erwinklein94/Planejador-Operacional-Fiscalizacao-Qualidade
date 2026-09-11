import { readdir, readFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
let count = 0;
for (const dir of ["js", "services", "modules", "utils", "data", "scripts"])
  for (const file of await readdir(dir)) {
    if (!/\.m?js$/.test(file)) continue;
    const path = `${dir}/${file}`;
    const result = spawnSync(process.execPath, ["--check", path], {
      encoding: "utf8",
    });
    if (result.status !== 0) throw new Error(`${path}: ${result.stderr}`);
    const source = await readFile(path, "utf8");
    for (const [, link] of source.matchAll(/from\s+['"]([^'"]+)['"]/g))
      if (link.startsWith(".")) await access(resolve(dirname(path), link));
    count++;
  }
const html = await readFile("index.html", "utf8");
const vendor = JSON.parse(await readFile("vendor/manifest.json", "utf8"));
const checksum = createHash("sha256")
  .update(await readFile(`vendor/${vendor.file}`))
  .digest("hex");
if (checksum !== vendor.sha256)
  throw new Error("O SDK Supabase não corresponde ao checksum fixado.");
for (const [, path] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))
  await access(path);
process.stdout.write(`${count} scripts e referências locais verificados.\n`);
