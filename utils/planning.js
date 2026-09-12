import {
  addDays,
  daysBetween,
  inWeek,
  isoDate,
  monday,
  validDate,
  weekDays,
} from "./dates.js";
import { demandRisk } from "./risk.js";
export const BLOCKED = [
  "Férias",
  "Folga",
  "Afastado",
  "Indisponível",
  "Deslocamento",
  "Administrativo",
];
export const liveAllocations = (state) =>
  state.allocations.filter(
    (a) =>
      a.status === "Aprovada" &&
      state.demands.some(
        (d) => d.id === a.demandId && d.status !== "Cancelada",
      ),
  );
const DEFAULT_WORKDAYS = [1, 2, 3, 4, 5];
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function inspectorDailyHours(inspector, state) {
  const configured = Number(inspector?.dailyHours);
  if (Number.isFinite(configured)) return configured;
  const legacy = Number(inspector?.weeklyHours) / 5;
  return Number.isFinite(legacy) ? legacy : Number(state.settings.hoursPerDay);
}
export function isScheduledWorkday(inspector, date) {
  if (inspector?.scheduleType === "cycle") {
    const work = Number(inspector.cycleWorkDays);
    const off = Number(inspector.cycleOffDays);
    if (
      Number.isInteger(work) &&
      work > 0 &&
      Number.isInteger(off) &&
      off > 0 &&
      validDate(inspector.cycleStartDate)
    ) {
      const period = work + off;
      const position = ((daysBetween(inspector.cycleStartDate, date) % period) + period) % period;
      return position < work;
    }
  }
  const weekdays = Array.isArray(inspector?.workWeekdays)
    ? inspector.workWeekdays.map(Number)
    : DEFAULT_WORKDAYS;
  return weekdays.includes(new Date(`${date}T12:00:00`).getDay());
}
export function inspectorScheduleLabel(inspector, state) {
  const hours = inspectorDailyHours(inspector, state);
  if (inspector?.scheduleType === "cycle")
    return `${inspector.cycleWorkDays} dias de trabalho / ${inspector.cycleOffDays} de folga · ${hours} h/dia`;
  const weekdays = Array.isArray(inspector?.workWeekdays)
    ? inspector.workWeekdays.map(Number)
    : DEFAULT_WORKDAYS;
  return `${weekdays.map((day) => DAY_LABELS[day]).join(", ")} · ${hours} h/dia`;
}
export function dailyCapacity(inspector, date, state) {
  if (!inspector?.active || !weekDays(date).includes(date)) return 0;
  const override = state.availability.find(
    (a) => a.inspectorId === inspector.id && a.date === date,
  );
  if (override && BLOCKED.includes(override.status)) return 0;
  if (override) return Math.max(0, Math.min(12, Number(override.hours)));
  return isScheduledWorkday(inspector, date)
    ? Math.max(0, Math.min(12, inspectorDailyHours(inspector, state)))
    : 0;
}
export function inspectorCapacity(inspector, week, state) {
  return weekDays(week).reduce(
    (sum, day) => sum + dailyCapacity(inspector, day, state),
    0,
  );
}
export function inspectorUsed(inspector, week, state) {
  return liveAllocations(state)
    .filter((a) => a.inspectorId === inspector.id && inWeek(a.date, week))
    .reduce((sum, a) => sum + a.hours, 0);
}
export function demandAllocated(demand, state, week) {
  return Math.min(
    demand.requiredHours,
    liveAllocations(state)
      .filter(
        (a) => a.demandId === demand.id && (!week || inWeek(a.date, week)),
      )
      .reduce((sum, a) => sum + a.hours, 0),
  );
}
export function weeklyDemands(state, week) {
  return state.demands.filter(
    (d) => inWeek(d.requiredDate, week) && d.status !== "Cancelada",
  );
}
export function coverage(demand, state, week) {
  const covered = demandAllocated(demand, state, week);
  return {
    covered,
    remaining: Math.max(0, demand.requiredHours - covered),
    percent: demand.requiredHours
      ? (covered / demand.requiredHours) * 100
      : null,
  };
}
export function metrics(state, week, subset) {
  const demands = subset || weeklyDemands(state, week);
  const capacity = state.inspectors.reduce(
    (sum, fiscal) => sum + inspectorCapacity(fiscal, week, state),
    0,
  );
  const required = demands.reduce((sum, d) => sum + d.requiredHours, 0);
  const covered = demands.reduce(
    (sum, d) => sum + demandAllocated(d, state, week),
    0,
  );
  const executed = demands
    .filter((d) => d.status === "Realizada")
    .reduce((sum, d) => sum + d.requiredHours, 0);
  return {
    capacity,
    required,
    covered,
    executed,
    uncovered: required - covered,
    deficit: Math.max(0, required - capacity),
    coverage: required ? (covered / required) * 100 : null,
    repressedForecast: required
      ? ((required - covered) / required) * 100
      : null,
    uncoveredDemands: demands.filter(
      (d) => coverage(d, state, week).remaining > 0 && d.status !== "Realizada",
    ),
    available: state.inspectors.filter(
      (i) => inspectorCapacity(i, week, state) > inspectorUsed(i, week, state),
    ).length,
  };
}
export function allocationErrors(proposal, state, ignoreId) {
  const d = state.demands.find((x) => x.id === proposal.demandId);
  const f = state.inspectors.find((x) => x.id === proposal.inspectorId);
  const errors = [];
  if (!d || !f) return ["Demanda ou fiscal não encontrado."];
  if (["Cancelada", "Realizada"].includes(d.status))
    errors.push("A demanda está encerrada.");
  if (!f.active) errors.push("Fiscal inativo.");
  if (!f.materialIds.includes(d.materialId))
    errors.push("Fiscal sem habilitação para este material.");
  if (!inWeek(proposal.date, d.requiredDate))
    errors.push(
      "A alocação deve pertencer à semana da demanda. Reprograme a demanda para mudar de semana.",
    );
  if (proposal.date > d.deadline)
    errors.push(
      "A data ultrapassa o prazo. Reprograme com justificativa antes de alocar.",
    );
  if (
    !Number.isFinite(proposal.hours) ||
    proposal.hours < 0.25 ||
    !Number.isInteger(proposal.hours * 4)
  )
    errors.push("Informe horas em intervalos de 0,25 h (15 minutos).");
  const current = liveAllocations(state).filter((a) => a.id !== ignoreId);
  const sameDay = current.filter(
    (a) => a.inspectorId === f.id && a.date === proposal.date,
  );
  if (
    sameDay.reduce((s, a) => s + a.hours, 0) + proposal.hours >
    dailyCapacity(f, proposal.date, state) + 0.001
  )
    errors.push("Capacidade diária insuficiente ou fiscal indisponível.");
  const usedWeek = current
    .filter((a) => a.inspectorId === f.id && inWeek(a.date, proposal.date))
    .reduce((s, a) => s + a.hours, 0);
  if (
    usedWeek + proposal.hours >
    inspectorCapacity(f, proposal.date, state) + 0.001
  )
    errors.push("Capacidade semanal excedida.");
  const demandHours = current
    .filter((a) => a.demandId === d.id)
    .reduce((s, a) => s + a.hours, 0);
  if (demandHours + proposal.hours > d.requiredHours + 0.001)
    errors.push("As horas excedem o esforço necessário da demanda.");
  if (
    sameDay.some((a) => {
      const other = state.demands.find((x) => x.id === a.demandId);
      return (
        other &&
        (other.supplierId !== d.supplierId ||
          other.unit !== d.unit ||
          other.city !== d.city)
      );
    })
  )
    errors.push("Conflito de local: há outra unidade programada no mesmo dia.");
  return errors;
}
export function suggestAllocation(demand, state, today = isoDate()) {
  const risk = demandRisk(demand, state);
  const choices = [];
  for (const fiscal of state.inspectors) {
    if (!fiscal.active || !fiscal.materialIds.includes(demand.materialId))
      continue;
    const simulated = structuredClone(state);
    const slots = [];
    let remaining = coverage(demand, state).remaining;
    for (const date of weekDays(demand.requiredDate)) {
      if (date < today || date > demand.deadline || remaining <= 0.001)
        continue;
      const used = liveAllocations(simulated)
        .filter((a) => a.inspectorId === fiscal.id && a.date === date)
        .reduce((sum, a) => sum + a.hours, 0);
      const free = Math.min(
        dailyCapacity(fiscal, date, simulated) - used,
        inspectorCapacity(fiscal, date, simulated) -
          inspectorUsed(fiscal, date, simulated),
      );
      const proposal = {
        id: `suggestion-${date}`,
        demandId: demand.id,
        inspectorId: fiscal.id,
        date,
        hours: Math.floor(Math.min(free, remaining) * 4 + 0.000001) / 4,
        status: "Aprovada",
      };
      if (
        proposal.hours > 0.001 &&
        !allocationErrors(proposal, simulated).length
      ) {
        slots.push(proposal);
        simulated.allocations.push(proposal);
        remaining -= proposal.hours;
      }
    }
    if (!slots.length) continue;
    const local = fiscal.city === demand.city;
    const region = fiscal.uf === demand.uf;
    choices.push({
      inspector: fiscal,
      slots,
      remaining,
      rank:
        (remaining <= 0.001 ? 1000 : 0) +
        (local ? 100 : region ? 40 : 0) -
        inspectorUsed(fiscal, demand.requiredDate, state),
      reasons: [
        "Habilitado para o material",
        `${slots.reduce((sum, s) => sum + s.hours, 0)} h disponíveis na semana`,
        local
          ? "Base na mesma cidade"
          : region
            ? "Base no mesmo estado; confirmar deslocamento"
            : "Base em outro estado; avaliar deslocamento",
        ...(risk.score >= 70 ? ["Demanda crítica"] : []),
        ...(demand.holdPoint ? ["Presença exigida no hold point"] : []),
      ],
    });
  }
  return choices.sort((a, b) => b.rank - a.rank).slice(0, 3);
}
export function alerts(state, week) {
  const result = [];
  const m = metrics(state, week);
  const today = isoDate();
  for (const d of m.uncoveredDemands)
    if (
      d.status !== "Escala histórica" &&
      (d.holdPoint || demandRisk(d, state).score >= 70)
    )
      result.push({
        tone: "danger",
        title: d.holdPoint
          ? "Hold point sem cobertura completa"
          : "Demanda crítica descoberta",
        text: `${d.code} · ${d.description}`,
        demandId: d.id,
      });
  state.rncs
    .filter((r) => r.status !== "Encerrada" && r.deadline < today)
    .forEach((r) =>
      result.push({
        tone: "orange",
        title: "RNC vencida",
        text: `${r.number} · ${r.description}`,
        route: "rnc",
      }),
    );
  state.demands
    .filter(
      (d) =>
        d.deadline < today &&
        !["Realizada", "Cancelada", "Escala histórica"].includes(d.status) &&
        !inWeek(d.requiredDate, week),
    )
    .forEach((d) =>
      result.push({
        tone: "orange",
        title: "Pendência de outra semana",
        text: `${d.code} · Prazo ${d.deadline}. Requer reprogramação.`,
        demandId: d.id,
      }),
    );
  if (m.coverage !== null && m.coverage < state.settings.coverageTarget)
    result.unshift({
      tone: "orange",
      title: "Cobertura abaixo da meta",
      text: `A semana está abaixo da meta de ${state.settings.coverageTarget}%.`,
      route: "cobertura",
    });
  state.inspectors
    .filter(
      (f) => inspectorUsed(f, week, state) > inspectorCapacity(f, week, state),
    )
    .forEach((f) =>
      result.push({
        tone: "danger",
        title: "Capacidade excedida",
        text: f.name,
        route: "planejamento",
      }),
    );
  return result;
}
