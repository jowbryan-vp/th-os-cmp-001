# Modelo de dados — Cadastro Mestre do Projeto

## Entidade central

`ProjectMasterRecord` é a fonte única de informações de um projeto dentro do
TH OS. A entidade está definida em
`src/domain/project-master-record.ts`.

Campos de controle:

| Campo | Finalidade |
|---|---|
| `id` | Identificador técnico estável |
| `schemaVersion` | Versão estrutural do registro |
| `code` | Código legível no padrão `TH-AAAA-NNN` |
| `status` | `draft`, `active` ou `archived` |
| `createdAt` / `updatedAt` | Auditoria temporal |
| `archivedAt` | Data de arquivamento ou `null` |

Blocos de conteúdo:

- identificação: `title`, `projectType`, `phase`;
- síntese e contexto: `summary`, `context`, `objectives`;
- clientes: `clients[]`, com múltiplas pessoas e contato principal;
- imóvel: `property`;
- escopo preliminar: `preliminaryScope[]`;
- programa de necessidades: `needsProgram[]`;
- planejamento: `timeline[]`, `estimatedBudget`, `budgetNotes`;
- registros: `visits[]`, `documents[]`, `team[]`, `decisions[]`,
  `pending[]` e `history[]`.

Documentos são apenas referências textuais. O modelo não armazena arquivos e a
interface não realiza upload.

## Versão e migração

A versão atual é `PROJECT_SCHEMA_VERSION = 1`. Todo JSON importado passa por
`migrateProject`, que:

1. verifica se o conteúdo é um objeto;
2. exige `id`, `code` e `title`;
3. rejeita versões mais recentes que a aplicação;
4. preenche coleções e estruturas ausentes com valores seguros;
5. atualiza o registro para a versão corrente.

Novas alterações incompatíveis devem elevar `PROJECT_SCHEMA_VERSION` e
incorporar uma migração explícita antes da leitura.

## Persistência

`IndexedDbProjectRepository` implementa `ProjectRepository` em
`src/data/project-repository.ts`.

- banco: `th-os`;
- versão do banco: `1`;
- object store: `project-master-records`;
- chave: `id`;
- índices: `code`, `status`, `updatedAt`.

O repositório expõe `list`, `get`, `save`, `remove`, `nextCode` e
`ensurePilot`. A interface não acessa IndexedDB diretamente.

## Geração de código

`nextCode(year)` localiza o maior número existente para o ano solicitado e gera
o próximo identificador com três dígitos. Importações com conflito recebem novo
código sem sobrescrever outro projeto.

## Progresso e validação

O progresso é uma indicação de completude, não de execução física da obra. Ele
considera 12 grupos essenciais do cadastro.

Há três níveis de validação:

- **rascunho:** identificação mínima e ao menos um cliente;
- **reunião:** inclui síntese, contexto, imóvel, escopo e programa;
- **proposta:** inclui objetivos, prazos, orçamento de referência e ausência de
  pendências abertas de alta prioridade.

Validar para proposta não gera proposta automática.
