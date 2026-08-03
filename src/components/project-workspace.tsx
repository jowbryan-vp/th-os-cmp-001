"use client";

import Image from "next/image";
import { ChangeEvent, ReactNode, useCallback, useRef, useState } from "react";
import logo from "../assets/brand/th-logo-horizontal-positive.png";
import {
  ClientRecord, DecisionRecord, DocumentReference, NeedsItem, PendingRecord,
  PreliminaryScopeItem, ProjectMasterRecord, ProjectPhase, RecordStatus, TeamMember,
  VisitRecord, createEmptyClient, createEmptyProject, createHistoryEvent, createId,
  createScopeItem, phaseLabels, priorityLabels, projectPhases, scopeCatalog, statusLabels,
} from "../domain/project-master-record";
import { calculateOverallProgress, overduePending, summarizeAreas } from "../domain/project-progress";
import { calculateReadiness } from "../domain/project-validation";
import { useProjectAutosave } from "../hooks/use-project-autosave";
import { useProjects } from "../hooks/use-projects";
import {
  detectImportConflict, exportConsolidatedBackup, exportProject, importAsNew,
  parseConsolidatedBackup, parseProjectImportBundle,
} from "../services/project-import-service";
import { changeArchiveState, duplicateProject } from "../services/project-lifecycle-service";
import { getParametricStudyRepository } from "../features/cap/repositories/parametric-study-repository";
import { CapApplyPayload, CapWorkspace } from "../features/cap/components/cap-workspace";
import { applyScenarioToNeedsProgram } from "../features/cap/services/cap-program-service";

type View = "list" | "record" | "cap";
const sections = [
  ["identification", "Identificação"], ["clients", "Clientes"], ["property", "Imóvel"],
  ["context", "Contexto"], ["scope", "Escopo"], ["program", "Programa inicial"],
  ["planning", "Prazos"], ["budget", "Orçamento"], ["visits", "Visitas"],
  ["documents", "Documentos"], ["team", "Responsáveis e parceiros"],
  ["decisions", "Decisões"], ["pending", "Pendências"], ["history", "Histórico"],
] as const;

const moneyToCents = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : null;
};
const centsToMoney = (value: number | null) =>
  value === null ? "" : (value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const numberPt = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};
const formatDate = (value: string) => value
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)) : "Não informado";

export function ProjectWorkspace() {
  const { projects, setProjects, loading, error, upsert, repository } = useProjects();
  const [view, setView] = useState<View>("list");
  const [current, setCurrent] = useState<ProjectMasterRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [capContext, setCapContext] = useState<{ projectId?: string; needsItemId?: string }>({});
  const [validation, setValidation] = useState<ReturnType<typeof calculateReadiness> | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const studyRepository = getParametricStudyRepository();
  const save = useCallback(async (project: ProjectMasterRecord) => {
    const saved = await repository.save(project); upsert(saved); return saved;
  }, [repository, upsert]);
  const autosave = useProjectAutosave(current ?? createEmptyProject("TH-0000-000"), save, view === "record" && Boolean(current));

  async function newProject() {
    const project = createEmptyProject(await repository.nextCode());
    setCurrent(project); setView("record"); setNotice(`Cadastro ${project.code} criado.`);
  }
  function open(project: ProjectMasterRecord) { setCurrent(project); setView("record"); setValidation(null); }
  function update(patch: Partial<ProjectMasterRecord>) {
    setCurrent((project) => project ? { ...project, ...patch } : project); setValidation(null);
  }
  async function archive(project: ProjectMasterRecord, value: boolean) {
    const saved = await save(changeArchiveState(project, value)); setCurrent(saved);
    setNotice(value ? "Projeto arquivado." : "Projeto restaurado.");
  }
  async function duplicate(project: ProjectMasterRecord) {
    const saved = await save(duplicateProject(project, await repository.nextCode()));
    setCurrent(saved); setView("record"); setNotice(`${saved.code} criado a partir de ${project.code}.`);
  }
  async function remove(project: ProjectMasterRecord) {
    if (!window.confirm(`Excluir definitivamente ${project.code}?`)) return;
    await repository.remove(project.id); setProjects((items) => items.filter((item) => item.id !== project.id));
    setView("list"); setCurrent(null); setNotice("Cadastro excluído.");
  }
  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try {
      const bundle = parseProjectImportBundle(JSON.parse(await file.text()));
      let imported = bundle.project; let importedStudies = bundle.studies;
      const conflict = detectImportConflict(imported, projects);
      if (conflict !== "none") {
        const replace = window.confirm("Há conflito de ID ou código. OK: substituir existente. Cancelar: escolher importar como novo.");
        if (replace) {
          const target = projects.find((item) => item.id === imported.id || item.code === imported.code);
          if (target) { importedStudies = importedStudies.map((study) => ({ ...study, projectId: target.id })); imported = { ...imported, id: target.id, code: target.code }; }
        } else {
          if (!window.confirm("Importar como novo projeto? Cancelar interrompe a importação.")) return;
          const originalId = imported.id; imported = importAsNew(imported, await repository.nextCode());
          importedStudies = importedStudies.map((study) => ({ ...study, id: createId("cap-study"), projectId: imported.id,
            name: `${study.name} — importado`, needsProgramItemId: study.needsProgramItemId && originalId === bundle.project.id ? study.needsProgramItemId : null }));
        }
      }
      imported = { ...imported, history: [...imported.history, createHistoryEvent("imported", "Cadastro importado.")] };
      const saved = await save(imported);
      for (const study of importedStudies) {
        const existing = await studyRepository.findById(study.id);
        if (existing) await studyRepository.update(study); else await studyRepository.create(study);
      }
      setCurrent(saved); setView("record");
      setNotice(importedStudies.length ? `Cadastro ${saved.code} importado com ${importedStudies.length} estudo(s).`
        : `Cadastro ${saved.code} importado.`);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Falha ao importar."); }
  }
  async function download() {
    if (!current) return;
    const studies = await studyRepository.listByProject(current.id);
    const blob = new Blob([JSON.stringify(exportProject(current, studies), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${current.code.toLowerCase()}-cmp.json`; anchor.click();
    URL.revokeObjectURL(url); setNotice("Cadastro exportado em JSON.");
  }
  async function downloadBackup() {
    const studies = await studyRepository.listAll();
    const blob = new Blob([JSON.stringify(exportConsolidatedBackup(projects, studies), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `th-os-cmp-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
    URL.revokeObjectURL(url); setNotice(`Backup completo exportado com ${projects.length} cadastro(s).`);
  }
  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try {
      const restored = parseConsolidatedBackup(JSON.parse(await file.text()));
      if (!window.confirm(`Restaurar ${restored.projects.length} cadastro(s) e ${restored.studies.length} estudo(s)? Isso substituirá todos os dados locais atuais.`)) return;
      const saved = await repository.restoreAll(restored.projects, restored.studies);
      setProjects(saved.projects); setCurrent(null); setView("list");
      setNotice(`Backup restaurado com ${saved.projects.length} cadastro(s) e ${saved.studies.length} estudo(s).`);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Falha ao restaurar backup."); }
  }
  function openCap(projectId?: string, needsItemId?: string) {
    setCapContext({ projectId, needsItemId });
    setView("cap");
  }
  async function applyCapResult(payload: CapApplyPayload) {
    const project = projects.find((item) => item.id === payload.study.projectId);
    if (!project) throw new Error("Projeto vinculado ao estudo não encontrado.");
    const needsItem = project.needsProgram.find((item) => item.id === payload.study.needsProgramItemId);
    if (needsItem?.desiredAreaM2 !== null && needsItem?.desiredAreaM2 !== undefined
      && !window.confirm(`A área desejada atual é ${needsItem.desiredAreaM2.toLocaleString("pt-BR")} m². Substituir por ${payload.areaM2.toLocaleString("pt-BR")} m²?`)) return;
    const calculatedAt = new Date().toISOString();
    const updatedProject = applyScenarioToNeedsProgram(project, payload.study, payload.scenario, payload.areaType, calculatedAt);
    const savedProject = await save(updatedProject);
    const appliedStudy = { ...payload.study, status: "applied" as const, updatedAt: calculatedAt };
    const existingStudy = await studyRepository.findById(appliedStudy.id);
    if (existingStudy) await studyRepository.update(appliedStudy); else await studyRepository.create(appliedStudy);
    setCurrent(savedProject); setView("record");
    setNotice(`Área CAP-001 de ${payload.areaM2.toLocaleString("pt-BR")} m² aplicada ao Programa de Necessidades.`);
  }
  if (loading) return <main className="loading-state">Carregando Cadastro Mestre…</main>;
  if (error) return <main className="loading-state" role="alert">{error.message}</main>;
  return (
    <div className="app-shell">
      <Header
        record={view === "record"} autosave={autosave}
        onHome={() => setView("list")} onNew={newProject}
        onImport={() => importInput.current?.click()} onExport={() => void download()}
        onCap={() => openCap(current?.id)}
      />
      <aside className="pilot-notice" aria-label="Aviso sobre armazenamento local">
        <strong>Versão piloto.</strong>{" "}
        Os dados ficam armazenados somente neste navegador e dispositivo. Exporte o projeto em JSON para manter uma cópia de segurança.
      </aside>
      {view === "cap" ? (
        <CapWorkspace projects={projects} initialProjectId={capContext.projectId} initialNeedsItemId={capContext.needsItemId}
          onBack={() => setView(current ? "record" : "list")} onApply={applyCapResult} />
      ) : view === "list" ? (
        <ProjectList projects={projects} onOpen={open} onArchive={archive} onDuplicate={duplicate} onDelete={remove}
          onBackup={() => void downloadBackup()} onRestore={() => backupInput.current?.click()} />
      ) : current ? (
        <ProjectRecord project={current} update={update} validation={validation}
          setValidation={setValidation} onBack={() => setView("list")} onOpenCap={(needsItemId) => openCap(current.id, needsItemId)} />
      ) : null}
      <input ref={importInput} className="sr-only" type="file" accept=".json,application/json" onChange={importJson} />
      <input ref={backupInput} className="sr-only" type="file" accept=".json,application/json" onChange={restoreBackup} />
      {notice && <div className="toast" role="status"><strong>{notice}</strong><button onClick={() => setNotice("")}>Fechar</button></div>}
    </div>
  );
}

function Header({ record, autosave, onHome, onNew, onImport, onExport, onCap }: {
  record: boolean; autosave: ReturnType<typeof useProjectAutosave>; onHome: () => void;
  onNew: () => void; onImport: () => void; onExport: () => void; onCap: () => void;
}) {
  const saveLabel = autosave.state === "saving" ? "Salvando…" : autosave.state === "dirty" ? "Alterações pendentes"
    : autosave.state === "error" ? "Erro ao salvar" : autosave.state === "saved" ? "Salvo neste dispositivo" : "";
  return <header className="topbar">
    <button className="brand-link brand-button" aria-label="Voltar para projetos" onClick={onHome}>
      <span className="brand-crop brand-crop--horizontal" aria-hidden="true">
        <Image src={logo} alt="" priority unoptimized />
      </span>
    </button>
    <div className="product-signature"><strong>TH OS</strong><span>Cadastro Mestre do Projeto · CMP-001</span></div>
    <div className="topbar-actions">
      <button className="button button--ghost" onClick={onCap}>CAP-001</button>
      {record && saveLabel && <span className={`save-status save-status--${autosave.state}`}>{saveLabel}</span>}
      {autosave.state === "error" && <button className="button button--ghost" onClick={() => void autosave.retry()}>Tentar novamente</button>}
      {record ? <button className="button button--ghost record-export" onClick={onExport}>Exportar JSON</button>
        : <><button className="button button--ghost" onClick={onImport}>Importar JSON</button>
          <button className="button button--primary" onClick={onNew}>Novo projeto</button></>}
    </div>
  </header>;
}

function ProjectList({ projects, onOpen, onArchive, onDuplicate, onDelete, onBackup, onRestore }: {
  projects: ProjectMasterRecord[]; onOpen: (p: ProjectMasterRecord) => void;
  onArchive: (p: ProjectMasterRecord, value: boolean) => void; onDuplicate: (p: ProjectMasterRecord) => void;
  onDelete: (p: ProjectMasterRecord) => void; onBackup: () => void; onRestore: () => void;
}) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("visible");
  const [phase, setPhase] = useState(""); const [priority, setPriority] = useState("");
  const [responsible, setResponsible] = useState(""); const [city, setCity] = useState("");
  const [sort, setSort] = useState("updated");
  const cities = [...new Set(projects.map((item) => item.property.city).filter(Boolean))].sort();
  const filtered = projects.filter((project) => {
    const haystack = [project.code, project.internalName, project.commercialName,
      project.clients.map((client) => client.name).join(" "), project.property.city].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (status === "all" || status === "visible" ? status === "all" || project.recordStatus !== "archived" : project.recordStatus === status)
      && (!phase || project.projectPhase === phase) && (!priority || project.priority === priority)
      && (!responsible || project.primaryResponsible.toLowerCase().includes(responsible.toLowerCase()))
      && (!city || project.property.city === city);
  }).sort((a, b) => sort === "code" ? a.code.localeCompare(b.code)
    : sort === "name" ? a.internalName.localeCompare(b.internalName)
      : sort === "phase" ? a.projectPhase.localeCompare(b.projectPhase)
        : b.updatedAt.localeCompare(a.updatedAt));
  return <main id="projects" className="projects-page">
    <div className="projects-heading"><div><span className="eyebrow">TH OS · CMP-001</span>
      <h1>Cadastro Mestre do Projeto</h1><p>Fonte única para contexto, escopo, pessoas, decisões e próximos passos.</p></div>
      <div className="projects-metric"><strong>{projects.filter((p) => p.recordStatus !== "archived").length}</strong><span>projetos ativos</span></div>
    </div>
    <section className="backup-card" aria-label="Backup completo">
      <div><strong>Backup completo</strong><p>Exporte ou restaure todos os cadastros deste navegador em um único arquivo.</p></div>
      <div className="backup-actions"><button className="button button--ghost" onClick={onRestore}>Restaurar backup</button>
        <button className="button button--primary" onClick={onBackup}>Exportar backup completo</button></div>
    </section>
    <div className="filters-card" aria-label="Filtros de projetos">
      <Field label="Buscar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Código, nome, cliente ou cidade" /></Field>
      <Select label="Status" value={status} onChange={setStatus} options={[["visible", "Não arquivados"], ["all", "Todos"], ["draft", "Rascunho"], ["active", "Ativo"], ["archived", "Arquivado"]]} />
      <Select label="Fase" value={phase} onChange={setPhase} options={[["", "Todas"], ...projectPhases.map((p) => [p, phaseLabels[p]] as [string, string])]} />
      <Select label="Prioridade" value={priority} onChange={setPriority} options={[["", "Todas"], ["low", "Baixa"], ["medium", "Média"], ["high", "Alta"], ["urgent", "Urgente"]]} />
      <Field label="Responsável"><input value={responsible} onChange={(e) => setResponsible(e.target.value)} /></Field>
      <Select label="Cidade" value={city} onChange={setCity} options={[["", "Todas"], ...cities.map((v) => [v, v] as [string, string])]} />
      <Select label="Ordenar" value={sort} onChange={setSort} options={[["updated", "Atualização"], ["code", "Código"], ["name", "Nome"], ["phase", "Fase"]]} />
    </div>
    <div className="project-grid">{filtered.map((project) => {
      const overdue = overduePending(project); const blockers = project.pending.filter((p) => p.status === "blocked");
      return <article className="project-card" key={project.id}>
        <button className="project-card__open" onClick={() => onOpen(project)}>
          <div className="project-card__top"><span className="record-code">{project.code}</span>
            <span className={`status-chip status-chip--${project.recordStatus}`}>{statusLabels[project.recordStatus]}</span></div>
          <h3>{project.internalName}</h3><p>{project.clients.find((c) => c.primary)?.name || "Cliente não informado"} · {project.property.city || "Cidade não informada"}</p>
          <dl className="project-meta"><div><dt>Tipo</dt><dd>{project.property.type || "—"}</dd></div><div><dt>Fase</dt><dd>{phaseLabels[project.projectPhase]}</dd></div><div><dt>Prioridade</dt><dd>{priorityLabels[project.priority]}</dd></div></dl>
          <div className="progress-row"><span>Completude</span><strong>{calculateOverallProgress(project)}%</strong></div>
          <div className="progress-track"><span style={{ width: `${calculateOverallProgress(project)}%` }} /></div>
          {(overdue.length > 0 || blockers.length > 0) && <strong className="semantic-alert">⚠ {overdue.length} vencida(s) · {blockers.length} bloqueadora(s)</strong>}
          <small>Atualizado em {formatDate(project.updatedAt)}</small>
        </button>
        <div className="project-card__actions"><button onClick={() => onDuplicate(project)}>Duplicar</button>
          <button onClick={() => onArchive(project, project.recordStatus !== "archived")}>{project.recordStatus === "archived" ? "Restaurar" : "Arquivar"}</button>
          {project.recordStatus === "archived" && <button className="danger-action" onClick={() => onDelete(project)}>Excluir</button>}</div>
      </article>;
    })}</div>
  </main>;
}

function ProjectRecord({ project, update, validation, setValidation, onBack, onOpenCap }: {
  project: ProjectMasterRecord; update: (patch: Partial<ProjectMasterRecord>) => void;
  validation: ReturnType<typeof calculateReadiness> | null;
  setValidation: (v: ReturnType<typeof calculateReadiness>) => void; onBack: () => void;
  onOpenCap: (needsItemId: string) => void;
}) {
  const areas = summarizeAreas(project);
  const mutate = <K extends keyof ProjectMasterRecord>(key: K, value: ProjectMasterRecord[K]) => update({ [key]: value } as Pick<ProjectMasterRecord, K>);
  const updateClient = (id: string, patch: Partial<ClientRecord>) => mutate("clients", project.clients.map((item) =>
    item.id === id ? { ...item, ...patch } : patch.primary ? { ...item, primary: false } : item));
  return <main className="workspace expanded-workspace">
    <aside className="section-nav" aria-label="Seções do cadastro"><button className="back-action" onClick={onBack}>← Projetos</button>
      {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</aside>
    <div className="content-column">
      <div className="page-heading"><div><span className="record-code">{project.code}</span><h1>{project.internalName}</h1>
        <p>{project.initialSynthesis || "Síntese ainda não informada."}</p></div><strong>{calculateOverallProgress(project)}%</strong></div>
      <Section id="identification" title="1. Identificação">
        <Grid><Input label="Nome interno" value={project.internalName} onChange={(internalName) => update({ internalName })} />
          <Input label="Nome comercial" value={project.commercialName} onChange={(commercialName) => update({ commercialName })} />
          <Select label="Status" value={project.recordStatus} onChange={(recordStatus) => update({ recordStatus: recordStatus as RecordStatus })} options={[["draft", "Rascunho"], ["active", "Ativo"], ["archived", "Arquivado"]]} />
          <Select label="Fase" value={project.projectPhase} onChange={(projectPhase) => update({ projectPhase: projectPhase as ProjectPhase, history: [...project.history, createHistoryEvent("phase_changed", `Fase alterada para ${phaseLabels[projectPhase as ProjectPhase]}.`)] })} options={projectPhases.map((p) => [p, phaseLabels[p]])} />
          <Select label="Prioridade" value={project.priority} onChange={(priority) => update({ priority: priority as ProjectMasterRecord["priority"] })} options={[["low", "Baixa"], ["medium", "Média"], ["high", "Alta"], ["urgent", "Urgente"]]} />
          <Input label="Responsável principal" value={project.primaryResponsible} onChange={(primaryResponsible) => update({ primaryResponsible })} />
          <Input label="Origem do contato" value={project.contactOrigin} onChange={(contactOrigin) => update({ contactOrigin })} />
          <Textarea label="Notas internas" value={project.internalNotes} onChange={(internalNotes) => update({ internalNotes })} /></Grid>
      </Section>
      <Section id="clients" title="2. Clientes" action={<button onClick={() => mutate("clients", [...project.clients, { ...createEmptyClient(), primary: project.clients.length === 0 }])}>+ Cliente</button>}>
        {project.clients.map((client) => <Collection key={client.id} onRemove={() => mutate("clients", project.clients.filter((c) => c.id !== client.id))}>
          <Grid><Input label="Nome" value={client.name} onChange={(name) => updateClient(client.id, { name })} />
            <Input label="Nome preferido" value={client.preferredName} onChange={(preferredName) => updateClient(client.id, { preferredName })} />
            <Select label="Pessoa" value={client.personType} onChange={(personType) => updateClient(client.id, { personType: personType as ClientRecord["personType"] })} options={[["individual", "Pessoa física"], ["company", "Empresa"]]} />
            <Input label="Papel no projeto" value={client.projectRole} onChange={(projectRole) => updateClient(client.id, { projectRole })} />
            <Input label="Telefone" value={client.phone} onChange={(phone) => updateClient(client.id, { phone })} /><Input label="E-mail" value={client.email} onChange={(email) => updateClient(client.id, { email })} />
            <label className="check-row"><input type="checkbox" checked={client.primary} onChange={(e) => updateClient(client.id, { primary: e.target.checked })} /> Contato principal</label></Grid>
        </Collection>)}
      </Section>
      <Section id="property" title="3. Imóvel"><Grid>
        <Input label="Tipo" value={project.property.type} onChange={(type) => mutate("property", { ...project.property, type })} />
        <Input label="Situação" value={project.property.condition} onChange={(condition) => mutate("property", { ...project.property, condition })} />
        <Input label="Endereço/localização" value={project.property.address} onChange={(address) => mutate("property", { ...project.property, address })} />
        <Input label="Cidade" value={project.property.city} onChange={(city) => mutate("property", { ...project.property, city })} />
        <Input label="Estado" value={project.property.state} onChange={(state) => mutate("property", { ...project.property, state })} />
        <Input label="Área existente (m²)" value={project.property.existingBuiltAreaM2?.toLocaleString("pt-BR") ?? ""} onChange={(v) => mutate("property", { ...project.property, existingBuiltAreaM2: numberPt(v) })} />
        <Input label="Ampliação estimada (m²)" value={project.property.estimatedExpansionAreaM2?.toLocaleString("pt-BR") ?? ""} onChange={(v) => mutate("property", { ...project.property, estimatedExpansionAreaM2: numberPt(v) })} />
        <Textarea label="Condição aparente" value={project.property.apparentCondition} onChange={(apparentCondition) => mutate("property", { ...project.property, apparentCondition })} />
      </Grid></Section>
      <Section id="context" title="4. Contexto"><Grid>
        <Textarea label="Síntese inicial" value={project.initialSynthesis} onChange={(initialSynthesis) => update({ initialSynthesis })} />
        <Textarea label="Solicitação" value={project.context.requestSummary} onChange={(requestSummary) => mutate("context", { ...project.context, requestSummary })} />
        <Textarea label="Problema principal" value={project.context.mainProblem} onChange={(mainProblem) => mutate("context", { ...project.context, mainProblem })} />
        <Textarea label="Objetivos" value={project.context.objectives} onChange={(objectives) => mutate("context", { ...project.context, objectives })} />
        <Textarea label="Partes a concluir" value={project.context.partsToFinish} onChange={(partsToFinish) => mutate("context", { ...project.context, partsToFinish })} />
        <Textarea label="Partes a ampliar" value={project.context.partsToExpand} onChange={(partsToExpand) => mutate("context", { ...project.context, partsToExpand })} />
        <Textarea label="Restrições e riscos" value={[project.context.restrictions, project.context.risks].filter(Boolean).join("\n")} onChange={(restrictions) => mutate("context", { ...project.context, restrictions })} />
        <Textarea label="Questões abertas" value={project.context.openQuestions} onChange={(openQuestions) => mutate("context", { ...project.context, openQuestions })} />
      </Grid></Section>
      <Section id="scope" title="5. Escopo preliminar" action={<select aria-label="Adicionar serviço" defaultValue="" onChange={(e) => { if (e.target.value) mutate("preliminaryScope", [...project.preliminaryScope, createScopeItem(e.target.value, "not_defined", project.preliminaryScope.length)]); e.target.value = ""; }}><option value="">+ Catálogo</option>{scopeCatalog.map((s) => <option key={s.serviceCode} value={s.serviceCode}>{s.name}</option>)}</select>}>
        {project.preliminaryScope.sort((a, b) => a.order - b.order).map((item) => <ScopeRow key={item.id} item={item} onChange={(patch) => mutate("preliminaryScope", project.preliminaryScope.map((s) => s.id === item.id ? { ...s, ...patch } : s))} onRemove={() => mutate("preliminaryScope", project.preliminaryScope.filter((s) => s.id !== item.id))} />)}
      </Section>
      <Section id="program" title="6. Programa inicial" action={<button onClick={() => mutate("needsProgram", [...project.needsProgram, emptyNeed(project.needsProgram.length)])}>+ Ambiente</button>}>
        <div className="summary-strip"><span>Existente: {areas.existing} m²</span><span>Desejada: {areas.desired} m²</span><span>Ampliação: {areas.expansion} m²</span><span>Ambientes: {areas.environments}</span><span>Essenciais: {areas.essential}</span><span>Sob análise: {areas.underReview}</span></div>
        {project.needsProgram.map((item) => <Collection key={item.id} onRemove={() => mutate("needsProgram", project.needsProgram.filter((n) => n.id !== item.id))}><Grid>
          <Input label="Ambiente" value={item.environment} onChange={(environment) => updateNeed(project, item.id, { environment }, mutate)} />
          <Input label="Setor" value={item.sector} onChange={(sector) => updateNeed(project, item.id, { sector }, mutate)} />
          <Input label="Pavimento" value={item.floor} onChange={(floor) => updateNeed(project, item.id, { floor }, mutate)} />
          <Input label="Área existente m²" value={item.existingAreaM2?.toLocaleString("pt-BR") ?? ""} onChange={(v) => updateNeed(project, item.id, { existingAreaM2: numberPt(v) }, mutate)} />
          <Input label="Área desejada m²" value={item.desiredAreaM2?.toLocaleString("pt-BR") ?? ""} onChange={(v) => updateNeed(project, item.id, { desiredAreaM2: numberPt(v) }, mutate)} />
          <Select label="Prioridade" value={item.priority} onChange={(priority) => updateNeed(project, item.id, { priority: priority as NeedsItem["priority"] }, mutate)} options={[["essential", "Essencial"], ["important", "Importante"], ["desirable", "Desejável"], ["under_review", "Sob análise"]]} />
        </Grid><div className="cap-program-link"><button className="button button--ghost" onClick={() => onOpenCap(item.id)}>Pré-dimensionar com CAP-001</button>
          {item.parametricStudyId && <small>Aplicado: {item.appliedAreaM2?.toLocaleString("pt-BR")} m² · biblioteca {item.capLibraryVersion} · motor {item.calculationEngineVersion}</small>}</div></Collection>)}
      </Section>
      <Section id="planning" title="7. Prazos"><Grid>
        <Input type="date" label="Primeiro contato" value={project.planning.firstContactDate} onChange={(firstContactDate) => mutate("planning", { ...project.planning, firstContactDate })} />
        <Input type="date" label="Reunião" value={project.planning.meetingDate} onChange={(meetingDate) => mutate("planning", { ...project.planning, meetingDate })} />
        <Input type="date" label="Levantamento" value={project.planning.surveyDate} onChange={(surveyDate) => mutate("planning", { ...project.planning, surveyDate })} />
        <Input type="date" label="Início do projeto" value={project.planning.desiredDesignStartDate} onChange={(desiredDesignStartDate) => mutate("planning", { ...project.planning, desiredDesignStartDate })} />
        <Input type="date" label="Início da obra" value={project.planning.desiredConstructionStartDate} onChange={(desiredConstructionStartDate) => mutate("planning", { ...project.planning, desiredConstructionStartDate })} />
        <Input type="date" label="Conclusão desejada" value={project.planning.desiredCompletionDate} onChange={(desiredCompletionDate) => mutate("planning", { ...project.planning, desiredCompletionDate })} />
        <Input label="Urgência" value={project.planning.urgency} onChange={(urgency) => mutate("planning", { ...project.planning, urgency })} />
        <Input label="Tempo mínimo" value={project.planning.minimumRequiredTime} onChange={(minimumRequiredTime) => mutate("planning", { ...project.planning, minimumRequiredTime })} />
      </Grid></Section>
      <Section id="budget" title="8. Orçamento"><Grid>
        <Input label="Orçamento de obra (R$)" value={centsToMoney(project.budget.estimatedConstructionBudgetCents)} onChange={(v) => mutate("budget", { ...project.budget, estimatedConstructionBudgetCents: moneyToCents(v) })} />
        <Select label="Faixa" value={project.budget.investmentRange} onChange={(investmentRange) => mutate("budget", { ...project.budget, investmentRange: investmentRange as ProjectMasterRecord["budget"]["investmentRange"] })} options={[["not_informed", "Não informado"], ["up_to_100k", "Até 100 mil"], ["100k_to_250k", "100 a 250 mil"], ["250k_to_500k", "250 a 500 mil"], ["500k_to_1m", "500 mil a 1 milhão"], ["above_1m", "Acima de 1 milhão"], ["custom", "Personalizado"]]} />
        <Select label="Nível de definição" value={project.budget.definitionLevel} onChange={(definitionLevel) => mutate("budget", { ...project.budget, definitionLevel: definitionLevel as ProjectMasterRecord["budget"]["definitionLevel"] })} options={[["undefined", "Não definido"], ["preliminary", "Preliminar"], ["estimated", "Estimado"], ["confirmed", "Confirmado"]]} />
        <Textarea label="Notas" value={project.budget.notes} onChange={(notes) => mutate("budget", { ...project.budget, notes })} />
      </Grid><p className="helper-text">Este cadastro não calcula honorários.</p></Section>
      <GenericCollection id="visits" title="9. Visitas" items={project.visits} addLabel="Visita"
        onAdd={() => mutate("visits", [...project.visits, emptyVisit()])} onRemove={(id) => mutate("visits", project.visits.filter((v) => v.id !== id))}
        render={(item: VisitRecord) => <Grid><Input label="Finalidade" value={item.purpose} onChange={(purpose) => mutate("visits", project.visits.map((v) => v.id === item.id ? { ...v, purpose } : v))} /><Input type="date" label="Data" value={item.date} onChange={(date) => mutate("visits", project.visits.map((v) => v.id === item.id ? { ...v, date } : v))} /><Input label="Responsável" value={item.responsible} onChange={(responsible) => mutate("visits", project.visits.map((v) => v.id === item.id ? { ...v, responsible } : v))} /></Grid>} />
      <GenericCollection id="documents" title="10. Documentos" items={project.documents} addLabel="Documento"
        onAdd={() => mutate("documents", [...project.documents, emptyDocument()])} onRemove={(id) => mutate("documents", project.documents.filter((v) => v.id !== id))}
        render={(item: DocumentReference) => <Grid><Input label="Documento" value={item.name} onChange={(name) => mutate("documents", project.documents.map((v) => v.id === item.id ? { ...v, name } : v))} /><Input label="Categoria" value={item.category} onChange={(category) => mutate("documents", project.documents.map((v) => v.id === item.id ? { ...v, category } : v))} /><label className="check-row"><input type="checkbox" checked={item.required} onChange={(e) => mutate("documents", project.documents.map((v) => v.id === item.id ? { ...v, required: e.target.checked } : v))} /> Obrigatório</label></Grid>} />
      <GenericCollection id="team" title="11. Responsáveis e parceiros" items={project.team} addLabel="Participante"
        onAdd={() => mutate("team", [...project.team, emptyTeam()])} onRemove={(id) => mutate("team", project.team.filter((v) => v.id !== id))}
        render={(item: TeamMember) => <Grid><Input label="Nome" value={item.name} onChange={(name) => mutate("team", project.team.map((v) => v.id === item.id ? { ...v, name } : v))} /><Input label="Profissão" value={item.profession} onChange={(profession) => mutate("team", project.team.map((v) => v.id === item.id ? { ...v, profession } : v))} /><Select label="Status" value={item.status} onChange={(status) => mutate("team", project.team.map((v) => v.id === item.id ? { ...v, status: status as TeamMember["status"] } : v))} options={[["suggested", "Sugerido"], ["invited", "Convidado"], ["active", "Ativo"], ["inactive", "Inativo"]]} /></Grid>} />
      <GenericCollection id="decisions" title="12. Decisões" items={project.decisions} addLabel="Decisão"
        onAdd={() => mutate("decisions", [...project.decisions, emptyDecision(project.projectPhase)])} onRemove={(id) => mutate("decisions", project.decisions.filter((v) => v.id !== id))}
        render={(item: DecisionRecord) => <Grid><Input label="Assunto" value={item.subject} onChange={(subject) => mutate("decisions", project.decisions.map((v) => v.id === item.id ? { ...v, subject } : v))} /><Textarea label="Decisão" value={item.decision} onChange={(decision) => mutate("decisions", project.decisions.map((v) => v.id === item.id ? { ...v, decision } : v))} /></Grid>} />
      <GenericCollection id="pending" title="13. Pendências" items={project.pending} addLabel="Pendência"
        onAdd={() => mutate("pending", [...project.pending, emptyPending(project.projectPhase)])} onRemove={(id) => mutate("pending", project.pending.filter((v) => v.id !== id))}
        render={(item: PendingRecord) => <Grid><Input label="Descrição" value={item.description} onChange={(description) => mutate("pending", project.pending.map((v) => v.id === item.id ? { ...v, description } : v))} /><Input type="date" label="Prazo" value={item.dueDate} onChange={(dueDate) => mutate("pending", project.pending.map((v) => v.id === item.id ? { ...v, dueDate } : v))} /><Select label="Status" value={item.status} onChange={(status) => mutate("pending", project.pending.map((v) => v.id === item.id ? { ...v, status: status as PendingRecord["status"] } : v))} options={[["open", "Aberta"], ["in_progress", "Em andamento"], ["blocked", "Bloqueada"], ["completed", "Concluída"], ["cancelled", "Cancelada"]]} />{overduePending(project).some((p) => p.id === item.id) && <strong className="semantic-alert">⚠ Pendência vencida</strong>}</Grid>} />
      <Section id="history" title="14. Histórico"><div className="history-list">{[...project.history].reverse().map((event) => <div className="history-row" key={event.id}><strong>{event.action}</strong><p>{event.detail}</p><time>{formatDate(event.at)}</time></div>)}</div></Section>
      <section className="validation-panel"><div><h2>Prontidão</h2><p>A validação informa prontidão e não altera o status.</p></div>
        <div className="validation-actions">{(["draft", "meeting", "survey", "proposal"] as const).map((level) => <button key={level} className="button button--ghost" onClick={() => setValidation(calculateReadiness(project, level))}>{level === "draft" ? "Rascunho" : level === "meeting" ? "Reunião" : level === "survey" ? "Levantamento" : "Proposta"}</button>)}</div></section>
      {validation && <div className={`validation-result ${validation.valid ? "validation-result--valid" : ""}`} role="status"><strong>{validation.valid ? `Pronto para ${validation.level}.` : `Faltam ${validation.missing.length} itens.`}</strong><ul>{validation.missing.map((m) => <li key={m}>{m}</li>)}{validation.warnings.map((m) => <li key={m}>⚠ {m}</li>)}</ul></div>}
    </div>
  </main>;
}

function Section({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  return <section id={id} className="form-section"><div className="section-heading"><h2>{title}</h2>{action}</div><div className="card form-card">{children}</div></section>;
}
function Grid({ children }: { children: ReactNode }) { return <div className="field-grid">{children}</div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <Field label={label}><input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></Field>;
}
function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Field label={label}><textarea value={value} onChange={(e) => onChange(e.target.value)} /></Field>;
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly (readonly [string, string])[] }) {
  return <Field label={label}><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, text]) => <option value={v} key={v}>{text}</option>)}</select></Field>;
}
function Collection({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return <div className="table-card collection-card">{children}<button className="row-remove" aria-label="Remover registro" onClick={onRemove}>×</button></div>;
}
function GenericCollection<T extends { id: string }>({ id, title, items, addLabel, onAdd, onRemove, render }: { id: string; title: string; items: T[]; addLabel: string; onAdd: () => void; onRemove: (id: string) => void; render: (item: T) => ReactNode }) {
  return <Section id={id} title={title} action={<button onClick={onAdd}>+ {addLabel}</button>}>{items.length ? items.map((item) => <Collection key={item.id} onRemove={() => onRemove(item.id)}>{render(item)}</Collection>) : <p className="empty-state">Nenhum registro.</p>}</Section>;
}
function ScopeRow({ item, onChange, onRemove }: { item: PreliminaryScopeItem; onChange: (patch: Partial<PreliminaryScopeItem>) => void; onRemove: () => void }) {
  return <Collection onRemove={onRemove}><Grid><Input label="Serviço" value={item.name} onChange={(name) => onChange({ name })} />
    <Select label="Status" value={item.status} onChange={(status) => onChange({ status: status as PreliminaryScopeItem["status"] })} options={[["required", "Obrigatório"], ["under_review", "Sob análise"], ["optional", "Opcional"], ["not_defined", "Não definido"], ["excluded", "Excluído"]]} />
    <Select label="Execução" value={item.executionMode} onChange={(executionMode) => onChange({ executionMode: executionMode as PreliminaryScopeItem["executionMode"] })} options={[["internal", "Interna"], ["partner", "Parceiro"], ["outsourced", "Terceirizada"], ["client", "Cliente"], ["not_defined", "Não definida"]]} />
    <Input label="Responsável" value={item.responsible} onChange={(responsible) => onChange({ responsible })} /><Input label="Observações" value={item.notes} onChange={(notes) => onChange({ notes })} /></Grid></Collection>;
}
function emptyNeed(order: number): NeedsItem { return { id: createId("need"), environment: "", sector: "", floor: "", currentSituation: "under_review", intervention: "study", existingAreaM2: null, desiredAreaM2: null, quantity: 1, priority: "under_review", users: "", needs: "", lighting: "", ventilation: "", privacy: "", accessibility: "", furniture: "", equipment: "", connections: "", notes: "", order, parametricStudyId: null, parametricScenarioId: null, appliedAreaType: null, appliedAreaM2: null, capLibraryVersion: null, calculationEngineVersion: null, calculatedAt: null }; }
function updateNeed(project: ProjectMasterRecord, id: string, patch: Partial<NeedsItem>, mutate: <K extends keyof ProjectMasterRecord>(key: K, value: ProjectMasterRecord[K]) => void) { mutate("needsProgram", project.needsProgram.map((item) => item.id === id ? { ...item, ...patch } : item)); }
function emptyVisit(): VisitRecord { return { id: createId("visit"), type: "survey", date: "", time: "", city: "", address: "", responsible: "", participants: "", estimatedDurationMinutes: null, actualDurationMinutes: null, purpose: "", notes: "", reportRequired: false, status: "planned", estimatedExpensesCents: null }; }
function emptyDocument(): DocumentReference { return { id: createId("document"), name: "", category: "", required: false, status: "not_requested", requestedAt: "", receivedAt: "", notes: "", fileName: "", futureLink: "", responsible: "" }; }
function emptyTeam(): TeamMember { return { id: createId("team"), name: "", function: "", profession: "", company: "", phone: "", email: "", responsibility: "", engagementType: "", status: "suggested", notes: "" }; }
function emptyDecision(phase: ProjectPhase): DecisionRecord { return { id: createId("decision"), date: "", subject: "", decision: "", origin: "", participants: "", phase, costImpact: "unknown", deadlineImpact: "unknown", scopeImpact: "unknown", responsible: "", notes: "" }; }
function emptyPending(phase: ProjectPhase): PendingRecord { return { id: createId("pending"), description: "", category: "", responsible: "", dueDate: "", priority: "medium", status: "open", dependency: "", affectedPhase: phase, notes: "", completedAt: null }; }
