import { CapCalculationStrategy } from "../domain/cap-calculation-strategy";
import { capCalculationStrategies } from "./cap-calculation-strategies";

export function getCalculationStrategy(environmentId: string): CapCalculationStrategy {
  const strategy = capCalculationStrategies.find((item) => item.environmentIds.includes(environmentId));
  if (!strategy) throw new Error(`Nenhuma estratégia operacional para ${environmentId}.`);
  return strategy;
}
export function listCalculationStrategies() { return [...capCalculationStrategies]; }
