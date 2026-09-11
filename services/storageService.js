import { createSeed, emptyState } from "../data/seed.js";
import { uid } from "../utils/formatters.js";
import { demandRisk, supplierRisk } from "../utils/risk.js";
import { allocationErrors, coverage, metrics } from "../utils/planning.js";
import { isoDate, monday, addDays } from "../utils/dates.js";
import { COLLECTIONS, validateState } from "../utils/validation.js";
import { supabaseAdapter } from "./supabaseService.js";
export { COLLECTIONS, validateState } from "../utils/validation.js";
const LEGACY_KEY = "fiscalizacao-qualidade:v1";
const clone = (value) => structuredClone(value);
export class StateService {
  constructor(adapter = supabaseAdapter) {
    this.adapter = adapter;
    this.clear();
  }
  clear() {
    this.state = null;
    this.revision = null;
    this.profile = null;
    this.saving = false;
    this.pendingWrite = null;
    this.generation = (this.generation || 0) + 1;
  }
  async init(page = "dashboard") {
    return this.refresh(page);
  }
  async refresh(page = "dashboard") {
    const generation = this.generation;
    if (this.pendingWrite) await this.pendingWrite.catch(() => {});
    const result = await this.adapter.read(page);
    if (generation !== this.generation) throw new Error("Sessão encerrada.");
    if (!result.profile?.active) throw new Error("Conta sem acesso ativo.");
    this.profile = result.profile;
    this.revision = result.revision;
    this.state = result.payload || emptyState();
    validateState(this.state);
    if (!result.payload && this.profile.role === "editor") {
      const legacy = this.legacyData();
      if (legacy) {
        validateState(legacy);
        await this.persist(legacy);
      }
    }
    return this.getState();
  }
  legacyData() {
    // Migration only; a browser storage restriction must not block cloud access.
    let raw;
    try {
      raw = globalThis.localStorage?.getItem(LEGACY_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      validateState(value);
      return value;
    } catch {
      throw new Error(
        "Os dados antigos deste navegador precisam de revisão antes da importação. Exporte o backup da versão anterior.",
      );
    }
  }
  async importLegacy() {
    this.assertEditor();
    const legacy = this.legacyData();
    if (!legacy)
      throw new Error("Não há base da versão anterior salva neste navegador.");
    return this.importData(JSON.stringify(legacy));
  }
  assertEditor() {
    if (!this.state || this.profile?.role !== "editor" || !this.profile?.active)
      throw new Error("Somente o editor pode alterar os dados.");
  }
  async getState() {
    return clone(this.state);
  }
  async list(collection) {
    if (!COLLECTIONS.includes(collection))
      throw new Error("Coleção desconhecida.");
    return clone(this.state[collection]);
  }
  async persist(state) {
    this.assertEditor();
    if (this.saving) throw new Error("Aguarde o salvamento em andamento.");
    validateState(state);
    this.saving = true;
    const generation = this.generation;
    try {
      this.pendingWrite = this.adapter.write(state, this.revision);
      const result = await this.pendingWrite;
      if (generation !== this.generation) throw new Error("Sessão encerrada.");
      this.state = result.payload;
      this.revision = result.revision;
    } finally {
      if (generation === this.generation) {
        this.saving = false;
        this.pendingWrite = null;
      }
    }
  }
  async transact(type, record, change, mutate) {
    this.assertEditor();
    const next = clone(this.state);
    await mutate(next);
    validateState(next);
    next.auditLog.unshift({
      id: uid(),
      timestamp: new Date().toISOString(),
      type,
      record,
      change,
      user: this.profile.full_name,
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
          user: this.profile.full_name,
        });
    }
    await this.persist(next);
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
      user: this.profile.full_name,
    });
    await this.persist(data);
    return this.getState();
  }
  async reset(demo = false) {
    const next = demo ? createSeed() : emptyState();
    await this.persist(next);
    return this.getState();
  }
}
export const storageService = new StateService();
