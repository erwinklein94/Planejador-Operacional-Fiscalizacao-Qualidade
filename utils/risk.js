import { daysBetween, isoDate } from "./dates.js";
export const DEFAULT_WEIGHTS = {
  material: 20,
  supplier: 20,
  rnc: 15,
  mandatory: 20,
  elapsed: 10,
  urgency: 10,
  volume: 5,
};
export const WEIGHT_LABELS = {
  material: "Criticidade do material",
  supplier: "Risco do fornecedor",
  rnc: "RNC e reincidência",
  mandatory: "Obrigatoriedade / hold point",
  elapsed: "Tempo sem fiscalização",
  urgency: "Urgência / prazo",
  volume: "Relevância da produção",
};
export function riskLevel(score) {
  if (!Number.isFinite(score))
    throw new Error("Score de risco inválido. Verifique os dados de origem.");
  return score >= 70
    ? { label: "Crítico", tone: "danger" }
    : score >= 50
      ? { label: "Alto", tone: "orange" }
      : score >= 30
        ? { label: "Moderado", tone: "warning" }
        : { label: "Baixo", tone: "success" };
}
export function supplierRisk(supplier, state, today = isoDate()) {
  const records = state.rncs.filter(
    (r) => r.supplierId === supplier.id && r.status !== "Encerrada",
  );
  const recent = state.occurrences.filter(
    (r) =>
      r.supplierId === supplier.id &&
      daysBetween(r.date, today) <= 90 &&
      r.date <= today,
  );
  const parts = [
    ["Risco de base", Number(supplier.baseRisk || 0)],
    ["RNCs abertas", Math.min(20, records.length * 5)],
    [
      "RNCs graves",
      Math.min(
        20,
        records.filter((r) => ["Alta", "Crítica"].includes(r.severity)).length *
          10,
      ),
    ],
    [
      "Reincidências",
      Math.min(20, records.filter((r) => r.recurrence).length * 12),
    ],
    ["Ocorrências recentes", Math.min(15, recent.length * 5)],
    [
      "Tempo sem auditoria",
      !supplier.lastAudit
        ? 10
        : Math.min(
            10,
            Math.floor(
              Math.max(0, daysBetween(supplier.lastAudit, today)) / 30,
            ),
          ),
    ],
    ["Documentação", Number(supplier.documentationRisk || 0)],
    [
      "Reprovações / divergências",
      Math.min(
        15,
        Number(supplier.rejections || 0) * 3 +
          Number(supplier.divergences || 0) * 3 +
          Number(supplier.postReleaseIssues || 0) * 5,
      ),
    ],
  ];
  const score = Math.min(
    100,
    parts.reduce((sum, [, value]) => sum + value, 0),
  );
  return {
    score,
    parts,
    ...riskLevel(score),
    qualityScore: 100 - score,
    regime:
      score >= 70 ||
      supplier.isNew ||
      records.some((r) => r.severity === "Crítica" || r.recurrence)
        ? 1
        : score >= 30
          ? 2
          : 3,
  };
}
export function demandRisk(demand, state, today = isoDate()) {
  const supplier = state.suppliers.find((s) => s.id === demand.supplierId);
  const material = state.materials.find((m) => m.id === demand.materialId);
  const related = state.rncs.filter(
    (r) => r.id === demand.rncId && r.status !== "Encerrada",
  );
  const severe =
    related.some((r) => r.severity === "Crítica" || r.recurrence) ||
    demand.severeRecurrence;
  const remaining = daysBetween(today, demand.deadline || demand.requiredDate);
  const fractions = {
    material:
      Number(demand.materialCriticality ?? material?.criticality ?? 10) / 20,
    supplier: supplier ? supplierRisk(supplier, state, today).score / 100 : 0,
    rnc: severe ? 1 : demand.recurrence ? 0.8 : related.length ? 0.6 : 0,
    mandatory:
      demand.holdPoint || demand.mandatory ? 1 : demand.surpriseAudit ? 0.4 : 0,
    elapsed: !supplier?.lastInspection
      ? 1
      : Math.min(
          1,
          Math.max(0, daysBetween(supplier.lastInspection, today)) / 60,
        ),
    urgency:
      remaining <= 1
        ? 1
        : remaining <= 3
          ? 0.8
          : remaining <= 7
            ? 0.5
            : remaining <= 14
              ? 0.2
              : 0,
    volume: Number(demand.volume || 0) / 5,
  };
  const weights = state.settings.weights || DEFAULT_WEIGHTS;
  const parts = Object.entries(fractions).map(([key, fraction]) => ({
    key,
    label: WEIGHT_LABELS[key],
    value:
      Math.round(Math.min(1, Math.max(0, fraction)) * weights[key] * 10) / 10,
    max: weights[key],
  }));
  const raw = Math.round(parts.reduce((sum, part) => sum + part.value, 0));
  const floor = demand.holdPoint || severe ? 70 : demand.mandatory ? 50 : 0;
  const score = Math.min(100, Math.max(raw, floor));
  return {
    score,
    raw,
    floor,
    parts,
    ...riskLevel(score),
    floorReason: demand.holdPoint
      ? "Hold point: piso de 70 pontos"
      : severe
        ? "RNC crítica / reincidência grave: piso de 70 pontos"
        : demand.mandatory
          ? "Presença obrigatória: piso de 50 pontos"
          : "",
  };
}
