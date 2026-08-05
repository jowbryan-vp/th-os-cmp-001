# Próximos passos — CMP-001

## Pós DS-001

- realizar auditoria assistiva com leitor de tela e contraste em dispositivos reais;
- migrar controles nativos remanescentes por fluxo, preservando seus adaptadores de domínio;
- versionar componentes quando houver primeiro consumidor externo ao TH OS;
- incluir regressão visual no CI depois de estabilizar a infraestrutura de fontes e navegador.

## Pós HON-001 v1

- calibrar horas com registros reais aprovados;
- importar referência formal e versionada quando validada;
- integrar agenda/feriados sem expor finanças;
- evoluir `ProposalPricingSnapshot` para proposta e contrato;
- revisar `docs/hon/HON_TECHNICAL_REVIEW.md`.

## Antes de ampliar o piloto

1. Validar campos e pesos com três projetos reais.
2. Definir política formal de retenção e exclusão.
3. Realizar auditoria assistiva com leitor de tela.
4. Treinar a equipe no fluxo de exportação e restauração.
5. Concluir os itens de revisão arquitetônica listados em `docs/cap/CAP_TECHNICAL_REVIEW.md`.
6. Validar os presets CAP-001 em casos reais antes de elevar maturidade.

## Evoluções seguras

1. Reordenação por arrastar e soltar no escopo e programa.
2. Agrupamento visual por setor/pavimento e filtros do programa.
3. Testes de componentes e variações de conflito de importação.
4. Automatizar deploy somente após estabilizar o piloto manual, usando secrets
   protegidos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`.
5. Criar cálculo específico de cozinha, sala, lavanderia, varanda e hall após revisão.
6. Tratar rampas em módulo próprio somente com base normativa vigente validada.

## Concluído após o piloto

- backup consolidado versionado de todos os cadastros;
- restauração validada e atômica da base local.

Proposta, contratos, financeiro, login e integrações permanecem módulos
separados e fora do CMP-001.
