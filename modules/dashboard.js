import { icon } from "../js/icons.js";
import { num, pct, esc } from "../utils/formatters.js";
import { dateLabel, isoDate, weekNumber } from "../utils/dates.js";
import {
  metrics,
  weeklyDemands,
  inspectorCapacity,
  alerts,
} from "../utils/planning.js";
import { demandRisk, supplierRisk } from "../utils/risk.js";
import { helpFor, labelWithHelp } from "../js/help.js";
import {
  coreMetrics,
  heading,
  button,
  badge,
  progress,
  demandTable,
  empty,
} from "./shared.js";
export function renderDashboard(ctx) {
  const { state: s, week } = ctx;
  const m = metrics(s, week);
  const demands = weeklyDemands(s, week);
  const critical = demands.filter((d) => demandRisk(d, s).score >= 70);
  const uncovered = [...m.uncoveredDemands]
    .sort(
      (a, b) =>
        Number(b.holdPoint) - Number(a.holdPoint) ||
        demandRisk(b, s).score - demandRisk(a, s).score,
    )
    .slice(0, 5);
  const suppliers = s.suppliers
    .filter((f) => f.active)
    .map((f) => ({ ...f, risk: supplierRisk(f, s) }))
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, 5);
  const open = s.rncs.filter((r) => r.status !== "Encerrada");
  const overdue = open.filter((r) => r.deadline < isoDate());
  const unavailable = s.inspectors.filter(
    (f) => f.active && inspectorCapacity(f, week, s) === 0,
  ).length;
  const radius = 66,
    circumference = 2 * Math.PI * radius;
  return `${heading("Visão da operação", `Acompanhe a capacidade, priorize riscos e proteja a sua semana.`, `${button("Resumo semanal", "report", "", "download")}${button("Nova demanda", "new-demands", "primary", "plus")}`)}
  ${coreMetrics(m, s)}
  <div class="mini-metrics"><div class="mini-metric"><span>Fiscais com<br>horas disponíveis</span><strong>${m.available}<small class="muted">/${s.inspectors.filter((f) => f.active).length}</small></strong></div><div class="mini-metric"><span>Demandas<br>críticas ${helpFor("Score de prioridade")}</span><strong class="danger-text">${critical.length}</strong></div><div class="mini-metric"><span>Demandas sem<br>cobertura completa ${helpFor("Cobertura")}</span><strong class="danger-text">${m.uncoveredDemands.length}</strong></div><div class="mini-metric"><span>Fiscalizações<br>realizadas</span><strong>${demands.filter((d) => d.status === "Realizada").length}</strong></div><div class="mini-metric"><span>RNCs abertas<br><small>${overdue.length} vencidas</small></span><strong>${open.length}</strong></div></div>
  ${m.uncoveredDemands.length ? `<div class="attention-banner">${icon("alert")}<div><strong>${m.uncoveredDemands.filter((d) => d.holdPoint).length} hold points e ${uncovered.length ? m.uncoveredDemands.filter((d) => demandRisk(d, s).score >= 70).length : 0} demandas críticas precisam de cobertura.</strong><p>${num(m.uncovered / s.settings.hoursPerDay)} fiscal-dias ainda sem alocação. A aprovação do planejamento requer atenção a esses riscos.</p></div><a href="#/cobertura">Analisar cobertura ${icon("arrow")}</a></div>` : `<div class="notice">${demands.length ? "Todas as demandas da semana têm cobertura programada. Acompanhe a execução das fiscalizações." : "Nenhuma demanda cadastrada nesta semana. Selecione outra semana ou cadastre a primeira demanda."}</div>`}
  <div class="grid-2"><section class="panel"><div class="section-title"><div><h2>${labelWithHelp("Cobertura", "Percentual de horas aprovadas em relação ao esforço necessário, apresentado separadamente para cada material.")} por material</h2><p>Esforço alocado em relação à demanda</p></div><a class="text-link" href="#/cobertura">Ver detalhes ${icon("chevron")}</a></div>${
    s.materials
      .filter((x) => x.active)
      .map((material) => {
        const group = demands.filter((d) => d.materialId === material.id);
        const cm = metrics(s, week, group);
        const colors = ["#003865", "#32a6e6", "#1e9f7f", "#627d98", "#8e9fb0"];
        return `<div class="material-row"><span class="material-name"><i class="material-dot" style="background:${colors[s.materials.indexOf(material) % colors.length]}"></i>${esc(material.name)}</span>${progress(cm.coverage, colors[s.materials.indexOf(material) % colors.length])}<strong>${cm.coverage === null ? "—" : pct(cm.coverage)}</strong></div>`;
      })
      .join("") || empty("Nenhum material cadastrado")
  }</section>
  <section class="panel"><div class="section-title"><div><h2>Distribuição da demanda</h2><p>Semana ${weekNumber(week)} · ${demands.length} demandas</p></div><span>${badge("fiscal-dias", "neutral")}${helpFor("Fiscal-dia")}</span></div><div class="capacity-summary"><div class="donut"><svg viewBox="0 0 168 168" role="img" aria-label="${m.coverage === null ? "Sem demanda" : pct(m.coverage) + " de cobertura"}"><circle cx="84" cy="84" r="${radius}" fill="none" stroke="#f2ddc9" stroke-width="16"/><circle cx="84" cy="84" r="${radius}" fill="none" stroke="#003865" stroke-width="16" stroke-dasharray="${(circumference * (m.coverage || 0)) / 100} ${circumference}" stroke-linecap="round"/></svg><div class="donut-center"><strong>${num(m.required / s.settings.hoursPerDay)}</strong><small>fiscal-dias de demanda</small></div></div><div class="legend"><div class="legend-row"><i></i><span>Demanda coberta<strong>${num(m.covered / s.settings.hoursPerDay)} <small>fiscal-dias</small></strong></span></div><div class="legend-row"><i></i><span>Demanda não coberta<strong>${num(m.uncovered / s.settings.hoursPerDay)} <small>fiscal-dias</small></strong></span></div></div></div><div class="chart-foot">${icon("clock")} ${labelWithHelp("Demanda reprimida prevista")}: <strong>${m.repressedForecast === null ? "sem demanda" : pct(m.repressedForecast)}</strong></div></section></div>
  <div class="grid-2 spaced"><section class="panel flush"><div class="section-title"><div><h2>${labelWithHelp("Risco não coberto", "Demandas ordenadas por prioridade que ainda têm horas sem alocação aprovada.")}</h2><p>As 5 demandas que exigem sua atenção primeiro</p></div><a class="text-link" href="#/demandas?coverage=uncovered">Ver todas ${icon("chevron")}</a></div>${demandTable(uncovered, s, week, true)}</section><section class="panel"><div class="section-title"><div><h2>Fornecedores de maior risco ${helpFor("Score de risco")}</h2><p>Score de risco · quanto maior, maior a atenção</p></div><a class="text-link" href="#/risco">Mapa de risco ${icon("chevron")}</a></div>${suppliers.map((f, i) => `<div class="ranking"><span class="rank-number">${String(i + 1).padStart(2, "0")}</span><span class="supplier-symbol">${icon("factory")}</span><div class="ranking-copy"><button class="table-link" data-action="supplier-detail" data-id="${f.id}"><strong>${esc(f.name)}</strong></button><small>${esc(f.city)} · ${esc(f.uf)}</small></div><div class="risk-score"><strong class="${f.risk.score >= 70 ? "danger-text" : ""}">${f.risk.score}</strong><small>/100</small><div>${badge(f.risk.label, f.risk.tone)}</div></div></div>`).join("") || empty("Nenhum fornecedor")}</section></div>
  <div class="grid-2 spaced"><section class="panel"><div class="section-title"><h2>RNCs mais antigas</h2><a class="text-link" href="#/rnc">Consultar RNCs ${icon("chevron")}</a></div>${
    open
      .sort((a, b) => a.openedAt.localeCompare(b.openedAt))
      .slice(0, 3)
      .map(
        (r) =>
          `<div class="ranking"><span class="supplier-symbol">${icon("alert")}</span><div class="ranking-copy"><button class="table-link" data-action="edit-rncs" data-id="${r.id}"><strong>${esc(r.number)} · ${esc(r.description)}</strong></button><small>Aberta em ${dateLabel(r.openedAt)} · Prazo ${dateLabel(r.deadline)}</small></div>${badge(r.deadline < isoDate() ? "Vencida" : r.status, r.deadline < isoDate() ? "danger" : "warning")}</div>`,
      )
      .join("") || empty("Nenhuma RNC aberta")
  }</section><section class="panel"><div class="section-title"><h2>Esta semana na equipe</h2><a class="text-link" href="#/planejamento">Abrir planejamento ${icon("chevron")}</a></div><div class="detail-grid"><div><dt>Fiscais ativos</dt><dd>${s.inspectors.filter((f) => f.active).length}</dd></div><div><dt>Sem disponibilidade na semana</dt><dd>${unavailable}</dd></div><div><dt>Demandas programadas</dt><dd>${demands.filter((d) => ["Programada", "Em andamento"].includes(d.status)).length}</dd></div><div><dt>Alertas que exigem atenção</dt><dd>${alerts(s, week).length}</dd></div></div><div class="notice">Alocação aprovada indica cobertura planejada. A execução é confirmada ao registrar o resultado da fiscalização.</div></section></div>`;
}
