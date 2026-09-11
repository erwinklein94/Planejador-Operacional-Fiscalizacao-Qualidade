# Planejador Operacional — Fiscalização e Qualidade

Sistema estático de **Planejamento Operacional da Fiscalização de Materiais**, da Engenharia da Qualidade de Materiais. Ajuda a distribuir uma equipe limitada entre fornecedores, inspeções, ensaios e materiais ferroviários, considerando risco e capacidade.

**Aplicação:** [abrir o planejador](https://erwinklein94.github.io/Planejador-Operacional-Fiscalizacao-Qualidade/)

**Conceito:** demanda → risco → prioridade → capacidade → alocação → cobertura → resultado.

## Primeira versão

- Interface responsiva, sidebar recolhível, navegação por hash, modais, busca, filtros, ordenação e paginação.
- Dashboard executivo, planejamento semanal, escala, cadastro de fiscais, fornecedores, materiais e demandas.
- Capacidade em horas e fiscal-dias, cobertura parcial, déficit estrutural e demandas sem cobertura.
- Score explicável de prioridade, risco de fornecedores, hold points e regimes de fiscalização.
- Sugestões de alocação com justificativa, aprovação humana e revalidação de conflitos.
- Disponibilidade diária: férias, folga, afastamento, deslocamento, administrativo e outros impedimentos.
- Registro de resultados, cancelamento e reprogramação com histórico.
- Recursos básicos adicionais de RNC, alertas, histórico de alterações, fotografias de cobertura e resumo imprimível.
- Configuração de pesos, meta de cobertura, jornada e usuário local.
- Backup e restauração JSON com validação e proteção contra gravações de outra aba.

Não utiliza backend, bibliotecas externas no navegador, CDNs, imagens remotas, credenciais ou autenticação. Os dados ficam **somente no localStorage deste navegador/origem**. A URL pública não compartilha a base local entre usuários.

## Identidade visual

Referências: [paleta do Brandbook Rumo](https://brandbook.rumolog.com/paleta.html), [tipografia de sistema](https://brandbook.rumolog.com/tipografia.html) e [grafismos](https://brandbook.rumolog.com/grafismos.html).

- Azul institucional: `#003865`.
- Azul-claro: `#32A6E6`.
- Verde: `#1E9F7F`; verde-claro: `#7FE06C`.
- Fundo de interface: `#F2F5F6`; superfícies brancas.
- Verdana como fonte de sistema. Nenhum arquivo de fonte proprietária é redistribuído.

As cores e tokens estão em `css/styles.css`. O monograma **EQ** é uma área reservada ao logo oficial, sem simular um logo oficial da Rumo. Para substituí-lo, coloque o arquivo autorizado em `assets/` e ajuste a marca em `js/app.js`. As classificações de risco combinam cor e texto.

## Executar localmente

Requer Node.js 20 ou superior apenas para servir, verificar e preparar os arquivos. A aplicação publicada executa inteiramente no navegador, sem Node.js.

```sh
git clone https://github.com/erwinklein94/Planejador-Operacional-Fiscalizacao-Qualidade.git
cd Planejador-Operacional-Fiscalizacao-Qualidade
node scripts/serve.mjs
```

Abra `http://127.0.0.1:4173`. Não abra `index.html` via `file://`, pois os módulos JavaScript precisam ser servidos por HTTP. Não é necessário executar `npm install`.

```sh
node scripts/check.mjs
node --test tests/*.test.js
node scripts/build.mjs
```

O build copia apenas os arquivos públicos para `dist/`. O servidor local é exclusivamente uma ferramenta de desenvolvimento, não um backend da aplicação.

## Publicação no GitHub Pages

O workflow `.github/workflows/pages.yml` verifica os módulos, executa os testes, monta `dist/` e publica a cada push na `main`.

1. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
2. Faça commit e push na `main`.
3. Acompanhe o workflow **Validar e publicar GitHub Pages** na aba Actions.

As referências aos arquivos são relativas. Rotas como `#/planejamento` funcionam no subdiretório do repositório e continuam funcionando ao atualizar a página.

O repositório foi preparado como público para hospedar o protótipo no GitHub Pages. Não adicione dados operacionais confidenciais ou credenciais ao código ou aos dados de demonstração.

## Dados de demonstração

No primeiro acesso, o sistema cria uma semana relativa à data atual, com:

- 6 fiscais: Erwin, Leonardo, André, Eunice, Walter e Ivan.
- 8 fornecedores e 5 materiais.
- 20 demandas e 5 RNCs fictícias.
- 24 fiscal-dias de capacidade, 35 de demanda e 16 alocados.
- 11 fiscal-dias de déficit estrutural; 19 fiscal-dias sem alocação.
- 45,7% de cobertura programada e 11 demandas sem cobertura completa.

Todos os desempenhos, desvios, fornecedores e alocações são exemplos e não representam dados reais. Fernando, Robert e Ivan Souza não aparecem no quadro ativo.

O seed é aplicado uma única vez. Em semanas seguintes, selecione a semana original para consultar os exemplos ou use **Configurações → Carregar demonstração** para criar novos exemplos relativos à data atual.

## Como limpar e preservar dados

Use **Configurações → Exportar backup JSON** antes de mudar de navegador, dispositivo ou origem. A aplicação local e a publicada possuem armazenamentos diferentes.

- **Importar backup** valida o formato, os vínculos, os tipos e as alocações antes de substituir os dados. Um backup da base anterior é baixado.
- **Carregar demonstração** substitui a base pelos exemplos e oferece backup antes da confirmação.
- **Limpar dados locais** deixa uma base vazia após confirmação e backup. Cadastre materiais, fiscais e fornecedores antes de criar demandas.
- A chave utilizada é `fiscalizacao-qualidade:v1`. Excluí-la manualmente pelas ferramentas do navegador fará o seed ser recriado no próximo acesso.
- Dados corrompidos ou armazenamento bloqueado geram erro visível e não são apagados silenciosamente.

Backups locais não são criptografados. Nesta primeira versão, use apenas dados de teste sem informações confidenciais.

## Regras operacionais

### Capacidade e recorte semanal

A semana operacional considera **segunda a sexta**. A data necessária da demanda define sua semana; a alocação pode ocorrer em um dia útil dessa semana até o prazo final. Não há cálculo automático de feriados, turnos ou deslocamentos.

As horas disponíveis por dia partem da carga semanal do fiscal dividida por cinco, limitadas à jornada configurada. Uma disponibilidade diária pode substituí-las, respeitando o limite semanal. Ausências, deslocamento e administrativo retiram horas da capacidade de fiscalização. Uma inspeção programada consome capacidade, sem descontá-la duas vezes.

O esforço interno é armazenado em **horas**, permitindo frações. Um fiscal-dia equivale, inicialmente, a 8 horas. A jornada configurada altera a apresentação da unidade e os limites; não reescreve as horas das alocações existentes.

Demandas canceladas saem do cálculo operacional e permanecem nos registros. Demandas de outras semanas ficam disponíveis na consulta geral e geram alertas de pendência quando vencidas. Não são transportadas silenciosamente para a nova semana: reprogramar exige motivo e preserva as datas e alocações anteriores.

### Indicadores

```text
capacidade = soma da disponibilidade semanal dos fiscais ativos
demanda = soma do esforço necessário das demandas da semana
cobertura por demanda = mínimo(esforço necessário, horas aprovadas na semana)
demanda coberta = soma da cobertura por demanda
demanda não coberta = demanda − demanda coberta
cobertura % = demanda coberta / demanda × 100
déficit estrutural = máximo(0, demanda − capacidade)
demanda reprimida prevista % = demanda não coberta / demanda × 100
```

Sem demanda, os percentuais aparecem como “—” / “Sem demanda”, não como 100%. Uma demanda parcialmente alocada permanece descoberta. Aprovar uma alocação não significa executar uma fiscalização.

Uma demanda é concluída somente com cobertura integral e resultado registrado. Nesta versão, a conclusão é integral: para execução parcial com resultados separados, cadastre demandas menores. Os campos operacionais de uma fiscalização concluída ficam protegidos.

**Demanda reprimida efetiva:** após o término da semana, as fotografias somam o esforço das demandas não realizadas cujo motivo registrado é **Falta de capacidade**. Cancelamentos e outros motivos não entram nessa apuração. As fotografias são imutáveis; registros posteriores geram novas fotografias, preservando as anteriores.

### Score e regime

| Componente | Peso padrão |
|---|---:|
| Criticidade do material | 20 |
| Risco do fornecedor | 20 |
| RNC / reincidência | 15 |
| Obrigatoriedade / hold point | 20 |
| Tempo desde a última fiscalização | 10 |
| Urgência / prazo | 10 |
| Relevância da produção | 5 |

Faixas: 0–29 baixo; 30–49 moderado; 50–69 alto; 70–100 crítico. Presença obrigatória impõe piso 50; hold point, RNC crítica relacionada ou reincidência grave impõem piso 70. O detalhe mostra a soma original e qualquer piso aplicado. Os pesos são editáveis e devem somar 100.

O risco do fornecedor combina risco de base, RNCs abertas, gravidade, reincidências, ocorrências dos últimos 90 dias, auditoria, documentação, reprovações, divergências e problemas após liberação. O total é limitado a 100. Os contadores de desempenho são informados manualmente nesta versão. **Supplier Quality Score = 100 − score de risco**, para que maior qualidade signifique menor risco.

Regime 1 (intensivo) é recomendado para risco ≥70, novo fornecedor/processo ou RNC crítica/reincidente. Regime 2 (dirigido) para risco ≥30. Regime 3 (amostragem) para os demais. Ajustes manuais exigem justificativa e preservam a indicação calculada. Ainda não existem perfis autorizadores; as ações são atribuídas ao usuário local.

O score considera a data atual. Alterações de cadastro, RNC e parâmetros registram mudanças de risco e prioridade. A mera passagem dos dias não cria registros automáticos em segundo plano.

### Alocação

O motor sugere até três fiscais elegíveis para uma demanda, priorizando cobertura completa, proximidade da base e menor utilização. As sugestões não fazem nenhuma gravação até a aprovação. O botão geral começa pela demanda descoberta mais prioritária; também é possível solicitar uma sugestão em qualquer demanda.

São bloqueados: fiscal inativo, ausência de habilitação, dia indisponível, excesso diário/semanal, excesso do esforço necessário, prazo ultrapassado, semana incompatível e duas unidades diferentes no mesmo dia. A aprovação revalida o estado e é atômica.

Não há agendamento de horários de início/fim. Horas na mesma unidade podem ser compartilhadas até o limite diário; unidades diferentes no mesmo dia são conservadoramente bloqueadas. Distâncias reais e tempos de viagem não são calculados. Confirme deslocamentos e registre os dias necessários antes de aprovar.

## Estrutura

```text
index.html                  Entrada estática
css/                        Tema e componentes responsivos / impressão
js/app.js                   Inicialização, contexto e ações da interface
js/router.js                Rotas por hash
js/ui.js                    Modais, confirmações e mensagens
js/icons.js                 Ícones SVG locais
data/seed.js                Base fictícia e estado vazio
services/storageService.js  Persistência assíncrona, validação e transações
utils/dates.js              Datas locais, semanas e calendário
utils/risk.js               Scores e regimes calculados
utils/planning.js           Capacidade, cobertura e sugestões
modules/dashboard.js        Visão executiva
modules/planejamento.js     Grade semanal e escala
modules/cadastros.js        Fiscais, fornecedores, materiais, demandas e RNC
modules/analises.js         Cobertura, risco, histórico e configurações
modules/forms.js            Formulários de cadastro
modules/dialogs.js          Detalhes, sugestões e resumo semanal
scripts/                    Servidor de desenvolvimento, verificação e build
tests/                      Regras de domínio e persistência
docs/data-model.md          Contrato e evolução do modelo
config.example.js           Exemplo sem credenciais
.github/workflows/pages.yml Validação e publicação na main
```

## Arquitetura e futura migração

As telas consultam um estado obtido por métodos assíncronos; somente `LocalStorageService` lê ou grava o localStorage. As operações de aprovação, reprogramação, configuração e backup ficam nesse serviço. Risco e planejamento são funções puras, independentes da persistência e testadas separadamente.

Para uma futura integração com Supabase:

1. Criar um adaptador com o contrato assíncrono documentado em `docs/data-model.md` e selecioná-lo no ponto de composição de `js/app.js`.
2. Migrar as coleções para tabelas com IDs, chaves estrangeiras e timestamps; conservar horas como unidade interna.
3. Adicionar Auth, usuários, organização e os perfis ADMIN, COORDENAÇÃO, ANALISTA/PLANEJAMENTO, FISCAL e CONSULTA.
4. Implementar RLS por organização e perfil, validando alocações e auditoria também no servidor. As regras de concorrência e aprovação devem ser transacionais no banco.
5. Importar os backups com mapeamento dos IDs legíveis do seed para UUIDs, mantendo os vínculos.
6. Substituir a leitura integral por consultas paginadas quando o volume crescer e adicionar sincronização entre usuários.

**Supabase não está implementado nem conectado nesta entrega.** A migração terá trabalho próprio de autenticação, autorização, concorrência, esquema e validação no servidor. Não coloque chaves secretas em código estático.

## Limites conhecidos

- Uso local, sem sincronização, autenticação, aprovação por papéis ou auditoria inviolável.
- Sem drag-and-drop; a escala pode ser alterada por formulários com validação.
- Sem roteirização, feriados, turnos, notificações externas, anexos de evidência ou execução parcial de uma mesma demanda.
- Escala e indicadores consultam os cadastros atuais; use fotografias para conservar indicadores históricos. Mudanças incompatíveis de disponibilidade/habilitação são bloqueadas enquanto houver alocações relacionadas.
- Gráficos de evolução usam apenas fotografias e alterações realmente registradas; não inventam séries históricas.
- Ocorrências são tratadas pelo módulo simples de RNC; contadores de desempenho do fornecedor são manuais.
- A decisão final e a avaliação de viagens permanecem com a pessoa responsável pelo planejamento.

## Fluxo de desenvolvimento

Conforme autorização do usuário neste projeto: validar, fazer commit e push diretamente na **main**, sem force push. Cada push aprovado pelo workflow atualiza o site.
