import { esc } from "../utils/formatters.js";
import { isoDate, addDays, monday } from "../utils/dates.js";
import { DEMAND_STATUSES, RNC_STATUSES } from "./cadastros.js";
import { showModal, closeModal, formError } from "../js/ui.js";
import { helpFor } from "../js/help.js";
export const ACTIVITY_TYPES = [
  "Inspeção",
  "Ensaio",
  "Acompanhamento de produção",
  "Auditoria",
  "Liberação",
  "Contraprova",
  "Investigação",
  "Retorno de RNC",
  "Inspeção dimensional",
  "Inspeção visual",
  "Coleta",
  "Visita técnica",
  "Outros",
];
const STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
export function field(key, label, type = "text", options = {}) {
  return { key, label, type, ...options };
}
export function fieldHtml(f, value) {
  if (f.type === "section")
    return `<div class="form-section"><span>${esc(f.label)}</span>${helpFor(f.label, f.tooltip)}</div>`;
  if (f.type === "checkbox")
    return `<div class="checks ${f.full ? "field full" : ""}"><label><input type="checkbox" name="${f.key}" ${value ? "checked" : ""}>${esc(f.label)}</label>${helpFor(f.label, f.tooltip)}</div>`;
  const attrs = `name="${f.key}" id="field-${f.key}" ${f.required ? "required" : ""} ${f.min !== undefined ? `min="${f.min}"` : ""} ${f.max !== undefined ? `max="${f.max}"` : ""} ${f.step ? `step="${f.step}"` : ""} ${f.readonly ? "readonly" : ""}`;
  let control;
  if (f.type === "select" || f.type === "multiple")
    control = `<select ${attrs} ${f.type === "multiple" ? "multiple" : ""}>${f.type === "select" && !f.noEmpty ? '<option value="">Selecione…</option>' : ""}${f.options
      .map((o) => {
        const [id, name] = Array.isArray(o) ? o : [o, o];
        return `<option value="${esc(id)}" ${f.type === "multiple" ? ((value || []).includes(id) ? "selected" : "") : String(value) === String(id) ? "selected" : ""}>${esc(name)}</option>`;
      })
      .join("")}</select>`;
  else if (f.type === "textarea")
    control = `<textarea ${attrs} maxlength="4000">${esc(value || "")}</textarea>`;
  else
    control = `<input type="${f.type}" ${attrs} value="${esc(value ?? "")}" ${f.type === "text" ? 'maxlength="250"' : ""}>`;
  return `<div class="field ${f.full ? "full" : ""}"><div class="field-label-row"><label for="field-${f.key}">${esc(f.label)}${f.required ? " *" : ""}</label>${helpFor(f.label, f.tooltip)}</div>${control}${f.help ? `<small>${esc(f.help)}</small>` : ""}</div>`;
}
export function showForm(title, subtitle, fields, values, save, extra = "") {
  const dialog = showModal(
    title,
    subtitle,
    `<form id="record-form"><div class="form-grid">${fields.map((f) => fieldHtml(f, values[f.key])).join("")}</div>${extra}<div id="form-error" role="alert"></div><div class="modal-actions"><button class="btn" type="button" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`,
  );
  dialog.querySelector("#record-form").onsubmit = async (event) => {
    event.preventDefault();
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    const fd = new FormData(event.currentTarget);
    const record = { ...values };
    for (const f of fields) {
      if (f.type === "section") continue;
      record[f.key] =
        f.type === "checkbox"
          ? fd.has(f.key)
          : f.type === "multiple"
            ? fd.getAll(f.key)
            : f.type === "number"
              ? fd.get(f.key) === "" && !f.required
                ? undefined
                : Number(fd.get(f.key))
              : String(fd.get(f.key) || "").trim();
    }
    try {
      await save(record);
    } catch (error) {
      formError(error);
    } finally {
      if (submit?.isConnected) submit.disabled = false;
    }
  };
  return dialog;
}
export function openEdit(ctx, collection, id, save) {
  const s = ctx.state;
  const old = s[collection].find((r) => r.id === id);
  const materialOptions = s.materials.map((m) => [m.id, m.name]);
  const supplierOptions = s.suppliers.map((m) => [m.id, m.name]);
  let fields, values, title;
  if (collection === "inspectors") {
    title = "fiscal";
    values = {
      name: "",
      company: "",
      employment: "Próprio",
      base: "",
      city: "",
      uf: "SP",
      active: true,
      materialIds: [],
      weeklyHours: 40,
      scheduleType: "weekly",
      workWeekdays: ["1", "2", "3", "4", "5"],
      dailyHours: 8,
      cycleWorkDays: 10,
      cycleOffDays: 4,
      cycleStartDate: isoDate(),
      registration: "",
      skills: "",
      notes: "",
      ...old,
    };
    fields = [
      field("name", "Nome", "text", { required: true }),
      field("registration", "Matrícula"),
      field("company", "Empresa"),
      field("employment", "Vínculo", "select", {
        options: ["Próprio", "Terceiro", "Não informado no Excel"],
        required: true,
      }),
      field("base", "Base"),
      field("city", "Cidade"),
      field("uf", "UF", "select", { options: STATES }),
      field("", "Escala de trabalho", "section"),
      field("scheduleType", "Tipo de escala", "select", {
        options: [
          ["weekly", "Dias fixos da semana"],
          ["cycle", "Ciclo de trabalho e folga"],
        ],
        required: true,
      }),
      field("dailyHours", "Jornada diária (h)", "number", {
        min: 0.25,
        max: 12,
        step: ".25",
        required: true,
      }),
      field("workWeekdays", "Dias habituais de trabalho", "multiple", {
        options: [
          ["1", "Segunda-feira"],
          ["2", "Terça-feira"],
          ["3", "Quarta-feira"],
          ["4", "Quinta-feira"],
          ["5", "Sexta-feira"],
          ["6", "Sábado"],
        ],
        required: true,
        full: true,
        help: "Usado na escala de dias fixos. Use Ctrl/Cmd para selecionar vários dias.",
      }),
      field("cycleWorkDays", "Dias consecutivos de trabalho", "number", {
        min: 1,
        max: 30,
        required: true,
      }),
      field("cycleOffDays", "Dias consecutivos de folga", "number", {
        min: 1,
        max: 30,
        required: true,
      }),
      field("cycleStartDate", "Início do ciclo de trabalho", "date", {
        required: true,
        full: true,
        help: "Informe uma data conhecida como o primeiro dia de trabalho do ciclo.",
      }),
      field("materialIds", "Materiais habilitados", "multiple", {
        options: materialOptions,
        required: true,
        full: true,
        help: "Use Ctrl/Cmd para selecionar vários materiais no computador.",
      }),
      field("skills", "Competências", "textarea", { full: true }),
      field("active", "Fiscal ativo", "checkbox"),
      field("notes", "Observações", "textarea", { full: true }),
    ];
  } else if (collection === "suppliers") {
    title = "fornecedor";
    values = {
      name: "",
      unit: "",
      cnpj: "",
      city: "",
      uf: "SP",
      materialIds: [],
      baseRisk: 10,
      documentationRisk: 0,
      rejections: 0,
      divergences: 0,
      postReleaseIssues: 0,
      lastAudit: "",
      lastInspection: "",
      active: true,
      isNew: false,
      regimeOverride: "",
      regimeReason: "",
      referenceInspectorId: "",
      notes: "",
      ...old,
    };
    fields = [
      field("name", "Nome", "text", { required: true }),
      field("unit", "Unidade / fábrica", "text", { required: true }),
      field("cnpj", "CNPJ (opcional)"),
      field("city", "Cidade", "text", { required: true }),
      field("uf", "UF", "select", { options: STATES, required: true }),
      field("referenceInspectorId", "Fiscal de referência", "select", {
        options: s.inspectors.map((f) => [f.id, f.name]),
      }),
      field("materialIds", "Materiais fornecidos", "multiple", {
        options: materialOptions,
        required: true,
        full: true,
      }),
      field("", "Composição do risco do fornecedor", "section"),
      field("baseRisk", "Risco de base (0–100)", "number", {
        min: 0,
        max: 100,
        required: true,
      }),
      field("documentationRisk", "Risco da documentação (0–10)", "number", {
        min: 0,
        max: 10,
        required: true,
      }),
      field("rejections", "Reprovações recentes", "number", {
        min: 0,
        max: 1000,
        required: true,
      }),
      field("divergences", "Divergências de qualidade", "number", {
        min: 0,
        max: 1000,
        required: true,
      }),
      field("postReleaseIssues", "Problemas após liberação", "number", {
        min: 0,
        max: 1000,
        required: true,
      }),
      field("lastAudit", "Última auditoria", "date"),
      field("lastInspection", "Última fiscalização", "date"),
      field("regimeOverride", "Regime manual (opcional)", "select", {
        options: [
          ["1", "Nível 1 · Intensiva"],
          ["2", "Nível 2 · Dirigida"],
          ["3", "Nível 3 · Amostragem"],
        ],
        help: "Em branco: usar regime calculado.",
      }),
      field("regimeReason", "Justificativa de ajuste do regime", "textarea", {
        full: true,
      }),
      field("active", "Fornecedor ativo", "checkbox"),
      field("isNew", "Fornecedor novo / processo alterado", "checkbox"),
      field("notes", "Observações", "textarea", { full: true }),
    ];
  } else if (collection === "materials") {
    title = "material";
    values = {
      name: "",
      description: "",
      criticality: 10,
      active: true,
      ...old,
    };
    fields = [
      field("name", "Nome do material", "text", { required: true }),
      field("criticality", "Criticidade (0–20)", "number", {
        min: 0,
        max: 20,
        required: true,
      }),
      field("description", "Descrição", "textarea", { full: true }),
      field("active", "Material ativo", "checkbox"),
    ];
  } else if (collection === "demands") {
    title = "demanda";
    values = {
      supplierId: "",
      materialId: "",
      unit: "",
      city: "",
      uf: "SP",
      activity: "Inspeção",
      description: "",
      lot: "",
      requiredDate: ctx.week,
      deadline: addDays(ctx.week, 4),
      requiredHours: 8,
      materialCriticality: undefined,
      mandatory: false,
      holdPoint: false,
      surpriseAudit: false,
      rncId: "",
      recurrence: false,
      severeRecurrence: false,
      volume: 2,
      status: "Nova",
      notes: "",
      inspectorId: "",
      outcome: "",
      unfulfilledReason: "",
      completedAt: "",
      changeReason: "",
      ...old,
    };
    fields = [
      field("supplierId", "Fornecedor", "select", {
        options: supplierOptions,
        required: true,
      }),
      field("materialId", "Material", "select", {
        options: materialOptions,
        required: true,
      }),
      field("unit", "Unidade / fábrica", "text", { required: true }),
      field("city", "Cidade", "text", { required: true }),
      field("uf", "UF", "select", { options: STATES, required: true }),
      field("activity", "Tipo de atividade", "select", {
        options: ACTIVITY_TYPES,
        required: true,
      }),
      field("description", "Descrição da demanda", "textarea", {
        full: true,
        required: true,
      }),
      field("lot", "Produção / lote"),
      field("requiredHours", "Esforço necessário (horas)", "number", {
        min: 0.25,
        max: 10000,
        step: ".25",
        required: true,
        help: `${s.settings.hoursPerDay} h equivalem a 1 fiscal-dia.`,
      }),
      field("requiredDate", "Data necessária", "date", {
        required: true,
        help: "Define a semana do planejamento.",
      }),
      field("deadline", "Prazo final da fiscalização", "date", {
        required: true,
      }),
      field("materialCriticality", "Criticidade específica (0–20)", "number", {
        min: 0,
        max: 20,
        help: "Vazio: usar a criticidade cadastrada do material.",
      }),
      field("volume", "Relevância da produção (0–5)", "number", {
        min: 0,
        max: 5,
        required: true,
      }),
      field("rncId", "RNC relacionada", "select", {
        options: s.rncs.map((r) => [r.id, `${r.number} · ${r.description}`]),
        full: true,
      }),
      field("mandatory", "Presença obrigatória Rumo", "checkbox"),
      field("holdPoint", "Hold point", "checkbox"),
      field("surpriseAudit", "Auditoria surpresa", "checkbox"),
      field("recurrence", "Reincidência", "checkbox"),
      field("severeRecurrence", "Reincidência grave", "checkbox"),
      field("status", "Status operacional", "select", {
        options: DEMAND_STATUSES,
        required: true,
      }),
      field("unfulfilledReason", "Motivo da não execução", "select", {
        options: [
          "Falta de capacidade",
          "Fornecedor indisponível",
          "Alteração de produção",
          "Outro",
        ],
        full: true,
      }),
      field("outcome", "Resultado da fiscalização", "textarea", {
        full: true,
        help: "Obrigatório para concluir. A cobertura precisa estar completa.",
      }),
      field(
        "changeReason",
        "Motivo de reprogramação / cancelamento",
        "textarea",
        { full: true },
      ),
      field("notes", "Observações", "textarea", { full: true }),
    ];
  } else if (collection === "rncs") {
    title = "RNC";
    values = {
      number: "",
      supplierId: "",
      materialId: "",
      openedAt: isoDate(),
      description: "",
      severity: "Média",
      owner: "",
      deadline: addDays(isoDate(), 7),
      status: "Aberta",
      cause: "",
      action: "",
      evidence: "",
      closedAt: "",
      effectiveness: "",
      recurrence: false,
      ...old,
    };
    fields = [
      field("number", "Número", "text", { required: true }),
      field("supplierId", "Fornecedor", "select", {
        options: supplierOptions,
        required: true,
      }),
      field("materialId", "Material", "select", {
        options: materialOptions,
        required: true,
      }),
      field("severity", "Criticidade", "select", {
        options: ["Baixa", "Média", "Alta", "Crítica"],
        required: true,
      }),
      field("openedAt", "Data de abertura", "date", { required: true }),
      field("deadline", "Prazo", "date", { required: true }),
      field("description", "Descrição da ocorrência", "textarea", {
        required: true,
        full: true,
      }),
      field("owner", "Responsável"),
      field("status", "Status", "select", {
        options: RNC_STATUSES,
        required: true,
      }),
      field("cause", "Causa", "textarea", { full: true }),
      field("action", "Ação", "textarea", { full: true }),
      field("evidence", "Referência da evidência (texto / URL)", "textarea", {
        full: true,
        help: "Esta versão registra referências; não faz upload de arquivos.",
      }),
      field("closedAt", "Data de encerramento", "date"),
      field("recurrence", "Reincidência", "checkbox"),
      field("effectiveness", "Verificação de eficácia", "textarea", {
        full: true,
      }),
    ];
  } else throw new Error("Cadastro desconhecido.");
  const persist =
    collection === "inspectors"
      ? (record) => {
          record.weeklyHours =
            record.dailyHours *
            (record.scheduleType === "weekly"
              ? record.workWeekdays.length
              : Math.min(6, record.cycleWorkDays));
          return save(record);
        }
      : save;
  const dialog = showForm(
    `${old ? "Editar" : "Cadastrar"} ${title}`,
    old?.code ||
      "Os campos com * são obrigatórios. As alterações ficam registradas no histórico.",
    fields,
    values,
    persist,
  );
  if (collection === "inspectors") {
    const scheduleType = dialog.querySelector("[name=scheduleType]");
    const weeklyFields = ["workWeekdays"];
    const cycleFields = ["cycleWorkDays", "cycleOffDays", "cycleStartDate"];
    const toggleScheduleFields = () => {
      const cycle = scheduleType.value === "cycle";
      for (const key of weeklyFields)
        dialog.querySelector(`[name=${key}]`).closest(".field").hidden = cycle;
      for (const key of cycleFields)
        dialog.querySelector(`[name=${key}]`).closest(".field").hidden = !cycle;
    };
    scheduleType.addEventListener("change", toggleScheduleFields);
    toggleScheduleFields();
  }
  if (collection === "demands") {
    dialog
      .querySelector("[name=supplierId]")
      .addEventListener("change", (event) => {
        const supplier = s.suppliers.find((x) => x.id === event.target.value);
        if (!supplier) return;
        for (const key of ["unit", "city", "uf"])
          dialog.querySelector(`[name=${key}]`).value = supplier[key] || "";
        dialog.querySelector("[name=materialId]").innerHTML =
          '<option value="">Selecione…</option>' +
          s.materials
            .filter((m) => supplier.materialIds.includes(m.id))
            .map((m) => `<option value="${m.id}">${esc(m.name)}</option>`)
            .join("");
        if (supplier.materialIds.length === 1)
          dialog.querySelector("[name=materialId]").value =
            supplier.materialIds[0];
      });
  }
  return dialog;
}
