# Correções de UX do PR #5

## Diagnóstico objetivo

- O corte horizontal vinha de uma coluna mínima de 340 px no grid da calculadora, mantida até 760 px, combinada com filhos de grid sem `min-width: 0`.
- O fieldset personalizado tinha quatro colunas rígidas e controles com largura intrínseca; em notebook e zoom isso ultrapassava o card.
- O aviso usava uma grade destinada a ícone + texto, embora não houvesse ícone, deixando mensagem e botão em posições estreitas.
- O item personalizado convertia a cada tecla com `Number()`: vazio virava zero e `0,60` virava `NaN`.
- O motor tentava resolver registros legados incompletos e expunha o ID técnico na exceção.
- Os campos referenciais do CMP eram texto livre e não existiam repositório, normalização de duplicidade ou backup de catálogos.

## Resolução

A calculadora usa colunas fluidas 46/54 e empilha a 1180 px. Todos os descendentes críticos aceitam encolhimento, ações quebram linha e somente o comparador tem rolagem horizontal intencional. O toast tem largura legível, fechamento nomeado e região viva. Decimais são mantidos como texto durante a edição e parseados centralmente.

Itens personalizados têm nome, largura, comprimento, altura opcional, quantidade, função e observações, além de editar, duplicar e remover. Registros incompletos aparecem como pendentes, ficam fora do motor e não impedem itens válidos. Resultados anteriores recebem marca de desatualizado.

## Breakpoints verificados

1920×1080, 1440×900, 1366×768, tablet e celular; a verificação também cobre equivalentes de zoom a 125% e 150%.
