"""Build the illustrated beginner guide. Requires reportlab; no production data."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf/Guia-de-Uso-Planejador-Operacional.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
FONT = Path('C:/Windows/Fonts')
if (FONT / 'verdana.ttf').exists():
    pdfmetrics.registerFont(TTFont('Guide', str(FONT / 'verdana.ttf')))
    pdfmetrics.registerFont(TTFont('GuideBold', str(FONT / 'verdanab.ttf')))
    pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='GuideBold', italic='Guide', boldItalic='GuideBold')
else:
    from reportlab import rl_config
    bundled = Path(rl_config.TTFSearchPath[0])
    pdfmetrics.registerFont(TTFont('Guide', str(bundled / 'Vera.ttf')))
    pdfmetrics.registerFont(TTFont('GuideBold', str(bundled / 'VeraBd.ttf')))
    pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='GuideBold', italic='Guide', boldItalic='GuideBold')

NAVY=HexColor('#003865'); GREEN=HexColor('#1E9F7F'); SKY=HexColor('#32A6E6')
INK=HexColor('#223D50'); MUTED=HexColor('#587080'); LIGHT=HexColor('#EEF5F8')
W,H=A4; M=43; CW=W-2*M
c=canvas.Canvas(str(OUT), pagesize=A4)
c.setTitle('Como usar o Planejador Operacional - Fiscalização e Qualidade')
c.setAuthor('Planejador Operacional - Guia de uso')
c.setSubject('Manual prático de login, cadastros, planejamento, consulta e auditoria')
URL='https://erwinklein94.github.io/Planejador-Operacional-Fiscalizacao-Qualidade/'
page=0; y=0

def para(text, width=CW, size=10.3, leading=15.3, color=INK, bold=False):
    return Paragraph(text, ParagraphStyle('p',fontName='GuideBold' if bold else 'Guide',fontSize=size,leading=leading,textColor=color,spaceAfter=0))

def put(text, size=10.3, color=INK, gap=10, bold=False):
    global y
    p=para(text,size=size,leading=size*1.48,color=color,bold=bold)
    _,h=p.wrap(CW,H)
    if y-h<61: raise ValueError(f'Page {page}: overflow at {text[:55]}')
    p.drawOn(c,M,y-h);y-=h+gap

def section(text):
    global y
    y-=4;put(text,14,NAVY,8,True)

def box(title, text, color=LIGHT):
    global y
    p=para(f'<b>{title}</b><br/>{text}', CW-26)
    _,h=p.wrap(CW-26,H);h+=24
    if y-h<61: raise ValueError(f'Page {page}: box overflow')
    c.setFillColor(color);c.roundRect(M,y-h,CW,h,8,fill=1,stroke=0)
    c.setFillColor(GREEN);c.roundRect(M,y-h,4,h,2,fill=1,stroke=0)
    p.drawOn(c,M+13,y-h+12);y-=h+13

def table(rows,widths=None):
    global y
    widths=widths or [CW/len(rows[0])]*len(rows[0])
    cells=[[para(escape(str(v)),widths[j]-18,size=9.3,leading=13.8,color=white if i==0 else INK,bold=i==0) for j,v in enumerate(row)] for i,row in enumerate(rows)]
    t=Table(cells,colWidths=widths,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('ROWBACKGROUNDS',(0,1),(-1,-1),[LIGHT,white]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,-1),(-1,-1),.5,HexColor('#D9E4EA'))]))
    _,h=t.wrap(CW,H)
    if y-h<61:raise ValueError(f'Page {page}: table overflow')
    t.drawOn(c,M,y-h);y-=h+14

def step(n,title,text):
    put(f'<font color="#1E9F7F"><b>{n:02d}</b></font>  <b>{title}</b><br/>{text}',gap=13)

def start(title,subtitle,tag='GUIA PRÁTICO'):
    global page,y
    if page:c.showPage()
    page+=1
    c.setFillColor(NAVY);c.rect(0,H-13,W,13,fill=1,stroke=0)
    c.setFont('GuideBold',8);c.setFillColor(NAVY);c.drawString(M,H-40,'FISCALIZAÇÃO & QUALIDADE')
    c.setFont('Guide',8);c.setFillColor(MUTED);c.drawRightString(W-M,H-40,tag)
    c.setStrokeColor(HexColor('#D9E4EA'));c.line(M,48,W-M,48)
    c.setFont('Guide',7.5);c.drawString(M,33,'Guia de uso | versão do site: bdf8cda | 11/09/2026')
    c.drawRightString(W-M,33,f'{page:02d} / 09')
    y=H-76;put(title,25,NAVY,12,True);put(subtitle,11,MUTED,20)
    c.bookmarkPage(f'p{page}');c.addOutlineEntry(title,f'p{page}',0,False)

start('Entenda o sistema\nem poucos passos'.replace('\n','<br/>'),'Planejador Operacional da Fiscalização de Materiais','COMECE AQUI')
put('O site ajuda a decidir <b>quem vai fiscalizar, o quê, onde e em quais dias</b>. Ele compara o trabalho necessário com as horas disponíveis da equipe e mostra o que ainda ficou sem atendimento.',11.4,gap=16)
box('A pergunta central','“Temos equipe e dias suficientes para atender às inspeções desta semana?”')
section('O caminho de uma fiscalização')
table([['1. Demanda','2. Planejamento','3. Resultado'],['Cadastre o trabalho que precisa acontecer.','Escolha o fiscal, as datas e as horas. Aprove a alocação.','Depois da atividade, registre o resultado e conclua a demanda.']])
box('Três coisas diferentes','<b>Cadastro:</b> o trabalho existe.<br/><b>Cobertura:</b> há horas aprovadas na escala.<br/><b>Execução:</b> a fiscalização foi realizada e teve o resultado registrado.')
section('Como ler este guia')
put('<b>Se você é editor:</b> leia na ordem, das páginas 2 a 9. Você faz os cadastros e atualiza a operação.<br/><br/><b>Se você é Fiscalização ou Coordenação:</b> comece pelas páginas 2, 7 e 9. Seu acesso permite consultar; solicite ao editor as alterações necessárias.')
put(f'<link href="{URL}" color="#003865"><b>Clique aqui para abrir o planejador</b></link>',gap=14)
put('Roteiro: acesso (2) • cadastros (3) • demanda (4) • escala (5) • resultados (6) • indicadores (7) • contas e dados (8) • rotina e dúvidas (9).',9.2,MUTED)

start('Entre e encontre sua semana','A mesma base é compartilhada entre as contas autorizadas.','TODOS OS PERFIS')
step(1,'Abra o site e entre','Informe o e-mail e a senha da sua conta cadastrada e clique em <b>Entrar</b>. Não há cadastro público. Se não conseguir entrar, solicite orientação ao editor.')
step(2,'Confira o seu perfil','Abra <b>Meu perfil</b>. É ali que aparecem seu nome, seu tipo de acesso e a opção <b>Alterar minha senha</b>. Ao terminar, use <b>Sair da conta</b>.')
step(3,'Selecione a semana','Use o campo de data e as setas de semana na parte superior. A escala considera segunda a sexta. No celular, abra o menu pelo botão de três linhas; a semana também aparece acima do conteúdo.')
table([['Perfil','O que faz'],['Editor','Cadastra e edita dados, organiza a escala, registra resultados, cria contas e consulta a auditoria.'],['Fiscalização / Coordenação','Consulta planejamento, cadastros, indicadores e relatórios. Não altera a operação.']],[146,CW-146])
section('Qual tela abrir?')
table([['Quero...','Abra...'],['Ver a situação geral','Dashboard'],['Encontrar uma inspeção','Demandas'],['Saber quem estará em cada dia','Planejamento semanal ou Escala de fiscais'],['Entender as pendências','Cobertura ou Mapa de risco'],['Consultar uma não conformidade','RNC / Ocorrências']],[CW*.55,CW*.45])
box('Se os dados parecerem desatualizados','Use <b>Atualizar dados compartilhados</b> no topo ou navegue para outra página. O site precisa de internet. Só considere uma alteração salva depois da mensagem de sucesso.')

start('Prepare os cadastros','Faça isso antes de montar as primeiras demandas. Se já existem registros corretos, aproveite-os.','EDITOR')
step(1,'Materiais: o que será fiscalizado','Em <b>Materiais</b>, cadastre o nome, a criticidade e mantenha o material ativo. Exemplo ilustrativo: “Dormente de concreto”. A criticidade ajuda a calcular a prioridade das demandas.')
step(2,'Fornecedores: onde o trabalho acontece','Em <b>Fornecedores > Novo fornecedor</b>, preencha unidade/fábrica, cidade, UF e materiais fornecidos. Confira os campos de risco e o histórico de qualidade com base nas informações da operação.')
step(3,'Fiscais: quem pode executar','Em <b>Fiscais</b>, cadastre a pessoa, base, cidade, UF e carga semanal. Selecione os <b>Materiais habilitados</b> e mantenha o fiscal ativo. No computador, Ctrl/Cmd permite selecionar vários materiais.')
step(4,'Disponibilidade: quando a pessoa pode ir','Em <b>Planejamento semanal > Disponibilidade</b>, selecione fiscal, data, situação e horas. Registre férias, afastamentos, deslocamentos ou outras indisponibilidades antes de sugerir alocações.')
box('Conta de acesso não é cadastro de fiscal','<b>Meu perfil > Nova conta</b> permite à pessoa entrar no site.<br/><b>Fiscais</b> define a equipe que pode aparecer na escala.<br/>Criar uma conta de Fiscalização não cria automaticamente seu cadastro operacional, habilitações ou disponibilidade.')
box('Fiscal de referência não reserva um dia','O fiscal de referência no fornecedor é uma informação de cadastro. Para colocá-lo na escala, é preciso aprovar uma alocação com data e horas.')

start('Cadastre uma demanda','Uma demanda representa um trabalho de fiscalização que precisa ser atendido.','EDITOR | EXEMPLO GUIADO')
put('Vamos usar um <b>exemplo ilustrativo</b>: uma inspeção de dormentes na “Unidade Exemplo” que exige <b>16 horas</b>. Use dados reais somente quando estiver preparando uma atividade verdadeira.')
step(1,'Abra Demandas > Nova demanda','Escolha um fornecedor e um material que pertença a ele. Confira a unidade, cidade e UF preenchidas no formulário.')
table([['Campo / informação','Como pensar no exemplo'],['Atividade e descrição','Inspeção do lote. Descreva claramente o que será verificado.'],['Data necessária','Escolha um dia da semana em que a demanda deve ser atendida. Essa data define a semana do planejamento.'],['Prazo','Último dia permitido para atender a demanda. Deve ser igual ou posterior à data necessária.'],['Esforço necessário','Informe 16 h. É tempo de trabalho, não quantidade de peças.'],['Condições de prioridade','Marque presença obrigatória, hold point ou reincidência somente quando realmente se aplicarem.']],[156,CW-156])
step(2,'Confira os demais campos e salve','Preencha os campos obrigatórios indicados por *. Depois de salvar, abra a demanda e confira o prazo, as horas necessárias, o status e a explicação da prioridade.')
box('O que deve acontecer agora?','A demanda existe na lista, mas ainda pode estar <b>sem cobertura</b>. Isso é esperado: você ainda não escolheu os dias e as horas do fiscal. Continue na página 5.')
put('Dica: se a demanda não aparecer, confira a semana e os filtros da lista. A data necessária pode tê-la colocado em outra semana.',9.4,MUTED)

start('Coloque o trabalho na escala','O sistema sugere opções; o editor confere e aprova.','EDITOR | CONTINUAÇÃO DO EXEMPLO')
step(1,'Abra a demanda e clique em Sugerir fiscal','A ferramenta procura fiscais elegíveis considerando habilitação, disponibilidade e capacidade. <b>Sugerir alocação</b>, na tela de planejamento, começa por uma demanda pendente prioritária.')
step(2,'Leia a proposta antes de aprovar','Confira fiscal, unidade, datas, horas e se a cobertura é integral ou parcial. Verifique deslocamentos: o site não calcula rotas nem tempo de viagem.')
table([['Exemplo de distribuição','Horas aprovadas','Cobertura da demanda'],['Somente um dia disponível','8 de 16 h','50%: ainda faltam 8 h'],['Dois dias de 8 h na mesma semana','16 de 16 h','100%: esforço integral alocado']],[207,110,CW-317])
step(3,'Clique em Aprovar esta alocação','A escala só é alterada após essa aprovação. Depois da mensagem de sucesso, confira o cartão da atividade em <b>Planejamento semanal</b> ou <b>Escala de fiscais</b>.')
step(4,'Se preferir, aloque manualmente','Use <b>+ Alocar atividade</b> em uma célula da escala, ou <b>Alocar manualmente</b> na janela de sugestões. Escolha demanda, fiscal, data e horas. O salvamento continua sujeito às mesmas validações.')
box('Por que uma alocação pode ser recusada?','Fiscal inativo ou sem habilitação; falta de horas; indisponibilidade; data fora da semana/prazo; excesso de horas da demanda; ou duas unidades diferentes no mesmo dia.')
box('Cobertura completa ainda não é execução','No exemplo, 16 h aprovadas significam que o trabalho foi <b>programado</b>. Registre o resultado depois da fiscalização para confirmar que ela foi realizada.')

start('Atualize o que aconteceu','Registre a execução e trate as mudanças sem perder o histórico.','EDITOR')
section('Quando a fiscalização for realizada')
step(1,'Abra a demanda','Com cobertura integral, clique em <b>Registrar resultado</b>. Você também pode acessar a edição da demanda.')
step(2,'Preencha o resultado e conclua','Registre o que foi verificado e o resultado; selecione o status <b>Realizada</b> e salve. A data de conclusão é registrada automaticamente. O sistema exige resultado e cobertura integral para concluir. Depois, confira o histórico e os indicadores.')
box('Se só parte do trabalho foi executada','Nesta versão, a conclusão da demanda é integral. Não marque 16 h como realizadas se apenas 8 h foram executadas. Planeje demandas menores quando precisar controlar entregas e resultados parciais separados.')
section('Se o plano mudou')
table([['Situação','O que fazer'],['Mudou a semana ou o prazo','Abra a demanda > Reprogramar. Informe nova data necessária, novo prazo e motivo. Refaça as alocações: as anteriores ficam canceladas no histórico.'],['Mudou o fiscal ou o dia','Abra o cartão na escala > Remover da escala. Depois aprove uma nova alocação.'],['A demanda foi cancelada','Edite a demanda, selecione Cancelada e registre o motivo. Ela permanece no histórico.']],[150,CW-150])
section('Quando houver uma não conformidade')
put('Em <b>RNC / Ocorrências</b>, registre a não conformidade, fornecedor, material, gravidade, prazo e responsável. Atualize causa, ação e acompanhamento. Para encerrar, registre a data e a verificação de eficácia. Uma RNC pode aumentar o risco; confira a prioridade das demandas relacionadas.',gap=8)
put('RNC = registro de não conformidade. Fiscalização e Coordenação consultam essas informações e solicitam ao editor as atualizações.',9.2,MUTED)

start('Leia os números sem confundir','Capacidade, cobertura e execução respondem a perguntas diferentes.','TODOS OS PERFIS')
table([['Indicador','Pergunta que responde'],['Capacidade disponível','Quantas horas a equipe pode trabalhar na semana?'],['Demanda de fiscalização','Quantas horas de trabalho são necessárias?'],['Déficit de capacidade','Quanto trabalho excede a capacidade total da equipe?'],['Cobertura programada','Quanto do esforço já tem horas aprovadas na escala?'],['Fiscalizações realizadas','Quais demandas tiveram sua execução confirmada?']],[183,CW-183])
section('Exemplo: há capacidade, mas falta planejamento')
put('A equipe tem <b>40 h disponíveis</b>. A demanda exige <b>16 h</b>. Você aprovou apenas <b>8 h</b>. Então:')
table([['Déficit de capacidade','Cobertura programada','Ainda sem cobertura'],['0 h','8 ÷ 16 = 50%','8 h']])
box('A conclusão correta','Ter horas livres não resolve a demanda automaticamente. Ainda é preciso alocar as 8 h restantes. Para converter horas em fiscal-dias, use a jornada configurada; com jornada de 8 h, 16 h equivalem a 2 fiscal-dias.')
section('Como interpretar a prioridade')
put('No <b>Mapa de risco</b>, comece pelas condições obrigatórias e pelos riscos mais altos. Abra uma demanda para ver por que recebeu aquela pontuação. A avaliação humana continua necessária.')
table([['Baixo','Moderado','Alto','Crítico'],['0 a 29','30 a 49','50 a 69','70 a 100']])
put('<b>Hold point:</b> ponto de parada que exige atenção/presença conforme a regra da atividade. No sistema, ele estabelece prioridade mínima de 70. Presença obrigatória tem piso de 50; RNC crítica relacionada ou reincidência grave também podem impor piso de 70.',9.4,gap=8)
put('Sem demandas, o percentual aparece sem valor. Isso não significa 100% de cobertura.',9.4)

start('Contas, auditoria e dados','Estas tarefas administrativas ficam com o editor.','EDITOR')
section('Criar uma nova conta')
step(1,'Meu perfil > Nova conta','Informe nome, e-mail, perfil e senha inicial com pelo menos 8 caracteres. Fiscalização e Coordenação terão apenas consulta; Editor terá permissão de alteração.')
step(2,'Clique em Criar conta','A pessoa já poderá entrar com as credenciais cadastradas. Oriente-a a usar <b>Meu perfil > Alterar minha senha</b>. Não é necessário entrar no painel do Supabase para criar essas contas.')
box('O que a tela de contas ainda não faz','A versão atual permite criar contas e alterar a própria senha. Não há tela para desativar contas, mudar o perfil de uma conta existente ou redefinir a senha de outra pessoa; essas tarefas exigem suporte administrativo.')
section('Consultar os acessos')
put('Abra <b>Auditoria de acessos</b>. A tabela mostra até os <b>100 acessos mais recentes</b> de Fiscalização e Coordenação, com pessoa, página, data e hora de Brasília. Os acessos de editores ficam fora dessa lista. Use <b>Atualizar acessos</b> para recarregar.')
put('<b>Histórico</b> e <b>Auditoria de acessos</b> são diferentes: o primeiro mostra alterações da operação; a segunda mostra as páginas consultadas pelos demais perfis.')
section('Guardar uma cópia e evitar substituições indevidas')
put('Em <b>Configurações > Exportar backup JSON</b>, baixe uma cópia dos dados operacionais. O arquivo serve para restauração; não é um relatório para leitura. Ele não contém contas, senhas nem a auditoria de acessos.')
box('Atenção aos comandos que substituem a base','<b>Importar backup</b>, <b>Importar dados do navegador antigo</b>, <b>Carregar demonstração</b> e <b>Limpar base compartilhada</b> afetam os dados de toda a equipe. Não use essas opções como tentativa de corrigir uma tela vazia. Leia a confirmação e guarde o backup.')

start('Sua rotina e as dúvidas comuns','Use esta página como consulta rápida enquanto aprende.','CONSULTA RÁPIDA')
section('Uma rotina simples para o editor')
put('<b>Antes da semana:</b> confira cadastros, disponibilidade, demandas e prioridades; aprove as alocações.<br/><br/><b>Durante a semana:</b> acompanhe a escala e os alertas; registre mudanças e resultados reais.<br/><br/><b>Depois da semana:</b> confira pendências, motivos de não execução e resultados; registre a fotografia em Cobertura. A apuração efetiva considera o motivo “Falta de capacidade” nas demandas não realizadas e a fotografia após o fim da semana.')
section('Se você só consulta')
put('Selecione a semana e consulte escala, demandas, Cobertura e RNCs. Avise o editor sobre mudanças. Não é preciso acessar o painel do Supabase.')
table([['Dúvida','O que verificar'],['“Não aparece meu botão de editar.”','Confira o perfil em Meu perfil. Fiscalização e Coordenação não podem editar.'],['“Cadastrei a demanda, mas a escala está vazia.”','Falta aprovar uma alocação. Confira também a semana selecionada.'],['“Não aparece sugestão de fiscal.”','Confira habilitação, fiscal ativo, horas disponíveis, unidade e prazo.'],['“Não consigo concluir.”','Confira cobertura integral, resultado preenchido e status Realizada.'],['“Alguém salvou em outra sessão.”','Atualize os dados, revise a alteração e tente novamente. O sistema evita sobrescrever silenciosamente.'],['“Quero um relatório em PDF.”','Dashboard > Resumo semanal > Imprimir / salvar PDF; escolha salvar como PDF no navegador.']],[191,CW-191])
box('Seu próximo passo','Abra uma demanda existente e confira somente quatro itens: <b>local, prazo, horas necessárias e horas alocadas</b>. Depois encontre a mesma atividade na escala. Essa ligação é o centro do sistema.')

assert page==9
c.save()
print(OUT)





