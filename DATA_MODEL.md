# Modelo de dados — CMP-001

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
