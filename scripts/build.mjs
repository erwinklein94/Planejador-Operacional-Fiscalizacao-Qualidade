import { cp, mkdir, writeFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
for (const path of [
  "index.html",
  "css",
  "js",
  "services",
  "modules",
  "utils",
  "data",
  "assets",
  "vendor",
])
  await cp(path, `dist/${path}`, { recursive: true });
await writeFile("dist/.nojekyll", "");
process.stdout.write("Aplicação estática pronta em dist/\n");
