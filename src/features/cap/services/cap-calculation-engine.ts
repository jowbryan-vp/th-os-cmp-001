import { ResolvedSelectedItem } from "../domain/cap-calculation-strategy";
import { ParametricScenario } from "../domain/cap-library-types";
import { findCapItem, getCapEnvironment } from "./cap-library-service";
import { getCalculationStrategy } from "./cap-calculation-registry";

export const CAP_ENGINE_VERSION = "1.0.0";
function resolveItem(selection: ParametricScenario["selectedItems"][number]): ResolvedSelectedItem {
  const libraryItem = selection.libraryItemId ? findCapItem(selection.libraryItemId) : undefined;
  const custom = selection.dimensionsMode === "custom";
  const widthM = custom ? selection.customWidthM : libraryItem?.widthM;
  const lengthM = custom ? selection.customLengthM : libraryItem?.lengthM;
  const heightM = custom ? selection.customHeightM : libraryItem?.heightM;
  if (!widthM || !lengthM || !heightM) throw new Error(`Dimensões incompletas para o item ${selection.id}.`);
  return { selection, label: libraryItem?.label ?? (selection.notes || "Item customizado"), widthM, lengthM, heightM,
    footprintAreaM2: widthM * lengthM, sourceId: libraryItem?.sourceId ?? null, page: libraryItem?.page ?? null };
}
export function calculateParametricScenario(scenario: ParametricScenario, calculatedAt = new Date().toISOString()) {
  const environment = getCapEnvironment(scenario.environmentId); const items = scenario.selectedItems.map(resolveItem);
  const strategy = getCalculationStrategy(scenario.environmentId); const context = { scenario, environment, items, calculatedAt };
  const errors = strategy.validate(context); if (errors.length) throw new Error(errors.join(" "));
  return strategy.calculate(context);
}
