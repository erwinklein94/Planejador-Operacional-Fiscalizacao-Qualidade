import { esc, num, normalize } from "../utils/formatters.js";
import { dateLabel, inWeek, isoDate } from "../utils/dates.js";
import { supplierRisk, demandRisk } from "../utils/risk.js";
import {
  coverage,
  inspectorCapacity,
  inspectorUsed,
  liveAllocations,
} from "../utils/planning.js";
import {
  heading,
  button,
  filters,
  badge,
  demandTable,
  avatar,
  progress,
  entityName,
  empty,
  paginate,
} from "./shared.js";
const queryMatches = (record, q, extra = "") =>
  !q ||
  normalize(
    `${Object.values(record)
      .filter((x) => typeof x !== "object")
      .join(" ")} ${extra}`,
  ).includes(normalize(q));
function filterItems(items, ctx, kind) {
  const { filters: f, state: s } = ctx;
  return items
    .filter((r) => {
      if (
        !queryMatches(
          r,
          f.q,
          `${entityName(s, "suppliers", r.supplierId)} ${entityName(s, "materials", r.materialId)}`,
        )
      )
        return false;
      if (
        f.materialId &&
        !(
          r.materialId === f.materialId || r.materialIds?.includes(f.materialId)
        )
      )
        return false;
      if (f.supplierId && r.supplierId !== f.supplierId) return false;
      if (f.status && r.status !== f.status) return false;
      if (
        f.risk &&
        (kind === "demands"
          ? demandRisk(r, s)
          : kind === "suppliers"
            ? supplierRisk(r, s)
            : { label: "" }
        ).label !== f.risk
      )
        return false;
      if (kind === "demands") {
        if (f.period === "week" && !inWeek(r.requiredDate, ctx.week))
          return false;
        if (
          f.coverage === "uncovered" &&
          (coverage(r, s).remaining === 0 ||
            ["Realizada", "Cancelada"].includes(r.status))
        )
          return false;
        if (f.coverage === "covered" && coverage(r, s).remaining > 0)
          return false;
        if (
          f.inspectorId &&
          !liveAllocations(s).some(
            (a) => a.demandId === r.id && a.inspectorId === f.inspectorId,
          )
        )
          return false;
      }
      return true;
    })
    .sort((a, b) =>
      f.sort === "name"
        ? String(a.name || a.description).localeCompare(
            String(b.name || b.description),
            "pt-BR",
          )
        : f.sort === "date"
          ? String(a.deadline || "").localeCompare(String(b.deadline || ""))
          : kind === "demands"
            ? demandRisk(b, s).score - demandRisk(a, s).score
            : kind === "suppliers"
              ? supplierRisk(b, s).score - supplierRisk(a, s).score
              : 0,
    );
}
export const DEMAND_STATUSES = [
  "Nova",
  "Aguardando planejamento",
  "Programada",
  "Em andamento",
  "Realizada",
  "Reprogramada",
  "Sem cobertura",
  "Cancelada",
];
export const RNC_STATUSES = [
  "Aberta",
  "Investigação",
  "Aguardando fornecedor",
  "Ação implementada",
  "Verificação eficácia",
  "Encerrada",
  "Vencida",
];
export function renderDemands(ctx) {
  const records = filterItems(ctx.state.demands, ctx, "demands");
  const page = paginate(records, ctx);
  return `${heading("Demandas de fiscalização", "Da necessidade à execução. Toda demanda tem um lugar no planejamento.", `${button("Sugerir alocação", "suggest-next", "", "spark")}${button("Nova demanda", "new-demands", "primary", "plus")}`)}${filters(ctx, { week: true, supplier: true, coverage: true, inspector: true, risk: true, status: DEMAND_STATUSES, placeholder: "Buscar demanda, lote, cidade ou fornecedor…" })}<section class="panel flush">${demandTable(page.items, ctx.state, undefined)}${page.footer}</section>`;
}
export function renderInspectors(ctx) {
  const s = ctx.state;
  const records = filterItems(s.inspectors, ctx, "inspectors");
  return `${heading("Equipe de fiscalização", "Habilitações, bases e capacidade disponível para cada profissional.", button("Novo fiscal", "new-inspectors", "primary", "plus"))}${filters(ctx, { placeholder: "Buscar fiscal, base, cidade ou empresa…" })}<div class="inspector-grid">${records
    .map((f) => {
      const capacity = inspectorCapacity(f, ctx.week, s);
      const used = inspectorUsed(f, ctx.week, s);
      return `<article class="panel inspector-card"><div class="card-heading">${avatar(f.name)}<div><h3>${esc(f.name)}</h3><small>${esc(f.base)} · ${esc(f.uf)}</small></div>${badge(f.active ? "Ativo" : "Inativo", f.active ? "success" : "neutral")}</div><div class="card-tags">${f.materialIds.map((id) => badge(entityName(s, "materials", id), "info")).join("")}</div><div class="card-line"><span class="muted">Carga semanal utilizada</span><strong>${num(used)} / ${num(capacity)} h</strong></div>${progress(capacity ? (used / capacity) * 100 : 0)}<div class="card-line"><span class="muted">Disponibilidade restante</span><strong>${num(Math.max(0, capacity - used) / s.settings.hoursPerDay)} fiscal-dias</strong></div><div class="card-footer"><span class="muted">${esc(f.employment)}</span><div class="flex">${button("Agenda", "availability", "small ghost", "", `data-id="${f.id}"`)}${button("Editar", "edit-inspectors", "small", "edit", `data-id="${f.id}"`)}</div></div></article>`;
    })
    .join(
      "",
    )}</div>${!records.length ? empty("Nenhum fiscal encontrado", "Cadastre a equipe e suas habilitações para começar a planejar.") : ""}`;
}
export function renderSuppliers(ctx) {
  const s = ctx.state;
  const page = paginate(filterItems(s.suppliers, ctx, "suppliers"), ctx);
  const regimes = {
    1: "Nível 1 · Intensiva",
    2: "Nível 2 · Dirigida",
    3: "Nível 3 · Amostragem",
  };
  return `${heading("Fornecedores", "Acompanhe o risco e direcione a fiscalização de cada unidade.", button("Novo fornecedor", "new-suppliers", "primary", "plus"))}${filters(ctx, { risk: true, placeholder: "Buscar fornecedor, unidade, cidade ou UF…" })}<section class="panel flush"><div class="table-wrap"><table><thead><tr><th>Fornecedor / unidade</th><th>Materiais</th><th>Score de risco</th><th>Regime</th><th>Última inspeção</th><th></th></tr></thead><tbody>${page.items
    .map((f) => {
      const risk = supplierRisk(f, s);
      return `<tr><td><button class="table-link table-main" data-action="supplier-detail" data-id="${f.id}">${esc(f.name)}</button><span class="table-sub">${esc(f.unit)} · ${esc(f.city)} / ${esc(f.uf)}</span>${!f.active ? badge("Inativo") : ""}</td><td>${f.materialIds.map((id) => `<span class="table-sub">${esc(entityName(s, "materials", id))}</span>`).join("")}</td><td><span class="score">${risk.score}<small>/ 100</small></span><br>${badge(risk.label, risk.tone)}</td><td>${badge(regimes[f.regimeOverride || risk.regime], risk.tone)}${f.regimeOverride ? '<span class="table-sub">Ajuste manual local</span>' : ""}</td><td>${dateLabel(f.lastInspection)}</td><td>${button("Editar", "edit-suppliers", "small", "edit", `data-id="${f.id}"`)}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></div>${!page.items.length ? empty("Nenhum fornecedor encontrado") : ""}${page.footer}</section>`;
}
export function renderMaterials(ctx) {
  const s = ctx.state;
  const records = filterItems(s.materials, ctx, "materials");
  return `${heading("Materiais", "Defina as famílias de materiais e a criticidade utilizada na priorização.", button("Novo material", "new-materials", "primary", "plus"))}${filters(ctx, { material: false })}<section class="panel flush"><div class="table-wrap"><table><thead><tr><th>Material</th><th>Criticidade</th><th>Fiscais habilitados</th><th>Fornecedores</th><th>Status</th><th></th></tr></thead><tbody>${records.map((m) => `<tr><td><strong class="table-main">${esc(m.name)}</strong><span class="table-sub">${esc(m.description)}</span></td><td>${m.criticality} / 20</td><td>${s.inspectors.filter((f) => f.active && f.materialIds.includes(m.id)).length}</td><td>${s.suppliers.filter((f) => f.active && f.materialIds.includes(m.id)).length}</td><td>${badge(m.active ? "Ativo" : "Inativo", m.active ? "success" : "neutral")}</td><td>${button("Editar", "edit-materials", "small", "edit", `data-id="${m.id}"`)}</td></tr>`).join("")}</tbody></table></div>${!records.length ? empty("Nenhum material encontrado") : ""}</section>`;
}
export function renderRnc(ctx) {
  const records = filterItems(ctx.state.rncs, ctx, "rncs");
  const page = paginate(records, ctx);
  const s = ctx.state;
  return `${heading("RNC / Ocorrências", "Registre desvios, acompanhe as ações e atualize o risco dos fornecedores.", button("Nova RNC", "new-rncs", "primary", "plus"))}<div class="notice">As RNCs abertas, críticas e reincidentes atualizam automaticamente o score do fornecedor e a prioridade das demandas relacionadas.</div>${filters(ctx, { supplier: true, status: RNC_STATUSES })}<section class="panel flush"><div class="table-wrap"><table><thead><tr><th>RNC / ocorrência</th><th>Fornecedor</th><th>Criticidade</th><th>Prazo</th><th>Status</th><th></th></tr></thead><tbody>${page.items.map((r) => `<tr><td><button class="table-link table-main" data-action="edit-rncs" data-id="${r.id}">${esc(r.number)}</button><span class="table-sub">${esc(r.description)}</span>${r.recurrence ? badge("Reincidência", "danger") : ""}</td><td>${esc(entityName(s, "suppliers", r.supplierId))}<span class="table-sub">${esc(entityName(s, "materials", r.materialId))}</span></td><td>${badge(r.severity, ["Crítica", "Alta"].includes(r.severity) ? "danger" : "warning")}</td><td>${dateLabel(r.deadline)}<span class="table-sub">Abertura ${dateLabel(r.openedAt)}</span></td><td>${badge(r.status !== "Encerrada" && r.deadline < isoDate() ? "Vencida" : r.status, r.status === "Encerrada" ? "success" : r.deadline < isoDate() ? "danger" : "warning")}</td><td>${button("Abrir", "edit-rncs", "small", "chevron", `data-id="${r.id}"`)}</td></tr>`).join("")}</tbody></table></div>${!records.length ? empty("Nenhuma RNC encontrada") : ""}${page.footer}</section>`;
}
