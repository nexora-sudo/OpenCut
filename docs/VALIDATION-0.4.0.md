# Validação da versão 0.4.0

## Escopo entregue

- Prévia em resolução original, metade ou um quarto, sem alterar a resolução da exportação. O compositor, texto, máscaras e intensidade visual do desfoque são ajustados; os arquivos de origem ainda são decodificados na resolução nativa.
- Progresso de exportação com quadros processados, velocidade medida e estimativa do tempo restante de processamento. A finalização do arquivo é uma etapa separada.
- Histórico local com até 20 versões da edição, intervalo automático mínimo de 30 segundos entre versões quando há salvamento de mudanças, e criação manual de versões. Restauração em projeto separado, com os arquivos necessários.
- Cinco novos efeitos: Sépia, Quente, Frio, Vívido e Negativo. Intensidade, ativação/desativação e comparação temporária antes/depois.
- Seis transições no total: Dissolver, Deslizar para esquerda/direita/cima/baixo e Aproximação. Duração configurável, reprodução opcional da cauda do clipe anterior e mistura opcional do áudio dos dois clipes. Projetos antigos conservam o modo de quadro congelado.
- Enquadrar projeto ou seleção na linha do tempo, controles de zoom e dicas de corte/encaixe mais claras.
- Espanhol e francês completos, além de português do Brasil, chinês simplificado, inglês, japonês e inglês do Reino Unido. 1.288 mensagens por catálogo, com parâmetros conferidos.
- Nenhum botão novo para relatar bugs foi adicionado.

## Testes no navegador

Windows e Chrome, com mídia sintética gerada localmente; nenhum arquivo pessoal enviado.

| Verificação                            | Resultado                                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prévia original → ½ → ¼ → original     | 1280×720 → 640×360 → 320×180 → 1280×720, mantendo cores e posições dos elementos                                                                                       |
| MP4 de 15 minutos                      | 900 segundos, 9.000 quadros, 128×72 a 10 fps; duração e cores inicial/final decodificadas corretamente                                                                 |
| WebM de 15 minutos                     | Mesma duração e quadros; progresso monotônico e estimativa de tempo observada                                                                                          |
| Seis transições em movimento           | Prévia e 12 exportações MP4/WebM em 720p/30 fps com quadros intermediários conferidos                                                                                  |
| Mesmo arquivo usado nos dois clipes    | Decodificadores separados para a cauda da transição e a entrada, sem sobrescrever os pixels compartilhados                                                             |
| Cinco novos efeitos GPU                | Prévia e 10 exportações MP4/WebM, comparando pixels; desativar ou zerar intensidade restituiu os pixels originais                                                      |
| Mistura de áudio na dissolução         | Tons de 440 Hz e 880 Hz detectados no intervalo da transição nos arquivos MP4 e WebM                                                                                   |
| Recuperação com IndexedDB e OPFS reais | Mídia removida ficou oculta no projeto atual e preservada para a versão anterior; restauração criou ID independente, manteve original intacto e copiou os mesmos bytes |
| Histórico pela interface               | Diálogo em português, lista de versões e botão de salvar versão manual conferidos                                                                                      |

Os testes de 15 minutos usam gráficos simples e não incluem áudio. Validam duração/progresso e processamento contínuo, não desempenho com vídeo de câmera em 4K. As verificações curtas das transições incluem áudio sintético. Os arquivos originais dos relatos da comunidade não foram fornecidos.

O MP4 com AAC teve duração de contêiner próxima de 4,017 s para uma timeline de 4 s, devido ao preenchimento do codec; vídeo sem áudio teve 4 s e WebM aproximadamente 4,0003 s.

## Verificações automatizadas

- Compilação final de produção Next.js 16.1.3 e verificação TypeScript concluídas com sucesso, incluindo a revisão final das mensagens de importação.
- 27 testes direcionados aprovados, zero falhas, incluindo traduções, resolução da prévia, leitura de vídeo, salvamento, backups, histórico, envelopes de áudio e compositor.
- Revisão estática dos arquivos TypeScript alterados: zero erros e zero avisos.
- Instalação Bun com arquivo de dependências travado concluída. A primeira tentativa no sandbox não conseguiu recriar os links locais no Windows; a repetição autorizada concluiu.
- Suíte completa: 218 aprovados, 8 falhas e 2 erros já existentes no ambiente WASM/Bun e nos testes de posicionamento da timeline. Não se declara a suíte completa como aprovada.
- Motor Rust compilado e testes do crate `time` aprovados no [fluxo de compilação](https://github.com/nexora-sudo/OpenCut/actions/runs/41044535592), a partir do commit `209a1c0d26bf21d8c11803296a97a342929ff1f9`.
- Artefato baixado conferido com o SHA-256 publicado pelo GitHub. A origem e os hashes estão em `vendor/opencut-wasm/README.md`.

## Limites e uso

O histórico fica neste navegador e não substitui um backup `.opencut`. Limpar os dados do site ou excluir o projeto remove o histórico. Arquivos removidos que ainda são necessários para versões anteriores continuam ocupando armazenamento até as versões expirarem.

As transições em movimento repetem o trecho final do clipe anterior sobre o seguinte, sem prolongar a timeline ou revelar mídia fora dos cortes. A mistura de áudio exige áudio habilitado nos dois clipes e não cobre configurações importadas com curva de velocidade. Clipes antigos não são convertidos automaticamente para o modo em movimento.

Prévia reduzida não é um sistema de arquivos proxy. Fontes grandes, decodificação, memória, armazenamento, navegador e GPU continuam influenciando o desempenho. A estimativa de exportação varia conforme a complexidade dos quadros e não inclui uma garantia de tempo de finalização.

Roteiros reproduzíveis: `scripts/qa/features-040-harness.tsx`, `scripts/qa/history-harness.tsx` e `scripts/qa/export-040-harness.tsx`. As rotas temporárias de teste foram removidas antes da compilação de produção. A publicação de release/tag no GitHub é separada da versão do aplicativo.

A versão compilada também foi conferida no navegador interno: alternância para espanhol e francês, preferência persistida após recarregar, aplicação de Sépia a uma imagem de teste, ativação/desativação com restauração das cores e botão de comparação liberado sem deixar a prévia presa. Foi corrigida uma mensagem de importação que ainda misturava inglês com o idioma escolhido.
