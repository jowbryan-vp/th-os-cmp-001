# Modelo de dados — CMP-001

## Extensão HON-001

O IndexedDB atual é v5 e o backup consolidado é v4. Entidades financeiras, stores e vínculos estão em [docs/hon/HON_DATA_MODEL.md](docs/hon/HON_DATA_MODEL.md). Monetários são centavos inteiros e snapshots aprovados são imutáveis.

## Versão e migração

`PROJECT_SCHEMA_VERSION = 2`. A entidade raiz permanece
`ProjectMasterRecord`. `project-migrations.ts` transforma v1 em v2. Registros
futuros são rejeitados. O antigo seed conhecido é substituído pelo seed
canônico de Cacoal; demais registros preservam os dados legados mapeáveis.

## Agregados

- controle: nomes, status, fase, prioridade, responsáveis e timestamps;
- clientes: pessoa, contatos, documentos opcionais e poder de decisão;
- imóvel: localização, situação, registros e áreas numéricas;
- contexto: problema, objetivos, intervenções, expectativas e riscos;
- escopo: serviço, categoria, status, execução, responsável e ordem;
- programa: ambiente, situação, intervenção, áreas, requisitos e ordem;
- planejamento, marcos, orçamento em centavos, visitas e documentos;
- equipe, decisões, pendências e histórico centralizado.

Schemas Zod estritos rejeitam campos desconhecidos. Áreas usam `number | null`;
dinheiro usa inteiros em centavos.

## CAP-001 e banco local v3

O IndexedDB está na versão 3 e adiciona `parametric-studies`, com índices por
projeto, status e atualização. `ParametricEnvironmentStudy` contém cenários,
versão/hash CAP e versão do motor. `NeedsItem` registra o estudo e cenário
aplicados, tipo/valor da área e timestamps. A criação da store é a migração
explícita v2 → v3; os campos novos do projeto são retrocompatíveis no schema v2.

O backup consolidado v2 usa `projectRecords`, `parametricStudies`,
`capLibraryReferences` e `backupSchemaVersion`. A restauração valida tudo antes
de uma transação atômica nas duas stores; remover um projeto remove seus estudos.

## Progresso ponderado

| Grupo | Peso |
|---|---:|
| Identificação | 10% |
| Clientes | 10% |
| Imóvel | 12% |
| Contexto | 10% |
| Escopo | 12% |
| Programa | 12% |
| Prazos | 8% |
| Orçamento | 7% |
| Visitas | 5% |
| Documentos | 5% |
| Equipe | 4% |
| Decisões e pendências | 5% |

Cada seção retorna percentual, completos, obrigatórios, ausentes e alertas.
Ter pendências não aumenta o progresso; bloqueios o reduzem.

## Prontidão e autosave

`calculateReadiness` cobre rascunho, reunião, levantamento e proposta sem
alterar o ciclo de vida. `useProjectAutosave` usa debounce configurável, fila,
token de versão, retry, último salvamento e aviso de saída.
# Catálogos de referência (IndexedDB v4)

O store `reference-catalog-options` persiste `CatalogOption` global ou por projeto. `parentId` preserva relações como cidade–estado. O backup consolidado v3 restaura projetos, estudos CAP e catálogos na mesma transação.
