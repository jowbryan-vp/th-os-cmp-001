# Changelog

## 2026-07-28 — Reestruturação para CMP-001

### Adicionado

- identificação institucional TH Arquitetura / TH OS / CMP-001;
- entidade central `ProjectMasterRecord` e `schemaVersion`;
- `ProjectRepository` com IndexedDB;
- geração de código `TH-AAAA-NNN`;
- projeto piloto `TH-2026-001`;
- listagem, criação, edição, duplicação, arquivamento, restauração e exclusão;
- autosave, importação e exportação JSON;
- seções completas do Cadastro Mestre do Projeto;
- progresso e validações para rascunho, reunião e proposta;
- resumo institucional para impressão;
- `DATA_MODEL.md` e `NEXT_STEPS.md`.

### Removido

- conceito e nomenclatura “TH Arquitetura — Contratos”;
- fluxo Contrato → Escopo → Prazos;
- botões e textos de emissão contratual;
- honorários, parcelamento e validade de contrato;
- dados fictícios da antiga tela e código `TH-2026-014`;
- helper de autenticação não utilizado;
- scaffold de D1/Drizzle não utilizado.

### Preservado

- arquivos oficiais selecionados em `src/assets/brand`;
- `src/styles/tokens.css`;
- decisões válidas de identidade, tipografia substituta e uso das marcas;
- fundamentos visuais genéricos de botões, formulários, cartões,
  responsividade e impressão.
