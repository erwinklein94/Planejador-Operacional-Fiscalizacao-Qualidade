import { storageService } from "../services/storageService.js";
import { authService } from "../services/authService.js";
import { readRoute } from "./router.js";
import { icon } from "./icons.js";
import { initHelpTooltips } from "./help.js";
import { esc, initials, download } from "../utils/formatters.js";
import {
  monday,
  addDays,
  weekLabel,
  weekNumber,
  validDate,
} from "../utils/dates.js";
import { metrics, alerts } from "../utils/planning.js";
import { demandRisk, WEIGHT_LABELS } from "../utils/risk.js";
import { renderDashboard } from "../modules/dashboard.js";
import { renderPlanning } from "../modules/planejamento.js";
import {
  renderDemands,
  renderInspectors,
  renderSuppliers,
  renderMaterials,
  renderRnc,
} from "../modules/cadastros.js";
import {
  renderCoverage,
  renderRisk,
  renderHistory,
  renderSettings,
} from "../modules/analises.js";
import { openEdit } from "../modules/forms.js";
import {
  renderLogin,
  renderProfile,
  renderAccessAudit,
  openAccountForm,
  openPasswordForm,
  roleLabel,
} from "../modules/auth.js";
import {
  demandDetail,
  supplierDetail,
  suggestions,
  manualAllocation,
  availabilityForm,
  reprogramForm,
  allocationDetail,
  alertsDialog,
  reportDialog,
} from "../modules/dialogs.js";
import {
  closeModal,
  showModal,
  toast,
  formError,
  confirmDialog,
} from "./ui.js";
const nav = [
  ["dashboard", "Dashboard", "dashboard"],
  ["planejamento", "Planejamento semanal", "calendar"],
  ["demandas", "Demandas", "clipboard"],
  ["escala", "Escala de fiscais", "users"],
  ["fiscais", "Fiscais", "users"],
  ["fornecedores", "Fornecedores", "factory"],
  ["materiais", "Materiais", "box"],
  ["risco", "Mapa de risco", "shield"],
  ["cobertura", "Cobertura", "chart"],
  ["rnc", "RNC / Ocorrências", "alert"],
  ["historico", "Histórico", "history"],
  ["configuracoes", "Configurações", "settings"],
  ["auditoria", "Auditoria de acessos", "history"],
  ["perfil", "Meu perfil", "users"],
];
const renderers = {
  dashboard: renderDashboard,
  planejamento: renderPlanning,
  escala: renderPlanning,
  demandas: renderDemands,
  fiscais: renderInspectors,
  fornecedores: renderSuppliers,
  materiais: renderMaterials,
  risco: renderRisk,
  cobertura: renderCoverage,
  rnc: renderRnc,
  historico: renderHistory,
  configuracoes: renderSettings,
  auditoria: renderAccessAudit,
  perfil: renderProfile,
};
let ctx = {
  state: null,
  week: monday(),
  ...readRoute(),
  filters: {},
  page: 1,
  coverageTab: "material",
  profile: null,
  accounts: [],
  accessLogs: [],
  loading: false,
};
let collapsed = false,
  mobileNav = false;
let loadVersion = 0;
let routeWork = Promise.resolve();
const root = document.querySelector("#app");
initHelpTooltips();
const editorRoutes = new Set(["configuracoes", "auditoria"]);
const editorActions = new Set([
  "suggest-demand",
  "suggest-next",
  "manual-allocation",
  "availability",
  "cancel-allocation",
  "reprogram",
  "snapshot",
  "import",
  "reset-demo",
  "reset-empty",
  "migrate-legacy",
  "create-account",
  "refresh-audit",
]);
const canEdit = () => ctx.profile?.role === "editor";
const requiresEditor = (name) =>
  name.startsWith("new-") || editorActions.has(name);
function assertEditor() {
  if (!canEdit())
    throw new Error("Seu perfil permite apenas consultar os dados.");
  if (ctx.loading)
    throw new Error("Aguarde a atualização dos dados antes de editar.");
}
function enforceReadOnly(scope) {
  if (canEdit()) return;
  for (const element of scope.querySelectorAll("[data-action]")) {
    const name = element.dataset.action;
    if (requiresEditor(name)) element.remove();
    else if (name.startsWith("edit-")) {
      element.title = "Consultar cadastro";
      if (!element.classList.contains("table-link")) {
        element.innerHTML = `${icon("chevron")} Consultar`;
        element.setAttribute("aria-label", "Consultar cadastro");
      }
    }
  }
}
function viewRecord(collection, id) {
  if (!id) throw new Error("Selecione um cadastro para consultar.");
  const dialog = openEdit(ctx, collection, id, () => {
    throw new Error("Seu perfil permite apenas consultar os dados.");
  });
  dialog.querySelector("#modal-title").textContent = dialog
    .querySelector("#modal-title")
    .textContent.replace(/^Editar/, "Consultar");
  dialog.querySelector(".modal-subtitle").textContent =
    "Consulta do cadastro. Seu perfil tem acesso somente para leitura.";
  for (const input of dialog.querySelectorAll("input, select, textarea"))
    input.disabled = true;
  dialog.querySelector('button[type="submit"]')?.remove();
  dialog
    .querySelector('[data-action="close-modal"][type="button"]')
    ?.replaceChildren("Fechar");
}
function clearPrivateState() {
  loadVersion++;
  clearTimeout(searchTimer);
  storageService.clear();
  ctx.state = null;
  ctx.profile = null;
  ctx.accounts = [];
  ctx.accessLogs = [];
  ctx.accountsError = "";
  ctx.auditError = "";
  ctx.filters = {};
  ctx.loading = false;
  mobileNav = false;
  closeModal();
  document.querySelector("#modal").replaceChildren();
  document.querySelector("#toasts").replaceChildren();
}
function showLogin(error = "", email = "") {
  clearPrivateState();
  root.innerHTML = renderLogin({ error, email });
  document.title = "Entrar | Planejamento Operacional";
}
function showLoadError(error) {
  clearPrivateState();
  root.innerHTML = `<main id="main" class="panel storage-error" tabindex="-1"><h1>Não foi possível abrir o planejamento</h1><p class="spaced">${esc(error.message || String(error))}</p><p class="spaced muted">Verifique a conexão e tente novamente para consultar os dados compartilhados.</p><div class="setting-actions"><button class="btn primary" data-action="retry-data">Tentar novamente</button><button class="btn" data-action="logout">Sair da conta</button></div></main>`;
}
function selectRoute() {
  const route = readRoute();
  ctx.route =
    route.route === "login" || (!canEdit() && editorRoutes.has(route.route))
      ? "dashboard"
      : route.route;
  if (ctx.route !== route.route)
    history.replaceState(null, "", `#/${ctx.route}`);
  ctx.filters = {
    period: ctx.route === "demandas" ? "week" : "",
    ...route.query,
  };
  ctx.page = 1;
  mobileNav = false;
}
async function loadPageDetails(version) {
  const route = ctx.route;
  ctx.accountsError = "";
  ctx.auditError = "";
  if (!canEdit()) {
    ctx.accounts = [];
    ctx.accessLogs = [];
    return;
  }
  if (route === "perfil") {
    try {
      const accounts = await authService.listAccounts();
      if (version === loadVersion) ctx.accounts = accounts;
    } catch (error) {
      if (version === loadVersion) ctx.accountsError = error.message;
    }
  } else if (route === "auditoria") {
    try {
      const entries = await authService.recentAccesses();
      if (version === loadVersion)
        ctx.accessLogs = entries.map((entry) => ({
          ...entry,
          page: nav.find(([route]) => route === entry.page)?.[1] || entry.page,
        }));
    } catch (error) {
      if (version === loadVersion) ctx.auditError = error.message;
    }
  }
}
async function applyRoute() {
  if (!ctx.profile) return;
  selectRoute();
  const route = ctx.route;
  const version = ++loadVersion;
  ctx.loading = true;
  if (ctx.state) render();
  routeWork = routeWork
    .catch(() => {})
    .then(async () => {
      if (version !== loadVersion) return;
      try {
        const state = await storageService.refresh(route);
        if (version !== loadVersion) return;
        ctx.state = state;
        ctx.profile = storageService.profile;
        selectRoute();
        await loadPageDetails(version);
        if (version !== loadVersion) return;
        ctx.loading = false;
        render();
      } catch (error) {
        if (version === loadVersion) showLoadError(error);
      }
    });
  await routeWork;
}
async function loadApplication() {
  const version = ++loadVersion;
  root.innerHTML =
    '<main id="main" class="initial-loading" role="status">Carregando sua conta e os dados compartilhados…</main>';
  try {
    const profile = await authService.getProfile();
    if (version !== loadVersion) return;
    ctx.profile = profile;
    selectRoute();
    const state = await storageService.init(ctx.route);
    if (version !== loadVersion) return;
    ctx.state = state;
    ctx.profile = storageService.profile;
    if (!ctx.profile)
      throw new Error("Sua conta não possui um perfil de acesso ativo.");
    selectRoute();
    await loadPageDetails(version);
    if (version !== loadVersion) return;
    ctx.loading = false;
    render();
  } catch (error) {
    if (version === loadVersion) showLoadError(error);
  }
}
function weekPicker() {
  return `<div class="week-picker"><button class="icon-button back" data-action="week-prev" aria-label="Semana anterior">${icon("chevron")}</button><input type="date" data-week-picker aria-label="Selecionar semana" value="${ctx.week}"><button class="icon-button" data-action="week-next" aria-label="Próxima semana">${icon("chevron")}</button></div>`;
}
function render() {
  if (!ctx.profile || !ctx.state) return;
  const focus = document.activeElement?.dataset?.filter;
  const position = document.activeElement?.selectionStart;
  const s = ctx.state;
  const count = alerts(s, ctx.week).length;
  const title = nav.find((n) => n[0] === ctx.route)?.[1];
  const userName = ctx.profile.full_name || ctx.profile.email;
  const navigation = nav.filter(
    ([route]) => canEdit() || !editorRoutes.has(route),
  );
  document.title = `${title} | Planejamento Operacional`;
  root.innerHTML = `<div class="app-shell ${collapsed ? "collapsed" : ""} ${mobileNav ? "mobile-nav" : ""}">
    <button class="mobile-overlay" data-action="toggle-nav" aria-label="Fechar navegação"></button>
    <aside class="sidebar" aria-label="Navegação principal">
      <a href="#/dashboard" class="brand" aria-label="Planejamento Operacional · início"><div class="brand-mark" title="Engenharia da Qualidade">EQ</div><div class="brand-text"><strong>fiscalização</strong><small>qualidade de materiais</small></div></a>
      <nav class="nav-scroll">${navigation.map(([route, label, glyph], i) => `${i === 0 ? '<p class="nav-label">Operação</p>' : i === 4 ? '<p class="nav-label secondary">Cadastros</p>' : i === 7 ? '<p class="nav-label secondary">Gestão e controle</p>' : ""}<a class="nav-link ${ctx.route === route ? "active" : ""}" href="#/${route}" title="${label}" ${ctx.route === route ? 'aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span>${route === "demandas" && metrics(s, ctx.week).uncoveredDemands.length ? `<span class="count">${metrics(s, ctx.week).uncoveredDemands.length}</span>` : ""}</a>`).join("")}</nav>
      <div class="sidebar-bottom"><div class="environment"><span class="status-dot"></span>Dados compartilhados · Supabase</div><a class="profile" href="#/perfil" title="Abrir meu perfil"><span class="avatar">${esc(initials(userName))}</span><div><strong>${esc(userName)}</strong><small>${esc(roleLabel(ctx.profile.role))}</small></div></a></div>
    </aside>
    <header class="topbar"><div class="topbar-left"><button class="icon-button" data-action="toggle-nav" aria-label="Alternar menu lateral" aria-expanded="${matchMedia("(max-width: 900px)").matches ? mobileNav : !collapsed}">${icon("menu")}</button><div><div class="topbar-title">Planejamento Operacional <span class="muted">/</span> <strong>${title}</strong></div><div class="topbar-subtitle">Engenharia da Qualidade de Materiais${canEdit() ? "" : " · Somente leitura"}</div></div></div><div class="topbar-right">${weekPicker()}<span class="separator"></span><button class="icon-button" data-action="refresh-data" aria-label="Atualizar dados compartilhados" ${ctx.loading ? "disabled" : ""}>${icon("history")}</button><button class="icon-button" data-action="alerts" aria-label="Central de alertas, ${count} pendências">${icon("bell")}${count ? `<span class="notification-count">${count > 99 ? "99+" : count}</span>` : ""}</button><a href="#/perfil" class="avatar" aria-label="Abrir meu perfil">${esc(initials(userName))}</a><button class="icon-button" data-action="logout" aria-label="Sair da conta">${icon("logout")}</button></div></header>
    <main id="main" class="content" tabindex="-1" aria-busy="${ctx.loading}"><div class="mobile-week flex"><span class="muted">Semana ${weekNumber(ctx.week)}</span>${weekPicker()}</div>${ctx.loading ? '<section class="panel"><p role="status">Atualizando os dados compartilhados…</p></section>' : renderers[ctx.route](ctx)}<footer class="footer-note"><span>Planejamento Operacional da Fiscalização de Materiais</span><span>${s.demo ? '<span class="demo-tag">Dados de demonstração</span> · ' : ""}Dados salvos no Supabase <span class="nowrap">· Semana ${weekNumber(ctx.week)}</span></span></footer></main>
  </div>`;
  enforceReadOnly(root);
  if (focus) {
    const input = root.querySelector(`[data-filter="${focus}"]`);
    input?.focus();
    if (input?.type === "search" && position !== null)
      input.setSelectionRange(position, position);
  }
}
async function finish(promise, message = "Alteração salva com sucesso.") {
  const version = loadVersion;
  const state = await promise;
  if (version !== loadVersion || !ctx.profile) return;
  ctx.state = state;
  closeModal();
  render();
  toast(message);
}
async function saveRecord(collection, record) {
  assertEditor();
  await finish(storageService.save(collection, record));
}
const approve = (slots) => {
  assertEditor();
  return finish(
    storageService.approveAllocations(slots),
    "Alocação aprovada. A escala e a cobertura foram atualizadas.",
  );
};
function openSuggestions(id) {
  suggestions(ctx, id, approve, (id) =>
    finish(
      storageService.rejectSuggestion(id),
      "Sugestões rejeitadas. A escala foi mantida.",
    ),
  );
}
function nextSuggestion() {
  const demand = metrics(ctx.state, ctx.week).uncoveredDemands.sort(
    (a, b) =>
      Number(b.holdPoint) - Number(a.holdPoint) ||
      demandRisk(b, ctx.state).score - demandRisk(a, ctx.state).score,
  )[0];
  if (demand) openSuggestions(demand.id);
  else toast("Não há demanda pendente de cobertura nesta semana.");
}
async function action(target) {
  const { action: name, id } = target.dataset;
  if (
    !["logout", "retry-data", "close-modal"].includes(name) &&
    (!ctx.profile || !ctx.state)
  )
    throw new Error("Entre com uma conta cadastrada para acessar o sistema.");
  if (ctx.loading && !["logout", "close-modal", "toggle-nav"].includes(name))
    throw new Error("Aguarde a atualização dos dados.");
  if (requiresEditor(name)) assertEditor();
  if (name.startsWith("new-") || name.startsWith("edit-")) {
    const collection = name.replace(/^(new|edit)-/, "");
    if (!canEdit()) {
      viewRecord(collection, id);
      return;
    }
    openEdit(ctx, collection, id, (record) => saveRecord(collection, record));
    return;
  }
  switch (name) {
    case "logout":
      showLogin();
      history.replaceState(null, "", "#/login");
      await authService.signOut();
      break;
    case "retry-data":
      await loadApplication();
      break;
    case "refresh-data":
    case "refresh-audit":
      await applyRoute();
      break;
    case "create-account":
      openAccountForm(async (record) => {
        assertEditor();
        await authService.createAccount(record);
        closeModal();
        toast("Conta criada. A pessoa já pode acessar o sistema.");
        await applyRoute();
      });
      break;
    case "change-password":
      openPasswordForm(async (password) => {
        await authService.changePassword(password);
        closeModal();
        toast("Sua senha foi alterada.");
      });
      break;
    case "close-modal":
      closeModal();
      break;
    case "toggle-nav":
      if (matchMedia("(max-width: 900px)").matches) mobileNav = !mobileNav;
      else collapsed = !collapsed;
      render();
      break;
    case "week-prev":
      ctx.week = addDays(ctx.week, -7);
      render();
      break;
    case "week-next":
      ctx.week = addDays(ctx.week, 7);
      render();
      break;
    case "clear-filters":
      ctx.filters = {};
      ctx.page = 1;
      render();
      break;
    case "page-prev":
      ctx.page = Math.max(1, ctx.page - 1);
      render();
      break;
    case "page-next":
      ctx.page++;
      render();
      break;
    case "coverage-tab":
      ctx.coverageTab = target.dataset.tab;
      render();
      break;
    case "demand-detail":
      demandDetail(ctx, id);
      break;
    case "supplier-detail":
      supplierDetail(ctx, id);
      break;
    case "suggest-demand":
      openSuggestions(id);
      break;
    case "suggest-next":
      nextSuggestion();
      break;
    case "manual-allocation":
      manualAllocation(ctx, target.dataset, approve);
      break;
    case "availability":
      availabilityForm(ctx, id, (record) => saveRecord("availability", record));
      break;
    case "allocation-detail":
      allocationDetail(ctx, id);
      break;
    case "cancel-allocation":
      confirmDialog(
        "Remover alocação da escala?",
        "A demanda poderá ficar sem cobertura. A alocação será preservada no histórico.",
        "Remover alocação",
        () =>
          finish(
            storageService.cancelAllocation(
              id,
              "Remoção manual aprovada pelo planejamento",
            ),
          ),
        true,
      );
      break;
    case "reprogram":
      reprogramForm(ctx, id, (...args) =>
        finish(
          storageService.reprogramDemand(...args),
          "Demanda reprogramada. As alocações anteriores foram preservadas no histórico.",
        ),
      );
      break;
    case "alerts":
      alertsDialog(ctx);
      break;
    case "report":
      reportDialog(ctx);
      break;
    case "print":
      window.print();
      break;
    case "navigate":
      closeModal();
      location.hash = `#/${target.dataset.route}`;
      break;
    case "snapshot":
      await finish(
        storageService.snapshot(ctx.week),
        "Fotografia semanal registrada no histórico.",
      );
      break;
    case "export":
      download(
        `fiscalizacao-backup-${new Date().toISOString().slice(0, 10)}.json`,
        await storageService.exportData(),
      );
      toast("Backup exportado.");
      break;
    case "import":
      document.querySelector("#import-file").click();
      break;
    case "migrate-legacy": {
      const legacy = storageService.legacyData();
      if (!legacy)
        throw new Error("Não há dados da versão anterior neste navegador.");
      confirmDialog(
        "Migrar os dados antigos deste navegador?",
        `A base antiga contém ${legacy.demands.length} demandas, ${legacy.inspectors.length} fiscais e ${legacy.suppliers.length} fornecedores. A base compartilhada atual contém ${ctx.state.demands.length} demandas. Os dados antigos substituirão a base no Supabase para toda a equipe. Um backup da base compartilhada atual será baixado antes da migração.`,
        "Fazer backup e migrar",
        async () => {
          assertEditor();
          download(
            "fiscalizacao-backup-antes-migracao.json",
            await storageService.exportData(),
          );
          await finish(
            storageService.importData(JSON.stringify(legacy)),
            "Dados antigos migrados para o Supabase e disponíveis para toda a equipe.",
          );
        },
      );
      break;
    }
    case "reset-demo":
    case "reset-empty": {
      const demo = name === "reset-demo";
      confirmDialog(
        demo
          ? "Substituir pelos dados de demonstração?"
          : "Limpar os dados compartilhados?",
        "Um backup da base atual será baixado antes da substituição. Esta ação substitui a base no Supabase para todas as contas da equipe.",
        demo ? "Carregar demonstração" : "Limpar dados",
        async () => {
          assertEditor();
          download(
            "fiscalizacao-backup-antes-da-substituicao.json",
            await storageService.exportData(),
          );
          await finish(
            storageService.reset(demo),
            demo
              ? "Demonstração carregada."
              : "Base compartilhada limpa. Cadastre materiais, fornecedores e fiscais para começar.",
          );
        },
        true,
      );
      break;
    }
  }
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (target)
    action(target)
      .then(() => enforceReadOnly(document.querySelector("#modal")))
      .catch((error) => toast(error.message, true));
});
let searchTimer;
document.addEventListener("input", (event) => {
  if (!ctx.profile || !ctx.state || ctx.loading) return;
  if (event.target.dataset.filter !== "q") return;
  clearTimeout(searchTimer);
  const value = event.target.value;
  searchTimer = setTimeout(() => {
    if (!ctx.profile || !ctx.state || ctx.loading) return;
    ctx.filters.q = value;
    ctx.page = 1;
    render();
  }, 180);
});
document.addEventListener("change", async (event) => {
  if (!ctx.profile || !ctx.state || ctx.loading) return;
  const target = event.target;
  if (target.hasAttribute("data-week-picker")) {
    if (validDate(target.value)) {
      ctx.week = monday(target.value);
      render();
    }
    return;
  }
  if (target.dataset.filter && target.dataset.filter !== "q") {
    ctx.filters[target.dataset.filter] = target.value;
    ctx.page = 1;
    render();
  }
  if (target.id === "import-file" && target.files[0]) {
    try {
      assertEditor();
      const file = target.files[0];
      if (file.size > 10 * 1024 * 1024)
        return toast("O backup deve ter até 10 MB.", true);
      const content = await file.text();
      confirmDialog(
        "Restaurar backup?",
        "A base compartilhada no Supabase será substituída para toda a equipe. Um backup de segurança será baixado antes da importação; arquivos inválidos serão rejeitados.",
        "Validar e restaurar",
        async () => {
          assertEditor();
          download(
            "fiscalizacao-backup-antes-importacao.json",
            await storageService.exportData(),
          );
          await finish(
            storageService.importData(content),
            "Backup validado e restaurado.",
          );
        },
      );
    } catch (error) {
      toast(error.message, true);
    } finally {
      target.value = "";
    }
  }
});
document.addEventListener("submit", async (event) => {
  if (event.target.id === "login-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const email = String(data.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(data.get("password") || "");
    root.innerHTML = renderLogin({ loading: true, email });
    try {
      await authService.signIn(email, password);
      await loadApplication();
    } catch (error) {
      showLogin(
        error.message || "Não foi possível entrar. Confira suas credenciais.",
        email,
      );
    }
    return;
  }
  if (event.target.id !== "settings-form") return;
  event.preventDefault();
  try {
    assertEditor();
  } catch (error) {
    formError(error, "#settings-error");
    return;
  }
  const submit = event.submitter;
  if (submit) submit.disabled = true;
  const fd = new FormData(event.target);
  const settings = {
    userName: String(fd.get("userName")).trim(),
    hoursPerDay: Number(fd.get("hoursPerDay")),
    coverageTarget: Number(fd.get("coverageTarget")),
    weights: Object.fromEntries(
      Object.keys(WEIGHT_LABELS).map((key) => [
        key,
        Number(fd.get(`weight-${key}`)),
      ]),
    ),
  };
  try {
    await finish(
      storageService.saveSettings(settings),
      "Configurações salvas; scores e indicadores recalculados.",
    );
  } catch (error) {
    formError(error, "#settings-error");
  } finally {
    if (submit?.isConnected) submit.disabled = false;
  }
});
window.addEventListener("hashchange", () => {
  closeModal();
  clearTimeout(searchTimer);
  applyRoute().catch((error) => toast(error.message, true));
});
try {
  const session = await authService.getSession();
  if (session) await loadApplication();
  else showLogin();
} catch (error) {
  showLogin(
    error.message || "Não foi possível verificar sua sessão. Entre novamente.",
  );
}
