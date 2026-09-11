import { esc, num, pct, normalize } from "../utils/formatters.js";
import { weekLabel, inWeek } from "../utils/dates.js";
import {
  metrics,
  weeklyDemands,
  inspectorCapacity,
  inspectorUsed,
  coverage,
} from "../utils/planning.js";
import { demandRisk, supplierRisk, WEIGHT_LABELS } from "../utils/risk.js";
import {
  heading,
  button,
  coreMetrics,
  badge,
  progress,
  empty,
  demandTable,
  filters,
  entityName,
  paginate,
} from "./shared.js";
export function renderCoverage(ctx) {
  const s = ctx.state;
  const m = metrics(s, ctx.week);
  const demands = weeklyDemands(s, ctx.week);
  const tab = ctx.coverageTab || "material";
  let groups =
    tab === "material"
      ? s.materials.map((m) => ({
          id: m.id,
          name: m.name,
          demands: demands.filter((d) => d.materialId === m.id),
        }))
      : tab === "supplier"
        ? s.suppliers.map((m) => ({
            id: m.id,
            name: m.name,
            demands: demands.filter((d) => d.supplierId === m.id),
          }))
        : [...new Set(demands.map((d) => d.uf))].map((uf) => ({
            id: uf,
            name: uf || "UF não informada",
            demands: demands.filter((d) => d.uf === uf),
          }));
  return `${heading("Cobertura da fiscalização", "Veja quais riscos estão protegidos e quais continuam sem recursos.", `${button("Registrar fotografia", "snapshot", "", "history")}${button("Resumo semanal", "report", "primary", "download")}`)}${coreMetrics(m, s)}<div class="notice ${m.uncovered ? "warn" : ""}"><strong>${num(m.uncovered / s.settings.hoursPerDay)} fiscal-dias sem cobertura</strong> · Demanda reprimida prevista: ${m.repressedForecast === null ? "sem demanda" : pct(m.repressedForecast)}. O déficit compara demanda e capacidade; a lacuna de cobertura considera as alocações aprovadas.</div><section class="panel"><div class="section-title"><h2>Distribuição da cobertura</h2><span class="muted">${weekLabel(ctx.week)}</span></div><div class="tabs">${[
    ["material", "Por material"],
    ["supplier", "Por fornecedor"],
    ["region", "Por região"],
    ["fiscal", "Por fiscal"],
    ["history", "Por semana"],
  ]
    .map(
      ([id, text]) =>
        `<button class="tab ${id === tab ? "active" : ""}" data-action="coverage-tab" data-tab="${id}">${text}</button>`,
    )
    .join("")}</div>${
    tab === "fiscal"
      ? s.inspectors
          .filter((f) => f.active)
          .map((f) => {
            const cap = inspectorCapacity(f, ctx.week, s),
              used = inspectorUsed(f, ctx.week, s);
            return `<div class="coverage-row"><span>${esc(f.name)}</span>${progress(cap ? (used / cap) * 100 : 0)}<strong>${cap ? pct((used / cap) * 100) : "—"}</strong><span class="muted">${num(used)} / ${num(cap)} h</span></div>`;
          })
          .join("") +
        '<p class="muted spaced">Por fiscal: utilização da capacidade disponível.</p>'
      : tab === "history"
        ? coverageHistory(s)
        : groups
            .map((g) => {
              const gm = metrics(s, ctx.week, g.demands);
              return `<div class="coverage-row"><span>${esc(g.name)}</span>${progress(gm.coverage)}<strong>${gm.coverage === null ? "—" : pct(gm.coverage)}</strong><span class="muted">${num(gm.covered / s.settings.hoursPerDay)} / ${num(gm.required / s.settings.hoursPerDay)} dias</span></div>`;
            })
            .join("") || empty("Nenhum registro disponível")
  }</section><section class="panel flush spaced"><div class="section-title"><div><h2>Risco não coberto</h2><p>Demandas parciais permanecem nesta relação até a cobertura integral</p></div>${badge(`${m.uncoveredDemands.length} demandas`, "danger")}</div>${demandTable(
    m.uncoveredDemands.sort(
      (a, b) => demandRisk(b, s).score - demandRisk(a, s).score,
    ),
    s,
    ctx.week,
  )}</section><div class="notice">Para apurar a demanda reprimida efetiva, registre o motivo “Falta de capacidade” nas demandas não executadas e salve uma fotografia após o encerramento da semana. O planejamento futuro mostra apenas a previsão.</div>`;
}
export function coverageHistory(s) {
  return !s.coverageHistory.length
    ? empty(
        "Ainda não há fotografias semanais",
        "Use “Registrar fotografia” para preservar os indicadores desta semana.",
      )
    : `<div class="table-wrap"><table><thead><tr><th>Semana</th><th>Cobertura</th><th>Demanda / capacidade</th><th>Reprimida efetiva</th><th>Registro</th></tr></thead><tbody>${s.coverageHistory.map((h) => `<tr><td>${weekLabel(h.week)}</td><td>${h.coverage === null ? "—" : pct(h.coverage)}</td><td>${num(h.required / (h.hoursPerDay || 8))} / ${num(h.capacity / (h.hoursPerDay || 8))} dias</td><td>${h.repressedPercent === null ? "Semana aberta" : pct(h.repressedPercent)}</td><td>${new Date(h.timestamp).toLocaleString("pt-BR")}</td></tr>`).join("")}</tbody></table></div>`;
}
export function renderRisk(ctx) {
  const s = ctx.state;
  const records = s.demands
    .filter(
      (d) =>
        !["Cancelada", "Realizada"].includes(d.status) &&
        inWeek(d.requiredDate, ctx.week),
    )
    .filter(
      (d) =>
        !ctx.filters.q ||
        normalize(
          `${d.description} ${entityName(s, "suppliers", d.supplierId)}`,
        ).includes(normalize(ctx.filters.q)),
    )
    .filter(
      (d) => !ctx.filters.materialId || d.materialId === ctx.filters.materialId,
    );
  return `${heading("Mapa de risco", "Prioridades explicáveis para decidir onde a presença da fiscalização faz diferença.", button("Sugerir alocação", "suggest-next", "primary", "spark"))}${filters(ctx)}<div class="risk-matrix">${[
    ["Crítico", "danger", "70–100"],
    ["Alto", "orange", "50–69"],
    ["Moderado", "warning", "30–49"],
    ["Baixo", "success", "0–29"],
  ]
    .map(([label, tone, range]) => {
      const group = records
        .filter((d) => demandRisk(d, s).label === label)
        .sort((a, b) => demandRisk(b, s).score - demandRisk(a, s).score);
      return `<section class="risk-column"><h3>${badge(label, tone)}<span class="muted">${group.length}</span></h3><small class="muted">${range} pontos</small>${group.map((d) => `<button class="risk-tile" data-action="demand-detail" data-id="${d.id}"><span class="flex">${badge(`${demandRisk(d, s).score} pontos`, tone)}${d.holdPoint ? '<span class="badge outline">HOLD POINT</span>' : ""}</span><strong>${esc(d.description)}</strong><small>${esc(entityName(s, "suppliers", d.supplierId))}</small><br>${badge(coverage(d, s).remaining ? "Sem cobertura completa" : "Programada", coverage(d, s).remaining ? "danger" : "info")}</button>`).join("") || '<p class="muted spaced">Sem demandas nesta faixa.</p>'}</section>`;
    })
    .join(
      "",
    )}</div><div class="notice">Prioridade calculada de 0 a 100. Presença obrigatória tem piso de 50; hold point, RNC crítica ou reincidência grave têm piso de 70. Abra uma demanda para consultar os componentes do score.</div>`;
}
export function renderHistory(ctx) {
  const records = ctx.state.auditLog.filter(
    (r) =>
      !ctx.filters.q ||
      normalize(Object.values(r).join(" ")).includes(normalize(ctx.filters.q)),
  );
  const page = paginate(records, ctx, 20);
  return `${heading("Histórico da operação", "Rastreabilidade de cadastros, alocações, mudanças de risco e decisões.", button("Exportar backup", "export", "", "download"))}${filters(ctx, { material: false, placeholder: "Buscar registro, usuário ou alteração…" })}<section class="panel"><ol class="timeline">${page.items.map((r) => `<li><strong>${esc(r.type)} · ${esc(r.record)}</strong><p>${esc(r.change)}</p><small>${new Date(r.timestamp).toLocaleString("pt-BR")} · ${esc(r.user)}</small></li>`).join("")}</ol>${!records.length ? empty("Nenhuma alteração registrada") : ""}</section>${page.footer}<section class="panel spaced"><h2>Fotografias da cobertura</h2>${coverageHistory(ctx.state)}</section>`;
}
export function renderSettings(ctx) {
  const s = ctx.state;
  return `${heading("Configurações", "Parâmetros de planejamento, pesos de risco e gestão da base compartilhada no Supabase.")}<div class="settings-grid"><section class="panel"><h2>Parâmetros da operação</h2><form id="settings-form"><label class="field">Editor responsável<input name="userName" readonly maxlength="160" value="${esc(ctx.profile.full_name)}"></label><div class="form-grid"><label class="field">Jornada de um fiscal-dia (h)<input name="hoursPerDay" type="number" min="1" max="12" step=".5" required value="${s.settings.hoursPerDay}"><small>Alocações são salvas em horas.</small></label><label class="field">Meta de cobertura (%)<input name="coverageTarget" type="number" min="0" max="100" required value="${s.settings.coverageTarget}"></label></div><h3 class="spaced">Pesos do score de prioridade</h3><p class="muted">Os sete componentes devem somar 100 pontos.</p><div class="form-grid">${Object.entries(
    WEIGHT_LABELS,
  )
    .map(
      ([key, name]) =>
        `<label class="field">${name}<input name="weight-${key}" type="number" min="0" max="100" required value="${s.settings.weights[key]}"></label>`,
    )
    .join(
      "",
    )}</div><div id="settings-error" role="alert"></div><button class="btn primary spaced" type="submit">Salvar configurações</button></form></section><div class="stack"><section class="panel"><h2>Dados no Supabase</h2><p class="muted spaced">Todos os usuários consultam a mesma base. As alterações são salvas no Supabase e as versões anteriores ficam preservadas no servidor.</p><div class="setting-actions">${button("Exportar backup JSON", "export", "", "download")}${button("Importar backup", "import", "", "history")}${button("Importar dados do navegador antigo", "migrate-legacy", "", "history")}</div><input type="file" id="import-file" accept=".json,application/json" hidden><div class="notice">${s.demo ? "Base de demonstração ativa. Todos os nomes, ocorrências e indicadores são exemplos." : "Base de trabalho compartilhada. Dados protegidos por autenticação e permissões no servidor."}</div></section><section class="panel"><h2>Base de demonstração</h2><p class="muted spaced">Carregar os exemplos ou começar com uma base vazia substitui todos os registros compartilhados. Um backup será oferecido antes da confirmação.</p><div class="setting-actions">${button("Carregar demonstração", "reset-demo", "", "history")}${button("Limpar base compartilhada", "reset-empty", "danger")}</div></section><section class="panel"><h2>Controle de acesso</h2><p class="muted spaced">O editor pode alterar dados e criar contas em Meu perfil. Fiscalização e Coordenação têm acesso de consulta.</p><div class="notice">A auditoria registra os últimos 100 acessos de Fiscalização e Coordenação, com usuário, página e horário. Somente o editor pode consultá-la.</div></section></div></div>`;
}
