# Validação — OpenCut Classic Community 0.3.3

## Alterações

- O seletor de exportação oferece 480p, 720p, 1080p e 1440p com dimensões reais. A proporção é preservada e o lado menor define a resolução em projetos verticais. O quadro completo é redimensionado depois da composição, preservando posições, fontes e efeitos sem alterar o projeto.
- Transições **Dissolver** e **Deslizar para a esquerda**, aplicadas ao segundo de dois clipes de vídeo/imagem encostados na mesma faixa. Há ajuste de duração, remoção e desfazer.
- As transições usam o último quadro visível do clipe anterior. Não revelam material removido pelo corte nem alteram a duração do projeto ou a posição do áudio. A duração é limitada à metade de cada clipe. Afastar os clipes desativa a transição.
- Novo efeito **Preto e branco**, com intensidade ajustável, para clipes e faixas de efeitos.
- Japonês e inglês do Reino Unido adicionados. Os cinco catálogos têm **1.218 mensagens**, com verificação de cobertura e marcadores de interpolação. A variante britânica inclui termos como Colour, Centre e Favourites. Nomes de arquivos e conteúdo do usuário são preservados.
- A lógica de dimensões e tempo das transições, assim como o shader do efeito, ficam em Rust. O componente compilado está incluído no repositório; o uso local e a Vercel não exigem instalação de Rust.

## Testes

| Verificação                                                                             | Resultado                                                 |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Rust: crate de tempo, incluindo dimensões, orientação e limites das transições          | 13 passaram                                               |
| Compilação Rust/WASM e geração dos bindings                                             | Passou no GitHub Actions                                  |
| Testes direcionados de traduções, salvamento, backup, cancelamento, prévia e compositor | 15 passaram, 0 falharam                                   |
| Verificação de tipos da aplicação                                                       | Passou                                                    |
| Compilação de produção                                                                  | Passou                                                    |
| WebM 480p com Dissolver                                                                 | 854 × 480, duração de 4 s                                 |
| WebM 720p com Deslizar para a esquerda                                                  | 1280 × 720, duração de 4 s                                |
| WebM 1080p com Dissolver e preto e branco no clipe                                      | 1920 × 1080, duração de 4 s                               |
| WebM 1440p com Deslizar e preto e branco na cena                                        | 2560 × 1440, duração de 4 s                               |
| MP4 720p com Dissolver                                                                  | 1280 × 720, cerca de 4,017 s, incluindo preenchimento AAC |
| Áudio durante as transições                                                             | Presente nos cinco arquivos; RMS entre 0,093 e 0,103      |
| Comparação da prévia com quadros decodificados dos arquivos                             | Passou nos cinco casos                                    |
| Marcador visual após redimensionamento                                                  | Posição proporcional preservada                           |
| Backup com transição                                                                    | Configuração preservada na restauração                    |
| Interface: aplicar, ajustar duração, remover e desfazer                                 | Passou                                                    |
| Interface: selecionar japonês e inglês do Reino Unido                                   | Passou                                                    |

Os testes no navegador foram feitos no **Windows com Chrome**, usando vídeo sintético de quatro segundos visíveis a 4 fps, duas cores, um marcador branco e áudio de 440 Hz. Não são uma avaliação de vídeos longos em 1440p, de fala real ou de todos os equipamentos. O teste da fonte é de baixa resolução; selecionar uma resolução maior não recupera detalhes ausentes no original.

A suíte completa teve **206 testes aprovados, 8 falhas e 2 erros de carregamento**. São os mesmos problemas anteriores da base: inicialização de WASM no Bun e dependências circulares/defaults em testes de posicionamento da linha do tempo. A suíte inteira ainda não está verde.

## Limites

- As transições atuais são visuais, usando quadro final congelado do clipe anterior. Não incluem mistura de áudio entre clipes nem sobreposição de trechos de movimento.
- Testar vídeos pessoais importantes primeiro com uma cópia e manter backup. Limitações de codecs e capacidade do navegador continuam aplicáveis.
- O japonês foi traduzido e conferido quanto a cobertura, variáveis e apresentação. Revisão por falantes nativos continua sendo bem-vinda.
- As tags e releases anteriores não são alteradas. A criação de uma release 0.3.3 no GitHub é separada da atualização do código e do site.

## Reprodução

Veja [o roteiro de testes](../scripts/qa/README.md) e `features-033-harness.tsx`. A rota temporária de testes é removida antes da publicação.

Proveniência da compilação do componente Rust: [GitHub Actions](https://github.com/nexora-sudo/OpenCut/actions/runs/40222520496). O artefato baixado foi validado pelo SHA-256 fornecido pelo GitHub. Veja `vendor/opencut-wasm/README.md`.
