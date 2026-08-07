# HON-001 — Modelo de dados

IndexedDB `th-os` v5 adiciona:

| Store | Entidade | Índices |
|---|---|---|
| `fee-studies` | `FeeCalculationStudy` | projectId, status, updatedAt |
| `fee-scenarios` | `FeeScenario` | studyId |
| `structure-profiles` | `StructureProfile` | active, kind |
| `service-catalog` | `ServiceCatalogItem` | code único, active |
| `fee-snapshots` | `FeeSnapshot` | studyId, projectId |
| `payment-plans` | `PaymentPlan` | studyId |
| `fee-calibration-records` | `FeeCalibrationRecord` | studyId, projectId |

Componentes usam repositórios. Snapshot contém payload, motor e checksum; regravação do ID é rejeitada. Backup v4 restaura CMP, CAP e HON em uma transação.

## HON_SCHEMA_VERSION 2 (HON-002B)

`ServiceCatalogItem` ganhou `category`, `clientDescription`, `technicalDescription`, `deliverables`, `exclusions`, `assumptions` e `displayOrder` — ver `docs/hon/HON_SERVICE_CATALOG.md`. Nenhuma outra entidade do HON mudou de forma nesta fase; `StructureProfile`/`FeeCalculationStudy` só passaram a ser gravados com `schemaVersion: 2` por usarem a mesma constante `HON_SCHEMA_VERSION`, sem incompatibilidade (o schema valida `schemaVersion` como inteiro positivo, não um literal).

A store `service-catalog` não mudou de versão do IndexedDB — o formato do registro é responsabilidade do schema Zod/migração, não da estrutura da store. `backupV4EnvelopeSchema` aceita `honSchemaVersion` 1 ou 2; o array `serviceCatalog` do envelope fica solto (não tipado estritamente) até passar por `parseHonBackupData`, que aplica a migração antes da validação estrita — assim um backup exportado antes do HON-002B continua sendo restaurado.

`hon-migrations.ts` (`migrateServiceCatalogItem`) preenche só os campos ausentes de um registro no formato anterior, a partir do conteúdo curado por código (`hon-catalog-content.ts`) ou de defaults seguros para itens personalizados com código desconhecido. Nunca sobrescreve um campo já presente — idempotente, sem perda de customização. Aplicado tanto em `ServiceCatalogRepository` (leitura direta do IndexedDB) quanto em `parseHonBackupData` (restauração de backup).

## HON_SCHEMA_VERSION 3 (HON-002C)

`FeeServiceInput` (a linha de serviço dentro de `FeeCalculationStudy.services` e `FeeScenario.services`) ganhou composição comercial: `commercialState` (`"included" | "optional" | "complimentary" | "not_contracted"`, fonte única de verdade — `included`/`optional`/`complimentary` continuam existindo como projeção derivada, sempre escrita em conjunto por `withCommercialState`), `quantity`, `individualDiscountCents`, `category`, `displayOrder` e `customDescription` (enriquecimento de item personalizado, `catalogItemId: null`). `FeeCalculationStudy` ganhou `compositionHistory` — ver `docs/hon/HON_SERVICE_COMPOSITION.md`.

`services` dentro de `feeStudySchema`/`feeScenarioSchema` continua um `z.array(z.record(...))` solto (nunca foi tipado estritamente campo a campo) — a forma real de `FeeServiceInput` é responsabilidade do TypeScript e da migração, não do schema Zod. Por isso a migração dos campos novos é obrigatória e explícita: `hon-migrations.ts` ganha `migrateFeeServiceInput` (deriva `commercialState` do `included` legado, recomputa os três booleanos derivados sempre a partir do enum — autocorrigindo qualquer combinação incoerente salva fora do app —, e preenche `category`/`displayOrder` pelo mesmo conteúdo curado por código do catálogo), `migrateFeeStudy`, `migrateFeeScenario` e `migrateFeeSnapshot` (migra o `payload` embutido, imutável, de um snapshot salvo antes do HON-002C). Aplicados em `FeeStudyRepository`, `FeeScenarioRepository`, `FeeSnapshotRepository` e `parseHonBackupData`.

`compositionHistory` é diferente: como um array vazio já é um conteúdo válido (nenhuma decisão registrada ainda), o campo usa `.optional().default([])` no próprio schema Zod — não precisa de migração manual.

`backupV4EnvelopeSchema.honSchemaVersion` aceita 1, 2 ou 3 — um backup exportado antes do HON-002C continua sendo restaurado. Nenhuma store nova, nenhuma mudança de `DB_VERSION` (continua 5): tudo cabe no mesmo formato JSON das stores existentes.
