import { z } from "zod";
import {
  accessibilityProfileSchema, calculationBreakdownSchema, capAccessibilityProfileDefinitionSchema,
  capCalculationRuleSchema, capCapabilitySchema, capCirculationProfileSchema, capComfortLevelSchema,
  capCompositionSchema, capConflictSchema, capEnvironmentSchema, capFunctionalZoneSchema,
  capLibraryItemSchema, capLibraryMetadataSchema, capSourceSchema, capWarningSchema,
  comfortLevelSchema, parametricCalculationResultSchema, parametricEnvironmentStudySchema,
  parametricScenarioSchema, selectedItemSchema,
} from "./cap-library-schema";

export type CapCapability = z.infer<typeof capCapabilitySchema>;
export type ComfortLevel = z.infer<typeof comfortLevelSchema>;
export type AccessibilityProfile = z.infer<typeof accessibilityProfileSchema>;
export type CapLibraryMetadata = z.infer<typeof capLibraryMetadataSchema>;
export type CapSource = z.infer<typeof capSourceSchema>;
export type CapEnvironment = z.infer<typeof capEnvironmentSchema>;
export type CapLibraryItem = z.infer<typeof capLibraryItemSchema>;
export type CapFurniture = CapLibraryItem;
export type CapEquipment = CapLibraryItem;
export type CapFunctionalZone = z.infer<typeof capFunctionalZoneSchema>;
export type CapCirculationProfile = z.infer<typeof capCirculationProfileSchema>;
export type CapComfortLevel = z.infer<typeof capComfortLevelSchema>;
export type CapAccessibilityProfile = z.infer<typeof capAccessibilityProfileDefinitionSchema>;
export type CapComposition = z.infer<typeof capCompositionSchema>;
export type CapCalculationRule = z.infer<typeof capCalculationRuleSchema>;
export type CapConflict = z.infer<typeof capConflictSchema>;
export type CapWarning = z.infer<typeof capWarningSchema>;
export type SelectedItem = z.infer<typeof selectedItemSchema>;
export type ParametricCalculationBreakdown = z.infer<typeof calculationBreakdownSchema>;
export type ParametricCalculationResult = z.infer<typeof parametricCalculationResultSchema>;
export type ParametricScenario = z.infer<typeof parametricScenarioSchema>;
export type ParametricEnvironmentStudy = z.infer<typeof parametricEnvironmentStudySchema>;

export interface CapLibrary {
  metadata: CapLibraryMetadata; sources: CapSource[]; environments: CapEnvironment[];
  furniture: CapFurniture[]; equipment: CapEquipment[]; functionalZones: CapFunctionalZone[];
  circulationProfiles: CapCirculationProfile[]; comfortLevels: CapComfortLevel[];
  accessibilityProfiles: CapAccessibilityProfile[]; compositions: CapComposition[];
  calculationRules: CapCalculationRule[]; conflicts: CapConflict[]; warnings: CapWarning[];
}
