# Implantação do piloto no Cloudflare Workers

Este guia publica o CMP-001 como Worker `th-os-cmp-001-pilot`. A aplicação
continua local-first: os projetos permanecem exclusivamente no IndexedDB do
navegador e não são enviados ao Cloudflare, GitHub ou outro serviço.

## 1. Pré-requisitos

- conta Cloudflare com o subdomínio `workers.dev` habilitado;
- Node.js 22.13 ou superior;
- pnpm 11;
- dependências instaladas com `pnpm install --frozen-lockfile`;
- branch de implantação revisada e testes aprovados.

## 2. Criar ou acessar a conta Cloudflare

Crie uma conta em <https://dash.cloudflare.com/sign-up> ou entre no painel.
Na primeira implantação, o Wrangler pode solicitar a ativação de um subdomínio
`workers.dev`.

## 3. Autenticar o Wrangler

Em uma máquina interativa:

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
```

O primeiro comando abre o navegador para autorização. Não copie tokens para
conversas, commits ou arquivos versionados.

## 4. Validar sem publicar

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm deploy:dry-run
```

O último comando recompila a aplicação e executa `wrangler deploy --dry-run`,
gravando o pacote inspecionável em `.wrangler/dry-run`.

## 5. Publicar

```bash
pnpm deploy
```

O Vinext compila o projeto e chama o Wrangler usando `wrangler.jsonc`. Confirme
no terminal que o Worker publicado é `th-os-cmp-001-pilot`.

## 6. Registrar a URL gerada

Implantação piloto validada em 2026-07-28:

- URL: <https://th-os-cmp-001-pilot.jowbryan.workers.dev>
- Worker: `th-os-cmp-001-pilot`
- versão Cloudflare: `62e728d4-c11e-4bd8-8f55-0d7db68ad09f`

Para executar os mesmos cenários E2E diretamente contra a implantação:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://th-os-cmp-001-pilot.jowbryan.workers.dev"
pnpm test:e2e
```

## 7. Atualizar a implantação

Após revisar e testar novas alterações:

```bash
pnpm deploy:dry-run
pnpm deploy
```

Confira a URL e repita o smoke test. A implantação não altera o IndexedDB já
existente no navegador enquanto origem e schema continuarem compatíveis.

## 8. Rollback

Liste as versões e reverta para uma implantação anterior:

```bash
pnpm exec wrangler versions list
pnpm exec wrangler rollback
```

Confirme a versão solicitada pelo Wrangler e execute novamente o checklist.
O rollback do código não restaura dados locais apagados.

## 9. Diagnóstico de erros

- `not authenticated`: execute `pnpm exec wrangler login` e depois `whoami`;
- erro de bundle: rode `pnpm build` e `pnpm deploy:dry-run`;
- página sem assets: confirme `dist/client` e a configuração `assets` em
  `wrangler.jsonc`;
- erro de compatibilidade: confirme Node 22.13+, versões do lockfile e a flag
  `nodejs_compat`;
- dados ausentes: confira se é a mesma URL, navegador e perfil; importe o JSON
  de backup se necessário;
- logs do Worker: use `pnpm exec wrangler tail th-os-cmp-001-pilot`, sem imprimir
  conteúdo confidencial.

## 10. Política de segredos

O piloto não exige segredos de aplicação. Para uma futura automação de CI, use
secrets protegidos chamados `CLOUDFLARE_API_TOKEN` e
`CLOUDFLARE_ACCOUNT_ID`. Nunca adicione valores reais ao repositório, ao
`wrangler.jsonc`, a exemplos de documentação ou a logs.

## 11. Persistência local

Cada origem, navegador, perfil e dispositivo possui seu próprio IndexedDB
`th-os`. Não há banco remoto, login, sincronização ou backup automático.
Exportar JSON é a única cópia de segurança prevista nesta fase.

## 12. Checklist pós-deploy

- [x] abrir a URL exata e confirmar resposta sem erro;
- [x] visualizar o projeto piloto `TH-2026-001` de Cacoal/RO;
- [x] visualizar o aviso de armazenamento local;
- [x] criar e editar um projeto;
- [x] aguardar “Salvo neste dispositivo” e atualizar a página;
- [x] confirmar persistência no mesmo contexto do navegador;
- [x] exportar JSON no Chrome desktop;
- [x] exportar JSON em navegador móvel compatível;
- [x] importar o JSON pela URL pública;
- [x] confirmar que outro navegador/perfil não recebeu o novo projeto;
- [x] validar layout desktop e móvel;
- [x] registrar a URL validada no README e neste arquivo.

## Automação futura

Quando a implantação manual estiver estabilizada, um workflow separado poderá
usar `cloudflare/wrangler-action` com os secrets protegidos
`CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. O CI atual permanece apenas
como validação e não publica em cada push.
