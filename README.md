# Planejador Operacional — Fiscalização e Qualidade

Sistema estático de **Planejamento Operacional da Fiscalização de Materiais**, da Engenharia da Qualidade de Materiais. Ajuda a distribuir uma equipe limitada entre fornecedores, inspeções, ensaios e materiais ferroviários, considerando risco e capacidade.

**Aplicação:** [abrir o planejador](https://erwinklein94.github.io/Planejador-Operacional-Fiscalizacao-Qualidade/)

**Aprenda a usar:** [guia prático em PDF](output/pdf/Guia-de-Uso-Planejador-Operacional.pdf), com nove páginas de instruções, exemplo de planejamento e dúvidas frequentes. O arquivo pode ser recriado com `python scripts/create_user_guide.py` (ReportLab).

**Conceito:** demanda → risco → prioridade → capacidade → alocação → cobertura → resultado.

## Recursos

- Interface responsiva, sidebar recolhível, navegação por hash, modais, busca, filtros, ordenação e paginação.
- Dashboard executivo, planejamento semanal, escala, cadastro de fiscais, fornecedores, materiais e demandas.
- Capacidade em horas e fiscal-dias, cobertura parcial, déficit estrutural e demandas sem cobertura.
- Score explicável de prioridade, risco de fornecedores, hold points e regimes de fiscalização.
- Sugestões de alocação com justificativa, aprovação humana e revalidação de conflitos.
- Disponibilidade diária: férias, folga, afastamento, deslocamento, administrativo e outros impedimentos.
- Registro de resultados, cancelamento e reprogramação com histórico.
- Recursos básicos adicionais de RNC, alertas, histórico de alterações, fotografias de cobertura e resumo imprimível.
- Configuração de pesos, meta de cobertura e jornada pelo editor.
- Base compartilhada no Supabase, backup e restauração JSON com validação e controle de revisões.
- Login obrigatório, contas cadastradas pelo editor e permissões de edição ou consulta.
- Auditoria dos 100 acessos mais recentes de Fiscalização e Coordenação, exclusiva do editor.

O frontend continua estático e é publicado no GitHub Pages. **Os dados operacionais ficam no Supabase e são compartilhados entre as contas autorizadas.** Supabase Auth, funções do banco, RLS e a Edge Function `planner-api` controlam acesso e gravações; não há servidor próprio para manter.

O HTML, os scripts e a chave publicável podem ser públicos. A leitura da base exige uma sessão válida e um perfil ativo. Não há cadastro público. O SDK do Supabase é distribuído localmente em `vendor/`, sem depender de um CDN em tempo de execução.

## Contas e permissões

| Perfil       | Acesso                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Editor       | Edita dados e parâmetros, aprova alocações, gerencia a base, cria contas e consulta a auditoria de acessos. |
| Fiscalização | Consulta a operação, o planejamento, os cadastros e os relatórios.                                          |
| Coordenação  | Consulta a operação, o planejamento, os cadastros e os relatórios.                                          |

Entre com uma conta previamente cadastrada. O editor cria novas contas em **Meu perfil → Nova conta**, informando nome, e-mail, perfil e senha inicial. Cada pessoa pode alterar a própria senha em **Meu perfil → Alterar minha senha**. A criação utiliza o serviço administrativo do Supabase somente na Edge Function; nenhuma chave secreta é enviada ao navegador.

A página **Auditoria de acessos** mostra pessoa, perfil, página, data e hora dos últimos 100 acessos de usuários não editores, em horário de Brasília. O servidor registra o acesso junto com a leitura da página e determina a identidade pela sessão autenticada. Contas de consulta não podem ler essa auditoria. O histórico operacional de alterações é uma consulta separada.

Somente a sessão de autenticação é persistida em `sessionStorage`, sob a chave `planner-auth-session`. Dados operacionais são mantidos em memória durante o uso e recarregados do Supabase; não são salvos no navegador. `localStorage` é lido apenas para migração da versão antiga. Sair da conta limpa a sessão e os dados apresentados pela aplicação.

## Identidade visual

Referências: [paleta do Brandbook Rumo](https://brandbook.rumolog.com/paleta.html), [tipografia de sistema](https://brandbook.rumolog.com/tipografia.html) e [grafismos](https://brandbook.rumolog.com/grafismos.html).

- Azul institucional: `#003865`.
- Azul-claro: `#32A6E6`.
- Verde: `#1E9F7F`; verde-claro: `#7FE06C`.
- Fundo de interface: `#F2F5F6`; superfícies brancas.
- Verdana como fonte de sistema. Nenhum arquivo de fonte proprietária é redistribuído.

As cores e tokens estão em `css/styles.css`. O monograma **EQ** é uma área reservada ao logo oficial, sem simular um logo oficial da Rumo. Para substituí-lo, coloque o arquivo autorizado em `assets/` e ajuste a marca em `js/app.js`. As classificações de risco combinam cor e texto.

## Executar localmente

Requer Node.js 22 ou superior apenas para servir, verificar e preparar os arquivos. A interface publicada executa no navegador; os serviços remotos executam no Supabase.

```sh
git clone https://github.com/erwinklein94/Planejador-Operacional-Fiscalizacao-Qualidade.git
cd Planejador-Operacional-Fiscalizacao-Qualidade
node scripts/serve.mjs
```

Abra `http://127.0.0.1:4173`. Não abra `index.html` via `file://`, pois os módulos JavaScript precisam ser servidos por HTTP. Não é necessário executar `npm install` para o frontend. O uso local também exige conexão com o Supabase e uma conta cadastrada; com a configuração atual, acessa a mesma base da aplicação publicada.

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

O repositório hospeda apenas o código público e exemplos. Não adicione dados operacionais, contas reais, senhas, tokens de sessão ou chaves secretas ao código, às migrações ou aos dados de demonstração. As regras de acesso do banco são obrigatórias mesmo com a URL e a chave publicável conhecidas.

## Dados de demonstração

Se a base remota ainda não foi inicializada, o primeiro editor importa automaticamente os dados válidos da versão antiga encontrados no mesmo navegador e origem. Se não houver dados antigos, apresenta uma base vazia. O editor pode carregar, explicitamente em Configurações, a demonstração com semana relativa à data atual:

- 6 fiscais fictícios.
- 8 fornecedores e 5 materiais.
- 20 demandas e 5 RNCs fictícias.
- 24 fiscal-dias de capacidade, 35 de demanda e 16 alocados.
- 11 fiscal-dias de déficit estrutural; 19 fiscal-dias sem alocação.
- 45,7% de cobertura programada e 11 demandas sem cobertura completa.

Todos os nomes, desempenhos, desvios, fornecedores e alocações da demonstração são exemplos e não representam dados reais. Eles não são contas de acesso ao sistema.

Essa inicialização ocorre somente enquanto o registro remoto não possui uma base. Abrir outro navegador não cria dados fictícios. Em semanas seguintes, selecione a semana original para consultar os exemplos ou use **Configurações → Carregar demonstração** para substituir a base por novos exemplos relativos à data atual.

## Como limpar e preservar dados

Use **Configurações → Exportar backup JSON** para guardar uma cópia da base operacional. Trocar de navegador ou dispositivo não exige exportação: a conta acessa os mesmos dados remotos. As ações de substituição são exclusivas do editor e afetam toda a equipe.

- **Importar backup** valida formato, vínculos, tipos e alocações antes de substituir os dados compartilhados. Após a confirmação, um backup da base anterior é baixado antes da gravação.
- **Importar dados do navegador antigo** lê a chave legada `fiscalizacao-qualidade:v1`. Quando a base remota já existe, a substituição exige confirmação e baixa um backup remoto antes de importar. Use o mesmo navegador e origem em que a versão antiga era utilizada, ou importe um backup JSON exportado dela.
- **Carregar demonstração** substitui a base compartilhada pelos exemplos, mediante confirmação e backup da versão anterior.
- **Limpar base compartilhada** grava uma base vazia após confirmação e backup. Cadastre materiais, fiscais e fornecedores antes de criar demandas. Uma base vazia já inicializada não recria o seed automaticamente.
- O conteúdo legado do navegador não é atualizado nem removido pelo sistema. Apagar essa chave não exclui dados do Supabase.
- Backups inválidos e falhas de conexão geram erro visível; não há gravação offline nem substituição silenciosa por uma base local.

Cada gravação remota preserva a revisão anterior no servidor. Os backups JSON exportados contêm apenas o estado operacional: não incluem contas do Auth, senhas, sessões nem a auditoria de acessos. São arquivos sem criptografia; guarde-os em um local apropriado aos dados da operação.

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

| Componente                        | Peso padrão |
| --------------------------------- | ----------: |
| Criticidade do material           |          20 |
| Risco do fornecedor               |          20 |
| RNC / reincidência                |          15 |
| Obrigatoriedade / hold point      |          20 |
| Tempo desde a última fiscalização |          10 |
| Urgência / prazo                  |          10 |
| Relevância da produção            |           5 |

Faixas: 0–29 baixo; 30–49 moderado; 50–69 alto; 70–100 crítico. Presença obrigatória impõe piso 50; hold point, RNC crítica relacionada ou reincidência grave impõem piso 70. O detalhe mostra a soma original e qualquer piso aplicado. Os pesos são editáveis e devem somar 100.

O risco do fornecedor combina risco de base, RNCs abertas, gravidade, reincidências, ocorrências dos últimos 90 dias, auditoria, documentação, reprovações, divergências e problemas após liberação. O total é limitado a 100. Os contadores de desempenho são informados manualmente nesta versão. **Supplier Quality Score = 100 − score de risco**, para que maior qualidade signifique menor risco.

Regime 1 (intensivo) é recomendado para risco ≥70, novo fornecedor/processo ou RNC crítica/reincidente. Regime 2 (dirigido) para risco ≥30. Regime 3 (amostragem) para os demais. Ajustes manuais exigem justificativa e preservam a indicação calculada. Somente o editor pode alterar esses parâmetros; a gravação é atribuída à identidade autenticada.

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
services/storageService.js  Estado em memória, operações e migração do legado
services/supabaseClient.js  URL, chave publicável e configuração de sessão
services/supabaseService.js Adaptador de leitura e gravação remotas
services/authService.js     Login, perfil, contas, senha e auditoria de acessos
utils/validation.js         Validação compartilhada entre frontend e Edge Function
utils/dates.js              Datas locais, semanas e calendário
utils/risk.js               Scores e regimes calculados
utils/planning.js           Capacidade, cobertura e sugestões
modules/dashboard.js        Visão executiva
modules/planejamento.js     Grade semanal e escala
modules/cadastros.js        Fiscais, fornecedores, materiais, demandas e RNC
modules/analises.js         Cobertura, risco, histórico e configurações
modules/forms.js            Formulários de cadastro
modules/dialogs.js          Detalhes, sugestões e resumo semanal
modules/auth.js             Login, perfil, contas e auditoria de acessos
supabase/migrations/        Perfis, RLS, estado, revisões, acessos e cadastro restrito
supabase/functions/         Edge Function planner-api
supabase/config.toml        Projeto e configuração da função
vendor/                    SDK Supabase fixado, manifesto e licença
scripts/                    Servidor de desenvolvimento, verificação e build
tests/                      Regras de domínio e persistência
docs/data-model.md          Contrato e evolução do modelo
.github/workflows/pages.yml Validação e publicação na main
```

## Arquitetura Supabase

O projeto configurado é `sesgiivthqftoevdenhn`. A URL `https://sesgiivthqftoevdenhn.supabase.co` e a chave **publicável** ficam em `services/supabaseClient.js`; são configuração do cliente, não credenciais administrativas. Segredos administrativos ficam exclusivamente no ambiente da Edge Function.

O banco mantém o estado operacional como um documento JSON versionado em `private.planner_state`. As coleções e os IDs existentes são preservados. `private.planner_revisions` arquiva as versões anteriores, e `private.access_events` armazena os acessos de consulta separadamente dos dados editáveis. O schema `private` deve permanecer fora dos schemas expostos pela Data API.

A RPC `read_planner` valida a conta ativa, aplica as permissões da página e registra o acesso dos perfis de consulta no servidor. A RPC `recent_accesses` devolve no máximo 100 registros e exige um editor ativo. Perfis de acesso ficam em `public.user_profiles`, com RLS: leitores consultam apenas o próprio perfil; o editor consulta as contas da equipe.

As gravações passam pela Edge Function `planner-api`, que valida o token com `auth.getUser`, verifica o perfil ativo e reaplica a validação de domínio compartilhada. O banco compara a revisão esperada dentro de uma transação com bloqueio do registro. Se outra sessão já salvou, a alteração é rejeitada e o editor precisa atualizar os dados; não há sobrescrita silenciosa. Uma leitura aguarda o salvamento pendente da mesma sessão.

Ao navegar ou acionar **Atualizar dados**, a interface recarrega a base remota. Não há assinatura Realtime ou edição offline. As regras puras de risco, capacidade e alocação continuam independentes da persistência. O contrato está em [docs/data-model.md](docs/data-model.md).

### Infraestrutura e dependência

- As migrações em `supabase/migrations/` definem schema, grants, RLS, RPCs, provisionamento de perfis e bloqueio de cadastro sem autorização administrativa. O perfil é provisionado por `app_metadata` controlado no servidor; `user_metadata` não autoriza acesso. Uma conta Auth sem perfil ativo não pode acessar a base.
- Ao configurar outro projeto, aplique as migrações e publique a função de `supabase/functions/planner-api/` antes de apontar o frontend para ele. O deploy do GitHub Pages publica somente o frontend; não aplica migrações nem publica a Edge Function.
- Cadastros públicos e anônimos estão desabilitados na configuração Auth deste projeto e devem permanecer assim. O trigger de cadastro também rejeita, no banco, novas contas sem os metadados administrativos e o perfil provisionado. A primeira conta de editor precisa ser criada por um administrador autorizado; as demais podem ser criadas em **Meu perfil**. Não coloque dados de contas em migrações.
- `supabase/config.toml` usa `verify_jwt = false` no gateway da Edge Function; a própria função valida obrigatoriamente o token e o perfil em cada solicitação. Isso não concede acesso anônimo às operações. A função permite a origem do site publicado e as origens locais da porta 4173.
- O SDK `@supabase/supabase-js` está fixado em **2.116.0** no frontend e na Edge Function. `vendor/manifest.json` registra origem, versão e SHA-256 do arquivo distribuído; `vendor/supabase-LICENSE` contém a licença MIT. Atualizações devem manter arquivo, manifesto, licença e imports consistentes.

## Limites conhecidos

- Uma base compartilhada por projeto Supabase, sem separação por organizações. A leitura transfere o estado operacional completo; não há paginação remota das coleções.
- Atualização por navegação ou ação manual, sem Realtime. Gravações concorrentes exigem atualização antes de reaplicar a alteração.
- O editor cria contas pela interface; desativação, alteração de perfil e recuperação administrativa de contas ainda não têm tela própria.
- Sem drag-and-drop; a escala pode ser alterada por formulários com validação.
- Sem roteirização, feriados, turnos, notificações externas, anexos de evidência ou execução parcial de uma mesma demanda.
- Escala e indicadores consultam os cadastros atuais; use fotografias para conservar indicadores históricos. Mudanças incompatíveis de disponibilidade/habilitação são bloqueadas enquanto houver alocações relacionadas.
- Gráficos de evolução usam apenas fotografias e alterações realmente registradas; não inventam séries históricas.
- Ocorrências são tratadas pelo módulo simples de RNC; contadores de desempenho do fornecedor são manuais.
- A decisão final e a avaliação de viagens permanecem com a pessoa responsável pelo planejamento.

## Fluxo de desenvolvimento

Conforme autorização do usuário neste projeto: validar, fazer commit e push diretamente na **main**, sem force push. Cada push aprovado pelo workflow atualiza o site.
