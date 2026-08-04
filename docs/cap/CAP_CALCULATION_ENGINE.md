# Motor de cálculo CAP-001

O motor `1.0.0` recebe um `ParametricScenario`, seleciona uma estratégia registrada e retorna dimensões, áreas, eficiência, confiança, premissas, alertas, fontes, conflitos e breakdown. Fórmulas textuais da fonte permanecem somente como evidência e nunca são executadas por `eval`, `Function` ou mecanismo equivalente.

O cálculo considera projeção, quantidade, envelope funcional, circulação, conforto, acessibilidade, arranjo, sobreposição e reserva geométrica configurável. A área bruta é sempre rotulada **Área bruta preliminar estimada**. Resultados antigos guardam biblioteca, hash, motor e parâmetros e não são recalculados automaticamente.

As zonas usam políticas explícitas `overlap_allowed`, `overlap_conditional`, `overlap_forbidden` e `unknown`. O breakdown registra zonas consideradas e sobrepostas, área removida e justificativa.

Escadas usam somente estimativa preliminar de espelhos, Blondel e projeção. Rampas não são calculadas. Todo resultado requer revisão do arquiteto e verificação da legislação e das normas vigentes.
