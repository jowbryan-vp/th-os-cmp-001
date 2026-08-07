"use client";

import { Badge, Button, EmptyState, Field as DsField } from "../../../../design-system";
import { RefreshCw, Save } from "../../../../design-system/icons";
import { serviceCommercialStateLabels } from "../../domain/hon-service-composition";
import { FeeCalculationStudy, ProposalDraft, ProposalServiceSnapshot } from "../../domain/hon-types";
import { serviceCategoryLabels } from "../../services/hon-catalog-content";
import { money } from "../hon-formatters";
import { Metric } from "../hon-metric";
import { Warnings } from "../hon-warnings";

type ManualFields = Pick<ProposalDraft,
  "title" | "introduction" | "observations" | "validUntil" | "commercialConditions" | "additionalExclusions" | "additionalAssumptions" | "status">;

export interface HonProposalPanelProps {
  draft: ProposalDraft | null;
  study: FeeCalculationStudy;
  stale: boolean;
  saveLabel: string | null;
  saveTone: "success" | "warning" | "info" | "error" | "neutral";
  onUpdateFromHon: () => void;
  onChangeField: (patch: Partial<ManualFields>) => void;
  onSave: () => void;
}

function ScopeSnapshotTable({ title, items }: { title: string; items: ProposalServiceSnapshot[] }) {
  return <div className="hon-table-wrap">
    <h4>{title}</h4>
    <table><thead><tr><th>Serviço</th><th>Categoria</th><th>Qtd.</th><th>Estado</th><th>Valor</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{serviceCategoryLabels[item.category]}</td><td>{item.quantity}</td><td>{serviceCommercialStateLabels[item.commercialState]}</td><td>{money(item.netCents)}</td></tr>)}
    </tbody></table>
  </div>;
}

// Prévia interna: rascunho de leitura do que a proposta contém, montado a partir dos mesmos
// dados congelados exibidos acima — não é exportação para o cliente (fora de escopo do
// HON-003), só uma conferência rápida de como o conteúdo se lê em conjunto.
function ProposalPreview({ draft }: { draft: ProposalDraft }) {
  return <article className="hon-proposal-preview">
    <h4>{draft.title || "(sem título)"}</h4>
    <p><strong>Código:</strong> {draft.code} · <strong>Projeto:</strong> {draft.projectSnapshot.projectName as string}</p>
    {draft.introduction && <p>{draft.introduction}</p>}
    <h5>Escopo</h5>
    <ul>{draft.scopeItems.map((item) => <li key={item.id}>{item.name}{item.commercialState === "complimentary" ? " (cortesia)" : ""}</li>)}</ul>
    {draft.optionalItems.length > 0 && <><h5>Opcionais</h5><ul>{draft.optionalItems.map((item) => <li key={item.id}>{item.name} — {money(item.netCents)}</li>)}</ul></>}
    <h5>Investimento</h5>
    <p>Valor final: <strong>{money(draft.totals.finalPriceCents)}</strong></p>
    {draft.commercialConditions && <><h5>Condições comerciais</h5><p>{draft.commercialConditions}</p></>}
    {draft.additionalExclusions.some(Boolean) && <><h5>Exclusões</h5><ul>{draft.additionalExclusions.filter(Boolean).map((line) => <li key={line}>{line}</li>)}</ul></>}
    {draft.additionalAssumptions.some(Boolean) && <><h5>Premissas</h5><ul>{draft.additionalAssumptions.filter(Boolean).map((line) => <li key={line}>{line}</li>)}</ul></>}
    {draft.validUntil && <p><strong>Validade:</strong> {new Date(`${draft.validUntil}T00:00:00`).toLocaleDateString("pt-BR")}</p>}
    {draft.observations && <><h5>Observações</h5><p>{draft.observations}</p></>}
  </article>;
}

export function HonProposalPanel({ draft, study, stale, saveLabel, saveTone, onUpdateFromHon, onChangeField, onSave }: HonProposalPanelProps) {
  if (!study.results) {
    return <EmptyState title="Calcule o estudo antes de montar a proposta"
      description="A proposta reaproveita o escopo, os opcionais e os totais do HON — calcule os honorários e use “Incorporar à proposta”, disponível no Resultado." />;
  }
  if (!draft) {
    return <EmptyState title="Nenhuma proposta incorporada ainda"
      description="Use “Incorporar à proposta”, disponível no Resultado, para montar a proposta a partir da composição e do cálculo atuais deste estudo." />;
  }
  return <div className="hon-proposal">
    <div className="hon-panel-title">
      <div><h2>{draft.code}</h2><p>Escopo, opcionais, condições de pagamento e totais são sempre copiados do HON — nunca recalculados aqui. Os campos abaixo são de preenchimento livre e nunca são sobrescritos por uma atualização a partir do HON.</p></div>
      <div className="hon-proposal-status">
        <Badge tone={draft.status === "ready" ? "success" : "neutral"}>{draft.status === "ready" ? "Pronta" : "Rascunho"}</Badge>
        <Button variant="tertiary" size="small" onClick={() => onChangeField({ status: draft.status === "ready" ? "draft" : "ready" })}>
          {draft.status === "ready" ? "Voltar para rascunho" : "Marcar como pronta"}
        </Button>
      </div>
    </div>
    {stale && <Warnings items={["O estudo HON foi recalculado desde a última incorporação nesta proposta. Escopo, opcionais e totais podem estar desatualizados — use “Atualizar a partir do HON” para trazer os valores mais recentes."]} />}
    <div className="hon-actions">
      <Button variant="secondary" icon={RefreshCw} disabled={!stale} onClick={onUpdateFromHon}>Atualizar a partir do HON</Button>
      <Button variant="secondary" icon={Save} onClick={onSave}>Salvar proposta</Button>
      {saveLabel && <Badge tone={saveTone}>{saveLabel}</Badge>}
    </div>

    <h3>Campos comerciais</h3>
    <div className="hon-form-grid">
      <DsField label="Título" className="hon-field"><input value={draft.title} onChange={(e) => onChangeField({ title: e.target.value })} /></DsField>
      <DsField label="Validade da proposta" className="hon-field"><input type="date" value={draft.validUntil ?? ""} onChange={(e) => onChangeField({ validUntil: e.target.value || null })} /></DsField>
    </div>
    <DsField label="Introdução" className="hon-field"><textarea value={draft.introduction} onChange={(e) => onChangeField({ introduction: e.target.value })} /></DsField>
    <DsField label="Condições comerciais" className="hon-field"><textarea value={draft.commercialConditions} onChange={(e) => onChangeField({ commercialConditions: e.target.value })} /></DsField>
    <DsField label="Observações" className="hon-field"><textarea value={draft.observations} onChange={(e) => onChangeField({ observations: e.target.value })} /></DsField>
    <DsField label="Exclusões adicionais (uma por linha)" className="hon-field" helpText="Complementam as exclusões já descritas em cada serviço."><textarea value={draft.additionalExclusions.join("\n")} onChange={(e) => onChangeField({ additionalExclusions: e.target.value.split("\n") })} /></DsField>
    <DsField label="Premissas adicionais (uma por linha)" className="hon-field" helpText="Complementam as premissas já descritas em cada serviço."><textarea value={draft.additionalAssumptions.join("\n")} onChange={(e) => onChangeField({ additionalAssumptions: e.target.value.split("\n") })} /></DsField>

    <h3>Escopo incorporado</h3>
    <p className="hon-help">Somente leitura — reflete a composição do estudo no momento da última incorporação/atualização.</p>
    <ScopeSnapshotTable title="Contratados e cortesias" items={draft.scopeItems} />
    {draft.optionalItems.length > 0 && <ScopeSnapshotTable title="Opcionais" items={draft.optionalItems} />}

    <h3>Totais</h3>
    <div className="hon-summary">
      <Metric label="Valor comercial" value={money(draft.totals.commercialPriceCents)} />
      <Metric label="Valor final" value={money(draft.totals.finalPriceCents)} />
      <Metric label="Desconto" value={money(draft.totals.discountCents)} />
      <Metric label="Total de opcionais" value={money(draft.totals.optionalCents)} />
      <Metric label="Total de cortesias" value={money(draft.totals.complimentaryCents)} />
    </div>

    <h3>Condições de pagamento</h3>
    {draft.paymentPlan
      ? <div className="hon-table-wrap"><table><thead><tr><th>Parcela</th><th>Percentual</th><th>Valor</th><th>Vencimento</th><th>Marco</th></tr></thead><tbody>
          {draft.paymentPlan.installments.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.percentage}%</td><td>{money(item.amountCents)}</td><td>{item.dueDate || "No marco"}</td><td>{item.milestone}</td></tr>)}
        </tbody></table></div>
      : <EmptyState title="Nenhuma condição de pagamento incorporada" description="Gere um plano de pagamento no HON e atualize a proposta para trazê-lo aqui." />}

    <h3>Prévia interna</h3>
    <details className="hon-proposal-preview-toggle"><summary>Visualizar prévia interna</summary><ProposalPreview draft={draft} /></details>
  </div>;
}
