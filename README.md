# TH Arquitetura - Contratos

Interface para organizar os dados do contratante, o escopo, os prazos e os
honorários de projetos arquitetônicos antes da emissão do contrato.

## Identidade visual

A implementação segue o manual da TH Arquitetura e utiliza somente logotipos
oficiais copiados para `src/assets/brand`.

A fonte institucional identificada no manual é **Organetto**, mas nenhum arquivo
de fonte ou licença de incorporação foi fornecido. Por esse motivo, a aplicação
usa **Geist Sans** como substituta digital, com Aptos, Helvetica Neue e Arial
como alternativas de sistema. Nenhum arquivo de fonte institucional foi
incluído no repositório.

O inventário completo, as limitações do manual e as regras aplicadas estão em
`BRAND_IMPLEMENTATION.md`.

## Uso local

Requer Node.js 22.13 ou superior.

```bash
pnpm install
pnpm dev
pnpm build
```

## Emissão

O botão **Emitir contrato** abre a versão de impressão em fundo branco, que pode
ser impressa ou salva como PDF pelo navegador.
