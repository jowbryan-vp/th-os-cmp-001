"use client";

import { RefObject } from "react";
import { Button, EmptyState } from "../../../../design-system";
import { ClipboardCheck, Download, Eye, Pencil } from "../../../../design-system/icons";
import { FeeCalculationStudy } from "../../domain/hon-types";
import { money } from "../hon-formatters";
import { Metric } from "../hon-metric";
import { Warnings } from "../hon-warnings";

export interface HonResultPanelProps {
  study: FeeCalculationStudy;
  resultHeadingRef: RefObject<HTMLHeadingElement | null>;
  onAdjustParameters: () => void;
  onGoToServices: () => void;
  onGoToScenarios: () => void;
  onGoToPayments: () => void;
  onExportInternal: () => void;
  onExportCommercial: () => void;
  onExportCsv: () => void;
}

const compositionRows = (result: NonNullable<FeeCalculationStudy["results"]>) => [
  ["Mão de obra interna", result.internalLaborCost], ["Complexidade", result.complexityAdjustment],
  ["Urgência", result.urgencyAdjustment], ["Risco", result.riskAdjustment], ["BIM", result.bimAdjustment],
  ["Revisões", result.revisionAdjustment], ["Parceiros", result.partnerCost],
  ["Gestão de parceiros", result.partnerManagementFee], ["Deslocamentos e visitas", result.travelCost],
  ["Acompanhamento e gerenciamento", result.constructionServicesCost], ["Despesas diretas", result.directExpenses],
  ["Lucro sobre custo", result.profitMarkup], ["Impostos", result.taxes], ["Desconto", -result.discount],
  ["Doação", -result.donation], ["Ajuste de mínimo", result.minimumAdjustment],
] as const;

export function HonResultPanel({
  study, resultHeadingRef, onAdjustParameters, onGoToServices, onGoToScenarios,
  onGoToPayments, onExportInternal, onExportCommercial, onExportCsv,
}: HonResultPanelProps) {
  const result = study.results;
  if (!result) {
    return <EmptyState title="Nenhum resultado calculado ainda"
      description="Ajuste os parâmetros abaixo e use “Calcular honorários”, disponível na barra superior, para gerar o resumo, a composição e o escopo." />;
  }
  const includedServices = study.services.filter((service) => service.included);

  return <div className="hon-result">
    <h2 ref={resultHeadingRef} tabIndex={-1} className="hon-result-heading">Resumo executivo</h2>
    <div className="hon-price-ladder">
      <Metric label="A. Custo do escritório" value={money(result.subtotalBeforeProfit)} />
      <Metric label="B. Mínimo sustentável" value={money(result.sustainableMinimum)} />
      <Metric label="C. Honorário recomendado" value={money(result.recommendedFee)} />
      <Metric label="D. Valor comercial" value={money(result.commercialPrice)} />
      <Metric label="E. Valor final negociado" value={money(result.finalPrice)} />
    </div>
    <div className="hon-summary">
      <Metric label="Data do cálculo" value={new Date(`${study.inputs.calculationDate}T00:00:00`).toLocaleDateString("pt-BR")} />
      <Metric label="Complexidade" value={study.inputs.complexityLevel} />
      <Metric label="Urgência" value={study.inputs.urgencyLevel} />
      <Metric label="Lucro sobre custo" value={`${study.inputs.profitMarkup}%`} />
      <Metric label="Imposto" value={`${study.inputs.taxPercentage}%`} />
      <Metric label="Método de cálculo" value={study.calculationMethod} />
    </div>
    <Warnings items={result.warnings} />

    <h3>Composição do valor</h3>
    <div className="hon-table-wrap"><table><tbody>
      {compositionRows(result).map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{money(Number(value))}</td></tr>)}
    </tbody></table></div>

    <h3>Escopo considerado</h3>
    {includedServices.length === 0
      ? <EmptyState title="Nenhum serviço incluído" description="Volte para Serviços e horas para incluir os itens do escopo."
        action={{ children: "Ver serviços e horas", onClick: onGoToServices }} />
      : <div className="hon-table-wrap"><table><thead><tr><th>Serviço</th><th>Etapa</th><th>Horas estimadas</th><th>Custo fixo</th><th>Observações</th></tr></thead><tbody>
        {includedServices.map((service) => <tr key={service.id}><td>{service.name}</td><td>{service.stage}</td><td>{service.estimatedHours}</td><td>{service.fixedCostCents ? money(service.fixedCostCents) : "—"}</td><td>{service.notes || "—"}</td></tr>)}
      </tbody></table></div>}

    <h3>Condições comerciais</h3>
    {study.paymentPlan
      ? <><div className="hon-table-wrap"><table><thead><tr><th>Parcela</th><th>Percentual</th><th>Valor</th><th>Vencimento</th><th>Marco</th></tr></thead><tbody>
          {study.paymentPlan.installments.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.percentage}%</td><td>{money(item.amountCents)}</td><td>{item.dueDate || "No marco"}</td><td>{item.milestone}</td></tr>)}
        </tbody></table></div><Warnings items={study.paymentPlan.warnings} /></>
      : <EmptyState title="Nenhuma condição comercial cadastrada" description="Gere um plano de pagamento para exibir entrada, parcelas e vencimentos aqui."
        action={{ children: "Configurar pagamentos", onClick: onGoToPayments }} />}

    <h3>Ações</h3>
    <div className="hon-actions">
      <Button variant="secondary" icon={Pencil} onClick={onAdjustParameters}>Ajustar parâmetros</Button>
      <Button variant="secondary" icon={Eye} onClick={onGoToServices}>Ver serviços e horas</Button>
      <Button variant="secondary" icon={ClipboardCheck} onClick={onGoToScenarios}>Comparar cenários</Button>
      <Button variant="secondary" onClick={onGoToPayments}>Configurar pagamentos</Button>
      <Button variant="secondary" icon={Download} onClick={onExportCommercial}>Exportar comercial</Button>
      <Button variant="secondary" icon={Download} onClick={onExportInternal}>Memória interna JSON</Button>
      <Button variant="secondary" icon={Download} onClick={onExportCsv}>Serviços CSV</Button>
    </div>
  </div>;
}
