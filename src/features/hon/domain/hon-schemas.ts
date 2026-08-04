import { z } from "zod";
import {
  FeeCalculationStudy, FeeCalibrationRecord, FeeScenario, FeeSnapshot, PaymentPlan,
  ServiceCatalogItem, StructureProfile,
} from "./hon-types";

const id = z.string().min(3);
const cents = z.number().int().nonnegative();
const dateTime = z.string().min(10);
const typed = <T>(schema: z.ZodType) => schema as z.ZodType<T>;

export const structureProfileSchema = typed<StructureProfile>(z.object({
  id, schemaVersion: z.number().int().positive(), name: z.string().min(1),
  kind: z.enum(["current_operation", "physical_office", "custom"]), active: z.boolean(),
  description: z.string(), parentProfileId: z.string().nullable(), proLaboreCents: cents,
  costs: z.array(z.object({
    id, name: z.string().min(1), amountCents: cents, periodicity: z.enum(["monthly", "annual", "one_time"]),
    startDate: z.string().nullable(), endDate: z.string().nullable(), active: z.boolean(),
    origin: z.enum(["common", "exclusive", "replacement"]), replacesCostId: z.string().nullable(),
    directlyReimbursable: z.boolean(), notes: z.string(),
  }).strict()),
  investments: z.array(z.object({
    id, name: z.string().min(1), amountCents: cents, recoveryMonths: z.number().int().positive(),
    recoverySuspended: z.boolean(), depreciable: z.boolean(), recoverableDeposit: z.boolean(),
    residualValueCents: cents, installmentCount: z.number().int().positive().nullable(),
    possibleOverlapWith: z.array(z.string()), notes: z.string(),
  }).strict()),
  capacity: z.object({ weeklyAvailableHours: z.number().positive(), averageWeeksPerMonth: z.number().positive(), billableUtilizationPercentage: z.number().positive().max(100) }).strict(),
  defaultProfitMarkup: z.number().nonnegative(), highProfitMarkup: z.number().nonnegative(),
  taxes: z.object({ percentage: z.number().min(0).lt(100), incidence: z.enum(["gross_price", "taxable_services"]), mode: z.enum(["included", "added"]), notes: z.string() }).strict(),
  minimumContractCents: cents, notes: z.string(), createdAt: dateTime, updatedAt: dateTime,
}).strict());

export const serviceCatalogItemSchema = typed<ServiceCatalogItem>(z.object({
  id, version: z.string(), code: z.string().min(1), name: z.string().min(1), stage: z.string(),
  calculationMethod: z.enum(["hours", "fixed", "percentage", "custom"]), baseHours: z.number().nonnegative(),
  minimumHours: z.number().nonnegative(), unit: z.string(), responsible: z.string(),
  execution: z.enum(["internal", "partner"]), defaultComplexity: z.enum(["very_simple", "simple", "medium", "complex", "very_complex"]),
  includedRevisionRounds: z.number().int().nonnegative(), includedVisits: z.number().int().nonnegative(),
  bim: z.boolean(), risk: z.enum(["low", "medium", "high", "custom"]), minimumValueCents: cents,
  active: z.boolean(), source: z.string(), confidence: z.enum(["unvalidated", "low", "medium", "high"]), notes: z.string(),
}).strict());

const studyCore = z.object({
  id, schemaVersion: z.number().int().positive(), projectId: id, code: z.string().min(1), name: z.string().min(1),
  version: z.number().int().positive(), status: z.enum(["draft", "calculated", "under_review", "approved", "used_in_proposal", "superseded", "archived"]),
  structureProfileId: id, calculationMethod: z.enum(["service_cost", "cau_reference", "commercial_reference"]),
  projectSnapshot: z.record(z.string(), z.unknown()), inputs: z.record(z.string(), z.unknown()), services: z.array(z.record(z.string(), z.unknown())),
  partners: z.array(z.record(z.string(), z.unknown())), travel: z.array(z.record(z.string(), z.unknown())),
  revisions: z.array(z.record(z.string(), z.unknown())), risks: z.array(z.record(z.string(), z.unknown())),
  bim: z.record(z.string(), z.unknown()), construction: z.record(z.string(), z.unknown()),
  discounts: z.array(z.record(z.string(), z.unknown())), donations: z.array(z.record(z.string(), z.unknown())),
  paymentPlan: z.record(z.string(), z.unknown()).nullable(), results: z.record(z.string(), z.unknown()).nullable(),
  snapshots: z.array(z.string()), createdAt: dateTime, updatedAt: dateTime, approvedAt: z.string().nullable(), notes: z.string(),
}).strict();
export const feeStudySchema = typed<FeeCalculationStudy>(studyCore);

export const feeScenarioSchema = typed<FeeScenario>(z.object({
  id, studyId: id, name: z.string().min(1), services: z.array(z.record(z.string(), z.unknown())), assumptions: z.array(z.string()),
  complexity: z.enum(["very_simple", "simple", "medium", "complex", "very_complex"]),
  urgency: z.enum(["normal", "accelerated", "urgent", "very_urgent", "emergency"]), structureProfileId: id,
  profitMarkup: z.number().nonnegative(), discount: cents, donation: cents, paymentCondition: z.string(),
  result: z.record(z.string(), z.unknown()), createdAt: dateTime, updatedAt: dateTime,
}).strict());

export const paymentPlanSchema = typed<PaymentPlan>(z.object({
  id, studyId: id, name: z.string().min(1), preset: z.enum(["upfront", "thirty_installments", "fifty_milestones", "custom"]),
  installments: z.array(z.object({ id, percentage: z.number().nonnegative(), amountCents: cents, dueDate: z.string(), milestone: z.string(), condition: z.string(), notes: z.string() }).strict()),
  valid: z.boolean(), warnings: z.array(z.string()), createdAt: dateTime, updatedAt: dateTime,
}).strict());

export const feeSnapshotSchema = typed<FeeSnapshot>(z.object({
  id, studyId: id, projectId: id, studyVersion: z.number().int().positive(), engineVersion: z.string(),
  approvedAt: dateTime, payload: studyCore, checksum: z.string().min(8),
}).strict());

export const feeCalibrationSchema = typed<FeeCalibrationRecord>(z.object({
  id, studyId: id, projectId: id, estimatedHours: z.number().nonnegative(), actualHours: z.number().nonnegative().nullable(),
  proposedPriceCents: cents, contractedPriceCents: cents.nullable(), predictedCostCents: cents, actualCostCents: cents.nullable(),
  predictedProfitCents: z.number().int(), actualProfitCents: z.number().int().nullable(), approvedForCalibration: z.boolean(),
  notes: z.string(), createdAt: dateTime, updatedAt: dateTime,
}).strict());
