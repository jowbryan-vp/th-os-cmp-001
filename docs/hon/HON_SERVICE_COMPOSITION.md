# HON-002C — Composição personalizada de serviços

Estende o catálogo descritivo (HON-002B) com a montagem do escopo, junto com o cliente: o
arquiteto escolhe quais serviços do catálogo entram no estudo, decide o estado comercial de
cada um, ajusta quantidade e desconto por item, e vê a composição final agrupada por categoria
com subtotais e totais separados.

## Estado comercial

Cada serviço da composição tem um `commercialState` — enum de 4 valores mutuamente exclusivos,
não três booleanos independentes (que poderiam contradizer um ao outro, ex.: opcional **e**
cortesia ao mesmo tempo):

| Estado | Entra no total contratado? | Entra no custo interno do motor? |
|---|---|---|
| `included` (Incluído) | Sim | Sim |
| `optional` (Opcional) | Não — total próprio | Não |
| `complimentary` (Cortesia) | Não — total próprio, valor bruto para transparência | Não |
| `not_contracted` (Não contratado) | Não | Não |

`included`/`optional`/`complimentary` (os três booleanos) continuam existindo em
`FeeServiceInput` — compatibilidade com código que já lia `service.included` (o motor de
cálculo, por exemplo, continua filtrando por esse campo sem nenhuma mudança) — mas são sempre
uma **projeção derivada** do enum, nunca escritos isoladamente: `withCommercialState`
(`hon-service-composition.ts`) é o único ponto de escrita, e a migração recomputa os três a
partir do enum em toda leitura, autocorrigindo qualquer combinação incoerente que porventura
exista em dados salvos fora do app.

Cortesia é distinta de um desconto individual de 100%: cortesia sai inteiramente do custo
interno e do preço (mesmo tratamento que "não contratado" recebia antes do HON-002C); um
desconto de 100% mantém o serviço como `included` — continua contando como parte do escopo
contratado, só que a R$ 0,00.

Adicionar um serviço do catálogo à composição (botão "Adicionar ao estudo" no painel de
consulta) sempre cria a linha em `not_contracted` — selecionar é só um passo de descoberta; a
decisão comercial é uma ação seguinte explícita, nunca implícita.

## Quantidade

`quantity` multiplica horas estimadas **e** custo fixo (ambos "por unidade do item"), nunca a
tarifa-hora em si (`hourlyCostCents` é uma tarifa, não um total) nem `minimumValueCents` (piso
do serviço — o motor não lê esse campo). Ver `serviceLineGrossCents` em
`hon-service-composition.ts`.

## Desconto individual

`individualDiscountCents` é auditável (aparece no histórico de decisões e no total "Descontos
aplicados" da composição) e nunca deixa a linha com valor negativo — um desconto maior que o
valor bruto apenas zera a linha.

## Categoria e ordenação

Cada `FeeServiceInput` carrega `category`/`displayOrder` — herdados do `ServiceCatalogItem`
quando adicionado do catálogo, ou definidos manualmente para item personalizado. A composição
agrupa e ordena exatamente como o catálogo (HON-002B): `serviceCategoryOrder` → `displayOrder`
→ nome. Cada grupo mostra seu próprio subtotal (só os serviços incluídos).

## Itens personalizados

Um serviço sem `catalogItemId` (criado via "+ Serviço personalizado") pode ser editado —
nome, categoria, ordem de exibição, descrição para o cliente, descrição técnica, entregáveis,
exclusões e premissas — através de `customDescription`, um campo próprio do `FeeServiceInput`.
Um item padrão do catálogo (`catalogItemId` definido) nunca ganha essa edição: a ação "Editar
item personalizado" só aparece para itens sem vínculo com o catálogo, e "Entenda este serviço"
resolve o conteúdo correto conforme o caso — do `ServiceCatalogItem` referenciado, ou do
`customDescription` do próprio serviço.

## Totais

- **Subtotal incluído / Total contratado** — soma líquida (após desconto) dos serviços
  `included`. São o mesmo número: "total contratado" é só um rótulo mais direto do mesmo total.
- **Total de opcionais** — soma líquida dos serviços `optional`. Nunca entra no contratado.
- **Total de cortesias** — soma **bruta** (sem descontar) dos serviços `complimentary`, para o
  arquiteto ver "quanto estaria dando de cortesia". Nunca entra em nenhum total cobrado.
- **Descontos aplicados** — soma dos descontos individuais aplicados aos serviços incluídos.

## Motor de cálculo

`calculateFeeStudy` (`hon-engine.ts`) continua filtrando `study.services` por `included` — sem
mudança nesse ponto —, mas agora delega o cálculo de cada linha para `serviceLineNetCents`/
`serviceLineHours` (`hon-service-composition.ts`), a mesma função usada pela UI da composição:
uma única implementação do cálculo de linha, para nunca haver duas versões divergentes.
Cortesia e opcional continuam fora do custo interno do motor, exatamente como "não incluído"
funcionava antes do HON-002C — nenhuma fórmula de complexidade/urgência/lucro/imposto mudou.

## Escopo no Resultado

"Escopo considerado" (aba Resultado) mostra três tabelas separadas — Contratados, Opcionais e
Cortesias — deixando explícito que só os contratados entram no valor final. `Não contratado`
não aparece: não faz parte do escopo apresentado ao cliente.

## Histórico de decisões

`FeeCalculationStudy.compositionHistory` registra só decisões relevantes — nunca uma por tecla
digitada. A cada salvamento explícito (`saveStudy`), `hon-workspace.tsx` calcula o diff entre a
composição salva anteriormente e a atual (`buildCompositionHistoryEntries`/
`appendCompositionHistory`, `hon-service-composition.ts`) e só grava entrada quando algo
realmente mudou: serviço incluído, marcado opcional, marcado cortesia, removido da composição,
ou desconto individual alterado — mais um resumo `composition_saved` por salvamento com
mudança. Retém no máximo os últimos 200 registros. Alterar horas/nome/observações não gera
entrada — não são decisões comerciais.

## Fora de escopo nesta fase

`ProposalDraft`, geração de PDF, contrato, portal público do cliente, login do cliente e
integração com FIN-001. Autosave geral do HON também não foi implementado — a composição
persiste por ação explícita de salvar, como o resto do estudo.
