import { esc, num } from "../utils/formatters.js";
import { weekDays, dateLabel, weekLabel } from "../utils/dates.js";
import {
  inspectorCapacity,
  inspectorUsed,
  dailyCapacity,
  liveAllocations,
  metrics,
} from "../utils/planning.js";
import { demandRisk } from "../utils/risk.js";
import { helpFor } from "../js/help.js";
import { heading, button, badge, avatar, entityName } from "./shared.js";
export function renderPlanning(ctx) {
  const { state: s, week } = ctx;
  const days = weekDays(week);
  const m = metrics(s, week);
  const names = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
  ];
  return `${heading(ctx.route === "escala" ? "Escala de fiscais" : "Planejamento semanal", `${weekLabel(week)} · Selecione uma atividade para consultar ou alterar a alocação.`, `${button("Disponibilidade", "availability", "", "calendar")}${button("Sugerir alocação", "suggest-next", "primary", "spark")}`)}<div class="section-title"><div class="flex"><span>${badge(`${m.uncoveredDemands.length} demandas sem cobertura completa`, m.uncoveredDemands.length ? "danger" : "success")}${helpFor("Cobertura")}</span><span>${badge(`${num(m.deficit / s.settings.hoursPerDay)} fiscal-dias de déficit`, m.deficit ? "orange" : "neutral")}${helpFor("Déficit de capacidade")}</span></div><div class="flex">${button("Semana anterior", "week-prev", "small", "calendar")}${button("Próxima semana", "week-next", "small", "calendar")}</div></div><section class="panel flush"><div class="planner-wrap"><div class="planner"><div class="day-head"><strong>Equipe de fiscalização</strong>Carga utilizada / disponível</div>${days.map((day, i) => `<div class="day-head"><strong>${names[i]}</strong>${dateLabel(day)}</div>`).join("")}${s.inspectors
    .filter((f) => f.active)
    .map(
      (f) =>
        `<div class="planner-person"><div class="flex">${avatar(f.name)}<strong>${esc(f.name)}</strong></div><small>${esc(f.base)} · ${esc(f.uf)}</small><small>${num(inspectorUsed(f, week, s))} / ${num(inspectorCapacity(f, week, s))} horas</small><button class="table-link" data-action="availability" data-id="${f.id}">Editar disponibilidade</button></div>${days
          .map((date) => {
            const allocations = liveAllocations(s).filter(
              (a) => a.inspectorId === f.id && a.date === date,
            );
            const available = dailyCapacity(f, date, s);
            const override = s.availability.find(
              (a) => a.inspectorId === f.id && a.date === date,
            );
            return `<div class="planner-cell">${allocations
              .map((a) => {
                const d = s.demands.find((d) => d.id === a.demandId);
                const risk = demandRisk(d, s);
                return `<button class="plan-item ${risk.tone}" data-action="allocation-detail" data-id="${a.id}">${badge(risk.label, risk.tone)}<strong>${esc(entityName(s, "suppliers", d.supplierId))}</strong><span>${esc(d.activity)} · ${num(a.hours)} h</span><br><small>${esc(entityName(s, "materials", d.materialId))}</small>${d.holdPoint ? '<br><span class="badge outline">HOLD POINT</span>' : ""}</button>`;
              })
              .join(
                "",
              )}${!available ? `<div class="unavailable">${esc(override?.status || "Indisponível")}</div>` : allocations.reduce((sum, a) => sum + a.hours, 0) < available ? `<button class="cell-add" data-action="manual-allocation" data-fiscal="${f.id}" data-date="${date}">+ Alocar atividade</button>` : ""}</div>`;
          })
          .join("")}`,
    )
    .join(
      "",
    )}</div></div><div class="planner-legend"><span>${badge("Crítico", "danger")}</span><span>${badge("Alto", "orange")}</span><span>${badge("Moderado", "warning")}</span><span>${badge("Baixo", "success")}</span><span>Planejamento em horas · ${s.settings.hoursPerDay} h = 1 fiscal-dia ${helpFor("Fiscal-dia")}</span></div></section><div class="notice">As demandas permanecem na semana da data necessária. Para mudar uma demanda de semana, use “Reprogramar” e registre o motivo. As alocações anteriores ficam no histórico.</div>`;
}
