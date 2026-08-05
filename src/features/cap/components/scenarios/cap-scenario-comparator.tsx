import { ParametricEnvironmentStudy, ParametricScenario } from "../../domain/cap-library-types";
import { accessibilityLabels, comfortLabels } from "../../utils/cap-labels";
import { Button } from "../../../../design-system";

const format = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CapScenarioComparator({ study, onPrefer }: {
  study: ParametricEnvironmentStudy | null;
  onPrefer: (scenarioId: string) => void;
}) {
  if (!study?.scenarios.length) return <section className="cap-panel"><h2>Comparador de cenários</h2><p>Crie e calcule cenários para comparar.</p></section>;
  const baselineArea = study.scenarios[0]?.result?.recommendedNetAreaM2;
  const rows: Array<[string, (scenario: ParametricScenario) => string]> = [
    ["Ambiente", (scenario) => scenario.environmentId], ["Composição", (scenario) => `${scenario.selectedItems.length} itens`],
    ["Itens", (scenario) => scenario.selectedItems.map((item) => `${item.libraryItemId ?? "Custom"} ×${item.quantity}`).join(", ") || "—"],
    ["Conforto", (scenario) => comfortLabels[scenario.comfortLevel]], ["Acessibilidade", (scenario) => accessibilityLabels[scenario.accessibilityProfile]],
    ["Largura recomendada", (scenario) => scenario.result ? `${format(scenario.result.recommendedWidthM)} m` : "—"],
    ["Comprimento recomendado", (scenario) => scenario.result ? `${format(scenario.result.recommendedLengthM)} m` : "—"],
    ["Área mínima", (scenario) => scenario.result ? `${format(scenario.result.minimumNetAreaM2)} m²` : "—"],
    ["Área recomendada", (scenario) => scenario.result ? `${format(scenario.result.recommendedNetAreaM2)} m²` : "—"],
    ["Diferença vs. cenário A", (scenario) => scenario.result && baselineArea ? `${format(((scenario.result.recommendedNetAreaM2 / baselineArea) - 1) * 100)}%` : "—"],
    ["Área bruta preliminar estimada", (scenario) => scenario.result ? `${format(scenario.result.estimatedGrossAreaM2)} m²` : "—"],
    ["Eficiência", (scenario) => scenario.result ? `${format(scenario.result.efficiencyRatio * 100)}%` : "—"],
    ["Confiança", (scenario) => scenario.result?.confidence ?? "—"], ["Alertas", (scenario) => String(scenario.result?.warnings.length ?? 0)],
  ];
  return <section className="cap-panel"><h2>Comparador de cenários</h2><p>Compare até quatro cenários. A ferramenta não escolhe automaticamente o melhor.</p><div className="cap-compare-wrap"><table className="cap-compare"><thead><tr><th>Métrica</th>{study.scenarios.map((scenario) => <th key={scenario.id}>{scenario.name}{study.selectedScenarioId === scenario.id ? <small>Preferido</small> : null}</th>)}</tr></thead><tbody>{rows.map(([label, getter]) => <tr key={label}><th>{label}</th>{study.scenarios.map((scenario) => <td key={scenario.id}>{getter(scenario)}</td>)}</tr>)}</tbody></table>
    <div className="cap-actions">{study.scenarios.map((scenario) => <Button variant="secondary" key={scenario.id} onClick={() => onPrefer(scenario.id)}>Destacar {scenario.name}</Button>)}</div></div></section>;
}
