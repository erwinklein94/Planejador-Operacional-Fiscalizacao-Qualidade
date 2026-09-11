import { createSeed, emptyState } from "../data/seed.js";
import { uid } from "../utils/formatters.js";
import { demandRisk, supplierRisk, DEFAULT_WEIGHTS } from "../utils/risk.js";
import { allocationErrors, coverage, metrics } from "../utils/planning.js";
import { isoDate, monday, validDate, addDays } from "../utils/dates.js";
export const STORAGE_KEY = "fiscalizacao-qualidade:v1";
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
const clone = (value) => structuredClone(value);
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
      const errors = allocationErrors(a, simulated);
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
export class LocalStorageService {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.state = null;
    this.revision = null;
  }
  async init() {
    let raw;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      throw new Error(
        "O navegador bloqueou o armazenamento local. Permita o armazenamento para usar o sistema.",
      );
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        validateState(parsed);
        this.state = parsed;
        this.revision = raw;
      } catch (error) {
        throw new Error(
          `Não foi possível abrir os dados salvos. Eles foram preservados. ${error.message}`,
        );
      }
    } else {
      const state = createSeed();
      validateState(state);
      this.persist(state);
    }
    return this.getState();
  }
  async getState() {
    return clone(this.state);
  }
  async list(collection) {
    if (!COLLECTIONS.includes(collection))
      throw new Error("Coleção desconhecida.");
    return clone(this.state[collection]);
  }
  persist(state) {
    let raw;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      throw new Error("Armazenamento indisponível.");
    }
    if (this.revision !== null && raw !== this.revision)
      throw new Error(
        "Os dados mudaram em outra aba. Recarregue esta página antes de salvar.",
      );
    const serialized = JSON.stringify(state);
    try {
      this.storage.setItem(STORAGE_KEY, serialized);
    } catch {
      throw new Error(
        "Não foi possível salvar: armazenamento indisponível ou cheio. Exporte um backup.",
      );
    }
    this.state = state;
    this.revision = serialized;
  }
  async transact(type, record, change, mutate) {
    const next = clone(this.state);
    await mutate(next);
    validateState(next);
    next.auditLog.unshift({
      id: uid(),
      timestamp: new Date().toISOString(),
      type,
      record,
      change,
      user: next.settings.userName || "Planejamento local",
    });
    for (const supplier of next.suppliers) {
      const score = supplierRisk(supplier, next).score;
      const old = this.state.suppliers.find((x) => x.id === supplier.id);
      if (!old || supplierRisk(old, this.state).score !== score)
        next.riskHistory.unshift({
          id: uid(),
          supplierId: supplier.id,
          date: isoDate(),
          week: monday(),
          score,
          source: type,
        });
    }
    for (const demand of next.demands) {
      const old = this.state.demands.find((d) => d.id === demand.id);
      const score = demandRisk(demand, next).score;
      if (old && demandRisk(old, this.state).score !== score)
        next.auditLog.unshift({
          id: uid(),
          timestamp: new Date().toISOString(),
          type: "Prioridade",
          record: demand.code,
          change: `Score ${demandRisk(old, this.state).score} → ${score}`,
          user: next.settings.userName,
        });
    }
    this.persist(next);
    return this.getState();
  }
  async save(collection, record) {
    if (
      ![
        "inspectors",
        "suppliers",
        "materials",
        "demands",
        "availability",
        "rncs",
        "occurrences",
      ].includes(collection)
    )
      throw new Error("Coleção não editável diretamente.");
    const old = this.state[collection].find((x) => x.id === record.id);
    const item = {
      ...record,
      id: record.id || uid(),
      updatedAt: new Date().toISOString(),
    };
    if (collection === "demands" && !old) {
      item.createdAt = new Date().toISOString();
      const largest = Math.max(
        0,
        ...this.state.demands.map((d) => Number(d.code?.split("-").pop()) || 0),
      );
      item.code = `DEM-${String(largest + 1).padStart(3, "0")}`;
    }
    const changes = old
      ? Object.keys(item)
          .filter(
            (k) =>
              !["updatedAt", "id"].includes(k) &&
              JSON.stringify(old[k]) !== JSON.stringify(item[k]),
          )
          .map(
            (k) =>
              `${k}: ${JSON.stringify(old[k] ?? "")} → ${JSON.stringify(item[k])}`,
          )
          .join("; ")
      : "Registro criado";
    return this.transact(
      old ? "Alteração" : "Cadastro",
      item.code || item.number || item.name || collection,
      changes,
      (next) => {
        if (collection === "demands") {
          if (old?.status === "Realizada") {
            const immutable = [
              "supplierId",
              "materialId",
              "unit",
              "city",
              "uf",
              "activity",
              "requiredDate",
              "deadline",
              "requiredHours",
              "completedAt",
              "status",
            ];
            if (immutable.some((k) => old[k] !== item[k]))
              throw new Error(
                "Os dados operacionais de uma fiscalização concluída não podem ser alterados. Crie uma nova demanda para retorno.",
              );
          }
          if (
            old &&
            (old.requiredDate !== item.requiredDate ||
              old.deadline !== item.deadline) &&
            !item.changeReason?.trim()
          )
            throw new Error(
              "Informe o motivo da reprogramação nas observações de alteração.",
            );
          if (
            item.status === "Realizada" &&
            (coverage(item, next, item.requiredDate).remaining > 0.001 ||
              !item.outcome?.trim())
          )
            throw new Error(
              "Para concluir, cubra todo o esforço e registre o resultado.",
            );
          if (item.status === "Realizada") item.completedAt ||= isoDate();
          if (item.status === "Cancelada") {
            if (!item.changeReason?.trim())
              throw new Error("Informe o motivo do cancelamento.");
            next.allocations
              .filter((a) => a.demandId === item.id)
              .forEach((a) => (a.status = "Cancelada"));
          }
          if (old?.status === "Realizada" && item.status !== "Realizada")
            throw new Error(
              "Fiscalizações concluídas permanecem no histórico. Crie uma nova demanda para retorno.",
            );
        }
        if (
          collection === "rncs" &&
          item.status === "Encerrada" &&
          (!item.effectiveness?.trim() || !item.closedAt)
        )
          throw new Error(
            "Registre a data de encerramento e a verificação de eficácia.",
          );
        const index = next[collection].findIndex((x) => x.id === item.id);
        if (index < 0) next[collection].push(item);
        else next[collection][index] = item;
      },
    );
  }
  async approveAllocations(slots) {
    return this.transact(
      "Alocação",
      slots[0]?.demandId || "",
      `${slots.length} dia(s) de alocação aprovado(s)`,
      (next) => {
        if (!slots.length) throw new Error("Não há alocações para aprovar.");
        for (const slot of slots) {
          const errors = allocationErrors(slot, next);
          if (errors.length) throw new Error(errors.join(" "));
          next.allocations.push({
            ...slot,
            id: uid(),
            status: "Aprovada",
            createdAt: new Date().toISOString(),
          });
          const d = next.demands.find((d) => d.id === slot.demandId);
          d.inspectorId = slot.inspectorId;
          d.status = "Programada";
        }
      },
    );
  }
  async cancelAllocation(id, reason) {
    return this.transact(
      "Escala",
      id,
      `Alocação removida: ${reason}`,
      (next) => {
        const a = next.allocations.find((a) => a.id === id);
        if (!a) throw new Error("Alocação não encontrada.");
        const d = next.demands.find((d) => d.id === a.demandId);
        if (d.status === "Realizada")
          throw new Error("A fiscalização já foi realizada.");
        a.status = "Cancelada";
        const remaining = next.allocations.filter(
          (x) => x.demandId === d.id && x.status === "Aprovada",
        );
        d.inspectorId = remaining[0]?.inspectorId || "";
        if (!remaining.length) d.status = "Sem cobertura";
      },
    );
  }
  async reprogramDemand(id, date, deadline, reason) {
    return this.transact(
      "Reprogramação",
      id,
      `Nova semana ${monday(date)}. Motivo: ${reason}`,
      (next) => {
        const d = next.demands.find((d) => d.id === id);
        if (!d || ["Realizada", "Cancelada"].includes(d.status))
          throw new Error("Demanda encerrada ou inexistente.");
        if (!reason.trim()) throw new Error("Informe o motivo.");
        next.allocations
          .filter((a) => a.demandId === id)
          .forEach((a) => (a.status = "Cancelada"));
        d.previousDates = [
          ...(d.previousDates || []),
          { requiredDate: d.requiredDate, deadline: d.deadline, reason },
        ];
        d.requiredDate = date;
        d.deadline = deadline;
        d.status = "Reprogramada";
        d.inspectorId = "";
      },
    );
  }
  async saveSettings(settings) {
    return this.transact(
      "Configurações",
      "Parâmetros",
      "Parâmetros de planejamento atualizados",
      (next) => {
        next.settings = { ...next.settings, ...settings };
      },
    );
  }
  async rejectSuggestion(id) {
    return this.transact(
      "Sugestão",
      id,
      "Sugestão rejeitada; escala preservada",
      () => {},
    );
  }
  async snapshot(week) {
    return this.transact(
      "Cobertura",
      week,
      "Fotografia semanal registrada",
      (next) => {
        const m = metrics(next, week);
        const closed = addDays(monday(week), 6) < isoDate();
        const repressed = next.demands
          .filter(
            (d) =>
              monday(d.requiredDate) === monday(week) &&
              !["Realizada", "Cancelada"].includes(d.status) &&
              d.unfulfilledReason === "Falta de capacidade",
          )
          .reduce((sum, d) => sum + d.requiredHours, 0);
        next.coverageHistory.unshift({
          id: uid(),
          week: monday(week),
          timestamp: new Date().toISOString(),
          hoursPerDay: next.settings.hoursPerDay,
          ...m,
          uncoveredDemands: m.uncoveredDemands.map((d) => d.id),
          closed,
          repressed: closed ? repressed : null,
          repressedPercent:
            closed && m.required ? (repressed / m.required) * 100 : null,
        });
      },
    );
  }
  async exportData() {
    return JSON.stringify(this.state, null, 2);
  }
  async importData(raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("O arquivo não contém JSON válido.");
    }
    validateState(data);
    data.auditLog.unshift({
      id: uid(),
      timestamp: new Date().toISOString(),
      type: "Importação",
      record: "Backup",
      change: "Base restaurada a partir de backup validado",
      user: data.settings.userName,
    });
    this.persist(data);
    return this.getState();
  }
  async reset(demo = false) {
    const next = demo ? createSeed() : emptyState();
    this.persist(next);
    return this.getState();
  }
}
export const storageService = new LocalStorageService();
