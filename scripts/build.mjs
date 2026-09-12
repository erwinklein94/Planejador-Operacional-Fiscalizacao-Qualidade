import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
const version = (process.env.GITHUB_SHA || Date.now().toString()).slice(0, 12);
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

async function versionReferences(path) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const target = `${path}/${entry.name}`;
    if (entry.isDirectory()) await versionReferences(target);
    else if (entry.name.endsWith(".js") || entry.name === "index.html") {
      const source = await readFile(target, "utf8");
      const updated = source.replace(
        /(["'])(\.{1,2}\/[^"'?]+\.(?:js|css))\1/g,
        `$1$2?v=${version}$1`,
      );
      await writeFile(target, updated);
    }
  }
}
await versionReferences("dist");
await writeFile("dist/.nojekyll", "");
process.stdout.write("Aplicação estática pronta em dist/\n");
