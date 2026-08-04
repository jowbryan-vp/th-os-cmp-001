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

Componentes usam repositórios. Snapshot contém payload, motor e checksum; regravação do ID é rejeitada. Backup v4 inclui `honSchemaVersion: 1` e restaura CMP, CAP e HON em uma transação.
