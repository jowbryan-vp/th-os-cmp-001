# DS-001 — Formulários

Campos disponíveis: `Input`, `NumberInput`, `CurrencyInput`, `PercentageInput`, `DateInput`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Radio` e `Switch`, sempre compostos por `Field` quando houver rótulo, ajuda ou erro.

Rótulos são visíveis; placeholder não substitui rótulo. `Field` associa `label` e controle automaticamente: gera um id estável via `useId()` quando nenhum `id`/`htmlFor` é informado, e preserva o id explícito do consumidor quando existe. A associação funciona com `Input`, `Select`, `Textarea` e com elementos nativos equivalentes usados diretamente dentro de `Field`. Erros usam `aria-invalid` e `aria-describedby` ligados ao mesmo id; ajuda usa `aria-describedby` quando não há erro; campo obrigatório expõe `aria-required`. Valores monetários, percentuais e datas continuam sendo interpretados pelas funções de domínio existentes. A migração visual não altera coerção, validação, persistência ou formato dos dados.
