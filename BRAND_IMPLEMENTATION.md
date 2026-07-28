# Implementação da identidade visual - TH Arquitetura

## 1. Materiais analisados

### Manual e documento funcional

| Arquivo | Formato | Leitura realizada | Finalidade |
|---|---|---|---|
| `MANUAL-DA-MARCA-TH-ARQUITETURA_074417.pdf` | PDF, 20 páginas | Todas as páginas renderizadas e verificadas visualmente | Fonte normativa da identidade |
| `Contrato TH ARQ.docx` | DOCX | Conteúdo e estrutura extraídos; a renderização visual não foi possível por ausência do LibreOffice no ambiente | Referência funcional para campos, etapas, escopo e honorários |

O manual é composto por imagens e não possui camada de texto selecionável. A análise foi feita sobre a renderização integral das 20 páginas.

### Inventário dos arquivos de marca

| Arquivo original | Formato | Versão | Fundo recomendado | Possível uso |
|---|---|---|---|---|
| `TH LOGO 01.pdf` | PDF | Assinatura horizontal | Conforme a arte do arquivo; produção gráfica | Arquivo mestre de impressão |
| `TH LOGO 01 (1).pdf` | PDF | Assinatura horizontal | Idêntico ao anterior | Duplicado exato; não usar |
| `TH LOGO LOGO 02.pdf` | PDF | Assinatura vertical | Conforme a arte do arquivo; produção gráfica | Arquivo mestre de impressão |
| `TH LOGO LOGO 02 (1).pdf` | PDF | Assinatura vertical | Idêntico ao anterior | Duplicado exato; não usar |
| `TH LOGO 03.pdf` | PDF | Assinatura circular | Conforme a arte do arquivo; produção gráfica | Arquivo mestre de impressão |
| `TH LOGO 03 (1).pdf` | PDF | Assinatura circular | Idêntico ao anterior | Duplicado exato; não usar |
| `TH LOGO 01.png` | PNG, 2000 x 2000 | Horizontal positiva sobre verde militar | Verde militar oficial | Peça pronta com fundo |
| `TH LOGO 01-fundo-branco.png` | PNG, 2000 x 2000 | Horizontal positiva | Branco | Peça pronta com fundo |
| `TH LOGO 01-preto-e-branco.png` | PNG, 2000 x 2000 | Horizontal negativa | Preto | Peça pronta com fundo |
| `TH LOGO 01-sem fundo.png` | PNG RGBA, 2000 x 2000 | Horizontal positiva transparente | Claro, branco ou fotografia clara com contraste | Cabeçalho, relatório e impressão |
| `TH LOGO 01-sem fundo-branco.png` | PNG RGBA, 2000 x 2000 | Horizontal negativa transparente | Preto, verde militar ou fotografia escura com contraste | Superfícies escuras |
| `TH LOGO 02.png` | PNG, 2000 x 2000 | Vertical positiva sobre verde militar | Verde militar oficial | Peça pronta com fundo |
| `TH LOGO 02-fundo-branco.png` | PNG, 2000 x 2000 | Vertical positiva | Branco | Peça pronta com fundo |
| `TH LOGO 02-preto-e-branco.png` | PNG, 2000 x 2000 | Vertical negativa | Preto | Peça pronta com fundo |
| `TH LOGO 02-sem fundo.png` | PNG RGBA, 2000 x 2000 | Vertical positiva transparente | Claro ou branco | Assinatura compacta e telas menores |
| `TH LOGO 02-sem fundo-branco.png` | PNG RGBA, 2000 x 2000 | Vertical negativa transparente | Preto ou verde militar | Superfícies escuras compactas |
| `TH LOGO 03.png` | PNG, 2000 x 2000 | Circular positiva sobre verde militar | Verde militar oficial | Selo ou aplicação editorial |
| `TH LOGO 03-fundo-branco.png` | PNG, 2000 x 2000 | Circular positiva | Branco | Selo em peça clara |
| `TH LOGO 03-preto-e-branco.png` | PNG, 2000 x 2000 | Circular negativa | Preto | Selo em peça escura |
| `TH LOGO 03-sem fundo.png` | PNG RGBA, 2000 x 2000 | Circular positiva transparente | Claro ou branco | Aplicação editorial específica |
| `TH LOGO 03-sem fundo-branco.png` | PNG RGBA, 2000 x 2000 | Circular negativa transparente | Preto ou verde militar | Aplicação editorial escura |

Os três pares de PDFs marcados com `(1)` possuem o mesmo hash SHA-256 dos arquivos sem o sufixo e são duplicados binários.

## 2. Identificação da marca

- **Logotipo principal:** versão 01, assinatura horizontal com símbolo TH à esquerda e denominação `TH ARQUITETURA` à direita.
- **Versão horizontal:** versão 01.
- **Versão vertical:** versão 02, com a denominação posicionada verticalmente ao lado do símbolo.
- **Versão reduzida:** o manual não fornece um arquivo isolado do símbolo. A versão 02 foi adotada como assinatura compacta oficial. O símbolo não foi recortado nem reconstruído.
- **Versão circular/editorial:** versão 03, com a denominação disposta ao redor do símbolo.
- **Positiva:** marca preta para fundos brancos, claros ou de contraste suficiente.
- **Negativa:** marca branca para fundos pretos, verde militar ou imagens escuras.
- **Monocromática:** preto, branco e escalas de 30% e 50% de preto, conforme a página 11 do manual.

## 3. Paleta cromática

Valores explicitamente informados pelo manual:

| Cor | RGB | HEX | CMYK | Uso na interface |
|---|---:|---|---:|---|
| Verde militar | 103, 112, 72 | `#677048` | 70, 50, 84, 9 | Ações principais, foco, seleção e estados positivos |
| Preto | 0, 0, 0 | `#000000` | 84, 83, 73, 80 | Marca, impressão e contraste máximo |
| Branco | 255, 255, 255 | `#FFFFFF` | 0, 0, 0, 0 | Superfícies e marca negativa |

Os neutros funcionais da interface são derivações de preto e branco para texto, bordas e superfícies. Eles estão centralizados em `src/styles/tokens.css` e não alteram a cor da marca.

## 4. Tipografia

O manual identifica **Organetto**, com pesos Regular, Bold e Light. Também informa que a tipografia do logotipo recebeu alterações próprias.

Nenhum arquivo de fonte ou licença foi fornecido na pasta. Por isso:

- Organetto não foi incorporada ao repositório;
- a interface usa **Geist Sans**, já presente na base técnica e com desenho geométrico contemporâneo;
- Aptos, Helvetica Neue e Arial são alternativas de sistema;
- a arte tipográfica do logotipo permanece preservada dentro dos PNGs oficiais.

## 5. Área de proteção, redução mínima e usos incorretos

O manual fornecido **não apresenta medidas numéricas** de área de proteção ou redução mínima e **não contém uma seção formal de usos incorretos**. Nenhum valor foi atribuído à marca como se fosse oficial.

Regras conservadoras de implementação, documentadas como decisões da aplicação:

- a assinatura horizontal é exibida com largura visual aproximada de 208 px no desktop;
- a assinatura vertical é exibida com largura visual aproximada de 56 px em telas menores;
- o recorte CSS remove apenas a grande margem transparente interna do PNG e mantém todos os pixels visíveis da marca;
- a área funcional ao redor da marca permanece livre, sem sobreposição de controles;
- a marca nunca é distorcida, rotacionada, recolorida, comprimida ou usada como padrão decorativo;
- não são aplicadas sombras, contornos, gradientes, filtros ou efeitos ao logotipo;
- fundos fotográficos só podem receber a versão cuja cor mantenha contraste claro, conforme as páginas 13 e 14 do manual.

## 6. Arquivos selecionados para a aplicação

| Arquivo no projeto | Origem oficial | Contexto |
|---|---|---|
| `src/assets/brand/th-logo-horizontal-positive.png` | `TH LOGO 01-sem fundo.png` | Cabeçalho desktop, resumo e impressão em fundo branco |
| `src/assets/brand/th-logo-vertical-positive.png` | `TH LOGO 02-sem fundo.png` | Cabeçalho compacto em telas menores |

Os arquivos foram copiados sem recompressão ou alteração binária. As versões negativas permanecem disponíveis na pasta original, mas não foram incluídas no projeto porque a interface final não posiciona logotipos sobre superfícies escuras.

## 7. Design tokens

`src/styles/tokens.css` centraliza:

- cores institucionais e neutros funcionais;
- cores de fundo, texto, borda, foco e sucesso;
- família tipográfica e pesos;
- escala de espaçamento;
- raios de borda;
- sombras discretas para cartões e notificações;
- duração de transições e largura máxima do conteúdo.

O verde militar é usado com parcimônia. Fundos principais são claros para evitar uma interface fria ou excessivamente escura.

## 8. Regras aplicadas na interface

- cabeçalho com assinatura completa em desktop;
- assinatura vertical oficial no tablet compacto e no celular;
- navegação com estado selecionado;
- botões primários e estados de foco em verde militar;
- cartões brancos com bordas neutras;
- formulários com rótulos persistentes e foco visível;
- resumo lateral fixo no desktop e reposicionado no fluxo em telas menores;
- mensagem de confirmação discreta após salvar;
- estado de conclusão antes da emissão;
- tela de impressão em fundo branco, com logotipo positivo e sem navegação;
- botão de emissão que abre a impressão do navegador, permitindo salvar em PDF;
- conteúdo preservado em desktop, tablet e celular sem ocultar informações funcionais.

## 9. Componentes com identidade implementada

- tela inicial e estrutura da aplicação;
- cabeçalho;
- navegação;
- botões e ações principais;
- estados de foco, seleção e confirmação;
- cartões;
- campos, seletores, áreas de texto e checkboxes;
- etapas e prazos;
- resumo lateral;
- estado de conclusão;
- notificação de salvamento;
- tela de impressão e saída para PDF.

## 10. Limitações registradas

- o manual não especifica área de proteção, redução mínima nem usos incorretos;
- não há arquivo oficial contendo apenas o símbolo;
- não há SVG oficial; os PNGs transparentes foram escolhidos por serem os formatos web oficiais disponíveis;
- os PNGs têm tela de 2000 x 2000 px e margens transparentes extensas; a aplicação usa recorte visual por CSS sem alterar os arquivos;
- os PDFs de logotipo são arquivos de impressão grandes e não foram convertidos para SVG;
- Organetto não foi incorporada por ausência de arquivo e licença;
- o contrato em Word foi usado como referência funcional, sem modificar o original;
- a verificação visual do DOCX não pôde ser concluída porque o renderizador LibreOffice não está disponível; isso não afeta a leitura estrutural usada na interface.
