# Changelog

## Não lançado — CAP-001 v1.1

- preserva e audita a fonte CAP-001 com normalização determinística;
- adiciona 14 ambientes com maturidade explícita e oito estratégias TypeScript;
- separa conforto de acessibilidade, preserva inferências e conflitos;
- inclui calculadora, estudos, comparador de quatro cenários e breakdown rastreável;
- aplica resultados ao Programa de Necessidades com confirmação e metadados;
- migra o IndexedDB para v3 e inclui estudos no backup/restauração atômicos.

## Não lançado — Backup consolidado

- exportação versionada de todos os cadastros em um único JSON;
- validação de versão, schema, IDs e códigos antes da restauração;
- substituição atômica da base local após confirmação explícita;
- testes unitários, integração IndexedDB e fluxo E2E de recuperação.

## Não lançado — Correções do piloto

- corrige o recorte da logo de 2000×2000 no cabeçalho sticky para impedir que
  sua área bloqueie a rolagem;
- adiciona regressão E2E para altura do cabeçalho e scroll sobre a logo em
  desktop e mobile.

## v0.2.0-pilot — 2026-07-28

- configuração do Worker `th-os-cmp-001-pilot` para Vinext/Vite e Wrangler 4;
- scripts de preview, dry-run real do bundle e implantação manual;
- aviso acessível de que os dados permanecem somente no navegador/dispositivo;
- cobertura E2E de aviso local, exportação móvel e isolamento entre contextos;
- guia de implantação, rollback, segredos e checklist pós-deploy;
- implantação validada em
  `https://th-os-cmp-001-pilot.jowbryan.workers.dev`;
- smoke test público sem erros de navegador e sete cenários E2E aprovados.

## 2026-07-28 — Consolidação v2 para uso piloto

- seed canônico de Cacoal/RO sem dados pessoais inventados;
- modelo v2, enums, Zod e migração explícita v1 → v2;
- escopo, programa, planejamento, orçamento e registros ampliados;
- progresso ponderado e quatro níveis de prontidão sem mutação;
- importação/exportação envelopada e autosave serializado;
- workspace com 14 seções, busca, filtros e ordenação;
- testes unitários, IndexedDB, smoke, Playwright e CI.

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
# Não publicado — correções do PR #5

- Layout CAP responsivo e toast acessível.
- Entrada decimal pt-BR e ciclo completo de itens personalizados.
- Catálogos referenciais reutilizáveis com combobox e IndexedDB v4.
- Backup consolidado v3 com catálogos e compatibilidade de leitura anterior.
