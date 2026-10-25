# Validação da correção 0.3.4

## Problemas reproduzidos

Um vídeo sintético em movimento de 1280 × 720 a 30 fps reproduziu a falha: durante Dissolver e Deslizar, os dois clipes acabavam usando os mesmos pixels do clipe anterior. A imagem só mudava quando a transição terminava.

O decodificador reutiliza canvases. A implementação buscava o quadro final anterior em cada quadro da transição, voltando no mesmo arquivo que também estava fornecendo o clipe de entrada. Isso sobrescrevia o canvas da entrada e reiniciava a leitura repetidamente. O teste anterior de 4 fps e quadros isolados não havia exposto esse problema.

No teste original, Dissolver levou aproximadamente **151 ms por quadro na mediana** e Deslizar **144,5 ms**. Com a correção, o mesmo roteiro ficou em aproximadamente **3,8 ms** e **3,6 ms**, com percentil 95 abaixo de 15 ms. Houve um pico de aproximadamente 103 ms na primeira leitura. São medidas deste computador e desta mídia, não garantia de desempenho em outros equipamentos ou em 4K.

## Correções

- A transição mantém uma cópia própria do quadro final anterior. Não volta no arquivo para buscar os mesmos pixels em cada quadro e não deixa o decodificador sobrescrever essa imagem.
- O quadro anterior é copiado antes de decodificar a entrada. A mistura do Dissolver e o deslocamento lateral passam a usar imagens distintas.
- O cache de texturas considera a versão temporal do quadro, além da identidade do canvas reutilizado.
- Pedidos de dois clipes no mesmo arquivo deixam de cancelar um ao outro na fila de leitura.
- A miniatura do efeito passa a ser um botão: com um clipe visual selecionado, aplica ao clipe; sem seleção de clipe visual, cria uma faixa cobrindo o projeto. O atalho “+” usa a mesma ação. Arrastar continua permitindo escolher um intervalo.
- Se o clipe selecionado estiver fora da posição atual da prévia, o editor mostra o começo desse clipe para tornar a aplicação visível.
- As miniaturas dos efeitos usam filtros nativos de interface, sem tocar no compositor do vídeo. A prévia e a exportação dos efeitos continuam usando o shader Rust.

O motor de Preto e branco passou no teste antes da correção. A falha concreta encontrada nesse fluxo era a aplicação pela interface: clicar na imagem não aplicava nada, e o botão anterior criava somente uma faixa curta na posição do indicador, que podia estar fora do vídeo.

## Evidências

| Verificação                                                                       | Resultado                                                                                                  |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Movimento a 720p/30 fps, dois cortes no mesmo arquivo                             | Passou                                                                                                     |
| Dissolver durante a reprodução renderizada                                        | Mistura progressiva de vermelho para azul; ponto médio próximo de RGB 127, 32, 128                         |
| Deslizar durante a reprodução renderizada                                         | Quadros distintos, deslocamento lateral correto                                                            |
| Arquivos MP4 e WebM com as duas transições a 720p/30 fps                          | Quadros intermediários corretos; MP4 com 4 s e WebM com aproximadamente 4,0003 s                           |
| Preto e branco por comando de clipe e por faixa de efeito                         | Canais RGB iguais na prévia e na exportação                                                                |
| Clique real na miniatura com um clipe selecionado                                 | Aplicou o efeito e mostrou imediatamente o clipe em cinza; sem clipe selecionado, cobriu o projeto inteiro |
| Renderização de miniaturas com o vídeo aberto                                     | Não alterou tamanho ou pixels do compositor de vídeo                                                       |
| Testes direcionados de leitura, tradução, prévia, compositor, salvamento e backup | 16 passaram, 0 falharam                                                                                    |
| Verificação de tipos e compilação de produção                                     | Passaram                                                                                                   |
| Revisão estática dos arquivos alterados                                           | Sem erros ou avisos                                                                                        |

O roteiro completo está em `scripts/qa/playback-harness.tsx`. Gera a própria mídia, compara a prévia com os arquivos decodificados e verifica também o caminho de comandos usado pela interface. A rota temporária de testes é removida antes da publicação.

A suíte completa manteve **207 aprovados, 8 falhas e 2 erros de carregamento**: as mesmas falhas anteriores de WASM/Bun e testes de posicionamento com dependências circulares. As mídias originais do usuário não foram fornecidas. As transições continuam sendo visuais, usando o último quadro do clipe anterior, sem misturar o áudio entre clipes.

As releases e tags anteriores permanecem intactas. Esta correção identifica o aplicativo como **0.3.4**; a release do GitHub é uma publicação separada.
