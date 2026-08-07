import { serviceLineHours, serviceLineNetCents } from "../domain/hon-service-composition";
import {
  BimInput, ComplexityLevel, FeeCalculationResult, FeeCalculationStudy, HourlyCostBreakdown,
  PaymentPlan, RevisionInput, StructureProfile, UrgencyLevel,
} from "../domain/hon-types";

export const complexityFactors: Record<ComplexityLevel, number> = {
  very_simple: 0.85, simple: 1, medium: 1.2, complex: 1.45, very_complex: 1.8,
};
export const urgencyPercentages: Record<UrgencyLevel, number> = {
  normal: 0, accelerated: 15, urgent: 25, very_urgent: 40, emergency: 60,
};

const round = (value: number) => Math.round(value);
const percentage = (base: number, percent: number) => round(base * percent / 100);
const activeOn = (start: string | null, end: string | null, date: string) => (!start || start <= date) && (!end || end >= date);
const monthlyCost = (amount: number, periodicity: "monthly" | "annual" | "one_time") => periodicity === "annual" ? round(amount / 12) : periodicity === "monthly" ? amount : 0;

export function calculateHourlyCost(profile: StructureProfile, calculationDate = new Date().toISOString().slice(0, 10)): HourlyCostBreakdown {
  const warnings: string[] = [];
  const billableRate = profile.capacity.billableUtilizationPercentage / 100;
  const availableHoursMonthly = profile.capacity.weeklyAvailableHours * profile.capacity.averageWeeksPerMonth;
  const billableHoursMonthly = availableHoursMonthly * billableRate;
  const nonBillableHoursMonthly = availableHoursMonthly - billableHoursMonthly;
  if (billableHoursMonthly <= 0) throw new Error("As horas faturáveis devem ser maiores que zero.");
  const operationalCostsCents = profile.costs
    .filter((item) => item.active && !item.directlyReimbursable && activeOn(item.startDate, item.endDate, calculationDate))
    .reduce((sum, item) => sum + monthlyCost(item.amountCents, item.periodicity), 0);
  const investmentRecoveryCents = profile.investments
    .filter((item) => !item.recoverySuspended && item.recoveryMonths > 0)
    .reduce((sum, item) => sum + round(Math.max(0, item.amountCents - item.residualValueCents) / item.recoveryMonths), 0);
  const totalMonthlyCostCents = operationalCostsCents + profile.proLaboreCents + investmentRecoveryCents;
  const costItems = new Set(profile.costs.map((item) => item.id));
  for (const item of profile.investments) {
    if (item.possibleOverlapWith.some((id) => costItems.has(id) || profile.investments.some((other) => other.id === id))) {
      warnings.push(`Possível sobreposição a revisar: ${item.name}.`);
    }
    if (item.recoverableDeposit && item.residualValueCents < item.amountCents) warnings.push(`${item.name}: confirmar parcela efetivamente não recuperável.`);
  }
  return {
    availableHoursMonthly, billableHoursMonthly, nonBillableHoursMonthly, operationalCostsCents,
    proLaboreCents: profile.proLaboreCents, investmentRecoveryCents, totalMonthlyCostCents,
    hourlyWithoutProLaboreCents: round(operationalCostsCents / billableHoursMonthly),
    hourlyWithProLaboreCents: round((operationalCostsCents + profile.proLaboreCents) / billableHoursMonthly),
    hourlyWithInvestmentCents: round((operationalCostsCents + investmentRecoveryCents) / billableHoursMonthly),
    sustainableHourlyCostCents: round(totalMonthlyCostCents / billableHoursMonthly), warnings,
  };
}

export function grossUpForIncludedTax(netCents: number, taxPercentage: number) {
  if (taxPercentage < 0 || taxPercentage >= 100) throw new Error("O imposto deve estar entre 0% e 100%.");
  return round(netCents / (1 - taxPercentage / 100));
}

function revisionValue(item: RevisionInput, hourlyCents: number) {
  if (item.method === "stage_percentage") return percentage(item.stageValueCents, item.percentage);
  if (item.method === "hours") return round(item.additionalHours * hourlyCents);
  return item.fixedValueCents;
}

function bimValue(bim: BimInput, hourlyCents: number) {
  if (bim.mode === "internal_method") return 0;
  return percentage(bim.affectedBaseCents, bim.percentage) + round(bim.additionalHours * hourlyCents);
}

export function calculateFeeStudy(study: FeeCalculationStudy, profile: StructureProfile): FeeCalculationResult {
  const hourly = calculateHourlyCost(profile, study.inputs.calculationDate);
  const hourlyCents = hourly.sustainableHourlyCostCents;
  const warnings = [...hourly.warnings];
  // Só serviços "included" entram no custo interno (mesmo filtro de sempre — `included` é
  // mantido em sincronia com `commercialState` por construção, ver hon-service-composition.ts).
  // Opcional, cortesia e não contratado ficam fora do preço: opcional/não contratado porque
  // ainda não são compromisso comercial; cortesia porque HON-002C trata "cortesia não soma
  // valor" como fora da precificação (não só do preço final, mas do próprio custo interno que
  // alimenta a cascata de complexidade/urgência/lucro) — não há acompanhamento de custo
  // absorvido de cortesias nesta fase.
  const services = study.services.filter((service) => service.included);
  const totalServiceHours = services.reduce((sum, service) => sum + serviceLineHours(service), 0);
  const rawLabor = services.reduce((sum, service) => sum + serviceLineNetCents(service, hourlyCents), 0);
  if (!services.length || totalServiceHours <= 0) warnings.push("Horas internas ainda não estimadas.");
  const factor = complexityFactors[study.inputs.complexityLevel];
  const complexityAdjustment = round(rawLabor * (factor - 1));
  if (study.inputs.complexityLevel !== study.inputs.complexitySuggestedLevel && !study.inputs.complexityJustification.trim()) {
    warnings.push("Complexidade escolhida diverge da sugestão sem justificativa.");
  }
  const urgencyRate = urgencyPercentages[study.inputs.urgencyLevel];
  const urgencyAdjustment = percentage(rawLabor + complexityAdjustment, urgencyRate);
  if (study.inputs.urgencyLevel !== "normal" && urgencyAdjustment === 0) warnings.push("Urgência informada sem adicional calculado.");
  const partnerCost = study.partners.filter((item) => item.includedInContract).reduce((sum, item) => sum + item.costCents + item.urgencyCents, 0);
  const partnerManagementFee = study.partners.filter((item) => item.includedInContract).reduce((sum, item) => {
    if (item.managementPercentage <= 0) warnings.push(`Parceiro sem gestão: ${item.name || item.service}.`);
    return sum + percentage(item.costCents, item.managementPercentage);
  }, 0);
  const travel = study.travel.reduce((acc, item) => {
    if (item.roundTripKm > 0 && item.travelHours <= 0) warnings.push(`Deslocamento para ${item.city || "outra cidade"} sem tempo de viagem.`);
    const vehicle = round(item.roundTripKm * item.costPerKmCents);
    const labor = round((item.travelHours + item.technicalHours + item.reportHours) * hourlyCents);
    const aid = item.perDiemDays * item.perDiemCents;
    const base = vehicle + labor + aid + item.directExpensesCents;
    return { cents: acc.cents + base + percentage(labor, item.calendarSurchargePercentage), hours: acc.hours + item.travelHours + item.technicalHours + item.reportHours };
  }, { cents: 0, hours: 0 });
  const constructionHours = study.construction.monitoringWeeks * study.construction.visitsPerWeek * study.construction.hoursPerVisit
    + study.construction.managementWeeklyHours * study.construction.managementWeeks;
  if (study.construction.visitsPerWeek > 0 && study.construction.monitoringWeeks <= 0) warnings.push("Acompanhamento sem duração definida.");
  if (study.construction.managementWeeks > 0 && study.construction.managementWeeklyHours <= 0) warnings.push("Gerenciamento sem carga semanal.");
  const constructionServicesCost = round(constructionHours * hourlyCents) + study.construction.dedicatedTeamCostCents;
  const directExpenses = study.inputs.directExpensesCents;
  const revisionAdjustment = study.revisions.reduce((sum, item) => sum + revisionValue(item, hourlyCents), 0);
  const bimAdjustment = bimValue(study.bim, hourlyCents);
  if (study.bim.mode !== "internal_method" && bimAdjustment <= 0) warnings.push("Entrega BIM exigida sem adicional ou horas específicas.");
  const riskBase = rawLabor + complexityAdjustment + urgencyAdjustment;
  const riskAdjustment = percentage(riskBase, study.inputs.riskPercentage);
  const subtotalBeforeProfit = rawLabor + complexityAdjustment + urgencyAdjustment + riskAdjustment + bimAdjustment
    + revisionAdjustment + partnerCost + partnerManagementFee + travel.cents + constructionServicesCost + directExpenses;
  const profitMarkupCents = percentage(subtotalBeforeProfit, study.inputs.profitMarkup);
  const priceBeforeTaxes = subtotalBeforeProfit + profitMarkupCents;
  const sustainableGross = study.inputs.taxMode === "included"
    ? grossUpForIncludedTax(subtotalBeforeProfit, study.inputs.taxPercentage)
    : subtotalBeforeProfit + percentage(subtotalBeforeProfit, study.inputs.taxPercentage);
  const recommendedFee = study.inputs.taxMode === "included"
    ? grossUpForIncludedTax(priceBeforeTaxes, study.inputs.taxPercentage)
    : priceBeforeTaxes + percentage(priceBeforeTaxes, study.inputs.taxPercentage);
  const commercialPrice = study.inputs.commercialPriceCents ?? recommendedFee;
  const negotiated = commercialPrice - study.inputs.discountCents - study.inputs.donationCents;
  const minimumAdjustment = study.inputs.donationCents > 0 ? 0 : Math.max(0, study.inputs.minimumContractCents - negotiated);
  const finalPrice = Math.max(0, negotiated + minimumAdjustment);
  const taxes = study.inputs.taxMode === "included" ? percentage(finalPrice, study.inputs.taxPercentage) : percentage(priceBeforeTaxes, study.inputs.taxPercentage);
  const estimatedNetRevenue = study.inputs.taxMode === "included" ? finalPrice - taxes : finalPrice;
  const estimatedProfit = estimatedNetRevenue - subtotalBeforeProfit;
  const totalEstimatedHours = totalServiceHours + travel.hours + constructionHours;
  const effectiveHourlyRate = totalEstimatedHours > 0 ? round(estimatedNetRevenue / totalEstimatedHours) : 0;
  if (finalPrice < subtotalBeforeProfit) warnings.push("Valor final abaixo do custo interno estimado.");
  if (finalPrice < sustainableGross) warnings.push("Valor final abaixo do mínimo sustentável.");
  if (estimatedProfit < 0) warnings.push("Lucro estimado negativo.");
  if (effectiveHourlyRate > 0 && effectiveHourlyRate < hourlyCents) warnings.push("Hora efetiva abaixo do custo-hora sustentável.");
  if (study.inputs.discountCents > profitMarkupCents) warnings.push("Desconto consome todo o lucro previsto.");
  if (study.inputs.discountCents > percentage(commercialPrice, 5)) warnings.push("Desconto acima do padrão comum de 5%.");
  if (minimumAdjustment > 0) warnings.push("Valor mínimo de contratação aplicado e registrado.");
  return {
    internalLaborCost: rawLabor, overheadCost: hourly.operationalCostsCents, proLaboreAllocation: hourly.proLaboreCents,
    investmentRecoveryAllocation: hourly.investmentRecoveryCents, directExpenses, travelCost: travel.cents,
    partnerCost, partnerManagementFee, riskAdjustment, complexityAdjustment, urgencyAdjustment,
    bimAdjustment, revisionAdjustment, constructionServicesCost, subtotalBeforeProfit,
    profitMarkup: profitMarkupCents, priceBeforeTaxes, taxes, sustainableMinimum: sustainableGross,
    recommendedFee, commercialPrice, discount: study.inputs.discountCents, donation: study.inputs.donationCents,
    minimumAdjustment, finalPrice, estimatedNetRevenue, estimatedProfit,
    effectiveProfitPercentage: subtotalBeforeProfit > 0 ? estimatedProfit / subtotalBeforeProfit * 100 : 0,
    effectiveMarginPercentage: estimatedNetRevenue > 0 ? estimatedProfit / estimatedNetRevenue * 100 : 0,
    totalEstimatedHours, effectiveHourlyRate, minimumHourlyRate: hourlyCents, warnings,
  };
}

export function validatePaymentPlan(plan: PaymentPlan, finalPriceCents: number): PaymentPlan {
  const warnings: string[] = [];
  const totalPercentage = plan.installments.reduce((sum, installment) => sum + installment.percentage, 0);
  const totalAmount = plan.installments.reduce((sum, installment) => sum + installment.amountCents, 0);
  if (Math.abs(totalPercentage - 100) > 0.001) warnings.push("As parcelas não totalizam 100%.");
  if (totalAmount !== finalPriceCents) warnings.push("A soma das parcelas diverge do valor final.");
  if (plan.installments.some((item) => item.percentage < 0 || item.amountCents < 0)) warnings.push("Há parcela negativa.");
  if (plan.installments.some((item) => !item.dueDate && !item.milestone)) warnings.push("Há saldo sem data ou marco de vencimento.");
  if (plan.installments[0] && plan.installments[0].percentage < 30) warnings.push("Entrada inferior a 30%.");
  const dates = plan.installments.map((item) => item.dueDate).filter(Boolean);
  if (dates.some((date, index) => index > 0 && date < dates[index - 1])) warnings.push("Datas de parcelas fora de ordem.");
  return { ...plan, valid: warnings.length === 0, warnings, updatedAt: new Date().toISOString() };
}

export function createPaymentPlan(studyId: string, name: string, preset: PaymentPlan["preset"], finalPriceCents: number, startDate: string): PaymentPlan {
  const now = new Date().toISOString();
  const make = (percentageValue: number, milestone: string, index: number) => ({
    id: `installment-${Date.now()}-${index}`, percentage: percentageValue,
    amountCents: index === 0 ? round(finalPriceCents * percentageValue / 100) : 0,
    dueDate: index === 0 ? startDate : "", milestone, condition: "Após confirmação do marco", notes: "",
  });
  let installments = preset === "upfront" ? [make(100, "Contratação", 0)]
    : preset === "fifty_milestones" ? [make(50, "Contratação", 0), make(25, "Anteprojeto aprovado", 1), make(25, "Entrega final", 2)]
      : [make(30, "Contratação", 0), make(30, "Estudo preliminar aprovado", 1), make(20, "Anteprojeto aprovado", 2), make(20, "Entrega final", 3)];
  let allocated = installments[0].amountCents;
  installments = installments.map((item, index) => {
    if (index === 0) return item;
    const isLast = index === installments.length - 1;
    const amountCents = isLast ? finalPriceCents - allocated : round(finalPriceCents * item.percentage / 100);
    allocated += amountCents;
    return { ...item, amountCents };
  });
  return validatePaymentPlan({ id: `payment-${Date.now()}`, studyId, name, preset, installments, valid: false, warnings: [], createdAt: now, updatedAt: now }, finalPriceCents);
}
