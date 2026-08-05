# DS-001 — Guia de uso

```tsx
import { Button, Field, Input, Toast } from "@/src/design-system";
import { Save } from "@/src/design-system/icons";

<Field label="Nome" error={error}><Input value={name} onChange={onChange} /></Field>
<Button icon={Save} loading={saving} onClick={save}>Salvar</Button>
{saved && <Toast variant="success" title="Dados salvos" />}
```

Veja todos os estados em `/design-system` durante `pnpm dev`. Antes de criar um componente novo, confira a vitrine e esta documentação. Rode `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm test:e2e` antes do PR.
