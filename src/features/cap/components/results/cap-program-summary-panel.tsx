import { ProjectMasterRecord } from "../../../../domain/project-master-record";
import { ParametricEnvironmentStudy } from "../../domain/cap-library-types";
import { capLibrary } from "../../services/cap-library-service";
import { isConfiguredNeedsItem, summarizeCapAreaOptions } from "../../services/cap-program-service";
import { Button } from "../../../../design-system";
import { Pencil, Trash2 } from "../../../../design-system/icons";

const formatArea = (value: number) => value.toLocaleString("pt-BR", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export function CapProgramSummaryPanel({ project, currentNeedsItemId, currentEnvironmentLabel, studies = [], onEdit, onDelete }: {
  project?: ProjectMasterRecord;
  currentNeedsItemId?: string;
  currentEnvironmentLabel?: string;
  studies?: ParametricEnvironmentStudy[];
  onEdit?: (needsItemId: string) => void;
  onDelete?: (needsItemId: string) => void;
}) {
  if (!project) return <aside className="cap-program-report"><h2>Relatório do programa</h2><p>Selecione um projeto para acompanhar as somatórias.</p></aside>;
  const totals = summarizeCapAreaOptions(project.needsProgram);
  const reportItems = project.needsProgram.filter((item) => isConfiguredNeedsItem(item) || item.id === currentNeedsItemId);
  return <aside className="cap-program-report" aria-label="Relatório acumulado do Programa de Necessidades">
    <header><span className="eyebrow">Programa de Necessidades</span><h2>Relatório acumulado</h2>
      <p>{totals.calculatedEnvironments} de {totals.totalEnvironments} ambiente(s) calculado(s)</p></header>
    <div className="cap-report-totals">
      <div><span>Líquida mínima</span><strong>{formatArea(totals.minimumAreaM2)} m²</strong></div>
      <div><span>Líquida recomendada</span><strong>{formatArea(totals.recommendedAreaM2)} m²</strong></div>
      <div><span>Bruta preliminar</span><strong>{formatArea(totals.preliminaryGrossAreaM2)} m²</strong></div>
    </div>
    <p className="cap-report-note">Somatórias dos ambientes registrados, considerando suas quantidades.</p>
    <div className="cap-report-environments">{reportItems.length ? reportItems.map((item, index) => {
      const calculated = item.capMinimumAreaM2 !== null && item.capRecommendedAreaM2 !== null
        && item.capPreliminaryGrossAreaM2 !== null;
      const quantity = Math.max(1, item.quantity);
      const savedStudy = item.parametricStudyId ? studies.find((study) => study.id === item.parametricStudyId) : undefined;
      const savedEnvironmentLabel = savedStudy
        ? capLibrary.environments.find((environment) => environment.id === savedStudy.environmentId)?.label : undefined;
      const environmentLabel = item.environment.trim()
        || (item.id === currentNeedsItemId ? currentEnvironmentLabel : undefined)
        || savedEnvironmentLabel || "Ambiente ainda não configurado";
      return <article key={item.id} className={item.id === currentNeedsItemId ? "is-current" : ""}>
        <div><span>{String(index + 1).padStart(2, "0")}</span><strong>{environmentLabel}</strong></div>
        <small>Quantidade: {quantity}{item.id === currentNeedsItemId ? " · configurando agora" : ""}</small>
        {calculated ? <dl>
          <div><dt>Mínima</dt><dd>{formatArea(item.capMinimumAreaM2! * quantity)} m²</dd></div>
          <div><dt>Recomendada</dt><dd>{formatArea(item.capRecommendedAreaM2! * quantity)} m²</dd></div>
          <div><dt>Bruta</dt><dd>{formatArea(item.capPreliminaryGrossAreaM2! * quantity)} m²</dd></div>
        </dl> : <p>Aguardando cálculo</p>}
        <div className="cap-report-actions"><Button size="small" variant="tertiary" icon={Pencil} onClick={() => onEdit?.(item.id)}>Editar</Button>
          <Button size="small" variant="destructive" icon={Trash2} onClick={() => onDelete?.(item.id)}>Excluir</Button></div>
      </article>;
    }) : <p>Nenhum ambiente adicionado.</p>}</div>
  </aside>;
}
