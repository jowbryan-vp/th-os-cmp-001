export const HON_SCHEMA_VERSION = 3;
export const HON_ENGINE_VERSION = "HON-001/1.0.0";

export type FeeStudyStatus = "draft" | "calculated" | "under_review" | "approved" | "used_in_proposal" | "superseded" | "archived";
export type ComplexityLevel = "very_simple" | "simple" | "medium" | "complex" | "very_complex";
export type UrgencyLevel = "normal" | "accelerated" | "urgent" | "very_urgent" | "emergency";
export type RiskLevel = "low" | "medium" | "high" | "custom";
export type CalculationMethod = "service_cost" | "cau_reference" | "commercial_reference";

export interface CapacityConfig {
  weeklyAvailableHours: number;
  averageWeeksPerMonth: number;
  billableUtilizationPercentage: number;
}

export interface StructureCostItem {
  id: string;
  name: string;
  amountCents: number;
  periodicity: "monthly" | "annual" | "one_time";
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  origin: "common" | "exclusive" | "replacement";
  replacesCostId: string | null;
  directlyReimbursable: boolean;
  notes: string;
}

export interface InvestmentItem {
  id: string;
  name: string;
  amountCents: number;
  recoveryMonths: number;
  recoverySuspended: boolean;
  depreciable: boolean;
  recoverableDeposit: boolean;
  residualValueCents: number;
  installmentCount: number | null;
  possibleOverlapWith: string[];
  notes: string;
}

export interface TaxConfig {
  percentage: number;
  incidence: "gross_price" | "taxable_services";
  mode: "included" | "added";
  notes: string;
}

export interface StructureProfile {
  id: string;
  schemaVersion: number;
  name: string;
  kind: "current_operation" | "physical_office" | "custom";
  active: boolean;
  description: string;
  parentProfileId: string | null;
  proLaboreCents: number;
  costs: StructureCostItem[];
  investments: InvestmentItem[];
  capacity: CapacityConfig;
  defaultProfitMarkup: number;
  highProfitMarkup: number;
  taxes: TaxConfig;
  minimumContractCents: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface HourlyCostBreakdown {
  availableHoursMonthly: number;
  billableHoursMonthly: number;
  nonBillableHoursMonthly: number;
  operationalCostsCents: number;
  proLaboreCents: number;
  investmentRecoveryCents: number;
  totalMonthlyCostCents: number;
  hourlyWithoutProLaboreCents: number;
  hourlyWithProLaboreCents: number;
  hourlyWithInvestmentCents: number;
  sustainableHourlyCostCents: number;
  warnings: string[];
}

// Categoria comercial do serviço (agrupamento para consulta/composição). Distinta de `stage`,
// que é a etapa de projeto (levantamento, anteprojeto, executivo...). Estável: HON-002C e a
// composição personalizada dependerão desses valores para agrupar/filtrar.
export type ServiceCategory =
  | "diagnosis" | "design" | "interiors_specialties" | "bim" | "sustainability"
  | "legal" | "construction" | "management" | "visualization" | "complementary";

export interface ServiceCatalogItem {
  id: string;
  version: string;
  code: string;
  name: string;
  stage: string;
  category: ServiceCategory;
  clientDescription: string;
  technicalDescription: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string[];
  displayOrder: number;
  calculationMethod: "hours" | "fixed" | "percentage" | "custom";
  baseHours: number;
  minimumHours: number;
  unit: string;
  responsible: string;
  execution: "internal" | "partner";
  defaultComplexity: ComplexityLevel;
  includedRevisionRounds: number;
  includedVisits: number;
  bim: boolean;
  risk: RiskLevel;
  minimumValueCents: number;
  active: boolean;
  source: string;
  confidence: "unvalidated" | "low" | "medium" | "high";
  notes: string;
}

// Estado comercial do serviço na composição (HON-002C): as 4 combinações possíveis de
// "conta no preço" x "está no escopo apresentado" são mutuamente exclusivas — por isso um
// enum, não três booleanos independentes que poderiam contradizer um ao outro (ex.: opcional
// E cortesia ao mesmo tempo). `included`/`optional`/`complimentary` em FeeServiceInput
// continuam existindo como projeção derivada de `commercialState` (compatibilidade com o
// motor e com código existente que já lê `service.included`), mas só `withCommercialState`
// (hon-service-composition.ts) deve escrevê-los — sempre os três juntos, nunca isolados.
export type ServiceCommercialState = "included" | "optional" | "complimentary" | "not_contracted";

// Enriquecimento manual de um item PERSONALIZADO (catalogItemId null) da composição — nunca
// preenchido para um item padrão do catálogo, cujo conteúdo vem sempre de ServiceCatalogItem
// via catalogItemId. Mesmo formato de conteúdo do catálogo (HON-002B) para reusar o mesmo
// modal "Entenda este serviço".
export interface ServiceCustomDescription {
  clientDescription: string;
  technicalDescription: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string[];
}

export interface FeeServiceInput {
  id: string;
  catalogItemId: string | null;
  code: string;
  name: string;
  stage: string;
  category: ServiceCategory;
  displayOrder: number;
  estimatedHours: number;
  hourlyCostCents: number | null;
  fixedCostCents: number;
  minimumValueCents: number;
  commercialState: ServiceCommercialState;
  included: boolean;
  optional: boolean;
  complimentary: boolean;
  quantity: number;
  individualDiscountCents: number;
  customDescription: ServiceCustomDescription | null;
  notes: string;
}

// Registro de uma decisão relevante da composição (HON-002C) — não um log de edição de campo
// a campo; só as ações listadas em serviceCompositionHistoryActions viram entrada. Escrito
// apenas ao salvar (diff entre a última composição salva e a atual), nunca por tecla digitada.
export type ServiceCompositionHistoryAction =
  | "service_included" | "service_removed" | "marked_optional" | "marked_complimentary"
  | "discount_applied" | "composition_saved";

export interface ServiceCompositionHistoryEntry {
  id: string;
  at: string;
  action: ServiceCompositionHistoryAction;
  serviceId: string | null;
  serviceName: string | null;
  detail: string;
}

export interface PartnerInput {
  id: string;
  name: string;
  service: string;
  costCents: number;
  managementPercentage: number;
  urgencyCents: number;
  responsibility: string;
  includedInContract: boolean;
  notes: string;
}

export interface TravelInput {
  id: string;
  city: string;
  roundTripKm: number;
  costPerKmCents: number;
  travelHours: number;
  technicalHours: number;
  reportHours: number;
  perDiemDays: number;
  perDiemCents: number;
  directExpensesCents: number;
  calendarSurchargePercentage: number;
  notes: string;
}

export interface RevisionInput {
  id: string;
  category: "simple" | "intermediate" | "broad" | "program_change" | "return_stage";
  method: "stage_percentage" | "hours" | "fixed" | "custom";
  stageValueCents: number;
  percentage: number;
  additionalHours: number;
  fixedValueCents: number;
  notes: string;
}

export interface RiskInput { id: string; category: string; level: RiskLevel; percentage: number; justification: string; }

export interface BimInput {
  mode: "internal_method" | "basic_delivery" | "information_requirements" | "coordination";
  percentage: number;
  affectedBaseCents: number;
  additionalHours: number;
  nativeFile: boolean;
  ifc: boolean;
  federatedModel: boolean;
  lod: string;
  loi: string;
  disciplines: number;
  cycles: number;
  notes: string;
}

export interface ConstructionServiceInput {
  monitoringWeeks: number;
  visitsPerWeek: number;
  hoursPerVisit: number;
  managementWeeklyHours: number;
  managementWeeks: number;
  dedicatedTeamCostCents: number;
  notes: string;
}

export interface PaymentInstallment {
  id: string;
  percentage: number;
  amountCents: number;
  dueDate: string;
  milestone: string;
  condition: string;
  notes: string;
}

export interface PaymentPlan {
  id: string;
  studyId: string;
  name: string;
  preset: "upfront" | "thirty_installments" | "fifty_milestones" | "custom";
  installments: PaymentInstallment[];
  valid: boolean;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeeCalculationResult {
  internalLaborCost: number; overheadCost: number; proLaboreAllocation: number;
  investmentRecoveryAllocation: number; directExpenses: number; travelCost: number;
  partnerCost: number; partnerManagementFee: number; riskAdjustment: number;
  complexityAdjustment: number; urgencyAdjustment: number; bimAdjustment: number;
  revisionAdjustment: number; constructionServicesCost: number; subtotalBeforeProfit: number;
  profitMarkup: number; priceBeforeTaxes: number; taxes: number; sustainableMinimum: number;
  recommendedFee: number; commercialPrice: number; discount: number; donation: number;
  minimumAdjustment: number; finalPrice: number; estimatedNetRevenue: number;
  estimatedProfit: number; effectiveProfitPercentage: number; effectiveMarginPercentage: number;
  totalEstimatedHours: number; effectiveHourlyRate: number; minimumHourlyRate: number;
  warnings: string[];
}

export interface ProjectDataSnapshot {
  readAt: string;
  projectUpdatedAt: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  city: string;
  state: string;
  propertyType: string;
  areas: { existing: number | null; expansion: number | null; demolition: number | null; capApplied: number };
  floors: number | null;
  scopeCodes: string[];
  capStudyIds: string[];
  capLibraryVersions: string[];
  manualChanges: string[];
  divergences: string[];
}

export interface FeeCalculationInputs {
  calculationDate: string;
  complexityLevel: ComplexityLevel;
  complexitySuggestedLevel: ComplexityLevel;
  complexityScore: number;
  complexityJustification: string;
  urgencyLevel: UrgencyLevel;
  riskPercentage: number;
  profitMarkup: number;
  taxPercentage: number;
  taxMode: "included" | "added";
  discountCents: number;
  donationCents: number;
  commercialPriceCents: number | null;
  minimumContractCents: number;
  directExpensesCents: number;
  areaReferenceM2: number | null;
  constructionCostReferenceCents: number | null;
  cauReferencePercentage: number | null;
  cauReferenceSource: string;
  commercialReferenceNotes: string;
}

export interface FeeScenario {
  id: string; studyId: string; name: string; services: FeeServiceInput[]; assumptions: string[];
  complexity: ComplexityLevel; urgency: UrgencyLevel; structureProfileId: string;
  profitMarkup: number; discount: number; donation: number; paymentCondition: string;
  result: FeeCalculationResult; createdAt: string; updatedAt: string;
}

export interface FeeCalculationStudy {
  id: string; schemaVersion: number; projectId: string; code: string; name: string; version: number;
  status: FeeStudyStatus; structureProfileId: string; calculationMethod: CalculationMethod;
  projectSnapshot: ProjectDataSnapshot; inputs: FeeCalculationInputs; services: FeeServiceInput[];
  partners: PartnerInput[]; travel: TravelInput[]; revisions: RevisionInput[]; risks: RiskInput[];
  bim: BimInput; construction: ConstructionServiceInput; discounts: Array<{ id: string; amountCents: number; reason: string }>;
  donations: Array<{ id: string; technicalValueCents: number; percentage: number; amountCents: number; justification: string; beneficiary: string; approvedBy: string; date: string; notes: string }>;
  paymentPlan: PaymentPlan | null; results: FeeCalculationResult | null; snapshots: string[];
  compositionHistory: ServiceCompositionHistoryEntry[];
  createdAt: string; updatedAt: string; approvedAt: string | null; notes: string;
}

export interface FeeSnapshot {
  id: string; studyId: string; projectId: string; studyVersion: number; engineVersion: string;
  approvedAt: string; payload: FeeCalculationStudy; checksum: string;
}

export interface FeeCalibrationRecord {
  id: string; studyId: string; projectId: string; estimatedHours: number; actualHours: number | null;
  proposedPriceCents: number; contractedPriceCents: number | null; predictedCostCents: number;
  actualCostCents: number | null; predictedProfitCents: number; actualProfitCents: number | null;
  approvedForCalibration: boolean; notes: string; createdAt: string; updatedAt: string;
}

export interface ProposalPricingSnapshot {
  studyId: string; scenarioId: string | null; projectCode: string; projectName: string;
  scope: Array<{ name: string; stage: string; notes: string }>;
  commercialPriceCents: number; finalPriceCents: number; paymentPlan: PaymentPlan | null;
  exclusions: string[]; revisionPolicy: string; visitPolicy: string; createdAt: string;
}
