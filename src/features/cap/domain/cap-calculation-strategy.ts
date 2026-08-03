import {
  CapEnvironment, ParametricCalculationResult, ParametricScenario, SelectedItem,
} from "./cap-library-types";

export interface ResolvedSelectedItem {
  selection: SelectedItem; label: string; widthM: number; lengthM: number; heightM: number;
  footprintAreaM2: number; sourceId: string | null; page: number | null;
}
export interface CapCalculationContext {
  scenario: ParametricScenario; environment: CapEnvironment; items: ResolvedSelectedItem[]; calculatedAt: string;
}
export interface CapCalculationStrategy {
  id: string; version: string; environmentIds: readonly string[]; inputs: readonly string[];
  limitations: readonly string[]; validate(context: CapCalculationContext): string[];
  calculate(context: CapCalculationContext): ParametricCalculationResult;
}
