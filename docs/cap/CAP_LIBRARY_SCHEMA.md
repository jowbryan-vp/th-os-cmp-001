# Schema da biblioteca CAP-001

A biblioteca de runtime é gerada, nunca editada à mão, por `pnpm cap:normalize` a partir do arquivo imutável em `data/cap-001/raw`. O SHA-256 aprovado é `8449321c330345221cf3136cdd7f5e6b2becf88f35215240ff921dcab8319ac2`.

## Mapeamento

| Fonte | Campo interno | Observação |
|---|---|---|
| `largura` | `widthM` | dimensão transversal declarada pela categoria |
| `comprimento` | `lengthM` | segunda dimensão em planta; não é presumida como profundidade universal |
| `altura` | `heightM` | dimensão vertical |
| `area_liquida_est` | `estimatedNetAreaM2` | preset comparativo, não resultado geométrico |
| `area_bruta_est` | `estimatedGrossAreaM2` | preset comparativo, não área construída garantida |
| `fonte_id`, `pagina` | `sourceId`, `page` | rastreabilidade bibliográfica |
| `nivel_conforto` | `comfortLevel` | independente de `accessibilityProfile` |

Os schemas Zod estritos cobrem metadados, fontes, ambientes, itens, zonas, circulações, conforto, acessibilidade, composições, regras, conflitos, avisos, estudos, cenários, resultados e breakdowns. As coleções normalizadas são arquivos separados sob `src/features/cap/data/v1.1.0`.
