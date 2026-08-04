# Schema da biblioteca CAP-001

A biblioteca de runtime é gerada, nunca editada à mão, por `pnpm cap:normalize` a partir do arquivo imutável em `data/cap-001/raw`. O SHA-256 aprovado da versão 1.2.0 sanitizada é `0c1b377a74713da4a879f8d049ed75a07258b8d19266c415cfeba4260a5e2f33`.

## Mapeamento

| Fonte | Campo interno | Observação |
|---|---|---|
| `largura` | `widthM` | dimensão transversal declarada pela categoria |
| `comprimento` | `lengthM` | segunda dimensão em planta; não é presumida como profundidade universal |
| `altura` | `heightM` | dimensão vertical |
| `area_liquida_est` | `estimatedNetAreaM2` | preset comparativo, não resultado geométrico |
| `area_bruta_est` | `estimatedGrossAreaM2` | preset comparativo, não área construída garantida |
| `fonte_id`, `pagina` | `sourceId`, `page` | rastreabilidade bibliográfica |
| `grupo`, `subgrupo` | `group`, `subgroup` | agrupamento visual em sanfonas |
| `tipo_selecao` | `selectionType` | seleção única, múltipla, por quantidade ou paramétrica |
| campos de piscina | `poolParameters` | profundidades, área, perímetro, volume, circulação e reserva estrutural |
| `nivel_conforto` | `comfortLevel` | independente de `accessibilityProfile` |

Os schemas Zod estritos cobrem metadados, fontes, ambientes, itens, zonas, circulações, conforto, acessibilidade, composições, regras, conflitos, avisos, estudos, cenários, resultados e breakdowns. As coleções normalizadas são arquivos separados sob `src/features/cap/data/v1.2.0`. Itens inferidos podem manter `sourceId` e `page` nulos até revisão, sempre com aviso explícito.
