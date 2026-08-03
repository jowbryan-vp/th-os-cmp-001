# CAP-001 — fonte bruta auditável

- **Nome original:** `CAP-001_Biblioteca_Parametrica_v1.json`
- **Nome no repositório:** `raw/CAP-001_Biblioteca_Parametrica_v1.1.0.json`
- **SHA-256:** `8449321c330345221cf3136cdd7f5e6b2becf88f35215240ff921dcab8319ac2`
- **Código documental:** CAP-001
- **Versão declarada:** 1.1.0
- **Data declarada:** 2026-08-03
- **Origem:** arquivo fornecido pelo responsável pelo repositório TH OS
- **Status de revisão:** aguardando revisão técnica do arquiteto

O arquivo em `raw/` é preservado sem edição e não é importado diretamente pela
interface. Os artefatos de runtime são gerados por `pnpm cap:normalize`.

## Limitações conhecidas

- conforto e acessibilidade aparecem combinados em `NCF-003` e precisam ser
  separados na camada operacional;
- áreas de composição são referências comparativas, não resultados calculados;
- algumas dimensões e composições possuem confiança `inferred`;
- referências normativas são indiretas e devem ser verificadas na norma vigente;
- regras de cálculo estão descritas como texto e não podem ser executadas.
