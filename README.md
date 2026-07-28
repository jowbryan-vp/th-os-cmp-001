# TH OS — Cadastro Mestre do Projeto

**Produto:** CMP-001 · **Fase:** piloto interno

Aplicação local da TH Arquitetura para manter uma fonte única de identificação,
clientes, imóvel, contexto, escopo, programa, planejamento, orçamento de
referência, visitas, documentos, equipe, decisões, pendências e histórico.

O CMP não cria propostas ou contratos, não calcula honorários, não possui
financeiro, login ou upload real.

## Arquitetura

- `src/domain`: modelo v2, schemas Zod, migrações, validação e progresso;
- `src/data`: contrato de repositório e implementação IndexedDB;
- `src/services`: importação/exportação e ciclo de vida;
- `src/hooks`: carregamento e autosave serializado;
- `src/components`: lista, filtros e workspace das 14 seções;
- `tests`: unitários, integração, smoke e Playwright.

## Uso

Requer Node.js 22.13+ e pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm verify
```

Na lista, use **Novo projeto**. O código `TH-AAAA-NNN` é gerado localmente.
Preencha as seções e aguarde “Salvo neste dispositivo”. O piloto correto é
`TH-2026-001`, em Cacoal/RO.

## Persistência e backup

Os dados ficam no IndexedDB `th-os`, store `project-master-records`. Não há
sincronização externa. Use **Exportar JSON** para backup. O envelope contém
aplicação, versão, data da exportação e projeto. A importação valida tipos e
enums, migra v1, rejeita versões futuras e trata conflitos.

## Limitações do piloto

- dados restritos ao navegador/dispositivo;
- sem colaboração simultânea ou upload;
- catálogo editável no registro, sem administração global;
- reordenação avançada e agrupamento visual ficam para evolução;
- não substitui proposta, contrato, financeiro ou gestão completa de obra.

Consulte `DATA_MODEL.md`, `AUDIT_RESOLUTION.md` e `NEXT_STEPS.md`.
