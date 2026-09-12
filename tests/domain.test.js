import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../data/seed.js";
import {
  metrics,
  coverage,
  allocationErrors,
  suggestAllocation,
  inspectorCapacity,
  dailyCapacity,
  isScheduledWorkday,
  alerts,
} from "../utils/planning.js";
import { riskLevel, demandRisk, supplierRisk } from "../utils/risk.js";
import { StateService, validateState } from "../services/storageService.js";
import { monday, addDays, weekNumber, validDate } from "../utils/dates.js";
const TODAY = "2026-09-11";
const seed = () => createSeed(TODAY);
function memory() {
  return {
    payload: createSeed(),
    revision: 0,
    async read() {
      return {
        payload: structuredClone(this.payload),
        revision: this.revision,
        profile: {
          id: "editor",
          role: "editor",
          active: true,
          full_name: "Editor teste",
        },
      };
    },
    async write(payload, revision) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (revision !== this.revision)
        throw new Error("Os dados mudaram em outra sessão.");
      this.payload = structuredClone(payload);
      this.revision++;
      return {
        payload: structuredClone(this.payload),
        revision: this.revision,
      };
    },
  };
}
async function service() {
  const store = memory();
  const s = new StateService(store);
  await s.init();
  await s.importData(JSON.stringify(seed()));
  return s;
}
test("seed íntegro: 6 fiscais, 8 fornecedores, 20 demandas, 5 RNCs; capacidade menor que demanda", () => {
  const s = seed();
  assert.equal(validateState(s), true);
  assert.deepEqual(
    [s.inspectors.length, s.suppliers.length, s.demands.length, s.rncs.length],
    [6, 8, 20, 5],
  );
  const m = metrics(s, s.seedWeek);
  assert.equal(m.capacity, 192);
  assert.equal(m.required, 280);
  assert.equal(m.covered, 128);
  assert.equal(m.deficit, 88);
  assert.equal(m.uncoveredDemands.length, 11);
  assert.ok(
    s.inspectors.every(
      (f) => !["Fernando", "Robert", "Ivan Souza"].includes(f.name),
    ),
  );
});
test("cobertura depende de alocações, não da capacidade", () => {
  const s = seed();
  s.allocations = [];
  const m = metrics(s, s.seedWeek);
  assert.equal(m.coverage, 0);
  assert.equal(m.uncovered, 280);
  assert.equal(m.capacity, 192);
  assert.equal(m.deficit, 88);
});
test("cobertura parcial mantém demanda descoberta; outra semana não cobre a atual", () => {
  const s = seed();
  s.allocations = s.allocations.filter((a) => a.id !== "alo-0-1");
  const d = s.demands[0];
  assert.equal(coverage(d, s).percent, 50);
  assert.ok(metrics(s, s.seedWeek).uncoveredDemands.some((x) => x.id === d.id));
  s.allocations[0].date = addDays(s.allocations[0].date, 7);
  assert.equal(coverage(d, s, s.seedWeek).covered, 0);
});
test("sem demanda evita divisão por zero; cancelada sai dos indicadores", () => {
  const s = seed();
  const m = metrics(s, addDays(s.seedWeek, 7));
  assert.equal(m.coverage, null);
  assert.equal(m.deficit, 0);
  s.demands.forEach((d) => (d.status = "Cancelada"));
  assert.equal(metrics(s, s.seedWeek).required, 0);
});

test("escala histórica permanece consultável sem gerar alerta vencido", () => {
  const s = createSeed(TODAY);
  const historical = s.demands[0];
  const allocation = s.allocations.find(
    (item) => item.demandId === historical.id,
  );
  s.demands
    .filter((demand) =>
      s.allocations.some(
        (item) =>
          item.demandId === demand.id &&
          item.inspectorId === allocation.inspectorId,
      ),
    )
    .forEach((demand) => (demand.status = "Escala histórica"));
  s.inspectors.find((item) => item.id === allocation.inspectorId).active = false;
  assert.equal(validateState(s), true);
  s.allocations = s.allocations.filter(
    (item) => item.demandId !== historical.id,
  );
  assert.equal(
    alerts(s, s.seedWeek).some((item) => item.demandId === historical.id),
    false,
  );
  s.demands.forEach((demand) => (demand.status = "Escala histórica"));
  s.inspectors.forEach((inspector) => (inspector.active = false));
  assert.equal(metrics(s, s.seedWeek).deficit, 0);
});
test("férias e administrativo descontam capacidade sem descontar inspeções duas vezes", () => {
  const s = seed();
  assert.equal(inspectorCapacity(s.inspectors[0], s.seedWeek, s), 40);
  assert.equal(inspectorCapacity(s.inspectors[4], s.seedWeek, s), 32);
  assert.equal(inspectorCapacity(s.inspectors[5], s.seedWeek, s), 0);
});
test("calendário semanal inclui sábado e respeita dias fixos de cada fiscal", () => {
  const s = seed();
  const fiscal = s.inspectors[0];
  fiscal.workWeekdays = ["1", "2", "3", "4", "5", "6"];
  fiscal.dailyHours = 8;
  fiscal.weeklyHours = 48;
  assert.equal(isScheduledWorkday(fiscal, addDays(s.seedWeek, 5)), true);
  assert.equal(dailyCapacity(fiscal, addDays(s.seedWeek, 5), s), 8);
  assert.equal(inspectorCapacity(fiscal, s.seedWeek, s), 48);
});
test("escala 10x4 calcula trabalho e folga pela data inicial do ciclo", () => {
  const s = seed();
  const fiscal = s.inspectors[0];
  Object.assign(fiscal, {
    scheduleType: "cycle",
    dailyHours: 8,
    cycleWorkDays: 10,
    cycleOffDays: 4,
    cycleStartDate: s.seedWeek,
    weeklyHours: 48,
  });
  assert.equal(isScheduledWorkday(fiscal, addDays(s.seedWeek, 9)), true);
  assert.equal(isScheduledWorkday(fiscal, addDays(s.seedWeek, 10)), false);
  assert.equal(isScheduledWorkday(fiscal, addDays(s.seedWeek, 14)), true);
  assert.equal(inspectorCapacity(fiscal, addDays(s.seedWeek, 7), s), 24);
  s.availability.push({
    id: "extra-sabado",
    inspectorId: fiscal.id,
    date: addDays(s.seedWeek, 12),
    status: "Disponível",
    hours: 6,
  });
  assert.equal(dailyCapacity(fiscal, addDays(s.seedWeek, 12), s), 6);
});
test("fronteiras de score e pisos transparentes", () => {
  assert.deepEqual(
    [29, 30, 49, 50, 69, 70].map((x) => riskLevel(x).label),
    ["Baixo", "Moderado", "Moderado", "Alto", "Alto", "Crítico"],
  );
  const s = seed();
  const d = { ...s.demands[19], mandatory: true, holdPoint: false };
  assert.ok(demandRisk(d, s).score >= 50);
  d.holdPoint = true;
  assert.ok(demandRisk(d, s).score >= 70);
  assert.throws(() => riskLevel(NaN));
});
test("RNC crítica e reincidência elevam automaticamente o risco", () => {
  const s = seed();
  const supplier = s.suppliers[1];
  const before = supplierRisk(supplier, s).score;
  s.rncs[0].status = "Encerrada";
  assert.ok(supplierRisk(supplier, s).score < before);
});
test("alocação bloqueia inativo, material não habilitado, indisponibilidade e conflito diário", () => {
  const s = seed();
  const base = {
    demandId: "dem-11",
    inspectorId: "fis-2",
    date: s.seedWeek,
    hours: 8,
  };
  assert.ok(allocationErrors(base, s).some((e) => e.includes("diária")));
  assert.ok(
    allocationErrors({ ...base, inspectorId: "fis-3" }, s).some((e) =>
      e.includes("habilitação"),
    ),
  );
  s.inspectors[1].active = false;
  assert.ok(allocationErrors(base, s).some((e) => e.includes("inativo")));
});
test("duas localidades no mesmo dia e excesso de horas da demanda são bloqueados", () => {
  const s = seed();
  s.allocations = [];
  s.demands[0].requiredHours = 4;
  const slot = {
    id: "a",
    demandId: "dem-1",
    inspectorId: "fis-2",
    date: s.seedWeek,
    hours: 4,
    status: "Aprovada",
  };
  s.allocations.push(slot);
  assert.ok(
    allocationErrors({ ...slot, hours: 1 }, s).some((e) =>
      e.includes("esforço"),
    ),
  );
  assert.ok(
    allocationErrors({ ...slot, demandId: "dem-7", hours: 4 }, s).some((e) =>
      e.includes("Conflito de local"),
    ),
  );
});
test("gerar sugestão não altera os dados; aprovação é atômica e revalida conflitos", async () => {
  const db = await service();
  const s = await db.getState();
  const original = JSON.stringify(s);
  const choices = suggestAllocation(s.demands[18], s, s.seedWeek);
  assert.ok(choices.length);
  assert.equal(JSON.stringify(s), original);
  await db.approveAllocations(choices[0].slots);
  const saved = await db.getState();
  assert.ok(coverage(saved.demands[18], saved).covered > 0);
  const prior = JSON.stringify(saved);
  await assert.rejects(db.approveAllocations(choices[0].slots));
  assert.equal(JSON.stringify(await db.getState()), prior);
});
test("conclusão exige cobertura e resultado; não pode mudar a semana depois", async () => {
  const db = await service();
  let s = await db.getState();
  await assert.rejects(
    db.save("demands", {
      ...s.demands[19],
      status: "Realizada",
      outcome: "Teste",
    }),
  );
  await db.save("demands", {
    ...s.demands[0],
    status: "Realizada",
    outcome: "Ensaio realizado, lote aprovado.",
  });
  s = await db.getState();
  assert.equal(s.demands[0].status, "Realizada");
  await assert.rejects(
    db.save("demands", {
      ...s.demands[0],
      requiredDate: addDays(s.seedWeek, 7),
      deadline: addDays(s.seedWeek, 11),
      changeReason: "Teste",
    }),
    /concluída/,
  );
});
test("importação rejeita fraude de conclusão, risco NaN, flags string e IDs inseguros", () => {
  const a = seed();
  a.demands[19].status = "Realizada";
  assert.throws(() => validateState(a), /realizada/);
  const b = seed();
  b.suppliers[0].documentationRisk = "abc";
  assert.throws(() => validateState(b), /risco/);
  const c = seed();
  c.inspectors[0].active = "false";
  assert.throws(() => validateState(c), /ativo/);
  const d = seed();
  d.suppliers[0].id = 'bad" onclick="alert(1)';
  assert.throws(() => validateState(d), /ID/);
});
test("reprogramação mantém alocações canceladas e registra motivo", async () => {
  const db = await service();
  const s = await db.getState();
  await db.reprogramDemand(
    "dem-1",
    addDays(s.seedWeek, 7),
    addDays(s.seedWeek, 11),
    "Alteração de produção",
  );
  const next = await db.getState();
  assert.equal(
    next.demands[0].previousDates[0].reason,
    "Alteração de produção",
  );
  assert.equal(
    next.allocations.filter(
      (a) => a.demandId === "dem-1" && a.status === "Cancelada",
    ).length,
    2,
  );
});
test("persistência sobrevive a nova instância e detecta gravação por outra sessão", async () => {
  const store = memory();
  const db = new StateService(store);
  await db.init();
  const s = await db.getState();
  await db.save("materials", { ...s.materials[0], name: "AMV atualizado" });
  const reopened = new StateService(store);
  assert.equal((await reopened.init()).materials[0].name, "AMV atualizado");
  store.revision++;
  await assert.rejects(
    db.saveSettings({ userName: "Outra aba" }),
    /outra sessão/,
  );
});
test("falha de escrita não altera o estado em memória", async () => {
  const store = memory();
  const db = new StateService(store);
  await db.init();
  const previous = JSON.stringify(await db.getState());
  store.write = async () => {
    throw new Error("Não foi possível salvar");
  };
  await assert.rejects(db.saveSettings({ userName: "Teste" }), /salvar/);
  assert.equal(JSON.stringify(await db.getState()), previous);
});
test("backup inválido preserva estado; pesos devem somar 100", async () => {
  const db = await service();
  const previous = JSON.stringify(await db.getState());
  await assert.rejects(db.importData("{bad"));
  assert.equal(JSON.stringify(await db.getState()), previous);
  await assert.rejects(db.saveSettings({ weights: { material: 10 } }), /100/);
});
test("datas tratam virada de ano ISO, domingo e datas impossíveis", () => {
  assert.equal(monday("2026-09-13"), "2026-09-07");
  assert.equal(weekNumber("2021-01-01"), 53);
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-02-28"), true);
});
test("sugestões não oferecem datas passadas e respeitam prazo", () => {
  const s = seed();
  const choices = suggestAllocation(s.demands[18], s, TODAY);
  assert.ok(
    choices.every((c) =>
      c.slots.every((a) => a.date >= TODAY && a.date <= s.demands[18].deadline),
    ),
  );
  assert.equal(suggestAllocation(s.demands[18], s, "2026-09-12").length, 0);
});
test("jornada diária individual gera sugestões aprováveis em parcelas de 15 minutos", async () => {
  const db = await service();
  const s = seed();
  s.allocations = [];
  s.inspectors[1].dailyHours = 7.25;
  s.inspectors[1].weeklyHours = 36.25;
  s.demands[18].requiredHours = 14.5;
  await db.importData(JSON.stringify(s));
  const choice = suggestAllocation(s.demands[18], s, s.seedWeek).find(
    (c) => c.inspector.id === "fis-2",
  );
  assert.deepEqual(
    choice.slots.map((a) => a.hours),
    [7.25, 7.25],
  );
  await db.approveAllocations(choice.slots);
  assert.equal(
    coverage((await db.getState()).demands[18], await db.getState()).remaining,
    0,
  );
});
