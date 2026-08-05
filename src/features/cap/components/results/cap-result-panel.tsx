import { ParametricScenario } from "../../domain/cap-library-types";
import { AppliedAreaType } from "../../services/cap-program-service";
import { Button } from "../../../../design-system";
import { CheckCircle2 } from "lucide-react";

const format = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CapResultPanel({ scenario, onApply, onSaveOptions, canSaveOptions }: {
  scenario?: ParametricScenario;
  onApply: (areaType: AppliedAreaType) => Promise<void>;
  onSaveOptions: () => Promise<void>;
  canSaveOptions: boolean;
}) {
  const result = scenario?.result;
  return <aside className="cap-result-panel" aria-live="polite"><h2>Resultado</h2>{!result ? <p>Configure os itens e calcule o cenário.</p> : <>
    <div className="cap-result-grid"><div><span>Largura mínima sugerida</span><strong>{format(result.minimumWidthM)} m</strong></div><div><span>Comprimento mínimo sugerido</span><strong>{format(result.minimumLengthM)} m</strong></div><div><span>Área líquida mínima</span><strong>{format(result.minimumNetAreaM2)} m²</strong></div><div><span>Área líquida recomendada</span><strong>{format(result.recommendedNetAreaM2)} m²</strong></div><div><span>Área bruta preliminar estimada</span><strong>{format(result.estimatedGrossAreaM2)} m²</strong></div><div><span>Confiança</span><strong>{result.confidence}</strong></div></div>
    <details open><summary>Como o resultado foi calculado</summary><p>Estratégia {result.breakdown.strategyId} v{result.breakdown.strategyVersion}</p><ul>{result.breakdown.itemAreas.map((item) => <li key={item.itemId}>{item.label}: {format(item.footprintAreaM2)} m²</li>)}</ul><p>Zonas: {result.breakdown.zonesConsidered.join(", ") || "—"}</p><p>Sobreposições: {result.breakdown.zonesOverlapped.join(", ") || "nenhuma"}; área eliminada {format(result.breakdown.overlapAreaRemovedM2)} m².</p><p>{result.breakdown.overlapJustification}</p><p>Principais fatores de área: {result.breakdown.primaryAreaDrivers.join(", ") || "—"}.</p></details>
    <details><summary>Premissas, alertas e fontes</summary><h3>Premissas</h3><ul>{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul><h3>Alertas</h3><ul>{result.warnings.map((item) => <li key={item}>{item}</li>)}</ul><h3>Fontes</h3><p>{result.sourceRefs.join(", ") || "Itens customizados sem fonte bibliográfica."}</p><h3>Conflitos</h3><p>{result.conflicts.join(", ") || "Nenhum conflito associado."}</p></details>
    <div className="cap-save-options"><strong>Comparar no Programa de Necessidades</strong><p>Registre as três áreas agora e escolha uma delas depois.</p><Button icon={CheckCircle2} disabled={!canSaveOptions} onClick={() => void onSaveOptions()}>Registrar as 3 áreas</Button>{!canSaveOptions && <small>Selecione um item do programa para registrar as opções.</small>}</div>
    <div className="cap-apply"><strong>Ou aplicar uma área agora</strong><Button variant="secondary" onClick={() => void onApply("minimum")}>Área mínima</Button><Button variant="secondary" onClick={() => void onApply("recommended")}>Área recomendada</Button><Button variant="secondary" onClick={() => void onApply("preliminary_gross")}>Área bruta preliminar</Button></div>
  </>}</aside>;
}
