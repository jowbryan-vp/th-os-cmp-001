import { HON_SCHEMA_VERSION, ServiceCatalogItem, StructureProfile } from "../domain/hon-types";

const at = "2026-08-04T12:00:00.000Z";
const cost = (id: string, name: string, amountCents: number, periodicity: "monthly" | "annual" | "one_time" = "monthly", extra: Partial<StructureProfile["costs"][number]> = {}): StructureProfile["costs"][number] => ({
  id, name, amountCents, periodicity, startDate: null, endDate: null, active: true,
  origin: "common", replacesCostId: null, directlyReimbursable: false, notes: "", ...extra,
});
const investment = (id: string, name: string, amountCents: number, extra: Partial<StructureProfile["investments"][number]> = {}): StructureProfile["investments"][number] => ({
  id, name, amountCents, recoveryMonths: 36, recoverySuspended: false, depreciable: true,
  recoverableDeposit: false, residualValueCents: 0, installmentCount: null,
  possibleOverlapWith: [], notes: "", ...extra,
});

const commonCosts = [
  cost("cost-software", "Software", 1_200_000, "annual"),
  cost("cost-notebook", "Notebook (12 parcelas)", 91_667, "monthly", { startDate: "2026-01-01", endDate: "2026-12-31", notes: "Parcela temporária; revisar datas reais." }),
  cost("cost-ai-storage", "IA e armazenamento", 35_000),
  cost("cost-phone-internet", "Telefone e internet", 12_500),
  cost("cost-general-travel", "Deslocamentos gerais", 25_000, "monthly", { notes: "Excluir quando cobrado diretamente para evitar dupla contagem." }),
  cost("cost-cau", "CAU", 80_000, "annual"),
  cost("cost-maintenance-current", "Manutenção", 10_000),
  cost("cost-accountant-current", "Contador previsto", 60_000),
];

export const currentOperationProfile: StructureProfile = {
  id: "profile-current-operation", schemaVersion: HON_SCHEMA_VERSION, name: "Operação atual",
  kind: "current_operation", active: true, description: "Preset inicial editável da operação atual.",
  parentProfileId: null, proLaboreCents: 500_000, costs: commonCosts, investments: [],
  capacity: { weeklyAvailableHours: 27.5, averageWeeksPerMonth: 4.33, billableUtilizationPercentage: 65 },
  defaultProfitMarkup: 40, highProfitMarkup: 50,
  taxes: { percentage: 5, incidence: "gross_price", mode: "included", notes: "Imposto por contrato; não é custo fixo mensal." },
  minimumContractCents: 200_000, notes: "Valores iniciais devem ser revisados pelo arquiteto.", createdAt: at, updatedAt: at,
};

export const physicalOfficeProfile: StructureProfile = {
  id: "profile-physical-office", schemaVersion: HON_SCHEMA_VERSION, name: "Escritório físico",
  kind: "physical_office", active: true, description: "Preset com custos comuns herdados e custos exclusivos de sede física.",
  parentProfileId: currentOperationProfile.id, proLaboreCents: 500_000,
  costs: [
    ...commonCosts.filter((item) => !["cost-phone-internet", "cost-accountant-current", "cost-maintenance-current"].includes(item.id)),
    cost("cost-rent", "Aluguel", 250_000, "monthly", { origin: "exclusive" }),
    cost("cost-energy", "Energia", 65_000, "monthly", { origin: "exclusive" }),
    cost("cost-office-internet", "Internet do escritório", 18_600, "monthly", { origin: "replacement", replacesCostId: "cost-phone-internet" }),
    cost("cost-furniture-provision", "Mobiliário — provisão mensal", 50_000, "monthly", { origin: "exclusive", notes: "Possível sobreposição com investimento em mobiliário." }),
    cost("cost-equipment-provision", "Equipamentos — provisão mensal", 100_000, "monthly", { origin: "exclusive", notes: "Possível sobreposição com computadores/aquisição de equipamentos." }),
    cost("cost-assistant", "Assistente", 200_000, "monthly", { origin: "exclusive" }),
    cost("cost-cleaning", "Limpeza", 80_000, "monthly", { origin: "exclusive" }),
    cost("cost-consumables", "Material de consumo", 30_000, "monthly", { origin: "exclusive" }),
    cost("cost-marketing", "Marketing", 80_000, "monthly", { origin: "exclusive" }),
    cost("cost-accountant-office", "Contador", 65_000, "monthly", { origin: "replacement", replacesCostId: "cost-accountant-current" }),
    cost("cost-insurance", "Seguros", 300_000, "annual", { origin: "exclusive" }),
    cost("cost-maintenance-office", "Manutenção", 50_000, "monthly", { origin: "replacement", replacesCostId: "cost-maintenance-current" }),
  ],
  investments: [
    investment("investment-renovation", "Reforma", 4_000_000),
    investment("investment-furniture", "Mobiliário", 6_500_000, { possibleOverlapWith: ["cost-furniture-provision"] }),
    investment("investment-computers", "Computadores", 8_000_000, { possibleOverlapWith: ["cost-equipment-provision", "investment-equipment"] }),
    investment("investment-printers", "Impressoras", 1_100_000),
    investment("investment-signage", "Comunicação visual", 1_000_000),
    investment("investment-deposit", "Caução", 500_000, { depreciable: false, recoverableDeposit: true, residualValueCents: 500_000, notes: "Caução potencialmente recuperável; não tratada como custo perdido." }),
    investment("investment-fees", "Taxas", 500_000, { depreciable: false }),
    investment("investment-equipment", "Aquisição de equipamentos", 3_000_000, { possibleOverlapWith: ["investment-computers", "cost-equipment-provision"] }),
  ],
  capacity: { weeklyAvailableHours: 27.5, averageWeeksPerMonth: 4.33, billableUtilizationPercentage: 65 },
  defaultProfitMarkup: 40, highProfitMarkup: 50,
  taxes: { percentage: 5, incidence: "gross_price", mode: "included", notes: "Configuração inicial editável." },
  minimumContractCents: 200_000, notes: "Revisar sobreposições antes de usar o custo-hora.", createdAt: at, updatedAt: at,
};

export const defaultStructureProfiles = [currentOperationProfile, physicalOfficeProfile];

const serviceNames: Array<[string, string, string, number]> = [
  ["data_survey", "Levantamento de dados", "levantamento", 0], ["briefing", "Briefing e programa de necessidades", "briefing", 0],
  ["feasibility", "Estudo de viabilidade", "viabilidade", 0], ["preliminary_study", "Estudo preliminar", "estudo_preliminar", 2],
  ["draft_design", "Anteprojeto", "anteprojeto", 3], ["legal_design", "Projeto legal", "projeto_legal", 0],
  ["executive_design", "Projeto executivo", "executivo", 0], ["detailing", "Detalhamento", "detalhamento", 0],
  ["coordination", "Compatibilização", "compatibilizacao", 0], ["procurement", "Assistência à contratação", "contratacao", 0],
  ["monitoring", "Acompanhamento de obra", "obra", 0], ["management", "Gerenciamento de obra", "obra", 0],
  ["closeout", "Encerramento e entrega", "entrega", 0], ["as_built", "As built", "entrega", 0],
  ["cadastral_survey", "Levantamento cadastral", "levantamento", 0], ["architectural_design", "Projeto arquitetônico", "projeto", 0],
  ["renovation", "Reforma", "projeto", 0], ["expansion", "Ampliação", "projeto", 0], ["interiors", "Interiores", "projeto", 0],
  ["lighting", "Iluminação", "projeto", 0], ["electrical_points", "Pontos elétricos", "projeto", 0],
  ["plumbing_points", "Pontos hidráulicos", "projeto", 0], ["furniture", "Mobiliário", "projeto", 0],
  ["landscape", "Paisagismo", "projeto", 0], ["massing", "Estudo de massas", "viabilidade", 0],
  ["regularization", "Regularização", "legal", 0], ["bim_modeling", "Modelagem BIM", "bim", 0],
  ["bim_delivery", "Entrega BIM", "bim", 0], ["bim_compatibility", "Compatibilização BIM", "bim", 0],
  ["bim_coordination", "Coordenação BIM", "bim", 0], ["bioclimatic", "Consultoria bioclimática", "consultoria", 0],
  ["sustainability", "Consultoria em sustentabilidade", "consultoria", 0], ["rendering", "Renderizações", "apoio", 0],
  ["complementary", "Projetos complementares", "apoio", 0], ["partial_management", "Gerenciamento parcial", "obra", 0],
  ["intensive_management", "Gerenciamento intensivo", "obra", 0], ["dedicated_management", "Gerenciamento dedicado", "obra", 0],
  ["technical_visit", "Visita técnica avulsa", "visita", 0], ["consulting", "Consultoria", "consultoria", 0], ["other", "Outros", "outros", 0],
];

export const defaultServiceCatalog: ServiceCatalogItem[] = serviceNames.map(([code, name, stage, includedRevisionRounds]) => ({
  id: `service-${code}`, version: "1.0.0", code, name, stage, calculationMethod: "hours",
  baseHours: 0, minimumHours: code === "technical_visit" ? 2 : 0, unit: "hora", responsible: "Arquiteto responsável",
  execution: code === "rendering" || code === "complementary" ? "partner" : "internal",
  defaultComplexity: "simple", includedRevisionRounds, includedVisits: 0,
  bim: code.includes("bim"), risk: "low", minimumValueCents: 0, active: true,
  source: "Preset inicial HON-001", confidence: "unvalidated", notes: "Horas devem ser informadas ou calibradas; não há coeficiente técnico definitivo.",
}));
