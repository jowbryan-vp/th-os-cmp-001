# DS-001 — Botões e ações

Use `Button` para ações e `Link` para navegação. Variantes: `primary`, `secondary`, `tertiary`, `destructive`, `success`, `ghost` e `link`; tamanhos `small`, `medium` e `large`.

Uma área deve ter no máximo uma ação primária. Ações destrutivas exigem `ConfirmDialog`. Use `loading` para impedir duplo envio e manter `aria-busy`; `disabled` deve ser explicável pelo texto próximo. Ícones vêm somente do barrel `src/design-system/icons` e sempre acompanham um rótulo, salvo controles com nome acessível explícito.
