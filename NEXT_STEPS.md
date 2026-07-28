# Próximos passos — CMP-001

## Antes de ampliar o produto

1. Anexar ao repositório a especificação integral e canônica do CMP-001.
2. Confirmar com a equipe os campos obrigatórios de cada nível de validação.
3. Validar o cálculo de completude com projetos reais.
4. Definir política de retenção e exclusão de registros.

## Evolução recomendada

1. Ampliar os testes de navegador para variações de validação, responsividade e acessibilidade.
2. Introduzir migrações adicionais somente quando o schema mudar.
3. Melhorar filtros e busca quando houver volume suficiente de projetos.
4. Avaliar exportação consolidada de todos os cadastros para backup.
5. Rever acessibilidade com teclado e leitores de tela.

## Módulos futuros

A ferramenta de contratos deverá ser um módulo separado. Ela poderá consumir
uma projeção somente de leitura do `ProjectMasterRecord`, sem incorporar lógica
contratual ao CMP. O mesmo princípio vale para proposta, financeiro, upload,
login e integrações externas.
