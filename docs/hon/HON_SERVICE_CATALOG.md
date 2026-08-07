# HON-001/HON-002B — Catálogo de serviços

O catálogo v1.0.0 contém 40 itens, das etapas do levantamento ao as built, cobrindo arquitetura, interiores, legalização, BIM, consultorias, parceiros, visitas, acompanhamento e gerenciamento.

Cada item possui método, horas, unidade, etapa, execução, revisões, visitas, BIM, risco, mínimo, fonte e confiança. Horas iniciais são zero e `unvalidated`: o arquiteto informa esforço manual ou aprova futura regra assistida calibrada. O catálogo é editável, versionado e incluído no backup.

## Conteúdo descritivo (HON-002B)

Além dos campos de cálculo, cada item tem `category`, `clientDescription`, `technicalDescription`, `deliverables`, `exclusions`, `assumptions` e `displayOrder`. O conteúdo dos 40 itens do preset vive em `hon-catalog-content.ts` — fonte única, usada tanto para semear o catálogo novo quanto para migrar registros já persistidos, evitando duas versões divergentes do mesmo texto.

### Categorias

Agrupamento comercial (distinto de `stage`, que é a etapa de projeto): Diagnóstico e levantamento, Projeto, Interiores e especialidades, BIM e coordenação, Sustentabilidade e desempenho, Legalização e regularização, Obra e acompanhamento, Gestão, Visualização e documentação, Serviços complementares. `displayOrder` segue blocos de 100 por categoria e 10 por item, deixando espaço para inserções futuras sem renumerar o catálogo.

### Duas camadas de descrição

- **`clientDescription`** — texto curto (1–3 frases) para o cliente: o que é, para que serve, o resultado que ele recebe. Sem jargão técnico, sem prometer aprovação ou resultado que o serviço não garante.
- **`technicalDescription`** — texto para proposta e escopo técnico: natureza do serviço, atividades principais, abrangência e limites gerais. Detalhes estruturados (quantidade de pranchas, revisões, nível de detalhamento) ficam fora daqui — variam por projeto e não devem ser inventados no catálogo genérico.

`deliverables`/`exclusions`/`assumptions` são listas curtas e específicas por serviço — nunca genéricas o bastante para valer para qualquer item do catálogo.

### Consulta na interface

A aba "Serviços e horas" do HON exibe o catálogo completo (busca por nome/descrição/categoria, filtro por categoria) com a ação "Entenda este serviço", que abre um modal com a descrição técnica, entregáveis, exclusões e premissas do item — sem seção vazia quando a lista correspondente não se aplica.

### Composição personalizada (HON-002C)

`quantity`, `optional`, `complimentary` e desconto individual passaram a existir — não no `ServiceCatalogItem` (que continua descrevendo o serviço em abstrato), mas no `FeeServiceInput` de cada estudo, quando o serviço é adicionado à composição. Ver `docs/hon/HON_SERVICE_COMPOSITION.md`.

### Ainda fora de escopo

`dependencies`, `incompatibilities`, `unitPrice`/regra de preço explícita e pacotes sugeridos — esses campos ainda não existem no modelo.
