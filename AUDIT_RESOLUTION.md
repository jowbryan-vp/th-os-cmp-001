# Resolução da auditoria — CMP-001

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

## Limitações aceitas

Reordenação por drag-and-drop, agrupamento avançado do programa e backup
consolidado permanecem próximos passos. Proposta, contrato, honorários,
financeiro, login e upload seguem fora do produto.
