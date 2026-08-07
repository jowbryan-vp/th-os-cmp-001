import { z } from "zod";
import {
  priorities, projectPhases, readinessLevels, recordStatuses,
} from "./project-master-record";
import { parametricEnvironmentStudySchema } from "../features/cap/domain/cap-library-schema";
import { catalogOptionSchema } from "../features/catalogs/domain/reference-catalog";
import {
  feeCalibrationSchema, feeScenarioSchema, feeSnapshotSchema, feeStudySchema, paymentPlanSchema,
  structureProfileSchema,
} from "../features/hon/domain/hon-schemas";

const nullableNumber = z.number().finite().nonnegative().nullable();
const id = z.string().min(3);
export const clientSchema = z.object({
  id, personType: z.enum(["individual", "company"]), projectRole: z.string(),
  name: z.string(), preferredName: z.string(), cpf: z.string(), cnpj: z.string(),
  rg: z.string(), stateRegistration: z.string(), profession: z.string(), phone: z.string(),
  secondaryPhone: z.string(), email: z.string(), address: z.string(), city: z.string(),
  state: z.string(), postalCode: z.string(),
  preferredChannel: z.enum(["whatsapp", "phone", "email", "in_person", "other"]),
  bestContactTime: z.string(),
  decisionPower: z.enum(["decision_maker", "co_decision_maker", "influencer", "contact_only"]),
  notes: z.string(), primary: z.boolean(),
}).strict();
export const propertySchema = z.object({
  type: z.string(), condition: z.string(), address: z.string(), city: z.string(),
  state: z.string(), postalCode: z.string(), latitude: z.number().finite().nullable(),
  longitude: z.number().finite().nullable(), mapUrl: z.string(), municipalRegistration: z.string(),
  registryNumber: z.string(), lot: z.string(), block: z.string(), condominium: z.string(),
  landAreaM2: nullableNumber, existingBuiltAreaM2: nullableNumber,
  estimatedExpansionAreaM2: nullableNumber, estimatedDemolitionAreaM2: nullableNumber,
  floors: nullableNumber, approximateYear: nullableNumber, occupancy: z.string(),
  relationshipToProperty: z.string(), hasPreviousProject: z.boolean().nullable(),
  hasBuildingPermit: z.boolean().nullable(), hasOccupancyPermit: z.boolean().nullable(),
  hasSurvey: z.boolean().nullable(), hasComplementaryProjects: z.boolean().nullable(),
  apparentCondition: z.string(), constraints: z.string(), notes: z.string(),
}).strict();
export const contextSchema = z.object({
  requestSummary: z.string(), mainProblem: z.string(), objectives: z.string(),
  partsToKeep: z.string(), partsToFinish: z.string(), partsToDemolish: z.string(),
  partsToExpand: z.string(), prioritySpaces: z.string(), aestheticExpectations: z.string(),
  functionalExpectations: z.string(), comfortExpectations: z.string(),
  lightingExpectations: z.string(), ventilationExpectations: z.string(),
  accessibilityExpectations: z.string(), sustainabilityExpectations: z.string(),
  bioclimaticExpectations: z.string(), restrictions: z.string(), risks: z.string(),
  existingDecisions: z.string(), openQuestions: z.string(), notes: z.string(),
}).strict();
export const scopeItemSchema = z.object({
  id, category: z.enum(["design", "construction", "outsourced"]), serviceCode: z.string(),
  name: z.string().min(1), status: z.enum(["required", "under_review", "optional", "not_defined", "excluded"]),
  executionMode: z.enum(["internal", "partner", "outsourced", "client", "not_defined"]),
  responsible: z.string(), notes: z.string(), order: z.number().int().nonnegative(),
}).strict();
export const needsItemSchema = z.object({
  id, environment: z.string(), sector: z.string(), floor: z.string(),
  currentSituation: z.enum(["existing", "new", "to_expand", "to_reform", "to_demolish", "under_review"]),
  intervention: z.enum(["maintain", "finish", "reform", "expand", "create", "demolish", "study"]),
  existingAreaM2: nullableNumber, desiredAreaM2: nullableNumber,
  quantity: z.number().int().positive(), priority: z.enum(["essential", "important", "desirable", "under_review"]),
  users: z.string(), needs: z.string(), lighting: z.string(), ventilation: z.string(),
  privacy: z.string(), accessibility: z.string(), furniture: z.string(), equipment: z.string(),
  connections: z.string(), notes: z.string(), order: z.number().int().nonnegative(),
  parametricStudyId: z.string().nullable().default(null), parametricScenarioId: z.string().nullable().default(null),
  capMinimumAreaM2: nullableNumber.default(null), capRecommendedAreaM2: nullableNumber.default(null),
  capPreliminaryGrossAreaM2: nullableNumber.default(null),
  appliedAreaType: z.enum(["minimum", "recommended", "preliminary_gross"]).nullable().default(null),
  appliedAreaM2: nullableNumber.default(null), capLibraryVersion: z.string().nullable().default(null),
  calculationEngineVersion: z.string().nullable().default(null), calculatedAt: z.string().nullable().default(null),
}).strict();
const planningSchema = z.object({
  firstContactDate: z.string(), meetingDate: z.string(), surveyDate: z.string(),
  desiredDesignStartDate: z.string(), desiredConstructionStartDate: z.string(),
  desiredCompletionDate: z.string(), urgency: z.string(), restrictions: z.string(),
  minimumRequiredTime: z.string(), notes: z.string(),
}).strict();
const budgetSchema = z.object({
  estimatedConstructionBudgetCents: nullableNumber,
  investmentRange: z.enum(["not_informed", "up_to_100k", "100k_to_250k", "250k_to_500k", "500k_to_1m", "above_1m", "custom"]),
  fundingSource: z.string(), availableAmountCents: nullableNumber, financing: z.boolean().nullable(),
  reserveAmountCents: nullableNumber, contingencyPercentage: nullableNumber,
  decisionPriority: z.enum(["cost", "deadline", "quality", "balance"]),
  definitionLevel: z.enum(["undefined", "preliminary", "estimated", "confirmed"]), notes: z.string(),
}).strict();
const visitSchema = z.object({
  id, type: z.enum(["first_meeting", "survey", "technical_visit", "construction_monitoring", "client_meeting", "other"]),
  date: z.string(), time: z.string(), city: z.string(), address: z.string(), responsible: z.string(),
  participants: z.string(), estimatedDurationMinutes: nullableNumber, actualDurationMinutes: nullableNumber,
  purpose: z.string(), notes: z.string(), reportRequired: z.boolean(),
  status: z.enum(["planned", "confirmed", "completed", "cancelled"]), estimatedExpensesCents: nullableNumber,
}).strict();
const documentSchema = z.object({
  id, name: z.string(), category: z.string(), required: z.boolean(),
  status: z.enum(["not_requested", "requested", "received", "incomplete", "not_available", "not_applicable"]),
  requestedAt: z.string(), receivedAt: z.string(), notes: z.string(), fileName: z.string(),
  futureLink: z.string(), responsible: z.string(),
}).strict();
const teamSchema = z.object({
  id, name: z.string(), function: z.string(), profession: z.string(), company: z.string(),
  phone: z.string(), email: z.string(), responsibility: z.string(), engagementType: z.string(),
  status: z.enum(["suggested", "invited", "active", "inactive"]), notes: z.string(),
}).strict();
const impact = z.enum(["none", "low", "medium", "high", "unknown"]);
const decisionSchema = z.object({
  id, date: z.string(), subject: z.string(), decision: z.string(), origin: z.string(),
  participants: z.string(), phase: z.enum(projectPhases), costImpact: impact,
  deadlineImpact: impact, scopeImpact: impact, responsible: z.string(), notes: z.string(),
}).strict();
const pendingSchema = z.object({
  id, description: z.string(), category: z.string(), responsible: z.string(), dueDate: z.string(),
  priority: z.enum(priorities), status: z.enum(["open", "in_progress", "blocked", "completed", "cancelled"]),
  dependency: z.string(), affectedPhase: z.enum(projectPhases), notes: z.string(),
  completedAt: z.string().nullable(),
}).strict();
const historySchema = z.object({
  id, at: z.string(), action: z.enum(["created", "edited", "phase_changed", "status_changed", "duplicated", "imported", "exported", "archived", "restored", "deleted", "scope_changed", "cap_options_saved", "cap_area_applied"]),
  detail: z.string(),
}).strict();

export const projectMasterRecordSchema = z.object({
  id, schemaVersion: z.literal(2), code: z.string().regex(/^TH-\d{4}-\d{3}$/),
  internalName: z.string(), commercialName: z.string(), recordStatus: z.enum(recordStatuses),
  projectPhase: z.enum(projectPhases), priority: z.enum(priorities), createdAt: z.string(),
  updatedAt: z.string(), archivedAt: z.string().nullable(), primaryResponsible: z.string(),
  contactOrigin: z.string(), internalNotes: z.string(), clients: z.array(clientSchema),
  property: propertySchema, initialSynthesis: z.string(), context: contextSchema,
  preliminaryScope: z.array(scopeItemSchema), needsProgram: z.array(needsItemSchema),
  planning: planningSchema,
  timeline: z.array(z.object({ id, title: z.string(), date: z.string(), notes: z.string() }).strict()),
  budget: budgetSchema, visits: z.array(visitSchema), documents: z.array(documentSchema),
  team: z.array(teamSchema), decisions: z.array(decisionSchema), pending: z.array(pendingSchema),
  history: z.array(historySchema),
}).strict();
export const importEnvelopeSchema = z.object({
  schemaVersion: z.number().int().positive(), exportedAt: z.string(),
  application: z.literal("TH-OS-CMP-001"), project: z.unknown(),
  parametricStudies: z.array(parametricEnvironmentStudySchema).optional().default([]),
}).strict();
const legacyBackupEnvelopeSchema = z.object({
  kind: z.literal("consolidated-backup"), schemaVersion: z.number().int().positive(),
  exportedAt: z.string(), application: z.literal("TH-OS-CMP-001"),
  projects: z.array(z.unknown()),
}).strict();
const capLibraryReferenceSchema = z.object({ libraryCode: z.literal("CAP-001"), version: z.string(), sourceHash: z.string() }).strict();
const backupV2EnvelopeSchema = z.object({
  kind: z.literal("consolidated-backup"), backupSchemaVersion: z.literal(2),
  schemaVersion: z.number().int().positive(), exportedAt: z.string(), application: z.literal("TH-OS-CMP-001"),
  projectRecords: z.array(z.unknown()), parametricStudies: z.array(parametricEnvironmentStudySchema),
  capLibraryReferences: z.array(capLibraryReferenceSchema),
}).strict();
const backupV3EnvelopeSchema = z.object({
  kind: z.literal("consolidated-backup"), backupSchemaVersion: z.literal(3),
  schemaVersion: z.number().int().positive(), exportedAt: z.string(), application: z.literal("TH-OS-CMP-001"),
  projectRecords: z.array(z.unknown()), parametricStudies: z.array(parametricEnvironmentStudySchema),
  referenceCatalogOptions: z.array(catalogOptionSchema), capLibraryReferences: z.array(capLibraryReferenceSchema),
}).strict();
const backupV4EnvelopeSchema = z.object({
  kind: z.literal("consolidated-backup"), backupSchemaVersion: z.literal(4),
  // honSchemaVersion 1 é o formato anterior ao HON-002B (catálogo sem os campos descritivos);
  // 2 é o formato do HON-002B; 3 (HON-002C) acrescenta composição comercial por serviço
  // (estado, quantidade, desconto individual) e histórico de decisões. A validação estrita do
  // catálogo e dos estudos (com migração) fica a cargo de parseHonBackupData/feeStudySchema —
  // aqui os itens permanecem records soltos ou passam por schemas com defaults, do mesmo jeito
  // que os demais tipos aninhados do HON.
  honSchemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  schemaVersion: z.number().int().positive(), exportedAt: z.string(), application: z.literal("TH-OS-CMP-001"),
  projectRecords: z.array(z.unknown()), parametricStudies: z.array(parametricEnvironmentStudySchema),
  referenceCatalogOptions: z.array(catalogOptionSchema), capLibraryReferences: z.array(capLibraryReferenceSchema),
  feeStudies: z.array(feeStudySchema), feeScenarios: z.array(feeScenarioSchema),
  structureProfiles: z.array(structureProfileSchema), serviceCatalog: z.array(z.record(z.string(), z.unknown())),
  feeSnapshots: z.array(feeSnapshotSchema), paymentPlans: z.array(paymentPlanSchema),
  feeCalibrationRecords: z.array(feeCalibrationSchema),
}).strict();
export const backupEnvelopeSchema = z.union([backupV4EnvelopeSchema, backupV3EnvelopeSchema, backupV2EnvelopeSchema, legacyBackupEnvelopeSchema]);
export const readinessSchema = z.enum(readinessLevels);
