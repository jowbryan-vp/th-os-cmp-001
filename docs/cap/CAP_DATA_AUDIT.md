# Auditoria de dados — CAP-001 v1.1.0

**Fonte:** `data/cap-001/raw/CAP-001_Biblioteca_Parametrica_v1.1.0.json`  
**SHA-256:** `8449321c330345221cf3136cdd7f5e6b2becf88f35215240ff921dcab8319ac2`  
**Resultado:** normalização permitida

## Resumo

| Severidade | Achados |
|---|---:|
| info | 2 |
| warning | 5 |
| technical_review | 20 |
| blocking | 0 |

## Achados

| Código | Entidade | Campo | Valor | Severidade | Explicação | Ação recomendada | Status |
|---|---|---|---|---|---|---|---|
| CAP-I-CONFLICT | CFL-001 | parametro | "Comprimento da Cama de Casal Padrão" | info | Divergência entre fontes preservada. | Exibir ambas as referências na interface. | accepted |
| CAP-I-CONFLICT | CFL-002 | parametro | "Corredor de Trabalho na Cozinha" | info | Divergência entre fontes preservada. | Exibir ambas as referências na interface. | accepted |
| CAP-T-COMFORT-ACCESS | NCF-003 | nome | "Alto Padrão / Acessível" | technical_review | A fonte combina padrão de conforto e acessibilidade, conceitos independentes. | Normalizar como conforto generoso e criar perfis de acessibilidade separados. | resolved |
| CAP-T-COMP-ITEMS | CMP-001 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-002 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-003 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-004 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-005 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-006 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-007 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-008 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-009 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-010 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-011 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-012 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-013 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-COMP-ITEMS | CMP-014 | items | [] | technical_review | A composição fornece apenas áreas de referência e não identifica seus itens. | Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico. | open |
| CAP-T-NORM | AVS-002 | severidade | "Erro Normativo" | technical_review | O rótulo 'Erro Normativo' excede a evidência secundária disponível. | Apresentar como alerta técnico e solicitar verificação normativa. | resolved |
| CAP-T-NORM | CIR-004 | aplicacao | "Área de manobra acessível NBR 9050" | technical_review | A menção a NBR 9050 é indireta e não comprova conformidade. | Exibir como referência técnica a verificar conforme norma vigente. | open |
| CAP-T-TEXT-RULE | REG-001 | algoritmo | "Area_Bruta = Area_Liquida * 1.15" | technical_review | Fórmula textual não possui implementação operacional segura. | Mapear para estratégia TypeScript explícita; nunca executar a string. | open |
| CAP-T-TEXT-RULE | REG-002 | algoritmo | "2 * Espelho + Piso = 0.63m a 0.65m" | technical_review | Fórmula textual não possui implementação operacional segura. | Mapear para estratégia TypeScript explícita; nunca executar a string. | open |
| CAP-T-TEXT-RULE | REG-003 | algoritmo | "Largura_Vaga = Largura_Carro + 0.80m; Comprimento_Vaga = Comp_Carro + 0.50m" | technical_review | Fórmula textual não possui implementação operacional segura. | Mapear para estratégia TypeScript explícita; nunca executar a string. | open |
| CAP-W-GEOMETRY-15 | REG-001 | algoritmo | "Area_Bruta = Area_Liquida * 1.15" | warning | O fator fixo de 15% não é universal. | Expor reserva geométrica como parâmetro configurável. | accepted |
| CAP-W-INFERRED | CMP-001 | confidence | "inferred" | warning | Área de composição identificada como inferida. | Tratar apenas como preset comparativo. | open |
| CAP-W-INFERRED | CMP-011 | confidence | "inferred" | warning | Área de composição identificada como inferida. | Tratar apenas como preset comparativo. | open |
| CAP-W-INFERRED | EQP-011 | confidence | "inferred" | warning | Dimensão derivada, sem confirmação direta na fonte. | Validar com o arquiteto antes de uso como preset. | open |
| CAP-W-STAIRS | AMB-014 | nome | "Escadas e Rampas Residencias" | warning | Escadas e rampas estão agrupadas, mas a regra de Blondel só se aplica a escadas. | Manter capacidade experimental e não calcular rampas. | resolved |

## Conclusão

A fonte não possui erro bloqueador estrutural. A biblioteca normalizada preserva conflitos, identifica inferências, separa conforto de acessibilidade e mantém fórmulas textuais apenas como rastreabilidade. A revisão técnica do arquiteto continua obrigatória.
