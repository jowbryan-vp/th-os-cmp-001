import { createId } from "../../../domain/project-master-record";
import { serviceCategoryOrder } from "../services/hon-catalog-content";
import {
  FeeServiceInput, ServiceCatalogItem, ServiceCategory, ServiceCommercialState,
  ServiceCompositionHistoryEntry,
} from "./hon-types";

export const serviceCommercialStateLabels: Record<ServiceCommercialState, string> = {
  included: "Incluído", optional: "Opcional", complimentary: "Cortesia", not_contracted: "Não contratado",
};
export const serviceCommercialStateOrder: ServiceCommercialState[] = ["included", "optional", "complimentary", "not_contracted"];

const round = (value: number) => Math.round(value);

// Único ponto de escrita do estado comercial: os três booleanos derivados
// (included/optional/complimentary) nunca são setados isoladamente — sempre os três juntos a
// partir de `commercialState`, para que uma combinação incoerente (ex.: optional=true e
// complimentary=true) seja estruturalmente impossível de produzir por este código.
export function withCommercialState(service: FeeServiceInput, state: ServiceCommercialState): FeeServiceInput {
  return {
    ...service, commercialState: state,
    included: state === "included", optional: state === "optional", complimentary: state === "complimentary",
  };
}

// Custo bruto da linha, antes do desconto individual. `quantity` multiplica horas e custo
// fixo (ambos "por unidade do item"), nunca a tarifa-hora (hourlyCostCents é uma TARIFA, não
// um total) nem minimumValueCents (piso do serviço, não valor por unidade — o motor não lê
// esse campo hoje, então esta função também não o usa).
export function serviceLineHours(service: FeeServiceInput): number {
  return service.estimatedHours * service.quantity;
}
export function serviceLineGrossCents(service: FeeServiceInput, fallbackHourlyCents: number): number {
  const hours = serviceLineHours(service);
  return round(hours * (service.hourlyCostCents ?? fallbackHourlyCents)) + service.fixedCostCents * service.quantity;
}
// Custo/valor líquido após desconto individual — nunca negativo (o desconto não pode gerar
// valor abaixo de zero; um desconto maior que o bruto apenas zera a linha).
export function serviceLineNetCents(service: FeeServiceInput, fallbackHourlyCents: number): number {
  return Math.max(0, serviceLineGrossCents(service, fallbackHourlyCents) - service.individualDiscountCents);
}
export function serviceLineAppliedDiscountCents(service: FeeServiceInput, fallbackHourlyCents: number): number {
  const gross = serviceLineGrossCents(service, fallbackHourlyCents);
  return gross - Math.max(0, gross - service.individualDiscountCents);
}

export interface ServiceCompositionTotals {
  includedCents: number; optionalCents: number; complimentaryCents: number; discountCents: number; contractedCents: number;
}

// Totais da composição (para exibição — não é o motor de precificação). Cortesia usa o valor
// BRUTO (para o arquiteto ver "quanto estaria dando de graça"), mas nunca soma a nenhum total
// cobrado; opcional soma ao seu próprio total, nunca ao contratado; só incluído entra no
// contratado. "Não contratado" não aparece em nenhum total.
export function computeCompositionTotals(services: FeeServiceInput[], fallbackHourlyCents: number): ServiceCompositionTotals {
  let includedCents = 0, optionalCents = 0, complimentaryCents = 0, discountCents = 0;
  for (const service of services) {
    if (service.commercialState === "included") {
      includedCents += serviceLineNetCents(service, fallbackHourlyCents);
      discountCents += serviceLineAppliedDiscountCents(service, fallbackHourlyCents);
    } else if (service.commercialState === "optional") {
      optionalCents += serviceLineNetCents(service, fallbackHourlyCents);
    } else if (service.commercialState === "complimentary") {
      complimentaryCents += serviceLineGrossCents(service, fallbackHourlyCents);
    }
  }
  return { includedCents, optionalCents, complimentaryCents, discountCents, contractedCents: includedCents };
}

export interface ServiceCategoryGroup {
  category: ServiceCategory;
  services: FeeServiceInput[];
  subtotalCents: number;
}

// Agrupa e ordena por serviceCategoryOrder → displayOrder → nome (mesma ordem comercial do
// catálogo, HON-002B). Subtotal por categoria conta só os serviços incluídos.
export function groupServicesByCategory(services: FeeServiceInput[], fallbackHourlyCents: number): ServiceCategoryGroup[] {
  const sorted = [...services].sort((a, b) =>
    serviceCategoryOrder.indexOf(a.category) - serviceCategoryOrder.indexOf(b.category)
    || a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "pt-BR"));
  const byCategory = new Map<ServiceCategory, FeeServiceInput[]>();
  for (const service of sorted) {
    const list = byCategory.get(service.category) ?? [];
    list.push(service);
    byCategory.set(service.category, list);
  }
  return serviceCategoryOrder
    .filter((category) => byCategory.has(category))
    .map((category) => {
      const items = byCategory.get(category)!;
      const subtotalCents = items
        .filter((item) => item.commercialState === "included")
        .reduce((sum, item) => sum + serviceLineNetCents(item, fallbackHourlyCents), 0);
      return { category, services: items, subtotalCents };
    });
}

// Nova linha a partir de um item do catálogo — entra como "não contratado" (estado neutro):
// adicionar ao estudo é só um passo de seleção, a decisão comercial (incluir/opcional/
// cortesia) é uma ação explícita seguinte, nunca implícita ao clicar "adicionar".
export function createServiceFromCatalogItem(item: ServiceCatalogItem): FeeServiceInput {
  return {
    id: createId("fee-service"), catalogItemId: item.id, code: item.code, name: item.name, stage: item.stage,
    category: item.category, displayOrder: item.displayOrder, estimatedHours: item.baseHours, hourlyCostCents: null,
    fixedCostCents: 0, minimumValueCents: item.minimumValueCents, commercialState: "not_contracted",
    included: false, optional: false, complimentary: false, quantity: 1, individualDiscountCents: 0,
    customDescription: null, notes: "",
  };
}

// Linha personalizada em branco — sem catalogItemId, então elegível para edição/enriquecimento
// (HON-002C item 10); nunca compartilha id com um item do catálogo.
export function createCustomService(): FeeServiceInput {
  return {
    id: createId("fee-service"), catalogItemId: null, code: `custom-${createId("svc")}`, name: "Novo serviço personalizado",
    stage: "projeto", category: "complementary", displayOrder: 9999, estimatedHours: 0, hourlyCostCents: null,
    fixedCostCents: 0, minimumValueCents: 0, commercialState: "not_contracted", included: false, optional: false,
    complimentary: false, quantity: 1, individualDiscountCents: 0, customDescription: null, notes: "",
  };
}

function historyEntry(action: ServiceCompositionHistoryEntry["action"], serviceId: string | null, serviceName: string | null, detail: string, at: string): ServiceCompositionHistoryEntry {
  return { id: createId("hon-history"), at, action, serviceId, serviceName, detail };
}

const MAX_HISTORY_ENTRIES = 200;

// Compara a composição salva anteriormente com a atual e produz só as entradas de decisões
// relevantes (HON-002C item 12) — nunca uma por tecla digitada, porque isto roda uma única vez
// por salvamento (diff), não a cada edição de campo. Vocabulário fechado: os únicos eventos
// reconhecidos são os 6 listados no requisito; uma linha que apenas volta para
// "não contratado" (sem ser removida) não gera entrada — não há uma categoria própria para
// isso no vocabulário pedido, e forçá-la em "service_removed" seria impreciso (a linha
// continua na composição).
export function buildCompositionHistoryEntries(previous: FeeServiceInput[], next: FeeServiceInput[], at: string): ServiceCompositionHistoryEntry[] {
  const entries: ServiceCompositionHistoryEntry[] = [];
  const previousById = new Map(previous.map((service) => [service.id, service]));
  const nextIds = new Set(next.map((service) => service.id));
  for (const service of previous) {
    if (!nextIds.has(service.id)) entries.push(historyEntry("service_removed", service.id, service.name, `${service.name} removido da composição.`, at));
  }
  for (const service of next) {
    const before = previousById.get(service.id);
    if (!before) {
      if (service.commercialState === "included") entries.push(historyEntry("service_included", service.id, service.name, `${service.name} incluído na composição.`, at));
      else if (service.commercialState === "optional") entries.push(historyEntry("marked_optional", service.id, service.name, `${service.name} adicionado como opcional.`, at));
      else if (service.commercialState === "complimentary") entries.push(historyEntry("marked_complimentary", service.id, service.name, `${service.name} adicionado como cortesia.`, at));
      continue;
    }
    if (before.commercialState !== service.commercialState) {
      if (service.commercialState === "included") entries.push(historyEntry("service_included", service.id, service.name, `${service.name} passou a incluído.`, at));
      else if (service.commercialState === "optional") entries.push(historyEntry("marked_optional", service.id, service.name, `${service.name} marcado como opcional.`, at));
      else if (service.commercialState === "complimentary") entries.push(historyEntry("marked_complimentary", service.id, service.name, `${service.name} marcado como cortesia.`, at));
    }
    if (before.individualDiscountCents !== service.individualDiscountCents) {
      const from = (before.individualDiscountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const to = (service.individualDiscountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      entries.push(historyEntry("discount_applied", service.id, service.name, `Desconto de ${service.name}: ${from} → ${to}.`, at));
    }
  }
  return entries;
}

// Acrescenta as entradas da composição (com um resumo "composition_saved" opcional) ao
// histórico existente, aplicando o limite de retenção. Só chamado quando há mudanças de
// composição a registrar — um salvamento que não mexeu em nenhum serviço não gera entrada.
export function appendCompositionHistory(existing: ServiceCompositionHistoryEntry[], previous: FeeServiceInput[], next: FeeServiceInput[], at: string): ServiceCompositionHistoryEntry[] {
  const entries = buildCompositionHistoryEntries(previous, next, at);
  if (entries.length === 0) return existing;
  const included = next.filter((service) => service.commercialState === "included").length;
  const optional = next.filter((service) => service.commercialState === "optional").length;
  const complimentary = next.filter((service) => service.commercialState === "complimentary").length;
  const summary = historyEntry("composition_saved", null, null, `Composição salva: ${included} incluído(s), ${optional} opcional(is), ${complimentary} cortesia(s).`, at);
  const merged = [...existing, ...entries, summary];
  return merged.length > MAX_HISTORY_ENTRIES ? merged.slice(merged.length - MAX_HISTORY_ENTRIES) : merged;
}
