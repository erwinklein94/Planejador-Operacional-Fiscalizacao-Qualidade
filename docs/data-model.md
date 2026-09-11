# Contrato de dados e persistência — v1

## Estado

Envelope JSON com `schemaVersion: 1`, `demo`, `settings` e coleções. Novos registros usam `crypto.randomUUID()`; IDs legíveis existem somente no seed. Datas civis usam `YYYY-MM-DD`, interpretadas no calendário local; timestamps usam ISO 8601.

| Coleção atual | Futura tabela | Campos principais |
|---|---|---|
| usuário local em settings | users | id, organização, nome, perfil; Auth futuramente |
| inspectors | fiscais | id, nome, matrícula, empresa, vínculo, base, cidade, UF, ativo, carga semanal em horas, habilitações, competências |
| suppliers | fornecedores | id, nome, CNPJ, unidade, cidade, UF, materiais, risco de base, documentação, inspeção/auditoria, contadores, regime manual e justificativa |
| materials | materiais | id, nome, descrição, criticidade 0–20, ativo |
| demands | demandas | id, código, criação, data necessária, prazo, fornecedor, unidade, material, atividade, descrição, lote, horas, flags, RNC, status, resultado, motivo da não execução |
| allocations | alocacoes | id, demanda, fiscal, data, horas, status Aprovada/Cancelada, criação |
| availability | disponibilidade_fiscais | id, fiscal, data, status, horas, observações; único por fiscal/data |
| rncs | rnc | id, número, fornecedor, material, abertura, prazo, gravidade, descrição, responsável, status, causa, ação, evidência, encerramento, eficácia, reincidência |
| occurrences | ocorrencias | id, fornecedor, data, descrição; reservado para evolução separada de RNC |
| riskHistory | historico_risco | id, fornecedor, data, semana, score, origem |
| coverageHistory | historico_cobertura | id, semana, timestamp, capacidade, demanda, cobertura, execução, déficit, IDs descobertos, reprimida efetiva |
| auditLog | audit_log | id, timestamp, tipo, registro, alteração, usuário local |

Relacionamentos de materiais de fiscais e fornecedores podem migrar para tabelas associativas. Fiscais responsáveis exibidos são derivados das alocações aprovadas; `inspectorId` da demanda é apenas referência auxiliar, nunca prova de cobertura.

## Interface assíncrona

```js
await service.init();
await service.getState();
await service.list(collection);
await service.save(collection, record);
await service.approveAllocations(slots);
await service.cancelAllocation(id, reason);
await service.reprogramDemand(id, date, deadline, reason);
await service.rejectSuggestion(demandId);
await service.saveSettings(settings);
await service.snapshot(week);
await service.exportData();
await service.importData(json);
await service.reset(loadDemo);
```

As mutações retornam um novo estado e só atualizam a memória após gravação bem-sucedida. As propostas de alocação são validadas como lote: qualquer conflito rejeita tudo. O estado é clonado antes de mutações e a revisão salva é comparada para detectar alterações entre abas.

No localStorage, esta revisão detecta conflitos sequenciais, mas não oferece bloqueio distribuído ou transação entre múltiplos navegadores. Um adaptador remoto deverá usar concorrência otimista, autorização e transações reais.

## Invariantes

- Apenas alocações aprovadas de demandas não canceladas contam como cobertura.
- O esforço coberto de cada demanda é limitado ao necessário e ao recorte semanal.
- Demandas realizadas exigem resultado, data e cobertura integral na semana; seus campos operacionais não podem ser movidos silenciosamente.
- Alocações canceladas, motivos e datas anteriores permanecem no histórico.
- Campos numéricos, booleanos, enums, IDs e referências relevantes são validados antes de salvar/importar.
- Texto é escapado ao renderizar HTML; IDs aceitam somente letras, números, hífen e underscore.
- Dados inválidos não são tratados como “risco baixo” e backups inválidos não substituem a base existente.
- Pesos de prioridade devem somar 100; pisos obrigatórios são explicados separadamente.
- Fotografias são registros novos; alterações posteriores não sobrescrevem fotografias anteriores.

## Perfis futuros

O usuário local não é uma identidade autenticada. Não usar `settings.userName` para autorizar acesso em uma versão compartilhada. A integração futura deverá definir os escopos ADMIN, COORDENAÇÃO, ANALISTA/PLANEJAMENTO, FISCAL e CONSULTA no servidor, com RLS por organização/perfil e autoria verificada no log.
