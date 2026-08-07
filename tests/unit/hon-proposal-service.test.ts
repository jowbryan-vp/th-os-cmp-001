import assert from "node:assert/strict";
import test from "node:test";
import { FeeCalculationStudy, FeeServiceInput, ProposalDraft, ServiceCatalogItem, StructureProfile } from "../../src/features/hon/domain/hon-types";
import { calculateFeeStudy } from "../../src/features/hon/services/hon-engine";
import { incorporateStudyIntoProposal, isProposalStale, nextProposalCode } from "../../src/features/hon/services/hon-proposal-service";
import { currentOperationProfile } from "../../src/features/hon/services/hon-presets";

const now = "2026-08-07T12:00:00.000Z";
const profile: StructureProfile = {
  ...currentOperationProfile, id: "simple-profile", proLaboreCents: 0, investments: [],
  costs: [{ id: "monthly", name: "Custo", amountCents: 100_000, periodicity: "monthly", startDate: null, endDate: null, active: true, origin: "common", replacesCostId: null, directlyReimbursable: false, notes: "" }],
  capacity: { weeklyAvailableHours: 25, averageWeeksPerMonth: 4, billableUtilizationPercentage: 100 },
  taxes: { percentage: 0, incidence: "gross_price", mode: "included", notes: "" }, minimumContractCents: 0,
};

function service(patch: Partial<FeeServiceInput> = {}): FeeServiceInput {
  return {
    id: "service-1", catalogItemId: null, code: "architecture", name: "Arquitetura", stage: "projeto",
    category: "design", displayOrder: 100, estimatedHours: 10, hourlyCostCents: 1_000, fixedCostCents: 0,
    minimumValueCents: 0, commercialState: "included", included: true, optional: false, complimentary: false,
    quantity: 1, individualDiscountCents: 0, customDescription: null, notes: "",
    ...patch,
  };
}

const catalog: ServiceCatalogItem[] = [{
  id: "cat-1", version: "1.0.0", code: "architecture", name: "Arquitetura", stage: "projeto",
  category: "design", clientDescription: "descrição para o cliente", technicalDescription: "descrição técnica",
  deliverables: ["plantas"], exclusions: ["obra"], assumptions: ["acesso ao imóvel"], displayOrder: 100,
  calculationMethod: "hours", baseHours: 10, minimumHours: 0, unit: "hora", responsible: "Arquiteto",
  execution: "internal", defaultComplexity: "simple", includedRevisionRounds: 0, includedVisits: 0, bim: false,
  risk: "low", minimumValueCents: 0, active: true, source: "teste", confidence: "unvalidated", notes: "",
}];

function study(services: FeeServiceInput[], patch: Partial<FeeCalculationStudy> = {}): FeeCalculationStudy {
  const base: FeeCalculationStudy = {
    id: "study-1", schemaVersion: 4, projectId: "project-1", code: "HON-001", name: "Teste", version: 1,
    status: "calculated", structureProfileId: profile.id, calculationMethod: "service_cost",
    projectSnapshot: { readAt: now, projectUpdatedAt: now, projectCode: "TH-001", projectName: "Projeto Teste", clientName: "Cliente", city: "Cacoal", state: "RO", propertyType: "", areas: { existing: null, expansion: null, demolition: null, capApplied: 0 }, floors: null, scopeCodes: [], capStudyIds: [], capLibraryVersions: [], manualChanges: [], divergences: [] },
    inputs: { calculationDate: "2026-08-07", complexityLevel: "simple", complexitySuggestedLevel: "simple", complexityScore: 0, complexityJustification: "", urgencyLevel: "normal", riskPercentage: 0, profitMarkup: 0, taxPercentage: 0, taxMode: "included", discountCents: 0, donationCents: 0, commercialPriceCents: null, minimumContractCents: 0, directExpensesCents: 0, areaReferenceM2: null, constructionCostReferenceCents: null, cauReferencePercentage: null, cauReferenceSource: "", commercialReferenceNotes: "" },
    services, partners: [], travel: [], revisions: [], risks: [],
    bim: { mode: "internal_method", percentage: 0, affectedBaseCents: 0, additionalHours: 0, nativeFile: false, ifc: false, federatedModel: false, lod: "", loi: "", disciplines: 0, cycles: 0, notes: "" },
    construction: { monitoringWeeks: 0, visitsPerWeek: 0, hoursPerVisit: 0, managementWeeklyHours: 0, managementWeeks: 0, dedicatedTeamCostCents: 0, notes: "" },
    discounts: [], donations: [], paymentPlan: null, results: null, snapshots: [], compositionHistory: [],
    createdAt: now, updatedAt: now, approvedAt: null, notes: "",
    ...patch,
  };
  return { ...base, results: calculateFeeStudy(base, profile) };
}

test("nextProposalCode gera PROP-{ano}-0001 sem propostas prévias e incrementa a maior sequência do mesmo ano", () => {
  assert.equal(nextProposalCode([], 2026), "PROP-2026-0001");
  const existing = [{ code: "PROP-2026-0003" }, { code: "PROP-2026-0001" }, { code: "PROP-2025-0009" }] as ProposalDraft[];
  assert.equal(nextProposalCode(existing, 2026), "PROP-2026-0004", "ignora propostas de outros anos e nunca reaproveita um número já usado");
});

test("incorporateStudyIntoProposal exige estudo calculado", () => {
  const uncalculated = study([service()], {}); const withoutResults = { ...uncalculated, results: null };
  assert.throws(() => incorporateStudyIntoProposal(withoutResults, catalog, 0, null, "PROP-2026-0001"), /Calcule o estudo/);
});

test("incorporateStudyIntoProposal separa escopo (incluído+cortesia) de opcionais, e exclui não contratado", () => {
  const included = service({ id: "s1", commercialState: "included" });
  const optional = service({ id: "s2", commercialState: "optional", included: false, optional: true, catalogItemId: null, code: "custom", name: "Opcional", customDescription: { clientDescription: "x", technicalDescription: "y", deliverables: [], exclusions: [], assumptions: [] } });
  const complimentary = service({ id: "s3", commercialState: "complimentary", included: false, complimentary: true, individualDiscountCents: 0 });
  const notContracted = service({ id: "s4", commercialState: "not_contracted", included: false });
  const draft = incorporateStudyIntoProposal(study([included, optional, complimentary, notContracted]), catalog, 0, null, "PROP-2026-0001");
  assert.deepEqual(draft.scopeItems.map((item) => item.id).sort(), ["s1", "s3"]);
  assert.deepEqual(draft.optionalItems.map((item) => item.id), ["s2"]);
});

test("incorporateStudyIntoProposal congela conteúdo do catálogo para serviço vinculado e do customDescription para item personalizado", () => {
  const fromCatalog = service({ id: "s1", catalogItemId: "cat-1" });
  const custom = service({ id: "s2", catalogItemId: null, code: "custom-1", name: "Consultoria extra", customDescription: { clientDescription: "para o cliente", technicalDescription: "técnica", deliverables: ["a"], exclusions: ["b"], assumptions: ["c"] } });
  const draft = incorporateStudyIntoProposal(study([fromCatalog, custom]), catalog, 0, null, "PROP-2026-0001");
  const catalogSnapshot = draft.scopeItems.find((item) => item.id === "s1")!;
  const customSnapshot = draft.scopeItems.find((item) => item.id === "s2")!;
  assert.equal(catalogSnapshot.clientDescription, "descrição para o cliente");
  assert.deepEqual(catalogSnapshot.deliverables, ["plantas"]);
  assert.equal(customSnapshot.clientDescription, "para o cliente");
  assert.deepEqual(customSnapshot.deliverables, ["a"]);
});

test("incorporateStudyIntoProposal usa valor bruto para cortesia e líquido para incluído/opcional", () => {
  const included = service({ id: "s1", commercialState: "included", estimatedHours: 10, hourlyCostCents: 1_000, individualDiscountCents: 2_000 });
  const complimentary = service({ id: "s2", commercialState: "complimentary", included: false, complimentary: true, estimatedHours: 10, hourlyCostCents: 1_000 });
  const draft = incorporateStudyIntoProposal(study([included, complimentary]), catalog, 0, null, "PROP-2026-0001");
  assert.equal(draft.scopeItems.find((item) => item.id === "s1")!.netCents, 8_000, "incluído usa valor líquido após desconto individual");
  assert.equal(draft.scopeItems.find((item) => item.id === "s2")!.netCents, 10_000, "cortesia usa valor bruto, para transparência de quanto está sendo dado");
});

test("incorporateStudyIntoProposal sem proposta existente gera código, status draft e campos manuais vazios", () => {
  const draft = incorporateStudyIntoProposal(study([service()]), catalog, 0, null, "PROP-2026-0007");
  assert.equal(draft.code, "PROP-2026-0007");
  assert.equal(draft.status, "draft");
  assert.equal(draft.projectId, "project-1");
  assert.equal(draft.studyId, "study-1");
  assert.equal(draft.introduction, "");
  assert.equal(draft.validUntil, null);
  assert.deepEqual(draft.additionalExclusions, []);
});

test("incorporateStudyIntoProposal com proposta existente preserva id/código/campos manuais e substitui só os campos derivados", () => {
  const first = incorporateStudyIntoProposal(study([service({ id: "s1" })]), catalog, 0, null, "PROP-2026-0001");
  const edited: ProposalDraft = { ...first, title: "Título customizado", introduction: "Prezado cliente...", commercialConditions: "50% + entrega", additionalExclusions: ["mobiliário"] };
  const restudy = study([service({ id: "s1" }), service({ id: "s2", name: "Novo serviço" })]);
  const updated = incorporateStudyIntoProposal(restudy, catalog, 0, edited, "PROP-2026-9999");
  assert.equal(updated.id, first.id, "id nunca muda numa atualização");
  assert.equal(updated.code, "PROP-2026-0001", "código nunca muda depois de gerado, mesmo se um novo código for passado");
  assert.equal(updated.title, "Título customizado", "campo manual é preservado");
  assert.equal(updated.introduction, "Prezado cliente...");
  assert.deepEqual(updated.additionalExclusions, ["mobiliário"]);
  assert.equal(updated.scopeItems.length, 2, "escopo é substituído pelo estado atual do estudo");
});

test("isProposalStale é false logo após incorporar e true depois que o estudo é recalculado com um resultado diferente", () => {
  const base = study([service()]);
  const draft = incorporateStudyIntoProposal(base, catalog, 0, null, "PROP-2026-0001");
  assert.equal(isProposalStale(draft, base), false);
  const recalculated = study([service()], { inputs: { ...base.inputs, profitMarkup: 40 } });
  assert.equal(isProposalStale(draft, recalculated), true);
});

test("isProposalStale é false quando o estudo ainda não foi calculado (nada para comparar)", () => {
  const base = study([service()]);
  const draft = incorporateStudyIntoProposal(base, catalog, 0, null, "PROP-2026-0001");
  assert.equal(isProposalStale(draft, { ...base, results: null }), false);
});
