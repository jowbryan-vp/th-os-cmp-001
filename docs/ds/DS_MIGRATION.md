# DS-001 — Migração

Inventarie primeiro o componente local e seu comportamento. Substitua somente a camada visual, preserve props, callbacks, tipos, textos funcionais, validação e persistência; depois valide o fluxo original.

Mapa principal: `.button` → `Button`; campos locais → `Field` + controle DS; abas locais → `Tabs`; avisos → `Toast`; confirmações nativas → `ConfirmDialog`; grupos de ações de cartão → `ActionMenu`; cartões/estados vazios → `Card`/`EmptyState`.

CMP, CAP e HON foram migrados incrementalmente por adaptadores, evitando reescrever regras de negócio. Novos módulos devem importar pelo barrel `src/design-system`.
