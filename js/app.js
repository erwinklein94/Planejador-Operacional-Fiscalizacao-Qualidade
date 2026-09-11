import { storageService, STORAGE_KEY } from "../services/storageService.js";
import { readRoute } from "./router.js";
import { icon } from "./icons.js";
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
};
let ctx = {
  state: null,
  week: monday(),
  ...readRoute(),
  filters: {},
  page: 1,
  coverageTab: "material",
};
let collapsed = false,
  mobileNav = false;
const root = document.querySelector("#app");
function applyRoute() {
  const route = readRoute();
  ctx.route = route.route;
  ctx.filters = {
    period: ctx.route === "demandas" ? "week" : "",
    ...route.query,
  };
  ctx.page = 1;
  mobileNav = false;
  if (ctx.state) render();
}
function weekPicker() {
  return `<div class="week-picker"><button class="icon-button back" data-action="week-prev" aria-label="Semana anterior">${icon("chevron")}</button><input type="date" data-week-picker aria-label="Selecionar semana" value="${ctx.week}"><button class="icon-button" data-action="week-next" aria-label="Próxima semana">${icon("chevron")}</button></div>`;
}
function render() {
  const focus = document.activeElement?.dataset?.filter;
  const position = document.activeElement?.selectionStart;
  const s = ctx.state;
  const count = alerts(s, ctx.week).length;
  const title = nav.find((n) => n[0] === ctx.route)?.[1];
  root.innerHTML = `<div class="app-shell ${collapsed ? "collapsed" : ""} ${mobileNav ? "mobile-nav" : ""}"><button class="mobile-overlay" data-action="toggle-nav" aria-label="Fechar navegação"></button><aside class="sidebar" aria-label="Navegação principal"><a href="#/dashboard" class="brand" aria-label="Planejamento Operacional · início"><div class="brand-mark" title="Área reservada ao logo oficial">EQ</div><div class="brand-text"><strong>fiscalização</strong><small>qualidade de materiais</small></div></a><nav class="nav-scroll">${nav.map(([route, label, glyph], i) => `${i === 0 ? '<p class="nav-label">Operação</p>' : i === 4 ? '<p class="nav-label secondary">Cadastros</p>' : i === 7 ? '<p class="nav-label secondary">Gestão e controle</p>' : ""}<a class="nav-link ${ctx.route === route ? "active" : ""}" href="#/${route}" title="${label}" ${ctx.route === route ? 'aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span>${route === "demandas" && metrics(s, ctx.week).uncoveredDemands.length ? `<span class="count">${metrics(s, ctx.week).uncoveredDemands.length}</span>` : ""}</a>`).join("")}</nav><div class="sidebar-bottom"><div class="environment"><span class="status-dot"></span>Armazenamento local ativo</div><div class="profile"><span class="avatar">${esc(initials(s.settings.userName))}</span><div><strong>${esc(s.settings.userName)}</strong><small>Engenharia da Qualidade</small></div></div></div></aside><header class="topbar"><div class="topbar-left"><button class="icon-button" data-action="toggle-nav" aria-label="Alternar menu lateral" aria-expanded="${matchMedia("(max-width: 900px)").matches ? mobileNav : !collapsed}">${icon("menu")}</button><div><div class="topbar-title">Planejamento Operacional <span class="muted">/</span> <strong>${title}</strong></div><div class="topbar-subtitle">Engenharia da Qualidade de Materiais</div></div></div><div class="topbar-right">${weekPicker()}<span class="separator"></span><button class="icon-button" data-action="alerts" aria-label="Central de alertas, ${count} pendências">${icon("bell")}${count ? `<span class="notification-count">${count > 99 ? "99+" : count}</span>` : ""}</button><span class="avatar">${esc(initials(s.settings.userName))}</span></div></header><main id="main" class="content" tabindex="-1"><div class="mobile-week flex"><span class="muted">Semana ${weekNumber(ctx.week)}</span>${weekPicker()}</div>${renderers[ctx.route](ctx)}<footer class="footer-note"><span>Planejamento Operacional da Fiscalização de Materiais</span><span>${s.demo ? '<span class="demo-tag">Dados de demonstração</span>' : "Dados salvos neste navegador"} <span class="nowrap">· Semana ${weekNumber(ctx.week)}</span></span></footer></main></div>`;
  if (focus) {
    const input = root.querySelector(`[data-filter="${focus}"]`);
    input?.focus();
    if (input?.type === "search" && position !== null)
      input.setSelectionRange(position, position);
  }
}
async function finish(promise, message = "Alteração salva com sucesso.") {
  ctx.state = await promise;
  closeModal();
  render();
  toast(message);
}
async function saveRecord(collection, record) {
  await finish(storageService.save(collection, record));
}
const approve = (slots) =>
  finish(
    storageService.approveAllocations(slots),
    "Alocação aprovada. A escala e a cobertura foram atualizadas.",
  );
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
  if (name.startsWith("new-") || name.startsWith("edit-")) {
    const collection = name.replace(/^(new|edit)-/, "");
    openEdit(ctx, collection, id, (record) => saveRecord(collection, record));
    return;
  }
  switch (name) {
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
    case "reset-demo":
    case "reset-empty": {
      const demo = name === "reset-demo";
      confirmDialog(
        demo
          ? "Substituir pelos dados de demonstração?"
          : "Limpar todos os dados locais?",
        "Um backup da base atual será baixado antes da substituição. Esta ação afeta os dados deste navegador.",
        demo ? "Carregar demonstração" : "Limpar dados",
        async () => {
          download(
            "fiscalizacao-backup-antes-da-substituicao.json",
            await storageService.exportData(),
          );
          await finish(
            storageService.reset(demo),
            demo
              ? "Demonstração carregada."
              : "Base local limpa. Cadastre materiais, fornecedores e fiscais para começar.",
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
  if (target) action(target).catch((error) => toast(error.message, true));
});
let searchTimer;
document.addEventListener("input", (event) => {
  if (event.target.dataset.filter !== "q") return;
  clearTimeout(searchTimer);
  const value = event.target.value;
  searchTimer = setTimeout(() => {
    ctx.filters.q = value;
    ctx.page = 1;
    render();
  }, 180);
});
document.addEventListener("change", async (event) => {
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
    const file = target.files[0];
    if (file.size > 10 * 1024 * 1024)
      return toast("O backup deve ter até 10 MB.", true);
    const content = await file.text();
    confirmDialog(
      "Restaurar backup?",
      "A base atual será substituída. Um backup de segurança será baixado antes da importação; arquivos inválidos serão rejeitados.",
      "Validar e restaurar",
      async () => {
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
  }
});
document.addEventListener("submit", async (event) => {
  if (event.target.id !== "settings-form") return;
  event.preventDefault();
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
  }
});
window.addEventListener("hashchange", () => {
  closeModal();
  applyRoute();
});
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY)
    toast(
      "Os dados foram alterados em outra aba. Recarregue a página antes de salvar.",
      true,
    );
});
try {
  ctx.state = await storageService.init();
  applyRoute();
} catch (error) {
  root.innerHTML = `<section class="panel storage-error"><h1>Não foi possível abrir o planejamento</h1><p class="spaced">${esc(error.message)}</p><p class="spaced muted">Os dados existentes não foram removidos. Verifique o armazenamento do navegador ou restaure a base com suporte técnico.</p><button class="btn primary spaced" onclick="location.reload()">Tentar novamente</button></section>`;
}
