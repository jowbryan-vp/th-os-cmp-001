# Versionamento CAP-001

`CapLibraryMetadata` registra código, SemVer, schema, hash da origem, data determinística de geração, status e versão mínima da aplicação. A versão inicial integrada é biblioteca `1.1.0`, schema `1`, motor `1.0.0`.

Cada estudo guarda `libraryCode`, `libraryVersion`, `libraryHash`, `engineVersion`, timestamps e uma cópia dos parâmetros e resultados. Atualizar a biblioteca não altera estudos salvos. A evolução prevista é duplicar um estudo, recalculá-lo conscientemente com uma nova versão e comparar os resultados.

Mudança de dados sem quebra incrementa patch; inclusão compatível incrementa minor; alteração incompatível de contrato ou semântica incrementa major. O backup rejeita versões de envelope incompatíveis antes de iniciar sua transação.
