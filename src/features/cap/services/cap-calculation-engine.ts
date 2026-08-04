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
  const heightM = custom ? selection.customHeightM ?? 0.75 : libraryItem?.heightM;
  if (!widthM || !lengthM || !heightM) throw new Error(`Revise as dimensões de “${selection.notes || "item personalizado"}”.`);
  return { selection, label: libraryItem?.label ?? (selection.notes || "Item customizado"), widthM, lengthM, heightM,
    footprintAreaM2: widthM * lengthM, sourceId: libraryItem?.sourceId ?? null, page: libraryItem?.page ?? null,
    group: libraryItem?.group ?? null, calculationFunction: libraryItem?.calculationFunction ?? null };
}
export function calculateParametricScenario(scenario: ParametricScenario, calculatedAt = new Date().toISOString()) {
  const pending = scenario.selectedItems.filter((item) => item.sourceType === "custom" && (!item.customWidthM || !item.customLengthM));
  const validSelections = scenario.selectedItems.filter((item) => !pending.includes(item));
  const environment = getCapEnvironment(scenario.environmentId); const items = validSelections.map(resolveItem);
  const strategy = getCalculationStrategy(scenario.environmentId); const context = { scenario, environment, items, calculatedAt };
  const errors = strategy.validate(context); if (errors.length) throw new Error(errors.join(" "));
  const result = strategy.calculate(context);
  return pending.length ? { ...result, warnings: [...result.warnings, ...pending.map((item) =>
    `“${item.notes || "Item personalizado"}” ficou pendente e não entrou no cálculo: informe largura e comprimento.`)] } : result;
}
