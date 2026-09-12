import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FIELD_HELP, helpFor, labelWithHelp } from "../js/help.js";
import { field, fieldHtml } from "../modules/forms.js";

test("todos os campos dos formulários declarativos possuem explicação", async () => {
  for (const file of ["modules/forms.js", "modules/dialogs.js", "modules/auth.js"]) {
    const source = await readFile(file, "utf8");
    const labels = [...source.matchAll(/field\(\s*["'][^"']*["']\s*,\s*["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    const missing = labels.filter((label) => !FIELD_HELP[label]);
    assert.deepEqual(missing, [], `${file} contém campos sem ajuda: ${missing.join(", ")}`);
  }
});

test("a ajuda é segura, acessível e aparece ao lado do rótulo", () => {
  const html = fieldHtml(
    field("example", "Campo <complexo>", "text", {
      tooltip: 'Explica o "campo" <sem HTML>.',
      required: true,
    }),
    "valor",
  );
  assert.match(html, /class="help-tip"/);
  assert.match(html, /aria-label="Ajuda sobre Campo &lt;complexo&gt;"/);
  assert.match(html, /Explica o &quot;campo&quot; &lt;sem HTML&gt;\./);
  assert.match(html, /<label for="field-example">Campo &lt;complexo&gt; \*<\/label>/);
});

test("conceitos conhecidos geram interrogação e os desconhecidos não geram botão vazio", () => {
  assert.match(labelWithHelp("Cobertura"), /data-help-text=/);
  assert.equal(helpFor("Conceito inexistente"), "");
});
