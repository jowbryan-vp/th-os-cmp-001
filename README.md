# TH OS — Cadastro Mestre do Projeto

**Código do produto:** CMP-001

Aplicação local da TH Arquitetura para centralizar as informações essenciais de
cada projeto. O Cadastro Mestre registra identificação, clientes, imóvel,
contexto, síntese, escopo preliminar, programa de necessidades, prazos,
orçamento de referência, visitas, documentos, equipe, decisões, pendências e
histórico.

O CMP não emite contratos, não calcula honorários, não gera propostas e não
possui sistema financeiro, login, upload real ou integrações externas. Módulos
futuros poderão consumir os dados versionados do `ProjectMasterRecord`.

## Funcionalidades

- listagem de projetos ativos e arquivados;
- criação com código sequencial `TH-AAAA-NNN`;
- edição com salvamento automático no IndexedDB;
- duplicação, arquivamento, restauração e exclusão confirmada;
- importação e exportação JSON com `schemaVersion`;
- validações para rascunho, reunião e proposta;
- cálculo de completude do cadastro;
- resumo institucional para impressão;
- projeto piloto `TH-2026-001`.

## Identidade visual

Foram preservados somente os ativos oficiais utilizados, os tokens e as
decisões visuais compatíveis com o novo sistema:

- `src/assets/brand/th-logo-horizontal-positive.png`;
- `src/assets/brand/th-logo-vertical-positive.png`;
- `src/styles/tokens.css`;
- padrões genéricos de cabeçalho, botões, formulários, cartões,
  responsividade e impressão.

A fonte institucional Organetto não foi incorporada porque o arquivo e sua
licença digital não foram fornecidos. A aplicação usa Aptos, Helvetica Neue e
Arial como substitutas de sistema, sem baixar ou incorporar arquivos de fonte.
Consulte `BRAND_IMPLEMENTATION.md`.

## Persistência

Os dados permanecem no dispositivo, no banco IndexedDB `th-os`, store
`project-master-records`. A exportação JSON deve ser usada como cópia portátil.
O modelo e as regras de versão estão em `DATA_MODEL.md`.

## Uso local

Requer Node.js 22.13 ou superior.

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

## Documentação

- `DATA_MODEL.md`: modelo, persistência e validações;
- `BRAND_IMPLEMENTATION.md`: identidade e reaproveitamento visual;
- `NEXT_STEPS.md`: evolução segura do CMP e módulos futuros;
- `CHANGELOG.md`: histórico desta reestruturação.
