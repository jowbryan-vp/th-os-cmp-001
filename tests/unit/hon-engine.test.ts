import assert from "node:assert/strict";
import test from "node:test";
import { FeeCalculationStudy, StructureProfile } from "../../src/features/hon/domain/hon-types";
import { calculateFeeStudy, calculateHourlyCost, createPaymentPlan, grossUpForIncludedTax, validatePaymentPlan } from "../../src/features/hon/services/hon-engine";
import { currentOperationProfile, physicalOfficeProfile } from "../../src/features/hon/services/hon-presets";

const now = "2026-08-04T12:00:00.000Z";
const simpleProfile: StructureProfile = {
  ...currentOperationProfile, id: "simple-profile", proLaboreCents: 0, investments: [],
  costs: [{
    id: "monthly", name: "Custo", amountCents: 100_000, periodicity: "monthly", startDate: null,
    endDate: null, active: true, origin: "common", replacesCostId: null, directlyReimbursable: false, notes: "",
  }],
  capacity: { weeklyAvailableHours: 25, averageWeeksPerMonth: 4, billableUtilizationPercentage: 100 },
  taxes: { percentage: 0, incidence: "gross_price", mode: "included", notes: "" }, minimumContractCents: 0,
};

function study(patch: Partial<FeeCalculationStudy> = {}): FeeCalculationStudy {
  const base: FeeCalculationStudy = {
    id: "study-1", schemaVersion: 1, projectId: "project-1", code: "HON-001", name: "Teste", version: 1,
    status: "draft", structureProfileId: simpleProfile.id, calculationMethod: "service_cost",
    projectSnapshot: { readAt: now, projectUpdatedAt: now, projectCode: "TH-001", projectName: "Teste", clientName: "", city: "Cacoal", state: "RO", propertyType: "", areas: { existing: null, expansion: null, demolition: null, capApplied: 0 }, floors: null, scopeCodes: [], capStudyIds: [], capLibraryVersions: [], manualChanges: [], divergences: [] },
    inputs: { calculationDate: "2026-08-04", complexityLevel: "simple", complexitySuggestedLevel: "simple", complexityScore: 0, complexityJustification: "", urgencyLevel: "normal", riskPercentage: 0, profitMarkup: 0, taxPercentage: 0, taxMode: "included", discountCents: 0, donationCents: 0, commercialPriceCents: null, minimumContractCents: 0, directExpensesCents: 0, areaReferenceM2: null, constructionCostReferenceCents: null, cauReferencePercentage: null, cauReferenceSource: "", commercialReferenceNotes: "" },
    services: [{
      id: "service-1", catalogItemId: null, code: "architecture", name: "Arquitetura", stage: "projeto",
      category: "design", displayOrder: 100, estimatedHours: 10, hourlyCostCents: null, fixedCostCents: 0,
      minimumValueCents: 0, commercialState: "included", included: true, optional: false, complimentary: false,
      quantity: 1, individualDiscountCents: 0, customDescription: null, notes: "",
    }],
    partners: [], travel: [], revisions: [], risks: [],
    bim: { mode: "internal_method", percentage: 0, affectedBaseCents: 0, additionalHours: 0, nativeFile: false, ifc: false, federatedModel: false, lod: "", loi: "", disciplines: 0, cycles: 0, notes: "" },
    construction: { monitoringWeeks: 0, visitsPerWeek: 0, hoursPerVisit: 0, managementWeeklyHours: 0, managementWeeks: 0, dedicatedTeamCostCents: 0, notes: "" },
    discounts: [], donations: [], paymentPlan: null, results: null, snapshots: [], compositionHistory: [],
    createdAt: now, updatedAt: now, approvedAt: null, notes: "",
  };
  return { ...base, ...patch, inputs: { ...base.inputs, ...patch.inputs }, bim: { ...base.bim, ...patch.bim }, construction: { ...base.construction, ...patch.construction } };
}

test("calcula capacidade faturável sem diluir custos nas horas não faturáveis", () => {
  const result = calculateHourlyCost(currentOperationProfile, "2026-08-04");
  assert.equal(result.availableHoursMonthly, 119.075);
  assert.equal(result.billableHoursMonthly, 77.39875);
  assert.ok(Math.abs(result.nonBillableHoursMonthly - 41.67625) < 0.000001);
  assert.equal(result.operationalCostsCents, 340_834);
  assert.equal(result.sustainableHourlyCostCents, 10_864);
});

test("mensaliza custo anual e encerra parcela temporária", () => {
  assert.equal(calculateHourlyCost(currentOperationProfile, "2026-08-04").operationalCostsCents, 340_834);
  assert.equal(calculateHourlyCost(currentOperationProfile, "2027-01-01").operationalCostsCents, 249_167);
});

test("recupera investimento em 36 meses sem consumir caução recuperável", () => {
  const result = calculateHourlyCost(physicalOfficeProfile, "2026-08-04");
  assert.equal(result.investmentRecoveryCents, 669_445);
  assert.ok(result.warnings.some((warning) => warning.includes("sobreposição")));
});

test("aplica acréscimo de 40% e expõe margem real diferente", () => {
  const result = calculateFeeStudy(study({ inputs: { ...study().inputs, profitMarkup: 40 } }), simpleProfile);
  assert.equal(result.subtotalBeforeProfit, 10_000);
  assert.equal(result.profitMarkup, 4_000);
  assert.equal(result.finalPrice, 14_000);
  assert.equal(result.effectiveProfitPercentage, 40);
  assert.ok(Math.abs(result.effectiveMarginPercentage - 28.5714285714) < 0.00001);
});

test("aplica acréscimo de 50%", () => {
  const result = calculateFeeStudy(study({ inputs: { ...study().inputs, profitMarkup: 50 } }), simpleProfile);
  assert.equal(result.recommendedFee, 15_000);
});

test("preserva valor líquido com imposto incluído de 5%", () => {
  assert.equal(grossUpForIncludedTax(100_000, 5), 105_263);
  const result = calculateFeeStudy(study({ inputs: { ...study().inputs, taxPercentage: 5 } }), simpleProfile);
  assert.equal(result.sustainableMinimum, 10_526);
  assert.equal(result.recommendedFee, 10_526);
  assert.equal(result.taxes, 526);
  assert.equal(result.estimatedNetRevenue, 10_000);
});

test("aplica mínimo de R$ 2.000 e registra ajuste", () => {
  const result = calculateFeeStudy(study({ inputs: { ...study().inputs, minimumContractCents: 200_000 } }), simpleProfile);
  assert.equal(result.minimumAdjustment, 190_000);
  assert.equal(result.finalPrice, 200_000);
  assert.ok(result.warnings.some((warning) => warning.includes("mínimo")));
});

test("aplica desconto de 5% e alerta quando consome lucro", () => {
  const result = calculateFeeStudy(study({ inputs: { ...study().inputs, profitMarkup: 40, discountCents: 700 } }), simpleProfile);
  assert.equal(result.finalPrice, 13_300);
  assert.ok(!result.warnings.some((warning) => warning.includes("acima do padrão")));
});

test("aplica desconto de 2%", () => {
  const result = calculateFeeStudy(study({ inputs: { ...study().inputs, commercialPriceCents: 20_000, discountCents: 400 } }), simpleProfile);
  assert.equal(result.finalPrice, 19_600);
});

test("gestão de parceiro usa 15% sem receber urgência interna", () => {
  const result = calculateFeeStudy(study({
    partners: [{ id: "p", name: "Estrutural", service: "Projeto estrutural", costCents: 100_000, managementPercentage: 15, urgencyCents: 0, responsibility: "Parceiro", includedInContract: true, notes: "" }],
    inputs: { ...study().inputs, urgencyLevel: "urgent" },
  }), simpleProfile);
  assert.equal(result.partnerCost, 100_000);
  assert.equal(result.partnerManagementFee, 15_000);
  assert.equal(result.urgencyAdjustment, 2_500);
});

test("deslocamento soma km, hora de viagem, ajuda de custo e domingo", () => {
  const result = calculateFeeStudy(study({ travel: [{ id: "t", city: "Vilhena", roundTripKm: 100, costPerKmCents: 150, travelHours: 2, technicalHours: 4, reportHours: 1, perDiemDays: 1, perDiemCents: 20_000, directExpensesCents: 5_000, calendarSurchargePercentage: 100, notes: "Domingo" }] }), simpleProfile);
  assert.equal(result.travelCost, 54_000);
  assert.equal(result.totalEstimatedHours, 17);
});

test("complexidade média aplica fator 1,20 apenas ao trabalho interno", () => {
  const result = calculateFeeStudy(study({ inputs: { ...study().inputs, complexityLevel: "medium", complexitySuggestedLevel: "medium" } }), simpleProfile);
  assert.equal(result.complexityAdjustment, 2_000);
});

test("urgência emergencial aplica pelo menos 60%", () => {
  const result = calculateFeeStudy(study({ inputs: { ...study().inputs, urgencyLevel: "emergency" } }), simpleProfile);
  assert.equal(result.urgencyAdjustment, 6_000);
});

test("BIM interno não cobra adicional e entrega BIM cobra percentual e horas", () => {
  assert.equal(calculateFeeStudy(study(), simpleProfile).bimAdjustment, 0);
  const result = calculateFeeStudy(study({ bim: { ...study().bim, mode: "basic_delivery", percentage: 10, affectedBaseCents: 10_000, additionalHours: 2, ifc: true } }), simpleProfile);
  assert.equal(result.bimAdjustment, 3_000);
});

test("revisão extra aceita percentual da etapa e horas", () => {
  const result = calculateFeeStudy(study({ revisions: [
    { id: "r1", category: "simple", method: "stage_percentage", stageValueCents: 10_000, percentage: 10, additionalHours: 0, fixedValueCents: 0, notes: "" },
    { id: "r2", category: "program_change", method: "hours", stageValueCents: 0, percentage: 0, additionalHours: 3, fixedValueCents: 0, notes: "" },
  ] }), simpleProfile);
  assert.equal(result.revisionAdjustment, 4_000);
});

test("doação não se confunde com desconto nem força mínimo", () => {
  const result = calculateFeeStudy(study({ inputs: { ...study().inputs, donationCents: 10_000, minimumContractCents: 200_000 } }), simpleProfile);
  assert.equal(result.donation, 10_000);
  assert.equal(result.discount, 0);
  assert.equal(result.minimumAdjustment, 0);
  assert.equal(result.finalPrice, 0);
  assert.equal(result.estimatedProfit, -10_000);
});

test("acompanhamento usa duração e gerenciamento usa carga semanal", () => {
  const result = calculateFeeStudy(study({ construction: { ...study().construction, monitoringWeeks: 4, visitsPerWeek: 1, hoursPerVisit: 2, managementWeeks: 4, managementWeeklyHours: 5 } }), simpleProfile);
  assert.equal(result.constructionServicesCost, 28_000);
  assert.equal(result.totalEstimatedHours, 38);
});

test("gera entrada de 30% e de 50% com total exato de 100%", () => {
  const thirty = createPaymentPlan("s", "30% + etapas", "thirty_installments", 100_001, "2026-08-04");
  assert.equal(thirty.installments[0].percentage, 30);
  assert.equal(thirty.installments.reduce((sum, item) => sum + item.amountCents, 0), 100_001);
  assert.equal(thirty.valid, true);
  const fifty = createPaymentPlan("s", "50% + marcos", "fifty_milestones", 100_001, "2026-08-04");
  assert.equal(fifty.installments[0].percentage, 50);
  assert.equal(fifty.installments.reduce((sum, item) => sum + item.percentage, 0), 100);
});

test("quantidade multiplica horas e custo fixo, nunca a tarifa-hora em si (HON-002C)", () => {
  const withQuantity = study({ services: [{
    id: "service-1", catalogItemId: null, code: "architecture", name: "Arquitetura", stage: "projeto",
    category: "design", displayOrder: 100, estimatedHours: 10, hourlyCostCents: 1_000, fixedCostCents: 500,
    minimumValueCents: 0, commercialState: "included", included: true, optional: false, complimentary: false,
    quantity: 3, individualDiscountCents: 0, customDescription: null, notes: "",
  }] });
  const result = calculateFeeStudy(withQuantity, simpleProfile);
  // (10h * 3) * 1000 + 500 * 3 = 30_000 + 1_500 = 31_500
  assert.equal(result.internalLaborCost, 31_500);
  assert.equal(result.totalEstimatedHours, 30);
});

test("desconto individual reduz o custo interno do serviço sem nunca ficar negativo (HON-002C)", () => {
  const overDiscounted = study({ services: [{
    id: "service-1", catalogItemId: null, code: "architecture", name: "Arquitetura", stage: "projeto",
    category: "design", displayOrder: 100, estimatedHours: 10, hourlyCostCents: 1_000, fixedCostCents: 0,
    minimumValueCents: 0, commercialState: "included", included: true, optional: false, complimentary: false,
    quantity: 1, individualDiscountCents: 999_999, customDescription: null, notes: "",
  }] });
  const result = calculateFeeStudy(overDiscounted, simpleProfile);
  assert.equal(result.internalLaborCost, 0, "desconto maior que o bruto zera a linha, nunca gera custo negativo");
});

test("cortesia e opcional não entram no custo interno nem no preço, mesmo com horas grandes (HON-002C)", () => {
  const withNonContracted = study({ services: [
    { id: "s1", catalogItemId: null, code: "a", name: "Incluído", stage: "projeto", category: "design", displayOrder: 1, estimatedHours: 10, hourlyCostCents: 1_000, fixedCostCents: 0, minimumValueCents: 0, commercialState: "included", included: true, optional: false, complimentary: false, quantity: 1, individualDiscountCents: 0, customDescription: null, notes: "" },
    { id: "s2", catalogItemId: null, code: "b", name: "Cortesia", stage: "projeto", category: "design", displayOrder: 2, estimatedHours: 1_000, hourlyCostCents: 1_000, fixedCostCents: 0, minimumValueCents: 0, commercialState: "complimentary", included: false, optional: false, complimentary: true, quantity: 1, individualDiscountCents: 0, customDescription: null, notes: "" },
    { id: "s3", catalogItemId: null, code: "c", name: "Opcional", stage: "projeto", category: "design", displayOrder: 3, estimatedHours: 1_000, hourlyCostCents: 1_000, fixedCostCents: 0, minimumValueCents: 0, commercialState: "optional", included: false, optional: true, complimentary: false, quantity: 1, individualDiscountCents: 0, customDescription: null, notes: "" },
  ] });
  const result = calculateFeeStudy(withNonContracted, simpleProfile);
  assert.equal(result.internalLaborCost, 10_000, "só a linha incluída (10h * 1000) entra no custo interno");
  assert.equal(result.totalEstimatedHours, 10);
});

test("rejeita plano com total diferente, parcela negativa e saldo sem vencimento", () => {
  const plan = createPaymentPlan("s", "custom", "thirty_installments", 100_000, "2026-08-04");
  plan.installments[0].percentage = 20;
  plan.installments[1].amountCents = -1;
  plan.installments[1].milestone = "";
  const result = validatePaymentPlan(plan, 100_000);
  assert.equal(result.valid, false);
  assert.ok(result.warnings.length >= 3);
});
