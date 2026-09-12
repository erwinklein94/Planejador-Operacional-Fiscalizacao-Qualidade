import { esc, num, pct, initials } from "../utils/formatters.js";
import { dateLabel } from "../utils/dates.js";
import { riskLevel, demandRisk } from "../utils/risk.js";
import { coverage } from "../utils/planning.js";
import { icon } from "../js/icons.js";
import { helpFor, labelWithHelp } from "../js/help.js";
export const entityName = (state, collection, id) =>
  state[collection].find((x) => x.id === id)?.name || "Não informado";
export const badge = (text, tone = "neutral") =>
  `<span class="badge ${tone}">${esc(text)}</span>`;
export const priority = (score) => {
  const r = riskLevel(score);
  return badge(r.label, r.tone);
};
export const avatar = (name) =>
  `<span class="avatar">${esc(initials(name))}</span>`;
export const button = (label, action, style = "", glyph = "", attrs = "") =>
  `<button class="btn ${style}" data-action="${action}" ${attrs}>${glyph ? icon(glyph) : ""}${label}</button>`;
export function heading(
  title,
  subtitle,
  actions = "",
  eyebrow = "PLANEJAMENTO OPERACIONAL",
) {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="page-actions">${actions}</div></div>`;
}
export function empty(title, subtitle = "", action = "") {
  return `<div class="empty">${icon("clipboard")}<strong>${title}</strong><p>${subtitle}</p>${action}</div>`;
}
export function progress(value, color = "var(--blue)") {
  const n = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return `<div class="thin-progress" role="progressbar" aria-label="Cobertura" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="100"><span style="width:${n}%;background:${color}"></span></div>`;
}
export function metricCard(title, value, unit, foot, glyph, style = "") {
  return `<article class="metric-card ${style}"><div class="metric-top"><span>${labelWithHelp(title)}</span><span class="metric-icon">${icon(glyph)}</span></div><div class="metric-value"><strong>${value}</strong><span>${unit}${unit === "fiscal-dias" ? helpFor("Fiscal-dia") : ""}</span></div><div class="metric-foot">${foot}</div></article>`;
}
export function coreMetrics(m, state) {
  const h = state.settings.hoursPerDay;
  return `<div class="metrics-grid">${metricCard("Capacidade disponível", num(m.capacity / h), "fiscal-dias", `${state.inspectors.filter((i) => i.active).length} fiscais ativos · jornada de ${h} h`, "users")}${metricCard("Demanda de fiscalização", num(m.required / h), "fiscal-dias", "Esforço necessário nesta semana", "clipboard")}${metricCard("Déficit de capacidade", num(m.deficit / h), "fiscal-dias", m.deficit ? "Demanda acima da capacidade da equipe" : "Capacidade total suficiente", "alert", m.deficit ? "alert-card" : "")}${metricCard("Cobertura programada", m.coverage === null ? "—" : pct(m.coverage), "", `${num(m.covered / h)} de ${num(m.required / h)} fiscal-dias alocados`, "shield", "dark")}</div>`;
}
export function demandStatus(d, state, week) {
  if (["Realizada", "Cancelada", "Escala histórica"].includes(d.status))
    return badge(d.status, d.status === "Realizada" ? "success" : "neutral");
  const c = coverage(d, state, week);
  return c.covered <= 0
    ? badge("Sem cobertura", "danger")
    : c.remaining > 0
      ? badge("Cobertura parcial", "warning")
      : badge(d.status, "info");
}
export function demandTable(demands, state, week, compact = false) {
  if (!demands.length)
    return empty(
      "Nenhuma demanda neste recorte",
      "Ajuste a semana ou os filtros para consultar outros registros.",
    );
  return `<div class="table-wrap"><table><thead><tr><th>Demanda / fornecedor</th>${compact ? "" : "<th>Material</th>"}<th>${labelWithHelp("Prioridade")}</th><th>Prazo</th><th>${compact ? labelWithHelp("Pendente", "Horas que ainda faltam para completar a cobertura da demanda.") : labelWithHelp("Cobertura")}</th><th></th></tr></thead><tbody>${demands
    .map((d) => {
      const risk = demandRisk(d, state);
      const c = coverage(d, state, week);
      return `<tr><td><button class="table-link table-main" data-action="demand-detail" data-id="${esc(d.id)}">${esc(d.description)}</button><span class="table-sub">${esc(d.code)} · ${esc(entityName(state, "suppliers", d.supplierId))}</span>${d.holdPoint ? '<span class="badge outline">HOLD POINT</span>' : ""}</td>${compact ? "" : `<td>${esc(entityName(state, "materials", d.materialId))}<span class="table-sub">${esc(d.activity)}</span></td>`}<td>${priority(risk.score)}<span class="table-sub">${risk.score} / 100</span></td><td class="nowrap">${dateLabel(d.deadline)}<span class="table-sub">${esc(d.city)} / ${esc(d.uf)}</span></td><td>${compact ? `<strong>${num(c.remaining / state.settings.hoursPerDay)} ${c.remaining === state.settings.hoursPerDay ? "dia" : "dias"}</strong>` : `${demandStatus(d, state, week)}<span class="table-sub">${num(c.covered)} / ${num(d.requiredHours)} h</span>`}</td><td><button class="table-action" data-action="demand-detail" data-id="${esc(d.id)}" aria-label="Abrir ${esc(d.code)}">${icon("chevron")}</button></td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}
export function selectFilter(key, label, values, current = "") {
  return `<select data-filter="${key}" aria-label="${label}"><option value="">${label}</option>${values
    .map((item) => {
      const [value, text] = Array.isArray(item) ? item : [item, item];
      return `<option value="${esc(value)}" ${String(value) === current ? "selected" : ""}>${esc(text)}</option>`;
    })
    .join("")}</select>`;
}
export function filters(ctx, options = {}) {
  const f = ctx.filters;
  const s = ctx.state;
  return `<div class="filters no-print"><label class="search-field">${icon("search")}<input type="search" data-filter="q" placeholder="${options.placeholder || "Buscar nome, cidade ou registro…"}" aria-label="Buscar registros" value="${esc(f.q || "")}"></label>${options.week ? selectFilter("period", "Todas as semanas", [["week", "Semana selecionada"]], f.period) : ""}${
    options.material !== false
      ? selectFilter(
          "materialId",
          "Todos os materiais",
          s.materials.map((m) => [m.id, m.name]),
          f.materialId,
        )
      : ""
  }${
    options.supplier
      ? selectFilter(
          "supplierId",
          "Todos os fornecedores",
          s.suppliers.map((m) => [m.id, m.name]),
          f.supplierId,
        )
      : ""
  }${options.risk ? selectFilter("risk", "Todos os riscos", ["Crítico", "Alto", "Moderado", "Baixo"], f.risk) : ""}${
    options.coverage
      ? selectFilter(
          "coverage",
          "Toda cobertura",
          [
            ["uncovered", "Sem cobertura / parcial"],
            ["covered", "Cobertura completa"],
          ],
          f.coverage,
        )
      : ""
  }${
    options.inspector
      ? selectFilter(
          "inspectorId",
          "Todos os fiscais",
          s.inspectors.map((m) => [m.id, m.name]),
          f.inspectorId,
        )
      : ""
  }${options.status ? selectFilter("status", "Todos os status", options.status, f.status) : ""}${selectFilter(
    "sort",
    "Ordenar por",
    [
      ["risk", "Maior risco"],
      ["date", "Prazo mais próximo"],
      ["name", "Nome / descrição"],
    ],
    f.sort,
  )}${button("Limpar", "clear-filters", "small ghost", "filter")}</div>`;
}
export function paginate(items, ctx, pageSize = 10) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(ctx.page || 1, pages);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    footer: `<div class="pagination"><span>${items.length ? start + 1 : 0}–${Math.min(start + pageSize, items.length)} de ${items.length} registros</span><div class="flex">${button("Anterior", "page-prev", "small", "", page === 1 ? "disabled" : "")}<span>${page} / ${pages}</span>${button("Próxima", "page-next", "small", "", page === pages ? "disabled" : "")}</div></div>`,
  };
}
