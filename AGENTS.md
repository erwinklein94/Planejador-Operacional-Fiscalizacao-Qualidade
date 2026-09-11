# Orientações deste projeto

- O usuário autorizou explicitamente, neste chat, commits e pushes de todas as alterações solicitadas diretamente na branch `main`.
- Validar as alterações, fazer commit e push na `main`; não criar outra branch ou PR por padrão. Nunca usar force push.
- Manter o sistema estático, compatível com GitHub Pages e sem backend próprio nesta primeira versão.
- Não adicionar credenciais, tokens, arquivos `.env`, dados operacionais reais ou dados confidenciais ao repositório.
- Toda persistência do navegador passa por `services/storageService.js`. As telas não devem acessar localStorage diretamente.
- Preservar histórico de cancelamentos, reprogramações, alocações e decisões.
- Cobertura significa horas alocadas aprovadas, não capacidade teórica. Demandas parciais continuam descobertas.
- Sugestões nunca devem alterar a escala sem confirmação do usuário da aplicação.
- Antes de publicar, executar `node scripts/check.mjs`, `node --test tests/*.test.js` e `node scripts/build.mjs`.
- A pasta `dist/` contém somente arquivos públicos selecionados pelo script de build; não publicar a raiz inteira com documentação interna e testes.
