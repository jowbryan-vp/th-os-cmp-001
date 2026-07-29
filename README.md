# TH OS — Cadastro Mestre do Projeto

**Produto:** CMP-001 · **Fase:** piloto

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

## Executar localmente

Requer Node.js 22.13+ e pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Para validar uma compilação de produção local:

```bash
pnpm build
pnpm preview
```

Os comandos de qualidade disponíveis são:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm verify
```

Na lista, use **Novo projeto**. O código `TH-AAAA-NNN` é gerado localmente.
Preencha as seções e aguarde “Salvo neste dispositivo”. O piloto correto é
`TH-2026-001`, em Cacoal/RO.

## Acesso online

O piloto validado está disponível em:

**<https://th-os-cmp-001-pilot.jowbryan.workers.dev>**

Os dados dessa URL continuam locais e independentes em cada navegador, perfil e
dispositivo. Consulte [DEPLOYMENT.md](./DEPLOYMENT.md) para implantação,
validação e rollback.

Para publicar ou atualizar manualmente:

```bash
pnpm deploy:dry-run
pnpm exec wrangler login
pnpm deploy
```

O deploy não é executado automaticamente em cada push.

## Persistência, exportação e importação

Os dados ficam no IndexedDB `th-os`, store `project-master-records`. Não há
sincronização externa: cada navegador, perfil e dispositivo mantém uma base
independente. Atualizar a página preserva os dados no mesmo navegador, mas
limpar os dados do site ou usar outro dispositivo não transfere projetos.

Para criar um backup, abra o projeto e use **Exportar JSON**. Guarde o arquivo
baixado fora do navegador. Para restaurar, volte à lista, selecione
**Importar JSON** e escolha o arquivo. O envelope contém aplicação, versão,
data da exportação e projeto; a importação valida tipos e enums, migra v1,
rejeita versões futuras e trata conflitos.

Para apagar todos os dados locais, abra as configurações do navegador, localize
os dados do site da URL utilizada e remova o armazenamento desse site. Essa
operação é irreversível sem um JSON exportado.

## Limitações do piloto

- dados restritos ao navegador/dispositivo;
- sem backup remoto, conta, login ou sincronização;
- sem colaboração simultânea ou upload;
- catálogo editável no registro, sem administração global;
- reordenação avançada e agrupamento visual ficam para evolução;
- não substitui proposta, contrato, financeiro ou gestão completa de obra.

Consulte `DATA_MODEL.md`, `AUDIT_RESOLUTION.md`, `DEPLOYMENT.md` e
`NEXT_STEPS.md`.
