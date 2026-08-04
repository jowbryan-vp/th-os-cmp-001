# Resolução da auditoria — CMP-001

## HON-001

O módulo separa custo, mínimo, recomendado, comercial e final; usa centavos; faz gross-up do imposto; separa desconto/doação; preserva snapshots; usa repositórios e não envia dados financeiros a serviços externos.

| Problema | Solução | Arquivo principal | Teste | Status |
|---|---|---|---|---|
| Seed fictício | Seed de Cacoal sem dados pessoais inventados | `project-master-record.ts` | domínio | Resolvido |
| Modelo simplificado | Schema v2, agregados e enums | `project-schemas.ts` | domínio | Resolvido |
| Migração implícita | Migração v1 → v2 e rejeição futura | `project-migrations.ts` | domínio | Resolvido |
| Escopo como strings | Itens e catálogo estruturados | `project-master-record.ts` | domínio/E2E | Resolvido |
| Programa reduzido | Áreas, intervenção, prioridade e resumo | `project-progress.ts` | domínio | Resolvido |
| Progresso booleano | Pesos por grupo | `project-progress.ts` | domínio | Resolvido |
| Validação alterava status | Prontidão pura em quatro níveis | `project-validation.ts` | domínio | Resolvido |
| Importação permissiva | Envelope, Zod, migração e conflitos | `project-import-service.ts` | domínio/E2E | Resolvido |
| Autosave concorrente | Fila, token, retry e aviso de saída | `use-project-autosave.ts` | E2E | Resolvido |
| Página monolítica | Entrada mínima e workspace separado | `app/page.tsx` | smoke/E2E | Resolvido |
| Lista limitada | Busca, filtros, ordenação e alertas | `project-workspace.tsx` | E2E/manual | Resolvido |
| Testes textuais | Domínio, fake IndexedDB, smoke e Playwright | `tests/` | CI | Resolvido |
| Sem CI/typecheck | Scripts e dois jobs | `package.json`, `ci.yml` | Actions | Resolvido |
| Biblioteca sem auditoria | Fonte imutável, hash e relatório reproduzível | `scripts/cap/normalize.ts`, `docs/cap/` | CAP biblioteca | Resolvido |
| Fórmulas textuais inseguras | Registry com estratégias TypeScript explícitas | `src/features/cap/services/` | CAP motor | Resolvido |
| Conforto acoplado à acessibilidade | Domínios e controles independentes | `cap-library-schema.ts` | CAP biblioteca/motor | Resolvido |
| Estudos fora do backup | Envelope v2 e transação em duas stores | `project-import-service.ts`, `th-os-database.ts` | integração/E2E | Resolvido |
| Referências técnicas indiretas | Aviso obrigatório e revisão técnica documentada | `CAP_TECHNICAL_REVIEW.md` | CAP biblioteca | Pendente de arquiteto |

## Limitações aceitas

Reordenação por drag-and-drop e agrupamento avançado do programa permanecem
próximos passos. A revisão técnica CAP-001 continua aberta. Proposta, contrato, honorários,
financeiro, login e upload seguem fora do produto.
# Complemento — revisão visual e funcional do PR #5

Foram tratados os achados de corte em larguras intermediárias, aviso ilegível, entrada decimal com vírgula, erro técnico em item personalizado incompleto, ausência de edição/duplicação e falta de catálogo central. A evidência automatizada fica nos testes unitários, de integração e E2E; a evidência visual é produzida como artefato do Playwright.
