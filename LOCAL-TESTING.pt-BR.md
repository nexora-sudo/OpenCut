# OpenCut Classic — português e chinês

Fork independente preparado para teste local, com desenvolvimento assistido por IA (Codex).
Créditos à equipe [OpenCut](https://github.com/OpenCut-app/opencut-classic) pelo projeto original.
O arquivo LICENSE original foi preservado.

## Testar

1. Instale o [Bun](https://bun.sh/) caso ainda não esteja instalado.
2. Na pasta principal, execute `bun install --frozen-lockfile`.
3. Copie `apps/web/.env.example` para `apps/web/.env.local` e defina um segredo aleatório em `BETTER_AUTH_SECRET`.
4. Na pasta `apps/web`, execute `bun run dev --hostname 127.0.0.1`.
5. Abra http://127.0.0.1:3000/projects em um navegador de computador.

O editor básico salva projetos e mídias no navegador. Esse teste não precisa de banco de dados nem Redis.
Busca de sons, envio de feedback e blog dependem de serviços e credenciais externas; as chaves de exemplo não habilitam essas integrações.

## Idiomas

- Português do Brasil, chinês simplificado e inglês.
- Abra a engrenagem no cabeçalho da lista de projetos ou do editor.
- Também é possível usar o painel lateral Configurações → Idioma.
- A preferência é salva em um cookie neste navegador e aplicada às próximas visitas.
- Projetos, arquivos, textos criados por você e nomes próprios não são traduzidos automaticamente.
- A tradução cobre a interface, avisos, erros conhecidos, atalhos, opções, páginas institucionais e as notas de versão incluídas.
- Conteúdo externo, como títulos de sons enviados por terceiros e artigos recebidos de um serviço, conserva seu idioma de origem.

## Organização

Os catálogos ficam em `apps/web/src/i18n/messages/`:

- `en.json`: textos de referência em inglês.
- `pt-BR.json`: português.
- `zh-CN.json`: chinês simplificado.

As mesmas chaves aparecem nos três arquivos. Elas são calculadas por `messageId`, em `src/i18n/config.ts`, a partir do texto inglês.
Componentes usam `useT()` e `t(texto, valores)`. Componentes assíncronos do servidor usam `getT()`.
O código usa next-intl para isolar o idioma de cada requisição e atualizar componentes React; não altera o DOM por busca e substituição.

## Base e limites

A base usada é o OpenCut Classic, com o editor funcional. Seu fork no GitHub veio da reescrita sem editor pronto, por isso este trabalho foi preparado em uma pasta e branch separadas, `feat/portuguese-chinese`.
As alterações estão disponíveis no fork [nexora-sudo/OpenCut](https://github.com/nexora-sudo/OpenCut), na branch `feat/portuguese-chinese`.

Além da tradução, foram corrigidas incompatibilidades que já impediam a inicialização: caminho das notas de versão, chamadas antigas do armazenamento e registro de adesivos e validadores de atalhos ausentes. Os ajustes de armazenamento preservam os dados existentes.

A suíte completa do upstream tem falhas de carregamento WASM e de dependências circulares em testes de linha do tempo. Essas mesmas falhas também aparecem na cópia original sem modificações. Consulte o relatório de validação entregue junto do código.
