import { esc, initials } from "../utils/formatters.js";
import { icon } from "../js/icons.js";
import { badge, button, heading, empty } from "./shared.js";
import { field, showForm } from "./forms.js";

export const ROLE_LABELS = Object.freeze({
  editor: "Editor",
  fiscalizacao: "Fiscalização",
  coordenacao: "Coordenação",
});

export const roleLabel = (role) => ROLE_LABELS[role] || "Sem perfil";

const pageLabels = {
  dashboard: "Dashboard",
  planejamento: "Planejamento semanal",
  demandas: "Demandas",
  escala: "Escala de fiscais",
  fiscais: "Fiscais",
  fornecedores: "Fornecedores",
  materiais: "Materiais",
  risco: "Mapa de risco",
  cobertura: "Cobertura",
  rnc: "RNC / Ocorrências",
  historico: "Histórico",
  perfil: "Meu perfil",
};

const isEditor = (ctx) => ctx.profile?.role === "editor";

function accessTime(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return `<time datetime="${esc(date.toISOString())}">${esc(
    date.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "medium",
    }),
  )}</time>`;
}

export function renderLogin({ error = "", loading = false, email = "" } = {}) {
  return `<main id="main" class="auth-page" tabindex="-1">
    <section class="auth-intro" aria-label="Planejamento operacional da fiscalização">
      <div class="auth-brand"><span class="auth-brand-mark" aria-hidden="true">EQ</span><div><strong>fiscalização</strong><small>qualidade de materiais</small></div></div>
      <div class="auth-intro-copy"><span class="auth-eyebrow">ENGENHARIA DA QUALIDADE</span><h1>Uma operação conectada.<br><span>Qualidade em cada etapa.</span></h1><p>Planeje a semana, acompanhe a cobertura e consulte as prioridades da fiscalização em um só lugar.</p></div>
      <div class="auth-track" aria-hidden="true"><span></span><span></span><span></span><i></i></div>
      <div class="auth-intro-footer">Planejamento Operacional <span>Fiscalização &amp; Qualidade</span></div>
    </section>
    <section class="auth-entry" aria-labelledby="login-title">
      <div class="auth-login-card">
        <span class="auth-access-label">${icon("shield")} ACESSO RESTRITO</span>
        <h2 id="login-title">Entre na sua conta</h2>
        <p class="auth-login-subtitle">Use o e-mail e a senha cadastrados para acessar o planejamento da equipe.</p>
        <form id="login-form" class="auth-form" aria-busy="${loading}">
          <label class="field" for="login-email">E-mail<input id="login-email" name="email" type="email" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="nome@empresa.com.br" value="${esc(email)}" required ${loading ? "disabled" : ""}></label>
          <label class="field" for="login-password">Senha<input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" required ${loading ? "disabled" : ""}></label>
          <div id="login-error" ${error ? 'class="inline-error"' : ""} role="alert">${esc(error)}</div>
          <button class="btn primary auth-submit" type="submit" ${loading ? "disabled" : ""}>${loading ? `${icon("clock")} Entrando…` : `Entrar ${icon("arrow")}`}</button>
        </form>
        <div class="auth-help">${icon("users")}<p>O acesso é exclusivo para pessoas cadastradas. Para solicitar uma conta ou recuperar o acesso, fale com o editor responsável.</p></div>
      </div>
      <p class="auth-entry-footer">Planejador Operacional · Fiscalização &amp; Qualidade</p>
    </section>
  </main>`;
}

export function renderProfile(ctx) {
  const profile = ctx.profile || {};
  const editor = isEditor(ctx);
  const name = profile.full_name || profile.email || "Minha conta";
  const accounts = Array.isArray(ctx.accounts) ? ctx.accounts : [];
  return `${heading("Meu perfil", "Sua conta e suas permissões no planejamento operacional.", button("Sair da conta", "logout", "", "logout"), "CONTA E ACESSO")}
    <div class="account-overview">
      <section class="panel account-identity" aria-labelledby="account-title">
        <span class="avatar account-avatar">${esc(initials(name))}</span>
        <div class="account-identity-copy"><h2 id="account-title">${esc(name)}</h2><p class="muted account-email">${esc(profile.email)}</p><div class="account-badges">${badge(roleLabel(profile.role), editor ? "info" : "neutral")}${badge("Conta ativa", "success")}</div></div>
        <div class="account-password-action">${button("Alterar minha senha", "change-password", "", "shield")}</div>
      </section>
      <section class="panel account-permissions" aria-labelledby="permissions-title">
        <div class="section-title"><h2 id="permissions-title">Permissões do perfil</h2>${icon(editor ? "edit" : "shield")}</div>
        <strong>${editor ? "Gestão completa da operação" : "Consulta do planejamento"}</strong>
        <p>${editor ? "Edite os dados da operação, organize o planejamento, cadastre contas e consulte a auditoria de acessos." : "Consulte os dados da operação, o planejamento semanal e os relatórios compartilhados pela equipe."}</p>
        <span class="account-permission-note">${icon("check")}${editor ? "Edição e administração habilitadas" : "Perfil com acesso somente para leitura"}</span>
      </section>
    </div>
    ${
      editor
        ? `<section class="panel flush account-list" aria-labelledby="accounts-title"><div class="section-title"><div><h2 id="accounts-title">Contas da equipe</h2><p class="muted">Defina quem pode acessar o sistema ao cadastrar uma nova conta.</p></div><div class="flex">${button("Atualizar", "refresh-data", "", "history")}${button("Nova conta", "create-account", "primary", "plus")}</div></div>
      ${ctx.accountsLoading ? '<p class="empty" role="status">Carregando contas…</p>' : ctx.accountsError ? `<div class="notice warn" role="alert">${esc(ctx.accountsError)}</div>` : accounts.length ? `<div class="table-wrap"><table><caption class="auth-visually-hidden">Contas cadastradas para acesso ao planejamento</caption><thead><tr><th>Pessoa</th><th>Perfil</th><th>Status</th></tr></thead><tbody>${accounts.map((account) => `<tr><td><span class="table-main">${esc(account.full_name || "Nome não informado")}${account.id === profile.id ? ' <span class="account-self">você</span>' : ""}</span><span class="table-sub account-email">${esc(account.email)}</span></td><td>${badge(roleLabel(account.role), account.role === "editor" ? "info" : "neutral")}</td><td>${badge(account.active === false ? "Inativa" : "Ativa", account.active === false ? "neutral" : "success")}</td></tr>`).join("")}</tbody></table></div><div class="summary-strip"><span><strong>${accounts.length}</strong> ${accounts.length === 1 ? "conta cadastrada" : "contas cadastradas"}</span><span>Fiscalização e Coordenação têm acesso somente para consulta.</span></div>` : empty("Nenhuma conta disponível", "Atualize a lista para consultar as contas cadastradas.")}</section>`
        : ""
    }`;
}

export function renderAccessAudit(ctx) {
  if (!isEditor(ctx))
    return `${heading("Acesso restrito", "Esta página está disponível somente para o perfil Editor.", "", "AUDITORIA")}`;
  const logs = (Array.isArray(ctx.accessLogs) ? ctx.accessLogs : [])
    .filter((entry) => entry.role !== "editor")
    .slice()
    .sort((a, b) => new Date(b.accessed_at) - new Date(a.accessed_at))
    .slice(0, 100);
  const people = new Set(logs.map((entry) => entry.user_id || entry.email))
    .size;
  return `${heading("Auditoria de acessos", "Os 100 acessos mais recentes dos perfis Fiscalização e Coordenação.", button("Atualizar acessos", "refresh-audit", "", "history"), "GESTÃO E CONTROLE")}
    <div class="audit-summary"><div><span class="audit-summary-icon">${icon("history")}</span><p><strong>${logs.length}</strong><span>Acessos exibidos</span></p></div><div><span class="audit-summary-icon">${icon("users")}</span><p><strong>${people}</strong><span>${people === 1 ? "Pessoa no período" : "Pessoas no período"}</span></p></div><div class="audit-timezone">Horário de Brasília<span>Registros mais recentes primeiro</span></div></div>
    <section class="panel flush" aria-labelledby="audit-title"><div class="section-title"><div><h2 id="audit-title">Páginas acessadas</h2><p class="muted">Data, hora e página consultada por cada pessoa.</p></div>${badge("Exclusivo do editor", "info")}</div>
      ${ctx.auditLoading ? '<p class="empty" role="status">Carregando os acessos…</p>' : ctx.auditError ? `<div class="notice warn" role="alert">${esc(ctx.auditError)}</div>` : logs.length ? `<div class="table-wrap"><table class="audit-table"><caption class="auth-visually-hidden">Últimos acessos de Fiscalização e Coordenação, em horário de Brasília</caption><thead><tr><th>Data e hora</th><th>Pessoa</th><th>Perfil</th><th>Página acessada</th></tr></thead><tbody>${logs.map((entry) => `<tr><td class="nowrap">${accessTime(entry.accessed_at)}</td><td><span class="table-main">${esc(entry.full_name || "Nome não informado")}</span><span class="table-sub account-email">${esc(entry.email)}</span></td><td>${badge(roleLabel(entry.role))}</td><td><span class="audit-page-name">${icon("clipboard")}${esc(pageLabels[entry.page] || entry.page || "Página não informada")}</span></td></tr>`).join("")}</tbody></table></div>` : empty("Nenhum acesso registrado", "Os acessos aparecerão aqui quando os perfis Fiscalização e Coordenação consultarem o sistema.")}
      <div class="summary-strip"><span>Os acessos do perfil Editor não são incluídos nesta auditoria.</span></div>
    </section>`;
}

export function openAccountForm(save) {
  const dialog = showForm(
    "Criar conta de acesso",
    "Cadastre a pessoa e escolha suas permissões. Fiscalização e Coordenação podem apenas consultar os dados.",
    [
      field("full_name", "Nome completo", "text", {
        required: true,
        full: true,
      }),
      field("email", "E-mail", "email", { required: true, full: true }),
      field("role", "Perfil de acesso", "select", {
        required: true,
        noEmpty: true,
        options: Object.entries(ROLE_LABELS),
        full: true,
      }),
      field("password", "Senha inicial", "password", {
        required: true,
        full: true,
        help: "Use pelo menos 8 caracteres. A pessoa poderá alterar a senha no próprio perfil.",
      }),
    ],
    {
      full_name: "",
      email: "",
      password: "",
      role: "fiscalizacao",
      active: true,
    },
    async (record) => {
      const password = dialog.querySelector('[name="password"]').value;
      if (password.length < 8)
        throw new Error("A senha deve ter pelo menos 8 caracteres.");
      if (!Object.hasOwn(ROLE_LABELS, record.role))
        throw new Error("Selecione um perfil válido.");
      await save({
        ...record,
        email: record.email.toLowerCase(),
        password,
        active: true,
      });
    },
  );
  const passwordInput = dialog.querySelector('[name="password"]');
  passwordInput.autocomplete = "new-password";
  passwordInput.minLength = 8;
  dialog.querySelector('[name="email"]').autocomplete = "email";
  dialog.querySelector('[name="email"]').spellcheck = false;
  dialog.querySelector('[name="full_name"]').autocomplete = "name";
  dialog.querySelector('button[type="submit"]').textContent = "Criar conta";
  return dialog;
}

export function openPasswordForm(save) {
  const dialog = showForm(
    "Alterar minha senha",
    "Escolha uma nova senha para sua conta de acesso.",
    [
      field("password", "Nova senha", "password", {
        required: true,
        full: true,
        help: "Use pelo menos 8 caracteres.",
      }),
      field("confirmation", "Confirme a nova senha", "password", {
        required: true,
        full: true,
      }),
    ],
    { password: "", confirmation: "" },
    async () => {
      const password = dialog.querySelector('[name="password"]').value;
      const confirmation = dialog.querySelector('[name="confirmation"]').value;
      if (password.length < 8)
        throw new Error("A senha deve ter pelo menos 8 caracteres.");
      if (password !== confirmation)
        throw new Error("As senhas não coincidem. Confira a confirmação.");
      await save(password);
    },
  );
  for (const input of dialog.querySelectorAll('input[type="password"]')) {
    input.autocomplete = "new-password";
    input.minLength = 8;
  }
  dialog.querySelector('button[type="submit"]').textContent = "Alterar senha";
  return dialog;
}
