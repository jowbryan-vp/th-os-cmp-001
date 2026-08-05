# DS-001 — Formulários

Campos disponíveis: `Input`, `NumberInput`, `CurrencyInput`, `PercentageInput`, `DateInput`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Radio` e `Switch`, sempre compostos por `Field` quando houver rótulo, ajuda ou erro.

Rótulos são visíveis; placeholder não substitui rótulo. Erros usam `aria-invalid` e `aria-describedby`. Valores monetários, percentuais e datas continuam sendo interpretados pelas funções de domínio existentes. A migração visual não altera coerção, validação, persistência ou formato dos dados.
