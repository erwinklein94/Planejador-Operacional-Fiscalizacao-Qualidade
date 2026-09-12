import { DEFAULT_WEIGHTS } from "./risk.js";
import { allocationErrors, coverage } from "./planning.js";
import { isoDate, validDate } from "./dates.js";
export const COLLECTIONS = [
  "inspectors",
  "suppliers",
  "materials",
  "demands",
  "allocations",
  "availability",
  "rncs",
  "occurrences",
  "riskHistory",
  "coverageHistory",
  "auditLog",
];
const finite = (value, min, max) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
const DEMAND_STATUSES = [
  "Nova",
  "Aguardando planejamento",
  "Programada",
  "Em andamento",
  "Realizada",
  "Escala histórica",
  "Reprogramada",
  "Sem cobertura",
  "Cancelada",
];
const RNC_STATUSES = [
  "Aberta",
  "Investigação",
  "Aguardando fornecedor",
  "Ação implementada",
  "Verificação eficácia",
  "Encerrada",
  "Vencida",
];
export function validateState(state) {
  if (!state || state.schemaVersion !== 1 || !state.settings)
    throw new Error("Formato de backup incompatível (versão 1 necessária).");
  for (const key of COLLECTIONS) {
    if (!Array.isArray(state[key]) || state[key].length > 50000)
      throw new Error(`Coleção inválida: ${key}.`);
    const ids = new Set();
    for (const record of state[key]) {
      if (
        !record ||
        typeof record.id !== "string" ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(record.id) ||
        ids.has(record.id)
      )
        throw new Error(`ID inválido ou duplicado em ${key}.`);
      ids.add(record.id);
    }
  }
  if (
    !finite(state.settings.hoursPerDay, 1, 12) ||
    !finite(state.settings.coverageTarget, 0, 100)
  )
    throw new Error("Configuração de jornada ou cobertura inválida.");
  const weights = state.settings.weights;
  if (
    !weights ||
    Object.keys(DEFAULT_WEIGHTS).some((k) => !finite(weights[k], 0, 100)) ||
    Object.keys(DEFAULT_WEIGHTS).reduce((s, k) => s + weights[k], 0) !== 100
  )
    throw new Error("Os sete pesos devem somar 100 pontos.");
  const has = (key, id) => state[key].some((r) => r.id === id);
  for (const key of ["inspectors", "suppliers", "materials"])
    for (const record of state[key])
      if (typeof record.active !== "boolean")
        throw new Error("O campo ativo deve ser verdadeiro ou falso.");
  const booleanFields = (record, keys) => {
    if (
      keys.some(
        (k) => record[k] !== undefined && typeof record[k] !== "boolean",
      )
    )
      throw new Error("Indicador booleano inválido.");
  };
  for (const supplier of state.suppliers) {
    for (const [key, max] of [
      ["documentationRisk", 10],
      ["rejections", 1000],
      ["divergences", 1000],
      ["postReleaseIssues", 1000],
    ])
      if (supplier[key] !== undefined && !finite(supplier[key], 0, max))
        throw new Error(`Componente de risco inválido: ${key}.`);
    for (const key of ["lastAudit", "lastInspection"])
      if (
        supplier[key] &&
        (!validDate(supplier[key]) || supplier[key] > isoDate())
      )
        throw new Error("Data de auditoria / inspeção inválida ou futura.");
    booleanFields(supplier, ["isNew"]);
    if (
      supplier.regimeOverride &&
      !["1", "2", "3"].includes(String(supplier.regimeOverride))
    )
      throw new Error("Regime inválido.");
    if (supplier.regimeOverride && !supplier.regimeReason?.trim())
      throw new Error("O ajuste manual de regime exige uma justificativa.");
  }
  for (const m of state.materials)
    if (
      typeof m.name !== "string" ||
      !m.name.trim() ||
      !finite(m.criticality, 0, 20)
    )
      throw new Error("Material inválido.");
  for (const f of state.inspectors)
    if (
      typeof f.name !== "string" ||
      !f.name.trim() ||
      !finite(f.weeklyHours, 0, 60) ||
      !Array.isArray(f.materialIds) ||
      f.materialIds.some((id) => !has("materials", id))
    )
      throw new Error("Fiscal ou habilitação inválida.");
  for (const s of state.suppliers)
    if (
      typeof s.name !== "string" ||
      !s.name.trim() ||
      !finite(s.baseRisk, 0, 100) ||
      !Array.isArray(s.materialIds) ||
      s.materialIds.some((id) => !has("materials", id))
    )
      throw new Error("Fornecedor inválido.");
  for (const d of state.demands) {
    if (!Number.isInteger(d.requiredHours * 4))
      throw new Error("O esforço deve usar intervalos de 0,25 h (15 minutos).");
    if (
      !DEMAND_STATUSES.includes(d.status) ||
      !finite(d.volume ?? 0, 0, 5) ||
      (d.materialCriticality !== undefined &&
        !finite(d.materialCriticality, 0, 20))
    )
      throw new Error("Status ou componente de prioridade inválido.");
    booleanFields(d, [
      "mandatory",
      "holdPoint",
      "surpriseAudit",
      "recurrence",
      "severeRecurrence",
    ]);
    if (
      !has("suppliers", d.supplierId) ||
      !has("materials", d.materialId) ||
      (d.rncId && !has("rncs", d.rncId)) ||
      typeof d.description !== "string" ||
      !d.description.trim() ||
      !validDate(d.requiredDate) ||
      !validDate(d.deadline) ||
      d.deadline < d.requiredDate ||
      !finite(d.requiredHours, 0.25, 10000)
    )
      throw new Error(
        "Demanda inválida. Verifique descrição, vínculos, datas e esforço.",
      );
    const supplier = state.suppliers.find((s) => s.id === d.supplierId);
    if (!supplier.materialIds.includes(d.materialId))
      throw new Error(
        "O material da demanda não pertence ao fornecedor selecionado.",
      );
    const rnc = state.rncs.find((r) => r.id === d.rncId);
    if (
      rnc &&
      (rnc.supplierId !== d.supplierId || rnc.materialId !== d.materialId)
    )
      throw new Error(
        "A RNC relacionada deve pertencer ao mesmo fornecedor e material.",
      );
  }
  for (const a of state.availability)
    if (
      !has("inspectors", a.inspectorId) ||
      !validDate(a.date) ||
      !finite(a.hours, 0, 12) ||
      ![
        "Disponível",
        "Em inspeção",
        "Deslocamento",
        "Férias",
        "Folga",
        "Afastado",
        "Administrativo",
        "Indisponível",
      ].includes(a.status)
    )
      throw new Error("Disponibilidade inválida.");
  const slots = state.availability.map((a) => `${a.inspectorId}:${a.date}`);
  if (new Set(slots).size !== slots.length)
    throw new Error(
      "Há disponibilidades duplicadas para o mesmo fiscal e dia.",
    );
  for (const r of state.rncs) {
    if (
      !has("suppliers", r.supplierId) ||
      !has("materials", r.materialId) ||
      !validDate(r.openedAt) ||
      !validDate(r.deadline) ||
      r.deadline < r.openedAt ||
      !["Baixa", "Média", "Alta", "Crítica"].includes(r.severity) ||
      !RNC_STATUSES.includes(r.status)
    )
      throw new Error("RNC inválida. Confira os vínculos e as datas.");
    booleanFields(r, ["recurrence"]);
    if (
      r.status === "Encerrada" &&
      (!validDate(r.closedAt) ||
        r.closedAt < r.openedAt ||
        !r.effectiveness?.trim())
    )
      throw new Error("Encerramento de RNC inválido.");
  }
  for (const a of state.allocations)
    if (
      !has("inspectors", a.inspectorId) ||
      !has("demands", a.demandId) ||
      !validDate(a.date) ||
      !finite(a.hours, 0.25, 12) ||
      !Number.isInteger(a.hours * 4) ||
      !["Aprovada", "Cancelada"].includes(a.status)
    )
      throw new Error("Alocação inválida.");
  const simulated = {
    ...state,
    demands: state.demands.map((d) =>
      d.status === "Realizada" ? { ...d, status: "Programada" } : d,
    ),
    allocations: [],
  };
  for (const a of state.allocations) {
    const d = state.demands.find((d) => d.id === a.demandId);
    if (a.status === "Aprovada") {
      if (d.status === "Cancelada")
        throw new Error("Demanda cancelada não pode ter alocação aprovada.");
      const validationState =
        d.status === "Escala histórica"
          ? {
              ...simulated,
              inspectors: simulated.inspectors.map((inspector) =>
                inspector.id === a.inspectorId
                  ? { ...inspector, active: true }
                  : inspector,
              ),
            }
          : simulated;
      const errors = allocationErrors(a, validationState);
      if (errors.length)
        throw new Error(`Conflito na escala (${d.code}): ${errors[0]}`);
    }
    simulated.allocations.push(a);
  }
  for (const d of state.demands)
    if (
      d.status === "Realizada" &&
      (!validDate(d.completedAt) ||
        !d.outcome?.trim() ||
        coverage(d, state, d.requiredDate).remaining > 0.001)
    )
      throw new Error(
        "Fiscalização realizada exige resultado, data e cobertura integral na mesma semana.",
      );
  return true;
}
