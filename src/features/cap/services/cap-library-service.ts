import accessibilityProfilesData from "../data/v1.2.0/accessibility-profiles.json";
import calculationRulesData from "../data/v1.2.0/calculation-rules.json";
import circulationProfilesData from "../data/v1.2.0/circulation-profiles.json";
import comfortLevelsData from "../data/v1.2.0/comfort-levels.json";
import compositionsData from "../data/v1.2.0/compositions.json";
import conflictsData from "../data/v1.2.0/conflicts.json";
import environmentsData from "../data/v1.2.0/environments.json";
import equipmentData from "../data/v1.2.0/equipment.json";
import functionalZonesData from "../data/v1.2.0/functional-zones.json";
import furnitureData from "../data/v1.2.0/furniture.json";
import metadataData from "../data/v1.2.0/metadata.json";
import sourcesData from "../data/v1.2.0/sources.json";
import warningsData from "../data/v1.2.0/warnings.json";
import {
  capAccessibilityProfileDefinitionSchema, capCalculationRuleSchema, capCirculationProfileSchema,
  capComfortLevelSchema, capCompositionSchema, capConflictSchema, capEnvironmentSchema,
  capFunctionalZoneSchema, capLibraryItemSchema, capLibraryMetadataSchema, capSourceSchema, capWarningSchema,
} from "../domain/cap-library-schema";
import { CapLibrary } from "../domain/cap-library-types";

export const capLibrary: CapLibrary = {
  metadata: capLibraryMetadataSchema.parse(metadataData),
  sources: capSourceSchema.array().parse(sourcesData),
  environments: capEnvironmentSchema.array().parse(environmentsData),
  furniture: capLibraryItemSchema.array().parse(furnitureData), equipment: capLibraryItemSchema.array().parse(equipmentData),
  functionalZones: capFunctionalZoneSchema.array().parse(functionalZonesData),
  circulationProfiles: capCirculationProfileSchema.array().parse(circulationProfilesData),
  comfortLevels: capComfortLevelSchema.array().parse(comfortLevelsData),
  accessibilityProfiles: capAccessibilityProfileDefinitionSchema.array().parse(accessibilityProfilesData),
  compositions: capCompositionSchema.array().parse(compositionsData),
  calculationRules: capCalculationRuleSchema.array().parse(calculationRulesData),
  conflicts: capConflictSchema.array().parse(conflictsData), warnings: capWarningSchema.array().parse(warningsData),
};

export function findCapItem(id: string) {
  return capLibrary.furniture.find((item) => item.id === id) ?? capLibrary.equipment.find((item) => item.id === id);
}
export function getCapEnvironment(id: string) {
  const environment = capLibrary.environments.find((item) => item.id === id);
  if (!environment) throw new Error(`Ambiente CAP inexistente: ${id}`);
  return environment;
}
export function searchCapEnvironments(query: string, category = "") {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  return capLibrary.environments.filter((environment) => (!category || environment.category === category)
    && (!normalized || `${environment.label} ${environment.description}`.toLocaleLowerCase("pt-BR").includes(normalized)));
}
export function getEnvironmentReferences(environmentId: string) {
  const composition = capLibrary.compositions.find((item) => item.environmentId === environmentId);
  return { composition, conflicts: capLibrary.conflicts, warnings: capLibrary.warnings };
}
