import test from "node:test";
import assert from "node:assert/strict";
import {
  renderLogin,
  renderProfile,
  renderAccessAudit,
} from "../modules/auth.js";

const profile = (role) => ({
  id: "fixture-user",
  full_name: "Pessoa de teste",
  email: "person@example.invalid",
  active: true,
  role,
});

test("login escapa erro e email sem oferecer cadastro público", () => {
  const html = renderLogin({
    error: '<script>alert("x")</script>',
    email: '\" autofocus onfocus=\"alert(1)',
  });
  assert.doesNotMatch(html, /<script>|value="" autofocus/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /type="password" autocomplete="current-password"/);
  assert.doesNotMatch(html, /data-action="create-account"|id="signup-form"/);
});

for (const role of ["fiscalizacao", "coordenacao"]) {
  test(`${role}: perfil oculta contas administrativas e auditoria oculta os registros`, () => {
    const accounts = [
      { ...profile("editor"), email: "private-account@example.invalid" },
    ];
    const accessLogs = [
      {
        role: "fiscalizacao",
        email: "private-audit@example.invalid",
        accessed_at: "2026-09-11T12:00:00Z",
      },
    ];
    const profileHtml = renderProfile({ profile: profile(role), accounts });
    const auditHtml = renderAccessAudit({ profile: profile(role), accessLogs });
    assert.doesNotMatch(
      profileHtml,
      /data-action="create-account"|private-account@example\.invalid/,
    );
    assert.match(profileHtml, /data-action="change-password"/);
    assert.doesNotMatch(auditHtml, /private-audit@example\.invalid|<table/);
    assert.match(auditHtml, /Acesso restrito/);
  });
}

test("editor acessa criação de contas e os valores das contas são escapados", () => {
  const html = renderProfile({
    profile: profile("editor"),
    accounts: [
      { ...profile("coordenacao"), full_name: "<img src=x onerror=alert(1)>" },
    ],
  });
  assert.match(html, /data-action="create-account"/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
});

test("auditoria mostra somente 100 acessos de não editores, em ordem recente, sem HTML injetado", () => {
  const logs = Array.from({ length: 105 }, (_, index) => ({
    id: index + 1,
    user_id: "fixture-reader",
    full_name:
      index === 104 ? "<script>audit injection</script>" : `Visitante ${index}`,
    email: `access-${String(index).padStart(3, "0")}@example.invalid`,
    role: index % 2 ? "fiscalizacao" : "coordenacao",
    page: "dashboard",
    accessed_at: new Date(Date.UTC(2026, 8, 11, 12, index)).toISOString(),
  }));
  logs.push({
    ...logs[104],
    role: "editor",
    email: "editor-must-be-excluded@example.invalid",
  });
  const originalOrder = logs.map((row) => row.email);
  const html = renderAccessAudit({
    profile: profile("editor"),
    accessLogs: logs,
  });
  assert.equal(
    (html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1].match(/<tr>/g) || []).length,
    100,
  );
  assert.doesNotMatch(
    html,
    /editor-must-be-excluded|access-004@example\.invalid|<script>/,
  );
  assert.match(html, /access-005@example\.invalid/);
  assert.match(html, /&lt;script&gt;audit injection&lt;\/script&gt;/);
  assert.ok(
    html.indexOf("access-104@example.invalid") <
      html.indexOf("access-005@example.invalid"),
  );
  assert.deepEqual(
    logs.map((row) => row.email),
    originalOrder,
  );
});
