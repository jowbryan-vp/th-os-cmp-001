# DS-001 — Auditoria visual da interface

Auditoria inicial em 2026-08-04 sobre a `main` no merge `fad7ff35734eee52240b593954a57c74050394e1`. Escopo: CMP-001, CAP-001 e HON-001. Nenhuma regra de negócio faz parte desta auditoria.

## Inventário

- 71 ocorrências de `<button>`, com mistura de classes `.button`, estilos por módulo e botões sem variante explícita;
- 59 inputs, 14 selects e helpers de campo duplicados entre CMP e HON;
- 6 tabelas com scroll local, mas sem primitiva compartilhada ou fallback documentado;
- tokens CSS parciais em `src/styles/tokens.css`;
- dois ativos oficiais da marca preservados em `src/assets/brand`;
- toasts locais, confirmações nativas e navegações por tabs implementadas separadamente.

## Achados e plano de correção

| Componente | Estado atual | Problema e risco | Classificação | Equivalente desejado | Status |
|---|---|---|---|---|---|
| Botões | Classe parcial e muitos botões crus | Ações parecem texto/marca-texto; hierarquia e disabled variam | clareza, feedback, manutenção | `Button` com 7 variantes, 3 tamanhos e loading | concluído |
| Links | Classes locais e anchors sem padrão | Texto navegável nem sempre se distingue | clareza, acessibilidade | `Link` inline/standalone/navigation/subtle | planejado |
| Tabs | CAP e HON duplicam regras | Ativo depende principalmente de cor; teclado incompleto | acessibilidade, inconsistência | `Tabs` com indicador, `aria-selected` e setas | concluído |
| Menus | Ações expostas em linha | Muitas ações competem e estouram no celular | hierarquia, responsividade | `ActionMenu` | concluído |
| Cards | Variações CMP/CAP/HON | Clickable e estático usam sinais inconsistentes | clareza, manutenção | `Card` e `ClickableCard` | planejado |
| Inputs/selects | Estilo global e helpers locais | Estados invalid/read-only/loading não são uniformes | acessibilidade, inconsistência | família `Field` | concluído por primitivas e adaptadores |
| Combobox | Componente próprio funcional | Aparência e foco não usam tokens consolidados | consistência | adaptar ao padrão DS sem mudar busca/criação | planejado |
| Checkbox/radio | Nativos dentro de cards locais | Área clicável e feedback variam | acessibilidade, clareza | `Checkbox` e `Radio` | planejado |
| Switch | Ausente | Futuros toggles tenderiam a implementações ad hoc | manutenção | `Switch` | planejado |
| Toast | Único estilo local | Sem variantes semânticas e posição pode competir no celular | feedback, responsividade | `Toast` | concluído |
| Modal/diálogo | `window.confirm` | Sem foco preso, descrição ou hierarquia própria | acessibilidade, feedback | `Modal` e `ConfirmDialog` | concluído nas ações destrutivas |
| Tabelas | CSS por módulo | Números e ações sem contrato compartilhado | responsividade, manutenção | `DataTable` | planejado |
| Badges/chips | Várias classes locais | Sem mapa semântico único; risco de usar badge como ação | inconsistência | `Badge`, `StatusBadge`, `Tag`, `Chip` | planejado |
| Loading | Texto simples em telas | Feedback discreto demais e sem anúncio uniforme | feedback, acessibilidade | `Spinner`, `Skeleton`, `ProgressBar` | concluído |
| Estados vazios | Parágrafos locais | Não orientam próxima ação de modo consistente | hierarquia, feedback | `EmptyState` | concluído |
| Topbar/action bar | Ações misturadas no cabeçalho | Em telas estreitas há competição e wrap pouco previsível | responsividade, hierarquia | `PageActionBar` | planejado |
| Foco | Regras duplicadas | Box-shadow e outline coexistem; nem todo controle tem offset | acessibilidade | token `semantic.focus` + ring único | concluído |
| Destrutivas | Texto vermelho ou botão final | Separação visual insuficiente e confirmação nativa | clareza, acessibilidade | `Button destructive` + `ConfirmDialog` | concluído |
| Responsividade | Media queries por módulo | Regras repetidas e risco de overflow/ação cortada | responsividade, manutenção | breakpoints/token e testes 7 viewports | concluído |
| Ícones | Emojis/sinais textuais pontuais | Traço e semântica não controlados | consistência, acessibilidade | uma biblioteca de ícones, sempre com texto/aria | concluído |

## Riscos prioritários

1. Botões primários e secundários competem ou parecem marca-texto.
2. Ações destrutivas ficam próximas de ações comuns sem diálogo acessível.
3. Tabs não oferecem contrato completo de teclado.
4. Estados disabled/loading não são sistemáticos.
5. CSS duplicado por módulo aumenta divergência futura.

Os itens ainda marcados como planejados possuem primitivas disponíveis e serão adotados conforme cada fluxo for revisitado; nenhum deles bloqueia a migração crítica de CMP, CAP e HON.
