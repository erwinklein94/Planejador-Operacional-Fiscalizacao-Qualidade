import test from "node:test";
import assert from "node:assert/strict";
import { StateService } from "../services/storageService.js";
import { createSeed } from "../data/seed.js";

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}
function adapter(role = "editor") {
  return {
    payload: createSeed(),
    revision: 1,
    async read() {
      return {
        payload: structuredClone(this.payload),
        revision: this.revision,
        profile: { role, active: true, full_name: "Teste" },
      };
    },
    async write(payload, revision) {
      assert.equal(revision, this.revision);
      this.payload = structuredClone(payload);
      return { payload: this.payload, revision: ++this.revision };
    },
  };
}
test("perfis de consulta não enviam nenhuma escrita ao servidor", async () => {
  for (const role of ["fiscalizacao", "coordenacao"]) {
    const remote = adapter(role);
    let writes = 0;
    remote.write = async () => writes++;
    const db = new StateService(remote);
    await db.init();
    await assert.rejects(db.saveSettings({ coverageTarget: 90 }), /editor/);
    await assert.rejects(db.importData(JSON.stringify(createSeed())), /editor/);
    await assert.rejects(db.reset(), /editor/);
    assert.equal(writes, 0);
  }
});
test("atualizar página aguarda confirmação de escrita remota", async () => {
  const remote = adapter();
  const barrier = deferred();
  const write = remote.write.bind(remote);
  remote.write = async (...args) => {
    await barrier.promise;
    return write(...args);
  };
  const db = new StateService(remote);
  await db.init();
  const value = await db.getState();
  value.settings.coverageTarget = 90;
  const saving = db.persist(value);
  const reading = db.refresh("demandas");
  assert.equal((await db.getState()).settings.coverageTarget, 80);
  barrier.resolve();
  await saving;
  assert.equal((await reading).settings.coverageTarget, 90);
});
test("logout impede resposta de gravação antiga de restaurar estado na memória", async () => {
  const remote = adapter();
  const barrier = deferred();
  const write = remote.write.bind(remote);
  remote.write = async (...args) => {
    await barrier.promise;
    return write(...args);
  };
  const db = new StateService(remote);
  await db.init();
  const saving = db.persist(await db.getState());
  db.clear();
  barrier.resolve();
  await assert.rejects(saving, /encerrada/);
  assert.equal(await db.getState(), null);
  assert.equal(db.profile, null);
});
