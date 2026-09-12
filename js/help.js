import { esc } from "../utils/formatters.js";

export const FIELD_HELP = Object.freeze({
  Nome: "Nome usado para identificar este cadastro nas telas, listas e relatórios.",
  Matrícula: "Identificador interno do fiscal. Serve para diferenciar pessoas e conferir registros da equipe.",
  Empresa: "Empresa à qual o fiscal está vinculado. Ajuda a identificar profissionais próprios e terceiros.",
  Vínculo: "Indica se o fiscal é próprio ou terceiro. Serve para contextualizar a composição da equipe.",
  Base: "Local de origem habitual do fiscal. O sistema usa cidade e estado para priorizar sugestões com menor necessidade de deslocamento.",
  Cidade: "Cidade da base, unidade ou atividade. Ela é usada para identificar conflitos de local e apoiar sugestões de alocação.",
  UF: "Estado da base, unidade ou atividade. Ajuda a organizar os registros por região e avaliar deslocamentos.",
  "Carga semanal contratada (h)": "Total máximo de horas do fiscal na semana. A capacidade diária também respeita a jornada de um fiscal-dia e os bloqueios da agenda.",
  "Materiais habilitados": "Materiais que este fiscal está autorizado a inspecionar. O sistema só sugere alocações compatíveis com esta seleção.",
  Competências: "Conhecimentos, certificações ou experiências relevantes do fiscal. É uma informação de consulta e não substitui os materiais habilitados.",
  "Fiscal ativo": "Quando desmarcado, o fiscal deixa de gerar capacidade e de aparecer nas sugestões de alocação.",
  Observações: "Espaço para informações complementares que ajudem outras pessoas a entender o cadastro.",
  "Unidade / fábrica": "Planta ou unidade física onde o fornecimento ou a fiscalização acontece. Ajuda a evitar alocações incompatíveis no mesmo dia.",
  "CNPJ (opcional)": "Documento da empresa ou unidade. Serve como referência cadastral; pode ficar vazio quando não estiver disponível.",
  "Fiscal de referência": "Fiscal normalmente associado ao fornecedor. É uma referência operacional e não cria uma alocação automática.",
  "Materiais fornecidos": "Materiais fornecidos por esta unidade. A lista limita as opções disponíveis ao cadastrar uma demanda desse fornecedor.",
  "Composição do risco do fornecedor": "Dados usados para calcular o risco atual do fornecedor e definir o regime sugerido de fiscalização.",
  "Risco de base (0–100)": "Avaliação inicial do risco inerente ao fornecedor. Ela entra diretamente no score, que é limitado a 100 pontos após somar os demais fatores.",
  "Risco da documentação (0–10)": "Parcela adicional de risco causada por documentação incompleta, vencida ou inconsistente. O valor é somado ao score do fornecedor.",
  "Reprovações recentes": "Quantidade de reprovações no período de acompanhamento adotado pela equipe. Cada registro acrescenta 3 pontos ao componente conjunto, limitado a 15.",
  "Divergências de qualidade": "Quantidade de divergências identificadas no período acompanhado. Cada registro acrescenta 3 pontos ao componente conjunto, limitado a 15.",
  "Problemas após liberação": "Quantidade de problemas encontrados depois que o material foi liberado. Cada registro acrescenta 5 pontos ao componente conjunto, limitado a 15.",
  "Última auditoria": "Data da auditoria mais recente. A cada 30 dias sem auditoria, o fornecedor recebe 1 ponto de risco, até o limite de 10.",
  "Última fiscalização": "Data da fiscalização mais recente. Quanto maior o intervalo, maior pode ser o componente de tempo sem fiscalização na prioridade das demandas.",
  "Regime manual (opcional)": "Substitui o regime calculado: nível 1 é intensivo, nível 2 é dirigido e nível 3 é por amostragem. Deixe vazio para usar o cálculo automático.",
  "Justificativa de ajuste do regime": "Registra por que o regime calculado foi substituído. A justificativa preserva a rastreabilidade da decisão.",
  "Fornecedor ativo": "Quando desmarcado, identifica que a unidade não está ativa para a operação atual, sem apagar seu histórico.",
  "Fornecedor novo / processo alterado": "Marque quando a unidade é nova ou passou por mudança relevante. Isso força o regime calculado para o nível 1, de fiscalização intensiva.",
  "Nome do material": "Nome da família de material exibido nos cadastros, demandas e relatórios.",
  "Criticidade (0–20)": "Risco padrão desta família de material. Ele participa do score de prioridade das demandas, dentro do peso configurado.",
  Descrição: "Explique o que este cadastro representa para facilitar sua identificação e o uso correto pela equipe.",
  "Material ativo": "Quando desmarcado, mantém o histórico do material, mas indica que ele não deve ser usado na operação atual.",
  Fornecedor: "Unidade responsável pelo fornecimento ou local relacionado ao registro.",
  Material: "Família de material relacionada ao registro. Ela também define quais fiscais podem ser sugeridos para a demanda.",
  "Tipo de atividade": "Natureza do trabalho que será executado, como inspeção, ensaio, auditoria ou liberação.",
  "Descrição da demanda": "Resumo claro do que precisa ser fiscalizado. É o texto principal usado para reconhecer a demanda nas telas.",
  "Produção / lote": "Identificação do lote, ordem, série ou produção relacionada à fiscalização. Facilita a rastreabilidade.",
  "Esforço necessário (horas)": "Total de horas aprovadas que a demanda precisa receber para ficar completamente coberta. Coberturas parciais continuam pendentes.",
  "Data necessária": "Data que define a semana operacional da demanda. As alocações devem acontecer dentro dessa mesma semana.",
  "Prazo final da fiscalização": "Último dia aceitável para executar a fiscalização. Uma alocação não pode ultrapassar este prazo sem reprogramação justificada.",
  "Criticidade específica (0–20)": "Permite ajustar a criticidade apenas para esta demanda. Deixe vazio para usar a criticidade padrão do material.",
  "Relevância da produção (0–5)": "Representa o impacto do volume ou da importância da produção. Quanto maior o valor, maior sua contribuição para a prioridade.",
  "RNC relacionada": "Vincula uma não conformidade à demanda. RNC aberta, crítica ou reincidente pode aumentar a prioridade calculada.",
  "Presença obrigatória Rumo": "Indica que a fiscalização precisa estar presente. O score final da demanda passa a ter piso de 50 pontos.",
  "Hold point": "Ponto do processo que não deve avançar sem a liberação prevista. O score final passa a ter piso de 70 pontos.",
  "Auditoria surpresa": "Indica uma verificação sem aviso prévio. Quando não há obrigatoriedade ou hold point, acrescenta parte do componente correspondente ao score.",
  Reincidência: "Indica repetição de um desvio ou problema. A marcação aumenta o risco e ajuda a destacar casos que exigem acompanhamento.",
  "Reincidência grave": "Indica repetição com impacto elevado. O score final da demanda passa a ter piso de 70 pontos.",
  "Status operacional": "Etapa atual da demanda. O status controla como ela aparece no planejamento e preserva situações como reprogramação, realização e cancelamento.",
  "Motivo da não execução": "Motivo pelo qual a fiscalização não ocorreu. “Falta de capacidade” é usado no cálculo da demanda reprimida efetiva ao registrar a fotografia semanal.",
  "Resultado da fiscalização": "Conclusão registrada após a execução, incluindo liberações, restrições, desvios ou encaminhamentos.",
  "Justificativa da alteração": "Explica por que uma informação relevante foi modificada. Serve para manter a decisão compreensível no histórico.",
  "Motivo de reprogramação / cancelamento": "Explique a mudança de data ou o cancelamento. O texto fica no histórico para preservar a decisão operacional.",
  Número: "Código ou número usado para identificar a RNC ou ocorrência ao longo do acompanhamento.",
  Criticidade: "Gravidade da não conformidade. Casos altos ou críticos aumentam o risco do fornecedor; uma RNC crítica relacionada eleva a prioridade da demanda.",
  "Data de abertura": "Data em que a RNC ou ocorrência começou a ser acompanhada.",
  Prazo: "Data limite para tratar a RNC. Registros abertos após esta data aparecem como vencidos.",
  "Descrição da ocorrência": "Relato objetivo do desvio encontrado, com informação suficiente para orientar a análise e a ação.",
  Responsável: "Pessoa ou área encarregada de conduzir o tratamento da RNC.",
  Status: "Etapa atual do tratamento da RNC, desde a abertura até a verificação de eficácia e o encerramento.",
  Causa: "Causa identificada para a ocorrência. Serve de base para definir uma ação que evite repetição.",
  Ação: "Medida definida para corrigir a ocorrência ou eliminar sua causa.",
  "Referência da evidência (texto / URL)": "Descrição ou endereço da evidência que comprova o tratamento. Não inclua senhas ou informações sigilosas.",
  "Data de encerramento": "Data em que o tratamento foi concluído. Preencha quando a RNC estiver efetivamente encerrada.",
  "Verificação de eficácia": "Registra como foi confirmado que a ação funcionou e que o problema não voltou a ocorrer.",
  Demanda: "Fiscalização que receberá a alocação. As horas aprovadas contam para a cobertura dessa demanda.",
  Fiscal: "Profissional que executará a atividade. Ele precisa estar ativo, habilitado para o material e disponível na data.",
  Data: "Dia em que a atividade será executada. Deve pertencer à semana da demanda e não ultrapassar o prazo.",
  "Horas alocadas": "Quantidade de horas reservadas para o fiscal nesta demanda. O sistema valida capacidade diária, semanal e esforço ainda pendente.",
  "Horas de fiscalização": "Quantidade de horas reservadas para o fiscal nesta demanda. O sistema valida capacidade diária, semanal e esforço ainda pendente.",
  Disponibilidade: "Situação do fiscal no dia. Férias, folga, afastamento, indisponibilidade, deslocamento e atividade administrativa zeram a capacidade desse dia.",
  "Horas disponíveis": "Capacidade excepcional para o dia. Ela continua limitada pela jornada de um fiscal-dia e pela carga semanal contratada.",
  "Horas disponíveis para fiscalização": "Capacidade excepcional para o dia. Ela continua limitada pela jornada de um fiscal-dia e pela carga semanal contratada.",
  "Nova data necessária": "Move a demanda e suas futuras alocações para a semana correspondente a esta data.",
  "Novo prazo final": "Novo limite para execução da demanda após a reprogramação.",
  "Novo prazo": "Novo limite para execução da demanda após a reprogramação.",
  "Motivo da reprogramação": "Justificativa obrigatória para mudar a programação. A decisão e as alocações anteriores permanecem no histórico.",
  "Nome completo": "Nome exibido no perfil, nas contas da equipe e nos registros de auditoria.",
  "E-mail": "Endereço usado para entrar no sistema. A conta só terá acesso depois de ser criada pelo Editor.",
  Perfil: "Define as permissões: Editor administra e edita; Fiscalização e Coordenação consultam os dados.",
  "Perfil de acesso": "Define as permissões: Editor administra e edita; Fiscalização e Coordenação consultam os dados.",
  "Senha inicial": "Senha temporária usada no primeiro acesso. Informe-a à pessoa por um canal adequado e oriente a troca no perfil.",
  "Nova senha": "Senha que substituirá a atual nesta conta.",
  "Confirmar nova senha": "Repita a nova senha para evitar que um erro de digitação bloqueie o próximo acesso.",
  "Confirme a nova senha": "Repita a nova senha para evitar que um erro de digitação bloqueie o próximo acesso.",
  "Editor responsável": "Pessoa identificada como responsável pelas configurações atuais. O valor vem do perfil Editor conectado.",
  "Jornada de um fiscal-dia (h)": "Número de horas usado para converter a capacidade e a demanda em fiscal-dias. Também limita a capacidade diária de cada fiscal.",
  "Meta de cobertura (%)": "Percentual mínimo desejado de horas alocadas sobre as horas necessárias. O sistema gera um alerta quando a semana fica abaixo desta meta.",
  "Criticidade do material": "Peso máximo dado ao risco do material dentro do score de prioridade da demanda.",
  "Risco do fornecedor": "Peso máximo dado ao score atual do fornecedor dentro da prioridade da demanda.",
  "RNC e reincidência": "Peso máximo de não conformidades relacionadas e repetições de problemas no score da demanda.",
  "Obrigatoriedade / hold point": "Peso máximo de presença obrigatória, hold point ou auditoria surpresa no score da demanda.",
  "Tempo sem fiscalização": "Peso máximo do tempo transcorrido desde a última fiscalização do fornecedor.",
  "Urgência / prazo": "Peso máximo da proximidade do prazo final. Prazos mais próximos usam uma parcela maior deste peso.",
  "Relevância da produção": "Peso máximo do volume ou impacto da produção informado na demanda.",
});

export const CONCEPT_HELP = Object.freeze({
  "Capacidade disponível": "Soma das horas que os fiscais ativos podem trabalhar na semana, respeitando carga contratada, jornada diária e bloqueios de agenda.",
  "Demanda de fiscalização": "Soma do esforço necessário de todas as demandas da semana selecionada, convertida em fiscal-dias.",
  "Déficit de capacidade": "Diferença entre a demanda total e a capacidade disponível. Pode ser zero mesmo com baixa cobertura quando há capacidade ainda não alocada.",
  "Cobertura programada": "Percentual do esforço necessário que já possui horas alocadas e aprovadas. Uma demanda parcial continua descoberta.",
  "Fiscal-dia": "Unidade de planejamento equivalente à jornada diária definida nas configurações. As alocações continuam sendo salvas em horas.",
  "Demanda reprimida prevista": "Percentual do esforço da semana que ainda não recebeu alocação aprovada.",
  "Demanda reprimida efetiva": "Parcela não executada por falta de capacidade, registrada na fotografia após o encerramento da semana.",
  "Score de prioridade": "Pontuação de 0 a 100 calculada com material, fornecedor, RNC, obrigatoriedade, tempo, urgência e produção. Quanto maior, mais cedo a demanda deve ser analisada.",
  "Score de risco": "Pontuação de 0 a 100 que reúne risco de base, RNCs, ocorrências, tempo sem auditoria, documentação e desvios do fornecedor.",
  Regime: "Intensidade sugerida para fiscalizar o fornecedor: nível 1 intensiva, nível 2 dirigida e nível 3 por amostragem.",
  Cobertura: "Horas alocadas e aprovadas divididas pelo esforço necessário. Só chega a 100% quando toda a demanda está programada.",
  Prioridade: "Faixa calculada pelo score da demanda: baixa, moderada, alta ou crítica. Pisos de risco podem elevar o resultado final.",
  "Risco não coberto": "Demandas que ainda possuem horas sem alocação aprovada, inclusive quando já estão parcialmente cobertas.",
  "Distribuição da cobertura": "Mostra a cobertura por material, fornecedor, região, fiscal ou semana para localizar onde faltam recursos.",
  "Fotografia da cobertura": "Registro imutável dos indicadores de uma semana naquele momento, usado para acompanhar a evolução e a demanda reprimida efetiva.",
});

export function helpTip(text, label = "este conceito") {
  if (!text) return "";
  return `<button class="help-tip" type="button" data-help-text="${esc(text)}" aria-label="Ajuda sobre ${esc(label)}" aria-expanded="false"><span aria-hidden="true">?</span></button>`;
}

export function helpFor(label, override) {
  return helpTip(override || FIELD_HELP[label] || CONCEPT_HELP[label], label);
}

export function labelWithHelp(label, override) {
  return `<span class="label-with-help">${esc(label)}${helpFor(label, override)}</span>`;
}

export function initHelpTooltips() {
  if (document.querySelector("#concept-tooltip")) return;
  const tooltip = document.createElement("div");
  tooltip.id = "concept-tooltip";
  tooltip.className = "help-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.setAttribute("popover", "manual");
  const usePopover = typeof tooltip.showPopover === "function";
  if (!usePopover) tooltip.hidden = true;
  document.body.append(tooltip);
  let active;

  const close = () => {
    if (active) {
      active.setAttribute("aria-expanded", "false");
      active.removeAttribute("aria-describedby");
    }
    active = undefined;
    if (usePopover) {
      if (tooltip.matches(":popover-open")) tooltip.hidePopover();
    } else {
      tooltip.hidden = true;
      if (tooltip.parentElement !== document.body) document.body.append(tooltip);
    }
  };
  const open = (trigger) => {
    if (!trigger?.dataset.helpText) return;
    active = trigger;
    tooltip.textContent = trigger.dataset.helpText;
    if (usePopover) {
      if (!tooltip.matches(":popover-open")) tooltip.showPopover();
    } else {
      const host = trigger.closest("dialog[open]") || document.body;
      if (tooltip.parentElement !== host) host.append(tooltip);
      tooltip.hidden = false;
    }
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-describedby", tooltip.id);
    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(320, window.innerWidth - margin * 2);
    tooltip.style.width = `${width}px`;
    const left = Math.min(
      window.innerWidth - width - margin,
      Math.max(margin, rect.left + rect.width / 2 - width / 2),
    );
    const tooltipHeight = tooltip.offsetHeight;
    const above = rect.top >= tooltipHeight + 18;
    tooltip.dataset.placement = above ? "top" : "bottom";
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${above ? rect.top - tooltipHeight - 10 : rect.bottom + 10}px`;
  };

  document.addEventListener("mouseover", (event) => {
    const trigger = event.target.closest(".help-tip");
    if (trigger) open(trigger);
  });
  document.addEventListener("mouseout", (event) => {
    const trigger = event.target.closest(".help-tip");
    if (trigger && !trigger.contains(event.relatedTarget)) close();
  });
  document.addEventListener("focusin", (event) => {
    const trigger = event.target.closest(".help-tip");
    if (trigger) open(trigger);
  });
  document.addEventListener("focusout", (event) => {
    if (event.target.closest(".help-tip")) close();
  });
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".help-tip");
    if (!trigger) {
      close();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    open(trigger);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  window.addEventListener("resize", close);
  document.addEventListener("scroll", close, true);
}
