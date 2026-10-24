# Validação — OpenCut Classic Community 0.3.2

## Correções e proteção dos projetos

- A exportação decodifica e mistura o áudio em janelas de um segundo. Não monta todas as fontes e a linha do tempo inteira em buffers PCM simultâneos.
- O arquivo final usa armazenamento temporário do navegador em disco quando disponível, com retorno em memória como alternativa.
- Falhas de áudio e codecs deixam de ser descartadas silenciosamente. A exportação mostra a etapa atual, aceita cancelamento e aplica limites de espera para operações sem resposta.
- Corrigidas as unidades de tempo dos clipes de áudio da biblioteca. Preservados FPS e detecção de áudio ao salvar/carregar mídias.
- A prévia e a exportação deixam de disputar o compositor compartilhado. O cancelamento de uma preparação de quadro libera a fila de renderização.
- O salvamento expõe estados pendente, salvando, salvo e erro. Um flush aguarda gravações anteriores e persiste alterações feitas durante a gravação. Falhas ficam pendentes; a saída não descarta o projeto após erro de salvamento.
- Backup `.opencut` inclui projeto e mídias. Áudio da biblioteca é incluído quando pode ser baixado. A restauração cria outro projeto, sem sobrescrever o original. Fontes e outros recursos vinculados podem exigir internet. Não há sincronização por conta ou compartilhamento de projeto por URL.

## Evidência dos testes

Ambiente: Windows e Chrome neste computador. As mídias são sintéticas; os arquivos originais dos relatos não foram fornecidos.

| Verificação                                                                                    | Resultado                                                                        |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Testes direcionados (salvamento, backup, timeout/cancelamento, prévia, compositor e traduções) | 14 passaram, 0 falharam                                                          |
| Tipos da aplicação                                                                             | Passou                                                                           |
| Compilação de produção                                                                         | Passou                                                                           |
| Instalação com lockfile congelado e scripts desativados                                        | Passou                                                                           |
| WebM: vídeo com áudio próprio + música, dois cortes e um intervalo, Blur, texto e adesivo      | Passou; duração de 3 s                                                           |
| MP4: mesma composição                                                                          | Passou; duração de aproximadamente 3,019 s, incluindo preenchimento do codec AAC |
| Cancelamento real no navegador                                                                 | Passou; retornou cancelado sem travar                                            |
| Exportação de 20 minutos                                                                       | Passou; duração de 1.200 s, áudio presente no início/meio/fim                    |
| Backup/restauração dos dados e bytes de mídia                                                  | Passou                                                                           |
| Restauração pela interface em outro navegador                                                  | Passou; projeto e imagem sintética na linha do tempo                             |
| Download de backup pela interface                                                              | Passou no navegador integrado                                                    |

O teste de 20 minutos usa **160×90 a 1 fps**. Ele verifica duração, avanço e processamento de áudio com memória limitada, sem representar o custo de um vídeo de 20 minutos em 1080p ou 4K. Nesta máquina, geração da mídia, exportação, leitura de validação e backup levaram cerca de 62 s no total. Esse número não é uma promessa de desempenho para vídeos reais.

A validação de áudio mede energia e componentes de 440 Hz (áudio do vídeo) e 880 Hz (música). O intervalo entre cortes contém apenas música; depois do fim dos clipes o arquivo fica silencioso. Os quadros decodificados confirmam a troca entre as cores dos cortes e a presença de elementos sobrepostos. Não se trata de teste de transcrição ou de qualidade perceptual da fala.

A suíte completa resultou em **205 testes aprovados, 8 falhas e 2 erros de carregamento**. As falhas reproduzem os problemas já encontrados na base original: inicialização de WASM no Bun e dependências circulares de DEFAULTS/ZERO_MEDIA_TIME em testes da linha do tempo. A suíte inteira não está verde.

## Limites e próximos testes

- Os relatos específicos de macOS/Chrome e Windows/Edge ainda precisam ser confirmados com os arquivos originais nesses ambientes.
- Exportações reais de 15–20 minutos em resoluções maiores continuam dependendo de codec, GPU, memória e espaço disponível. Browsers sem armazenamento em disco continuam usando a alternativa em memória.
- Testar codecs menos comuns, fala real, múltiplas faixas, alterações de velocidade, preservação de tom e arquivos grandes em equipamentos diferentes.
- Fazer backup antes de limpar os dados do navegador. O aviso de alterações pendentes ajuda na saída, mas não garante salvamento em uma queda do navegador ou do sistema.
- A release e tag **v0.3.1 permanecem intactas**. Este trabalho é identificado como 0.3.2; uma nova release pode ser publicada depois da revisão.

## Reproduzir

Veja [os testes audiovisuais locais](../scripts/qa/README.md). O roteiro temporário de testes fica fora das rotas publicadas do aplicativo.
