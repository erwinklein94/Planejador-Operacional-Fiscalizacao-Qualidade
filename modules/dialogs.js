import { esc, num, pct } from "../utils/formatters.js";
import {
  dateLabel,
  weekLabel,
  addDays,
  monday,
  isoDate,
} from "../utils/dates.js";
import {
  coverage,
  metrics,
  suggestAllocation,
  alerts,
  weeklyDemands,
} from "../utils/planning.js";
import { demandRisk, supplierRisk } from "../utils/risk.js";
import { icon } from "../js/icons.js";
import { helpFor, labelWithHelp } from "../js/help.js";
import { showModal, formError } from "../js/ui.js";
import { field, showForm } from "./forms.js";
import {
  badge,
  button,
  avatar,
  entityName,
  progress,
  empty,
  demandTable,
} from "./shared.js";
export function demandDetail(ctx, id) {
  const s = ctx.state;
  const d = s.demands.find((d) => d.id === id);
  if (!d) throw new Error("Demanda não encontrada.");
  const risk = demandRisk(d, s);
  const c = coverage(d, s);
  const assigned = [
    ...new Set(
      s.allocations
        .filter((a) => a.demandId === id && a.status === "Aprovada")
        .map((a) => entityName(s, "inspectors", a.inspectorId)),
    ),
  ];
  showModal(
    `${d.code} · ${d.activity}`,
    d.description,
    `<div class="flex">${badge(`${risk.label} · ${risk.score} / 100`, risk.tone)}${helpFor("Score de prioridade")}${d.holdPoint ? '<span class="badge outline">HOLD POINT</span>' : ""}${d.mandatory ? badge("Presença obrigatória", "info") : ""}</div><dl class="detail-grid"><div><dt>Fornecedor</dt><dd>${esc(entityName(s, "suppliers", d.supplierId))}</dd></div><div><dt>Material</dt><dd>${esc(entityName(s, "materials", d.materialId))}</dd></div><div><dt>Local / unidade</dt><dd>${esc(d.unit)} · ${esc(d.city)} / ${esc(d.uf)}</dd></div><div><dt>Data necessária / prazo</dt><dd>${dateLabel(d.requiredDate)} / ${dateLabel(d.deadline)}</dd></div><div><dt>${labelWithHelp("Cobertura", "Horas alocadas e aprovadas comparadas ao esforço necessário desta demanda.")}</dt><dd>${num(c.covered)} / ${num(d.requiredHours)} h ${c.remaining ? badge("Sem cobertura completa", "danger") : badge("Cobertura completa", "success")}</dd></div><div><dt>Fiscais alocados</dt><dd>${esc(assigned.join(", ") || "Sem fiscal alocado")}</dd></div><div><dt>Lote / produção</dt><dd>${esc(d.lot || "Não informado")}</dd></div><div><dt>Status operacional</dt><dd>${esc(d.status)}</dd></div></dl><h3>${labelWithHelp("Score de prioridade", "A composição abaixo mostra quanto cada fator acrescentou à prioridade final desta demanda.")}</h3><div class="risk-breakdown spaced">${risk.parts.map((p) => `<div class="risk-part"><span>${p.label}</span>${progress(p.max ? (p.value / p.max) * 100 : 0)}<strong>${num(p.value)} / ${p.max}</strong></div>`).join("")}</div>${risk.floor > risk.raw ? `<div class="notice warn">${esc(risk.floorReason)}. Soma dos componentes: ${risk.raw}; prioridade final: ${risk.score}.</div>` : `<p class="muted spaced">Soma dos componentes: ${risk.raw} pontos.${risk.floorReason ? ` ${esc(risk.floorReason)}.` : ""}</p>`}${d.outcome ? `<div class="notice"><strong>Resultado:</strong> ${esc(d.outcome)}</div>` : ""}${d.notes ? `<p class="muted spaced">${esc(d.notes)}</p>` : ""}<div class="modal-actions">${button("Editar demanda", "edit-demands", "", "edit", `data-id="${d.id}"`)}${!["Realizada", "Cancelada"].includes(d.status) ? `${button("Reprogramar", "reprogram", "", "calendar", `data-id="${d.id}"`)}${c.remaining ? button("Sugerir fiscal", "suggest-demand", "primary", "spark", `data-id="${d.id}"`) : button("Registrar resultado", "edit-demands", "primary", "check", `data-id="${d.id}"`)}` : ""}</div>`,
  );
}
export function supplierDetail(ctx, id) {
  const s = ctx.state;
  const supplier = s.suppliers.find((f) => f.id === id);
  if (!supplier) throw new Error("Fornecedor não encontrado.");
  const risk = supplierRisk(supplier, s);
  const history = s.riskHistory.filter((h) => h.supplierId === id).slice(0, 8);
  showModal(
    supplier.name,
    `${supplier.unit} · ${supplier.city} / ${supplier.uf}`,
    `<div class="report-grid"><div class="report-kpi"><small>Score de risco</small><strong>${risk.score}<small>/ 100</small></strong></div><div class="report-kpi"><small>Supplier Quality Score</small><strong>${risk.qualityScore}<small>maior = melhor</small></strong></div><div class="report-kpi"><small>Regime calculado</small><strong>Nível ${risk.regime}</strong></div><div class="report-kpi"><small>Regime em uso</small><strong>Nível ${supplier.regimeOverride || risk.regime}</strong></div></div>${badge(risk.label, risk.tone)}<div class="notice">Nível 1: fiscalização intensiva. Nível 2: fiscalização dirigida. Nível 3: amostragem. O regime considera o risco, novas unidades e RNCs graves.</div><h3>Composição do risco</h3><div class="risk-breakdown spaced">${risk.parts.map(([label, value]) => `<div class="risk-part"><span>${label}</span>${progress(value, "var(--navy)")}<strong>${value} pts</strong></div>`).join("")}</div><h3 class="spaced">Evolução registrada</h3>${history.length ? `<div class="slots">${history.map((h) => badge(`${dateLabel(h.date)} · ${h.score} pontos`, "info")).join("")}</div>` : '<p class="muted spaced">O histórico começa na primeira alteração do risco. Não há evolução anterior registrada.</p>'}${supplier.regimeReason ? `<div class="notice">Justificativa do ajuste manual: ${esc(supplier.regimeReason)}</div>` : ""}<div class="modal-actions">${button("Editar fornecedor", "edit-suppliers", "primary", "edit", `data-id="${id}"`)}</div>`,
    true,
  );
}
export function suggestions(ctx, id, approve, reject) {
  const s = ctx.state;
  const demand = s.demands.find((d) => d.id === id);
  if (!demand) throw new Error("Demanda não encontrada.");
  const options = suggestAllocation(demand, s);
  const dialog = showModal(
    "Sugestão de alocação",
    `${demand.code} · ${demand.description}`,
    `<div class="notice">Confira as datas e o deslocamento antes de aprovar. Estas sugestões ainda não alteraram a escala. Não há cálculo de rotas ou tempo de viagem nesta versão.</div>${options.map((o, i) => `<section class="recommendation"><div class="recommendation-header">${avatar(o.inspector.name)}<div><h3>${esc(o.inspector.name)}</h3><small class="muted">${esc(o.inspector.base)} / ${esc(o.inspector.uf)}</small></div>${badge(o.remaining > 0 ? "Cobertura parcial" : "Cobertura integral", o.remaining > 0 ? "warning" : "success")}</div><ul class="reason-list">${o.reasons.map((reason) => `<li>${icon("check")}${esc(reason)}</li>`).join("")}</ul><div class="slots">${o.slots.map((slot) => badge(`${dateLabel(slot.date)} · ${num(slot.hours)} h`, "info")).join("")}</div>${o.remaining ? `<p class="danger-text">Ainda restarão ${num(o.remaining)} h sem cobertura.</p>` : ""}<button class="btn primary small spaced" data-approve-suggestion="${i}">Aprovar esta alocação</button></section>`).join("") || empty("Nenhum fiscal elegível para esta demanda", "Verifique habilitações, disponibilidade, locais e prazo. A demanda continuará sem cobertura.")}<div id="form-error" role="alert"></div><div class="modal-actions">${button("Alocar manualmente", "manual-allocation", "", "calendar", `data-id="${id}"`)}<button class="btn" id="reject-suggestion">Rejeitar sugestões</button></div>`,
  );
  dialog.querySelectorAll("[data-approve-suggestion]").forEach(
    (el) =>
      (el.onclick = async () => {
        el.disabled = true;
        try {
          await approve(options[Number(el.dataset.approveSuggestion)].slots);
        } catch (error) {
          formError(error);
          if (el.isConnected) el.disabled = false;
        }
      }),
  );
  dialog.querySelector("#reject-suggestion").onclick = () => reject(id);
}
export function manualAllocation(ctx, options, save) {
  const s = ctx.state;
  const demands = s.demands.filter(
    (d) =>
      !["Realizada", "Cancelada"].includes(d.status) &&
      coverage(d, s).remaining > 0 &&
      (options.id === d.id || monday(d.requiredDate) === ctx.week),
  );
  const chosen = demands.find((d) => d.id === options.id) || demands[0];
  const dialog = showForm(
    "Aprovar alocação manual",
    "A aprovação passa pelas mesmas verificações de capacidade, habilitação e conflitos usadas nas sugestões.",
    [
      field("demandId", "Demanda", "select", {
        options: demands.map((d) => [d.id, `${d.code} · ${d.description}`]),
        required: true,
        full: true,
      }),
      field("inspectorId", "Fiscal", "select", {
        options: s.inspectors
          .filter((f) => f.active)
          .map((f) => [f.id, f.name]),
        required: true,
      }),
      field("date", "Data", "date", { required: true }),
      field("hours", "Horas de fiscalização", "number", {
        required: true,
        min: 0.25,
        max: s.settings.hoursPerDay,
        step: ".25",
      }),
    ],
    {
      demandId: chosen?.id || "",
      inspectorId: options.fiscal || "",
      date: options.date || (chosen ? monday(chosen.requiredDate) : ctx.week),
      hours: Math.min(
        s.settings.hoursPerDay,
        chosen ? coverage(chosen, s).remaining : 8,
      ),
    },
    (record) => save([{ ...record, status: "Aprovada" }]),
  );
  dialog.querySelector("[type=submit]").textContent = "Aprovar alocação";
}
export function availabilityForm(ctx, id, save) {
  const s = ctx.state;
  const fields = [
    field("inspectorId", "Fiscal", "select", {
      options: s.inspectors.map((f) => [f.id, f.name]),
      required: true,
    }),
    field("date", "Data", "date", { required: true }),
    field("status", "Disponibilidade", "select", {
      options: [
        "Disponível",
        "Em inspeção",
        "Deslocamento",
        "Férias",
        "Folga",
        "Afastado",
        "Administrativo",
        "Indisponível",
      ],
      required: true,
    }),
    field("hours", "Horas disponíveis para fiscalização", "number", {
      required: true,
      min: 0,
      max: s.settings.hoursPerDay,
      step: ".5",
      help: "Ausências, administrativo e deslocamento contam como zero.",
    }),
    field("notes", "Observações", "textarea", { full: true }),
  ];
  const dialog = showForm(
    "Disponibilidade do fiscal",
    "Registre um dia específico. Alterações que conflitem com alocações aprovadas precisam ser resolvidas na escala primeiro.",
    fields,
    {
      inspectorId: id || s.inspectors[0]?.id || "",
      date: ctx.week,
      status: "Disponível",
      hours: s.settings.hoursPerDay,
      notes: "",
    },
    (record) => {
      const old = s.availability.find(
        (a) => a.inspectorId === record.inspectorId && a.date === record.date,
      );
      return save({ ...record, id: old?.id });
    },
  );
  function fillExisting() {
    const fiscal = dialog.querySelector("[name=inspectorId]").value;
    const date = dialog.querySelector("[name=date]").value;
    const item = s.availability.find(
      (a) => a.inspectorId === fiscal && a.date === date,
    );
    dialog.querySelector("[name=status]").value = item?.status || "Disponível";
    dialog.querySelector("[name=hours]").value =
      item?.hours ?? s.settings.hoursPerDay;
    dialog.querySelector("[name=notes]").value = item?.notes || "";
  }
  dialog.querySelector("[name=inspectorId]").onchange = fillExisting;
  dialog.querySelector("[name=date]").onchange = fillExisting;
  fillExisting();
}
export function reprogramForm(ctx, id, save) {
  const d = ctx.state.demands.find((d) => d.id === id);
  showForm(
    "Reprogramar demanda",
    `${d.code} · As alocações atuais serão canceladas e preservadas no histórico.`,
    [
      field("date", "Nova data necessária", "date", { required: true }),
      field("deadline", "Novo prazo", "date", { required: true }),
      field("reason", "Motivo da reprogramação", "textarea", {
        required: true,
        full: true,
      }),
    ],
    {
      date: addDays(monday(d.requiredDate), 7),
      deadline: addDays(monday(d.requiredDate), 11),
      reason: "",
    },
    (record) => save(id, record.date, record.deadline, record.reason),
  );
}
export function allocationDetail(ctx, id) {
  const a = ctx.state.allocations.find((a) => a.id === id);
  const d = ctx.state.demands.find((d) => d.id === a?.demandId);
  if (!a || !d) throw new Error("Alocação não encontrada.");
  showModal(
    "Alocação aprovada",
    `${entityName(ctx.state, "inspectors", a.inspectorId)} · ${dateLabel(a.date)} · ${num(a.hours)} h`,
    `<h3>${esc(d.description)}</h3><p class="muted spaced">${esc(entityName(ctx.state, "suppliers", d.supplierId))} · ${esc(d.city)} / ${esc(d.uf)}</p><div class="notice">Para alterar a atividade, remova esta alocação e aprove uma nova. O histórico será mantido.</div><div class="modal-actions">${button("Ver demanda", "demand-detail", "", "", `data-id="${d.id}"`)}${d.status !== "Realizada" ? button("Remover da escala", "cancel-allocation", "danger", "", `data-id="${id}"`) : badge("Fiscalização realizada", "success")}</div>`,
  );
}
export function alertsDialog(ctx) {
  const list = alerts(ctx.state, ctx.week);
  showModal(
    "Central de alertas",
    "Pendências de planejamento e qualidade que precisam de atenção.",
    list
      .map(
        (a) =>
          `<button class="alert-item" data-action="${a.demandId ? "demand-detail" : "navigate"}" ${a.demandId ? `data-id="${a.demandId}"` : `data-route="${a.route}"`}>${icon("alert")}<span><strong>${esc(a.title)}</strong><p>${esc(a.text)}</p></span></button>`,
      )
      .join("") || empty("Nenhum alerta neste momento"),
  );
}
export function reportDialog(ctx) {
  const s = ctx.state;
  const m = metrics(s, ctx.week);
  const open = s.rncs.filter((r) => r.status !== "Encerrada");
  const critical = s.suppliers.filter((f) => supplierRisk(f, s).score >= 70);
  const demands = weeklyDemands(s, ctx.week);
  showModal(
    "Resumo semanal da fiscalização",
    `Engenharia da Qualidade de Materiais · ${weekLabel(ctx.week)}${s.demo ? " · Dados de demonstração" : ""}`,
    `<div class="report-grid">${[
      ["Capacidade (fiscal-dias)", num(m.capacity / s.settings.hoursPerDay)],
      ["Demanda (fiscal-dias)", num(m.required / s.settings.hoursPerDay)],
      ["Déficit (fiscal-dias)", num(m.deficit / s.settings.hoursPerDay)],
      [
        "Cobertura programada",
        m.coverage === null ? "Sem demanda" : pct(m.coverage),
      ],
      ["Fiscais com disponibilidade", m.available],
      [
        "Demandas críticas",
        demands.filter((d) => demandRisk(d, s).score >= 70).length,
      ],
      ["Demandas descobertas", m.uncoveredDemands.length],
      [
        "RNCs abertas / vencidas",
        `${open.length} / ${open.filter((r) => r.deadline < isoDate()).length}`,
      ],
    ]
      .map(
        ([title, value]) =>
          `<div class="report-kpi"><small>${title}</small><strong>${value}</strong></div>`,
      )
      .join(
        "",
      )}</div><p><strong>Fornecedores críticos:</strong> ${esc(critical.map((f) => f.name).join(", ") || "Nenhum")}.</p><p class="spaced"><strong>Demanda reprimida prevista:</strong> ${m.repressedForecast === null ? "sem demanda" : pct(m.repressedForecast)} · ${num(m.uncovered / s.settings.hoursPerDay)} fiscal-dias sem alocação.</p><h3 class="spaced">Demandas que permanecem sem cobertura</h3>${demandTable(m.uncoveredDemands, s, ctx.week, true)}<h3 class="spaced">Ocorrências relevantes</h3><p class="muted spaced">${esc(
      open
        .filter((r) => r.severity === "Crítica" || r.deadline < isoDate())
        .map((r) => `${r.number}: ${r.description}`)
        .join(" · ") || "Nenhuma ocorrência crítica ou vencida.",
    )}</p><p class="muted spaced">Emitido em ${new Date().toLocaleString("pt-BR")} · ${esc(s.settings.userName)}. Cobertura corresponde ao esforço programado; execução confirmada: ${num(m.executed / s.settings.hoursPerDay)} fiscal-dias.</p><div class="modal-actions">${button("Fechar", "close-modal")}${button("Imprimir / salvar PDF", "print", "primary", "print")}</div>`,
    true,
  );
}
