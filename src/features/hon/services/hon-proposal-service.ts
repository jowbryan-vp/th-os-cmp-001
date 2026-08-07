import { createId } from "../../../domain/project-master-record";
import { computeCompositionTotals, serviceLineGrossCents, serviceLineNetCents } from "../domain/hon-service-composition";
import {
  FeeCalculationStudy, FeeServiceInput, HON_SCHEMA_VERSION, ProposalDraft, ProposalServiceSnapshot,
  ProposalTotalsSnapshot, ServiceCatalogItem,
} from "../domain/hon-types";
import { serviceCategoryOrder } from "./hon-catalog-content";
import { checksum } from "./hon-study-service";

// Mesma ordem comercial usada na composição (hon-service-composition.ts#groupServicesByCategory):
// serviceCategoryOrder → displayOrder → nome. Aplicada aqui porque o snapshot congelado não
// carrega mais o `displayOrder` original (não faz parte do conteúdo comercial da proposta) —
// a ordem final é decidida e congelada no momento da incorporação, nunca recalculada depois.
function sortSnapshots(items: ProposalServiceSnapshot[]): ProposalServiceSnapshot[] {
  return [...items].sort((a, b) =>
    serviceCategoryOrder.indexOf(a.category) - serviceCategoryOrder.indexOf(b.category) || a.name.localeCompare(b.name, "pt-BR"));
}

// Próximo código de proposta, no formato PROP-{ano}-{sequência de 4 dígitos} — gerado uma
// única vez por proposta (na primeira incorporação) e nunca recalculado depois, mesmo que
// outras propostas do mesmo ano sejam criadas ou removidas. Mesmo padrão de
// indexed-db-project-repository.ts#nextCode, adaptado ao formato de 4 dígitos do HON-003.
export function nextProposalCode(existing: ProposalDraft[], year = new Date().getFullYear()): string {
  const prefix = `PROP-${year}-`;
  const highest = existing.map((item) => item.code).filter((code) => code.startsWith(prefix))
    .map((code) => Number(code.slice(prefix.length))).filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

// Conteúdo descritivo congelado no momento da incorporação: para um serviço do catálogo, vem
// do ServiceCatalogItem correspondente; para um item personalizado, vem de
// FeeServiceInput.customDescription; sem nenhuma das duas fontes (código de catálogo removido,
// personalizado sem enriquecimento), cai em textos vazios em vez de falhar a incorporação.
function resolveDescriptiveContent(service: FeeServiceInput, catalog: ServiceCatalogItem[]) {
  if (service.customDescription) return service.customDescription;
  const catalogItem = service.catalogItemId ? catalog.find((item) => item.id === service.catalogItemId) : undefined;
  if (catalogItem) {
    return {
      clientDescription: catalogItem.clientDescription, technicalDescription: catalogItem.technicalDescription,
      deliverables: catalogItem.deliverables, exclusions: catalogItem.exclusions, assumptions: catalogItem.assumptions,
    };
  }
  return { clientDescription: "", technicalDescription: "", deliverables: [], exclusions: [], assumptions: [] };
}

// Cortesia usa o valor BRUTO (mesma leitura de computeCompositionTotals — "quanto estaria
// dando de graça"); incluído e opcional usam o valor líquido (após desconto individual).
function buildServiceSnapshot(service: FeeServiceInput, catalog: ServiceCatalogItem[], fallbackHourlyCents: number): ProposalServiceSnapshot {
  const content = resolveDescriptiveContent(service, catalog);
  const netCents = service.commercialState === "complimentary"
    ? serviceLineGrossCents(service, fallbackHourlyCents) : serviceLineNetCents(service, fallbackHourlyCents);
  return {
    id: service.id, catalogItemId: service.catalogItemId, code: service.code, name: service.name, stage: service.stage,
    category: service.category, clientDescription: content.clientDescription, technicalDescription: content.technicalDescription,
    deliverables: content.deliverables, exclusions: content.exclusions, assumptions: content.assumptions,
    quantity: service.quantity, commercialState: service.commercialState, netCents,
  };
}

// Incorpora (ou atualiza) uma proposta a partir do estudo HON calculado: escopo, opcionais,
// totais e condições de pagamento são sempre substituídos pelo estado atual do estudo — nunca
// recalculados aqui, só copiados/derivados (HON-003). Campos manuais (title, introduction,
// observations, validUntil, commercialConditions, additionalExclusions, additionalAssumptions)
// são preservados de `existing` quando presente; só são inicializados na primeira incorporação.
// `code` é ignorado quando `existing` já tem um — o código nunca muda depois de gerado.
export function incorporateStudyIntoProposal(
  study: FeeCalculationStudy, catalog: ServiceCatalogItem[], fallbackHourlyCents: number,
  existing: ProposalDraft | null, code: string,
): ProposalDraft {
  if (!study.results) throw new Error("Calcule o estudo antes de incorporar à proposta.");
  const now = new Date().toISOString();
  const scopeItems = sortSnapshots(study.services
    .filter((service) => service.commercialState === "included" || service.commercialState === "complimentary")
    .map((service) => buildServiceSnapshot(service, catalog, fallbackHourlyCents)));
  const optionalItems = sortSnapshots(study.services
    .filter((service) => service.commercialState === "optional")
    .map((service) => buildServiceSnapshot(service, catalog, fallbackHourlyCents)));
  const compositionTotals = computeCompositionTotals(study.services, fallbackHourlyCents);
  const totals: ProposalTotalsSnapshot = {
    profitMarkupCents: study.results.profitMarkup, taxesCents: study.results.taxes,
    discountCents: study.results.discount, donationCents: study.results.donation,
    minimumAdjustmentCents: study.results.minimumAdjustment, commercialPriceCents: study.results.commercialPrice,
    finalPriceCents: study.results.finalPrice, includedCents: compositionTotals.includedCents,
    optionalCents: compositionTotals.optionalCents, complimentaryCents: compositionTotals.complimentaryCents,
  };
  const sourceCalculation = { studyId: study.id, studyVersion: study.version, checksum: checksum(study.results), incorporatedAt: now };
  if (existing) {
    return {
      ...existing, projectSnapshot: study.projectSnapshot, scopeItems, optionalItems, totals,
      paymentPlan: study.paymentPlan, sourceCalculation, updatedAt: now,
    };
  }
  return {
    id: createId("proposal-draft"), schemaVersion: HON_SCHEMA_VERSION, code, projectId: study.projectId, studyId: study.id,
    status: "draft", projectSnapshot: study.projectSnapshot, scopeItems, optionalItems, totals,
    paymentPlan: study.paymentPlan, sourceCalculation,
    title: `Proposta comercial — ${study.projectSnapshot.projectName}`, introduction: "", observations: "",
    validUntil: null, commercialConditions: "", additionalExclusions: [], additionalAssumptions: [],
    createdAt: now, updatedAt: now,
  };
}

// "Cálculo mais recente disponível" (HON-003): compara o checksum do FeeCalculationResult
// atual do estudo com o congelado em sourceCalculation na última incorporação/atualização.
// Nunca atualiza sozinho — só informa; a atualização é sempre uma ação explícita do usuário.
export function isProposalStale(draft: ProposalDraft, study: FeeCalculationStudy): boolean {
  return study.results !== null && draft.sourceCalculation.checksum !== checksum(study.results);
}
