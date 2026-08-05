# DS-001 — Tokens

Tokens TypeScript ficam em `src/design-system/tokens` e as custom properties em `src/styles/tokens.css`. As duas representações compartilham os mesmos nomes conceituais.

- Cores: marca, neutros, superfícies, texto, bordas e estados semânticos.
- Tipografia: Aptos, escala, pesos e alturas de linha.
- Espaço: escala de 4 px; use tokens em vez de números locais.
- Bordas, raios e sombras: elevação discreta e foco visível.
- Movimento: durações curtas; `prefers-reduced-motion` desativa animações não essenciais.
- Camadas e breakpoints: menus/modais e layouts responsivos padronizados.

Não introduza nova cor, raio ou sombra dentro de um módulo antes de verificar se o token já existe.
