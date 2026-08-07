# HON-003 — Proposta comercial (Proposal Builder)

Monta uma proposta comercial a partir de um estudo HON já calculado: escopo, opcionais,
condições de pagamento e totais são sempre **copiados** do HON — nunca recalculados dentro da
proposta. A proposta vive como uma nova aba ("Proposta comercial") dentro do `HonWorkspace`,
logo depois de "Resultado" — não um módulo separado, para reaproveitar o contexto de
projeto/estudo já carregado.

## Modelo (`ProposalDraft`)

- `code` — `PROP-{ano}-{sequência de 4 dígitos}` (`nextProposalCode`,
  `hon-proposal-service.ts`), gerado uma única vez na primeira incorporação e nunca recalculado
  depois — mesmo padrão de `nextCode()` para o código `TH-{ano}-{sequência}` dos projetos.
- `projectId` / `studyId` — referência ao CMP-001 e ao estudo HON de origem; o cadastro do
  cliente/projeto não é duplicado (reaproveita `study.projectSnapshot`, já uma cópia de
  trabalho rastreável do CMP/CAP).
- `scopeItems` / `optionalItems` — snapshots **imutáveis** de cada serviço (nome, categoria,
  descrições, entregáveis, exclusões, premissas, quantidade, valor) no momento da
  incorporação; nunca mudam se o catálogo mudar depois. `scopeItems` reúne `included` +
  `complimentary` (o que aparece no escopo apresentado); `optionalItems` é só `optional`;
  `not_contracted` fica de fora — é exclusão de escopo, não faz parte da proposta.
- `totals` — cópia dos campos de `FeeCalculationResult` relevantes (lucro, impostos, desconto,
  doação, ajuste de mínimo, valor comercial, valor final) mais os totais de composição
  (`computeCompositionTotals`, HON-002C).
- `sourceCalculation` — `{ studyId, studyVersion, checksum, incorporatedAt }`, usado só para
  detectar "cálculo mais recente disponível" (ver abaixo).
- `status` — enum completo (`draft | ready | sent | accepted | rejected | expired |
  superseded`); a UI desta fase só expõe `draft`/`ready`, o resto existe no modelo para não
  exigir migração quando o fluxo de envio for implementado.
- Campos manuais — `title`, `introduction`, `observations`, `validUntil`,
  `commercialConditions`, `additionalExclusions`, `additionalAssumptions`. Livres, nunca
  sobrescritos por uma atualização a partir do HON — só os campos acima (sempre derivados) são
  substituídos.

## Incorporar / atualizar (`incorporateStudyIntoProposal`)

Ponto único de entrada, usado tanto por "Incorporar à proposta" (aba Resultado) quanto por
"Atualizar a partir do HON" (aba Proposta comercial), via `requestProposalSync` em
`hon-workspace.tsx`:

1. Sem proposta existente para o estudo → incorpora direto, gera o código, `status: "draft"`.
2. Com proposta existente e sem mudança de cálculo desde a última incorporação (checksum
   igual) → só navega para a aba; nada é sobrescrito.
3. Com proposta existente e mudança de cálculo → confirma antes de sobrescrever
   (`ConfirmDialog`, design system), então substitui `scopeItems`/`optionalItems`/`totals`/
   `paymentPlan`/`sourceCalculation`, preservando id, código e todos os campos manuais.

Isso implementa a idempotência do HON-003: **uma proposta por `studyId`**, aplicada na camada
de aplicação (`ProposalDraftRepository.findByStudyId`) — sem índice único no IndexedDB.
"Incorporar à proposta" repetido nunca duplica, sempre atualiza a mesma proposta.

## Detecção de "cálculo mais recente disponível" (`isProposalStale`)

Compara o checksum do `FeeCalculationResult` atual do estudo com o congelado em
`sourceCalculation` — reaproveita `checksum()` (`hon-study-service.ts`, FNV-1a determinístico,
já usado para os snapshots aprovados). Nunca atualiza sozinho: a proposta exibe um alerta e o
botão "Atualizar a partir do HON" fica habilitado; a atualização é sempre uma ação explícita.

## Persistência

- Nova store `proposal-drafts` (`th-os-database.ts`, `DB_VERSION` 5→6).
- `HON_SCHEMA_VERSION` 3→4 (mesmo versionamento compartilhado das fases anteriores do HON, não
  uma versão separada só para a proposta).
- `ProposalDraftRepository` segue exatamente o padrão de `IndexedDbEntityRepository` já usado
  pelas demais entidades HON.
- Backup consolidado: `backupV4EnvelopeSchema` aceita `honSchemaVersion` até 4 e ganha o campo
  `proposalDrafts` com `.optional().default([])` — backups anteriores ao HON-003 continuam
  lendo normalmente, sem propostas. `parseHonBackupData` valida que toda proposta referencia um
  estudo e um projeto existentes no mesmo backup, e que não há duas propostas para o mesmo
  `studyId`.

## Prévia interna

A aba "Proposta comercial" tem um `<details>` "Visualizar prévia interna" com uma leitura
consolidada do título, introdução, escopo, opcionais, valor final, condições comerciais,
exclusões/premissas adicionais, validade e observações — uma conferência rápida de como o
conteúdo se lê em conjunto. Não é exportação para o cliente (PDF/impressão ficam fora do
escopo desta fase).
