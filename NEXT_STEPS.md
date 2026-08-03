# Próximos passos — CMP-001

## Antes de ampliar o piloto

1. Validar campos e pesos com três projetos reais.
2. Definir política formal de retenção e exclusão.
3. Realizar auditoria assistiva com leitor de tela.
4. Treinar a equipe no fluxo de exportação e restauração.

## Evoluções seguras

1. Reordenação por arrastar e soltar no escopo e programa.
2. Agrupamento visual por setor/pavimento e filtros do programa.
3. Testes de componentes e variações de conflito de importação.
4. Automatizar deploy somente após estabilizar o piloto manual, usando secrets
   protegidos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`.

## Concluído após o piloto

- backup consolidado versionado de todos os cadastros;
- restauração validada e atômica da base local.

Proposta, contratos, financeiro, login e integrações permanecem módulos
separados e fora do CMP-001.
