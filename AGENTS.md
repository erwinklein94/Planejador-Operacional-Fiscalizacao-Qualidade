# Orientações deste projeto

- O usuário autorizou explicitamente, neste chat, commits e pushes de todas as alterações solicitadas diretamente na branch `main`.
- Validar as alterações, fazer commit e push na `main`; não criar outra branch ou PR por padrão. Nunca usar force push.
- Manter o frontend estático e compatível com GitHub Pages. O usuário solicitou Supabase Auth, banco e Edge Function no projeto sesgiivthqftoevdenhn.
- Não adicionar credenciais, tokens, arquivos `.env`, dados operacionais reais ou dados confidenciais ao repositório.
- Toda persistência operacional passa por services/storageService.js e o adaptador Supabase. Não usar localStorage para dados; permitida apenas leitura isolada para migrar a base antiga. sessionStorage guarda somente a sessão de autenticação.
- Editor pode editar e criar contas; fiscalização e coordenação apenas consultam. Aplicar autorização no servidor, nunca apenas escondendo botões. Auditoria dos 100 últimos acessos de não editores é exclusiva do editor.
- Não habilitar cadastro público ou anônimo. Nunca enviar service_role, chaves secretas ou senhas para arquivos públicos; a chave publicável do Supabase é configuração pública.
- Preservar histórico de cancelamentos, reprogramações, alocações e decisões.
- Cobertura significa horas alocadas aprovadas, não capacidade teórica. Demandas parciais continuam descobertas.
- Sugestões nunca devem alterar a escala sem confirmação do usuário da aplicação.
- Antes de publicar, executar `node scripts/check.mjs`, `node --test tests/*.test.js` e `node scripts/build.mjs`.
- A pasta `dist/` contém somente arquivos públicos selecionados pelo script de build; não publicar a raiz inteira com documentação interna e testes.
