import { z } from "zod";

export const capCapabilitySchema = z.enum(["full_calculator", "preliminary_calculator", "reference_only", "experimental"]);
export const capConfidenceSchema = z.enum(["high", "medium", "low", "inferred", "conflicting_sources"]);
export const comfortLevelSchema = z.enum(["compact", "comfortable", "generous", "custom"]);
export const accessibilityProfileSchema = z.enum(["standard", "reduced_mobility", "wheelchair", "elderly", "custom"]);
export const capLibraryMetadataSchema = z.object({
  libraryCode: z.literal("CAP-001"), version: z.string().regex(/^\d+\.\d+\.\d+$/), schemaVersion: z.number().int().positive(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/), generatedAt: z.string(), status: z.string(),
  supportedApplicationVersion: z.string(), title: z.string(), description: z.string(),
  units: z.object({ length: z.literal("m"), area: z.literal("m2"), volume: z.literal("m3"), angle: z.literal("degrees") }).strict(),
  notes: z.array(z.string()),
}).strict();
export const capSourceSchema = z.object({
  id: z.string(), code: z.string(), title: z.string(), authors: z.array(z.string()), publisher: z.string(),
  edition: z.string(), year: z.number().int(), isbn: z.string().nullable(), url: z.string().nullable(),
}).strict();
export const capEnvironmentSchema = z.object({
  id: z.string(), label: z.string(), category: z.string(), description: z.string(),
  capability: capCapabilitySchema, maturityNote: z.string().nullable(),
}).strict();
export const capLibraryItemSchema = z.object({
  id: z.string(), label: z.string(), category: z.string(), widthM: z.number().positive(),
  lengthM: z.number().positive(), heightM: z.number().positive(), footprintAreaM2: z.number().positive(),
  group: z.string(), subgroup: z.string().nullable(), shape: z.string().nullable(), peopleCapacity: z.number().int().nonnegative().nullable(),
  calculationFunction: z.string().nullable(), selectionType: z.enum(["unica", "multipla", "quantidade", "parametrica"]),
  dimensionsEditable: z.boolean(), primaryItem: z.boolean(), useLocation: z.string().nullable(),
  sourceId: z.string().nullable(), page: z.number().int().positive().nullable(), tableOrFigure: z.string().nullable(),
  confidence: capConfidenceSchema, inferred: z.boolean(), notes: z.string(),
  poolParameters: z.object({
    minimumDepthM: z.number().nonnegative().nullable(), maximumDepthM: z.number().nonnegative().nullable(),
    waterSurfaceAreaM2: z.number().positive().nullable(), perimeterM: z.number().positive().nullable(),
    estimatedVolumeM3: z.number().positive().nullable(), minimumCirculationM: z.number().nonnegative().nullable(),
    recommendedCirculationM: z.number().nonnegative().nullable(), circulationSides: z.number().int().min(1).max(4).nullable(),
    structuralReservePercentage: z.number().min(0).max(100).nullable(),
  }).strict().nullable(),
}).strict();
export const capFunctionalZoneSchema = z.object({
  id: z.string(), label: z.string(), description: z.string(), minimumClearanceM: z.number().nonnegative(),
  overlapPolicy: z.enum(["overlap_allowed", "overlap_conditional", "overlap_forbidden", "unknown"]),
}).strict();
export const capCirculationProfileSchema = z.object({
  id: z.string(), label: z.string(), minimumWidthM: z.number().positive(), application: z.string(),
  confidence: capConfidenceSchema, normativeReferenceRequiresReview: z.boolean(),
}).strict();
export const capComfortLevelSchema = z.object({
  id: z.string(), level: comfortLevelSchema.exclude(["custom"]), label: z.string(), clearanceFactor: z.number().positive(),
  description: z.string(), legacyAccessibilityCoupling: z.boolean(),
}).strict();
export const capAccessibilityProfileDefinitionSchema = z.object({
  id: accessibilityProfileSchema, label: z.string(), requiredTurningDiameterM: z.number().positive().nullable(),
}).strict();
export const capCompositionSchema = z.object({
  id: z.string(), label: z.string(), environmentId: z.string(), estimatedNetAreaM2: z.number().positive(),
  estimatedGrossAreaM2: z.number().positive(), confidence: capConfidenceSchema, itemIds: z.array(z.string()),
  referencePreset: z.boolean(), geometryValidated: z.boolean(), notes: z.string(),
}).strict();
export const capCalculationRuleSchema = z.object({
  id: z.string(), label: z.string(), scope: z.string(), sourceExpression: z.string(), description: z.string(),
  sourceId: z.string().nullable(), page: z.number().int().positive().nullable(), implementationStatus: z.literal("not_operational"),
}).strict();
export const capConflictSchema = z.object({
  id: z.string(), parameter: z.string(), sourceA: z.string(), sourceB: z.string(), description: z.string(),
  sourceResolutionNote: z.string(), confidence: z.literal("conflicting_sources"), preserved: z.literal(true),
}).strict();
export const capWarningSchema = z.object({
  id: z.string(), code: z.string(), title: z.string(), message: z.string(), sourceSeverity: z.string(),
  severity: z.enum(["info", "warning", "technical_review", "blocking"]), normativeReferenceRequiresReview: z.boolean(),
}).strict();

export const selectedItemSchema = z.object({
  id: z.string(), sourceType: z.enum(["furniture", "equipment", "custom"]), libraryItemId: z.string().nullable(),
  quantity: z.number().int().positive(), dimensionsMode: z.enum(["library", "custom"]),
  customWidthM: z.number().positive().nullable(), customLengthM: z.number().positive().nullable(),
  customHeightM: z.number().positive().nullable(), functionalRole: z.string(), circulationProfileId: z.string().nullable(),
  notes: z.string(),
}).strict();
export const calculationBreakdownSchema = z.object({
  strategyId: z.string(), strategyVersion: z.string(), itemAreas: z.array(z.object({ itemId: z.string(),
    label: z.string(), quantity: z.number().int().positive(), footprintAreaM2: z.number().nonnegative() }).strict()),
  zonesConsidered: z.array(z.string()), zonesOverlapped: z.array(z.string()), overlapAreaRemovedM2: z.number().nonnegative(),
  overlapJustification: z.string(), primaryAreaDrivers: z.array(z.string()),
}).strict();
export const parametricCalculationResultSchema = z.object({
  minimumWidthM: z.number().positive(), minimumLengthM: z.number().positive(),
  recommendedWidthM: z.number().positive(), recommendedLengthM: z.number().positive(),
  minimumNetAreaM2: z.number().positive(), recommendedNetAreaM2: z.number().positive(),
  estimatedGrossAreaM2: z.number().positive(), furnitureFootprintAreaM2: z.number().nonnegative(),
  equipmentFootprintAreaM2: z.number().nonnegative(), functionalUseAreaM2: z.number().nonnegative(),
  circulationAreaM2: z.number().nonnegative(), geometricReserveAreaM2: z.number().nonnegative(),
  efficiencyRatio: z.number().positive(), confidence: capConfidenceSchema, assumptions: z.array(z.string()),
  warnings: z.array(z.string()), conflicts: z.array(z.string()), sourceRefs: z.array(z.string()),
  breakdown: calculationBreakdownSchema, calculatedAt: z.string(),
}).strict();
export const parametricScenarioSchema = z.object({
  id: z.string(), name: z.string(), environmentId: z.string(), comfortLevel: comfortLevelSchema,
  accessibilityProfile: accessibilityProfileSchema, selectedItems: z.array(selectedItemSchema),
  arrangement: z.string(), customParameters: z.record(z.string(), z.number()),
  geometricReservePercentage: z.number().min(0).max(100), result: parametricCalculationResultSchema.nullable(),
  createdAt: z.string(), updatedAt: z.string(), notes: z.string(),
}).strict();
export const parametricEnvironmentStudySchema = z.object({
  id: z.string(), projectId: z.string(), needsProgramItemId: z.string().nullable(), name: z.string(),
  environmentId: z.string(), libraryCode: z.literal("CAP-001"), libraryVersion: z.string(),
  libraryHash: z.string().regex(/^[a-f0-9]{64}$/), engineVersion: z.string(),
  status: z.enum(["draft", "calculated", "applied", "superseded", "archived"]),
  scenarios: z.array(parametricScenarioSchema), selectedScenarioId: z.string().nullable(),
  createdAt: z.string(), updatedAt: z.string(), notes: z.string(),
}).strict();
