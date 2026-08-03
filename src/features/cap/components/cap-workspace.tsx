"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NeedsItem, ProjectMasterRecord } from "../../../domain/project-master-record";
import { ParametricEnvironmentStudy, ParametricScenario } from "../domain/cap-library-types";
import { getParametricStudyRepository } from "../repositories/parametric-study-repository";
import { capLibrary, getEnvironmentReferences, searchCapEnvironments } from "../services/cap-library-service";
import {
  calculateScenario, createParametricStudy, createSelectedCustomItem, createSelectedLibraryItem, duplicateScenario,
} from "../services/cap-scenario-service";
import { accessibilityLabels, capabilityLabels, comfortLabels } from "../utils/cap-labels";
import { CapResultPanel } from "./results/cap-result-panel";
import { CapScenarioComparator } from "./scenarios/cap-scenario-comparator";
import { formatPtBrDecimal, isValidPositiveDimension, parsePtBrDecimal } from "../../../utils/pt-br-decimal";
import { CatalogCombobox } from "../../catalogs/components/catalog-combobox";
import { CatalogOption, ReferenceCatalog } from "../../catalogs/domain/reference-catalog";

type CapTab = "library" | "calculator" | "studies" | "compare" | "sources";
type ApplyAreaType = NonNullable<NeedsItem["appliedAreaType"]>;
export interface CapApplyPayload {
  study: ParametricEnvironmentStudy; scenario: ParametricScenario; areaType: ApplyAreaType; areaM2: number;
}
interface Props {
  projects: ProjectMasterRecord[]; initialProjectId?: string; initialNeedsItemId?: string;
  onBack: () => void; onApply: (payload: CapApplyPayload) => Promise<void>;
}
const repository = getParametricStudyRepository();
const staticOptions = (catalogType: ReferenceCatalog, values: Array<[string, string]>): CatalogOption[] => values.map(([value, label], order) => ({
  id: `cap-${catalogType}-${value}`, catalogType, value, label, active: true, system: true, order,
  createdAt: capLibrary.metadata.generatedAt, updatedAt: capLibrary.metadata.generatedAt, parentId: null, projectId: null,
}));
const environmentOptions = staticOptions("environmentType", capLibrary.environments.map((item) => [item.id, item.label]));
const comfortOptions = staticOptions("custom", Object.entries(comfortLabels).map(([value, label]) => [value, label]));
const accessibilityOptions = staticOptions("custom", Object.entries(accessibilityLabels).map(([value, label]) => [value, label]));
const emptyCustomItem = { name: "", widthM: "", lengthM: "", heightM: "", quantity: "1", functionalRole: "primary", notes: "" };
const defaults: Record<string, Array<[string, number]>> = {
  "AMB-001": [["MOB-001", 1], ["MOB-006", 1]], "AMB-002": [["MOB-004", 1], ["MOB-006", 1], ["MOB-014", 1]],
  "AMB-003": [["MOB-008", 2]], "AMB-004": [["MOB-009", 1], ["MOB-010", 1], ["MOB-011", 1]],
  "AMB-005": [["MOB-012", 1], ["MOB-013", 6]], "AMB-006": [["EQP-001", 1], ["EQP-002", 1]],
  "AMB-007": [["EQP-001", 1], ["EQP-003", 1], ["EQP-004", 1]],
  "AMB-008": [["EQP-006", 1], ["EQP-007", 1], ["EQP-008", 1]],
  "AMB-009": [["EQP-009", 1], ["EQP-010", 1]], "AMB-010": [["MOB-014", 1], ["MOB-015", 1]],
  "AMB-011": [["EQP-011", 1], ["MOB-017", 1], ["MOB-012", 1]], "AMB-012": [["MOB-018", 1]],
  "AMB-013": [["EQP-012", 1]], "AMB-014": [],
};
const defaultParameters: Record<string, Record<string, number>> = {
  "AMB-005": { circulationSides: 4 }, "AMB-008": { referenceNetAreaM2: 6.5 },
  "AMB-009": { referenceNetAreaM2: 3.8 }, "AMB-011": { referenceNetAreaM2: 8 },
  "AMB-012": { referenceNetAreaM2: 2.5 }, "AMB-010": { people: 1 },
  "AMB-013": { doorClearanceM: 0.5, pedestrianClearanceM: 0.3, rearClearanceM: 0.5 },
  "AMB-014": { levelHeightM: 2.8, targetRiserM: 0.175, treadM: 0.28, stairWidthM: 0.9, flights: 2, landingLengthM: 0.9 },
};
const arrangementDefault: Record<string, string> = { "AMB-003": "two_faces", "AMB-006": "linear", "AMB-007": "linear" };
const itemCategories: Record<string, string[]> = {
  "AMB-001": ["Dormitório", "Armazenamento", "Trabalho"], "AMB-002": ["Dormitório", "Armazenamento", "Trabalho"],
  "AMB-003": ["Armazenamento", "Trabalho"], "AMB-004": ["Estar"], "AMB-005": ["Jantar"],
  "AMB-006": ["Sanitário"], "AMB-007": ["Sanitário"], "AMB-008": ["Cozinha"], "AMB-009": ["Serviço"],
  "AMB-010": ["Trabalho", "Armazenamento"], "AMB-011": ["Lazer", "Lazer/Cozinha", "Jantar"],
  "AMB-012": ["Circulação"], "AMB-013": ["Apoio"], "AMB-014": [],
};

function scenarioWithDefaults(study: ParametricEnvironmentStudy, environmentId: string) {
  const scenario = study.scenarios[0]!;
  return { ...study, environmentId, scenarios: [{ ...scenario, environmentId,
    selectedItems: (defaults[environmentId] ?? []).map(([id, quantity]) => createSelectedLibraryItem(id, id.startsWith("EQP") ? "equipment" : "furniture", quantity)),
    arrangement: arrangementDefault[environmentId] ?? "", customParameters: defaultParameters[environmentId] ?? {}, result: null }],
    selectedScenarioId: scenario.id };
}
function format(value: number) { return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function CapWorkspace({ projects, initialProjectId, initialNeedsItemId, onBack, onApply }: Props) {
  const initialProject = projects.find((item) => item.id === initialProjectId) ?? projects[0];
  const linkedNeed = initialProject?.needsProgram.find((item) => item.id === initialNeedsItemId);
  const matchedEnvironment = linkedNeed ? capLibrary.environments.find((environment) =>
    linkedNeed.environment && environment.label.toLocaleLowerCase("pt-BR").includes(linkedNeed.environment.toLocaleLowerCase("pt-BR"))) : undefined;
  const initialEnvironmentId = matchedEnvironment?.id ?? "AMB-001";
  const [tab, setTab] = useState<CapTab>(initialNeedsItemId ? "calculator" : "library");
  const [projectId, setProjectId] = useState(initialProject?.id ?? "");
  const [needsItemId, setNeedsItemId] = useState(initialNeedsItemId ?? "");
  const [study, setStudy] = useState<ParametricEnvironmentStudy | null>(() => initialProject
    ? scenarioWithDefaults(createParametricStudy(initialProject.id, initialEnvironmentId, initialNeedsItemId ?? null), initialEnvironmentId) : null);
  const [studies, setStudies] = useState<ParametricEnvironmentStudy[]>([]);
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState(initialEnvironmentId);
  const [notice, setNotice] = useState("");
  const [customItem, setCustomItem] = useState(emptyCustomItem);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [resultStale, setResultStale] = useState(false);
  const customNameRef = useRef<HTMLInputElement>(null); const customWidthRef = useRef<HTMLInputElement>(null); const customLengthRef = useRef<HTMLInputElement>(null);
  const environments = searchCapEnvironments(query, category);
  const selectedEnvironment = capLibrary.environments.find((item) => item.id === selectedEnvironmentId) ?? capLibrary.environments[0]!;
  const currentScenario = study?.scenarios.find((scenario) => scenario.id === study.selectedScenarioId) ?? study?.scenarios[0];
  const selectedProject = projects.find((project) => project.id === projectId);
  const references = getEnvironmentReferences(selectedEnvironmentId);
  const relevantItems = useMemo(() => {
    const presetIds = new Set((defaults[selectedEnvironmentId] ?? []).map(([id]) => id));
    const categories = new Set(itemCategories[selectedEnvironmentId] ?? []);
    return [...capLibrary.furniture, ...capLibrary.equipment].filter((item) => presetIds.has(item.id)
      || categories.has(item.category));
  }, [selectedEnvironmentId]);

  useEffect(() => { void (projectId ? repository.listByProject(projectId) : Promise.resolve([])).then(setStudies); }, [projectId]);
  function updateScenario(patch: Partial<ParametricScenario>) {
    if (currentScenario?.result && !("result" in patch)) setResultStale(true);
    setStudy((current) => current ? { ...current, scenarios: current.scenarios.map((scenario) =>
      scenario.id === current.selectedScenarioId ? { ...scenario, ...patch, updatedAt: new Date().toISOString() } : scenario) } : current);
  }
  function selectEnvironment(environmentId: string) {
    setSelectedEnvironmentId(environmentId);
    if (projectId) setStudy(scenarioWithDefaults(createParametricStudy(projectId, environmentId, needsItemId || null), environmentId));
  }
  function selectProject(nextProjectId: string) {
    setProjectId(nextProjectId); setNeedsItemId("");
    if (nextProjectId) setStudy(scenarioWithDefaults(createParametricStudy(nextProjectId, selectedEnvironmentId, null), selectedEnvironmentId));
  }
  function toggleItem(itemId: string, checked: boolean) {
    if (!currentScenario) return;
    const existing = currentScenario.selectedItems.find((item) => item.libraryItemId === itemId);
    const sourceType = itemId.startsWith("EQP") ? "equipment" : "furniture";
    updateScenario({ selectedItems: checked && !existing ? [...currentScenario.selectedItems, createSelectedLibraryItem(itemId, sourceType)]
      : !checked ? currentScenario.selectedItems.filter((item) => item.libraryItemId !== itemId) : currentScenario.selectedItems });
  }
  function setQuantity(itemId: string, quantity: number) {
    if (!currentScenario) return;
    updateScenario({ selectedItems: currentScenario.selectedItems.map((item) => item.libraryItemId === itemId
      ? { ...item, quantity: Math.max(1, Math.round(quantity)) } : item) });
  }
  function addCustomItem() {
    if (!currentScenario) return;
    const widthM = parsePtBrDecimal(customItem.widthM); const lengthM = parsePtBrDecimal(customItem.lengthM);
    const heightM = parsePtBrDecimal(customItem.heightM); const quantity = parsePtBrDecimal(customItem.quantity);
    if (!customItem.name.trim()) { setNotice("Dê um nome ao item personalizado."); customNameRef.current?.focus(); return; }
    if (!isValidPositiveDimension(widthM)) { setNotice(`Revise “${customItem.name}”: a largura deve ser maior que zero.`); customWidthRef.current?.focus(); return; }
    if (!isValidPositiveDimension(lengthM)) { setNotice(`Revise “${customItem.name}”: o comprimento deve ser maior que zero.`); customLengthRef.current?.focus(); return; }
    if (heightM !== null && !isValidPositiveDimension(heightM)) { setNotice(`Revise “${customItem.name}”: a altura, quando informada, deve ser maior que zero.`); return; }
    if (!quantity || !Number.isInteger(quantity) || quantity < 1) { setNotice(`Revise “${customItem.name}”: a quantidade deve ser um número inteiro positivo.`); return; }
    const created = createSelectedCustomItem(widthM, lengthM, heightM, customItem.name.trim(), quantity, customItem.functionalRole);
    created.notes = [customItem.name.trim(), customItem.notes.trim()].filter(Boolean).join(" — ");
    const selectedItems = editingCustomId
      ? currentScenario.selectedItems.map((item) => item.id === editingCustomId ? { ...created, id: editingCustomId } : item)
      : [...currentScenario.selectedItems, created];
    const nextScenario = { ...currentScenario, selectedItems, updatedAt: new Date().toISOString() };
    try {
      const calculated = calculateScenario(nextScenario);
      setStudy((current) => current ? { ...current, status: "calculated", updatedAt: calculated.updatedAt,
        scenarios: current.scenarios.map((scenario) => scenario.id === calculated.id ? calculated : scenario) } : current);
      setResultStale(false);
      setNotice(editingCustomId ? "Item personalizado atualizado e cenário recalculado." : "Item personalizado adicionado e cenário recalculado.");
    } catch {
      updateScenario({ selectedItems }); setResultStale(Boolean(currentScenario.result));
      setNotice("Item salvo, mas o cenário precisa de revisão antes do cálculo.");
    }
    setCustomItem(emptyCustomItem); setEditingCustomId(null);
  }
  function editCustomItem(item: ParametricScenario["selectedItems"][number]) {
    const [name, ...notes] = item.notes.split(" — "); setEditingCustomId(item.id);
    setCustomItem({ name: name || "Item personalizado", widthM: formatPtBrDecimal(item.customWidthM), lengthM: formatPtBrDecimal(item.customLengthM),
      heightM: formatPtBrDecimal(item.customHeightM), quantity: String(item.quantity), functionalRole: item.functionalRole, notes: notes.join(" — ") });
    customNameRef.current?.focus();
  }
  function duplicateCustomItem(item: ParametricScenario["selectedItems"][number]) {
    if (!currentScenario) return; const copy = { ...structuredClone(item), id: crypto.randomUUID(), notes: `${item.notes || "Item personalizado"} — cópia` };
    updateScenario({ selectedItems: [...currentScenario.selectedItems, copy] }); setNotice("Item personalizado duplicado. Recalcule o cenário.");
  }
  function calculate() {
    if (!study || !currentScenario) return;
    try {
      const calculated = calculateScenario(currentScenario); setStudy({ ...study, status: "calculated",
        scenarios: study.scenarios.map((scenario) => scenario.id === calculated.id ? calculated : scenario), updatedAt: calculated.updatedAt });
      setResultStale(false); setNotice("Cenário calculado. Revise premissas e alertas."); setTab("calculator");
    } catch { setNotice("Não foi possível calcular. Revise os campos destacados e tente novamente."); }
  }
  async function saveStudy() {
    if (!study) return;
    const existing = await repository.findById(study.id); const saved = existing ? await repository.update(study) : await repository.create(study);
    setStudy(saved); setStudies(await repository.listByProject(saved.projectId)); setNotice("Estudo salvo neste dispositivo.");
  }
  function addScenario() {
    if (!study || !currentScenario || study.scenarios.length >= 4) { setNotice("O comparador aceita até quatro cenários."); return; }
    const created = duplicateScenario(currentScenario); setStudy({ ...study, scenarios: [...study.scenarios, created], selectedScenarioId: created.id });
  }
  async function apply(areaType: ApplyAreaType) {
    if (!study || !currentScenario?.result) return;
    const areaM2 = areaType === "minimum" ? currentScenario.result.minimumNetAreaM2
      : areaType === "recommended" ? currentScenario.result.recommendedNetAreaM2 : currentScenario.result.estimatedGrossAreaM2;
    await onApply({ study: { ...study, status: "applied" }, scenario: currentScenario, areaType, areaM2 });
    setStudy({ ...study, status: "applied" }); setNotice(`Área de ${format(areaM2)} m² aplicada ao programa.`);
  }
  return <main className="cap-shell">
    <header className="cap-header"><div><button className="text-action" onClick={onBack}>← Voltar ao CMP</button>
      <span className="eyebrow">CAP-001 · Biblioteca v{capLibrary.metadata.version}</span><h1>Biblioteca e Calculadora Paramétrica</h1>
      <p>Pré-dimensionamento para apoio ao programa de necessidades. Não substitui layout, levantamento, legislação, normas, acessibilidade, compatibilização ou projeto arquitetônico.</p></div></header>
    <nav className="cap-tabs" aria-label="Navegação CAP-001">
      {(["library", "calculator", "studies", "compare", "sources"] as const).map((value) => <button key={value}
        aria-current={tab === value ? "page" : undefined} onClick={() => setTab(value)}>{value === "library" ? "Biblioteca" : value === "calculator" ? "Calculadora" : value === "studies" ? "Estudos do projeto" : value === "compare" ? "Comparador" : "Fontes e conflitos"}</button>)}
    </nav>
    {tab === "library" && <section className="cap-panel"><div className="cap-toolbar"><label>Buscar ambientes<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas</option>{[...new Set(capLibrary.environments.map((item) => item.category))].map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="cap-library-layout"><div className="cap-environment-grid">{environments.map((environment) => <button className={`cap-environment-card ${environment.id === selectedEnvironmentId ? "is-selected" : ""}`} key={environment.id} onClick={() => setSelectedEnvironmentId(environment.id)}>
        <span>{environment.id}</span><strong>{environment.label}</strong><small>{environment.category} · {capabilityLabels[environment.capability]}</small><p>{environment.description}</p></button>)}</div>
        <aside className="cap-detail"><span className={`cap-maturity cap-maturity--${selectedEnvironment.capability}`}>{capabilityLabels[selectedEnvironment.capability]}</span><h2>{selectedEnvironment.label}</h2>
          <p>{selectedEnvironment.description}</p>{selectedEnvironment.maturityNote && <p className="cap-warning">{selectedEnvironment.maturityNote}</p>}
          <h3>Composição de referência</h3><p>{references.composition ? `${references.composition.label}: ${format(references.composition.estimatedNetAreaM2)} m² líquidos de referência.` : "Sem composição."}</p>
          <h3>Itens relacionados</h3><ul>{relevantItems.map((item) => <li key={item.id}><strong>{item.label}</strong> — {format(item.widthM)} × {format(item.lengthM)} m · {item.sourceId} p.{item.page}{item.inferred ? " · inferido" : ""}</li>)}</ul>
          <button className="button button--primary" onClick={() => { selectEnvironment(selectedEnvironment.id); setTab("calculator"); }}>Usar na calculadora</button></aside></div></section>}
    {tab === "calculator" && <section className="cap-calculator"><div className="cap-config-panel"><h2>Configuração</h2>
      <label>Projeto<select value={projectId} onChange={(event) => selectProject(event.target.value)}><option value="">Selecione</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.internalName}</option>)}</select></label>
      <label>Item do programa<select value={needsItemId} onChange={(event) => { setNeedsItemId(event.target.value); setStudy((value) => value ? { ...value, needsProgramItemId: event.target.value || null } : value); }}><option value="">Sem vínculo</option>{selectedProject?.needsProgram.map((item) => <option key={item.id} value={item.id}>{item.environment || "Ambiente sem nome"}</option>)}</select></label>
      <CatalogCombobox label="Ambiente" catalogType="environmentType" value={selectedEnvironmentId} onChange={selectEnvironment} options={environmentOptions} allowCreate={false} />
      <span className={`cap-maturity cap-maturity--${selectedEnvironment.capability}`}>{capabilityLabels[selectedEnvironment.capability]}</span>
      {currentScenario && <><label>Nome do cenário<input value={currentScenario.name} onChange={(event) => updateScenario({ name: event.target.value })} /></label>
        <CatalogCombobox label="Conforto" catalogType="custom" value={currentScenario.comfortLevel} onChange={(comfortLevel) => updateScenario({ comfortLevel: comfortLevel as ParametricScenario["comfortLevel"] })} options={comfortOptions} allowCreate={false} />
        <CatalogCombobox label="Acessibilidade" catalogType="custom" value={currentScenario.accessibilityProfile} onChange={(accessibilityProfile) => updateScenario({ accessibilityProfile: accessibilityProfile as ParametricScenario["accessibilityProfile"] })} options={accessibilityOptions} allowCreate={false} />
        <label>Reserva geométrica (%)<input type="number" min="0" max="100" value={currentScenario.geometricReservePercentage} onChange={(event) => { const value = parsePtBrDecimal(event.target.value); if (value !== null) updateScenario({ geometricReservePercentage: Math.min(100, Math.max(0, value)) }); }} /></label>
        {(selectedEnvironmentId === "AMB-003" || selectedEnvironmentId === "AMB-006" || selectedEnvironmentId === "AMB-007") && <label>Arranjo<select value={currentScenario.arrangement} onChange={(event) => updateScenario({ arrangement: event.target.value })}><option value="one_face">Uma face</option><option value="two_faces">Duas faces</option><option value="l">Em L</option><option value="u">Em U</option><option value="linear">Linear</option><option value="lateral">Lateral</option></select></label>}
        <fieldset className="cap-items"><legend>Mobiliários e equipamentos</legend>{relevantItems.map((item) => { const selected = currentScenario.selectedItems.find((entry) => entry.libraryItemId === item.id); return <div key={item.id}><label><input type="checkbox" checked={Boolean(selected)} onChange={(event) => toggleItem(item.id, event.target.checked)} /> {item.label}</label>{selected && <input aria-label={`Quantidade de ${item.label}`} type="number" min="1" value={selected.quantity} onChange={(event) => setQuantity(item.id, Number(event.target.value))} />}</div>; })}</fieldset>
        <fieldset className="cap-custom-item"><legend>Item com dimensões personalizadas</legend>
          <label>Nome<input ref={customNameRef} value={customItem.name} onChange={(event) => setCustomItem((value) => ({ ...value, name: event.target.value }))} /></label>
          <label>Largura (m)<input ref={customWidthRef} inputMode="decimal" placeholder="0,60" value={customItem.widthM} onChange={(event) => setCustomItem((value) => ({ ...value, widthM: event.target.value }))} /></label>
          <label>Comprimento (m)<input ref={customLengthRef} inputMode="decimal" placeholder="1,60" value={customItem.lengthM} onChange={(event) => setCustomItem((value) => ({ ...value, lengthM: event.target.value }))} /></label>
          <label>Altura opcional (m)<input inputMode="decimal" value={customItem.heightM} onChange={(event) => setCustomItem((value) => ({ ...value, heightM: event.target.value }))} /></label>
          <label>Quantidade<input inputMode="numeric" value={customItem.quantity} onChange={(event) => setCustomItem((value) => ({ ...value, quantity: event.target.value }))} /></label>
          <label>Função<input value={customItem.functionalRole} onChange={(event) => setCustomItem((value) => ({ ...value, functionalRole: event.target.value }))} /></label>
          <label className="cap-custom-item__notes">Observações<input value={customItem.notes} onChange={(event) => setCustomItem((value) => ({ ...value, notes: event.target.value }))} /></label>
          <div className="cap-custom-item__actions"><button type="button" onClick={addCustomItem}>{editingCustomId ? "Salvar alterações" : "Adicionar item"}</button>{editingCustomId && <button type="button" onClick={() => { setEditingCustomId(null); setCustomItem(emptyCustomItem); }}>Cancelar</button>}</div>
          {currentScenario.selectedItems.filter((item) => item.sourceType === "custom").map((item) => { const pending = !item.customWidthM || !item.customLengthM; return <div className={`cap-custom-item__row ${pending ? "is-pending" : ""}`} key={item.id}><span><strong>{item.notes || "Item personalizado"}</strong><small>{pending ? "Pendente: informe largura e comprimento" : `${formatPtBrDecimal(item.customWidthM)} × ${formatPtBrDecimal(item.customLengthM)} m · qtd. ${item.quantity}`}</small></span><div><button type="button" onClick={() => editCustomItem(item)}>Editar</button><button type="button" onClick={() => duplicateCustomItem(item)}>Duplicar</button><button type="button" aria-label={`Remover ${item.notes}`} onClick={() => { updateScenario({ selectedItems: currentScenario.selectedItems.filter((candidate) => candidate.id !== item.id) }); setResultStale(Boolean(currentScenario.result)); }}>Remover</button></div></div>; })}</fieldset>
        {selectedEnvironmentId === "AMB-014" && <div className="cap-parameter-grid">{[["levelHeightM", "Desnível (m)"], ["targetRiserM", "Espelho pretendido (m)"], ["treadM", "Piso (m)"], ["stairWidthM", "Largura (m)"], ["flights", "Lances"], ["landingLengthM", "Patamar (m)"]].map(([key, label]) => <label key={key}>{label}<input type="number" step="0.01" value={currentScenario.customParameters[key] ?? ""} onChange={(event) => { const value = parsePtBrDecimal(event.target.value); if (value !== null) updateScenario({ customParameters: { ...currentScenario.customParameters, [key]: value } }); }} /></label>)}</div>}
        {resultStale && currentScenario.result && <p className="cap-stale-result" role="status">Resultado anterior: os dados mudaram. Recalcule para atualizar.</p>}
        <div className="cap-actions"><button className="button button--primary" onClick={calculate}>Calcular cenário</button><button className="button button--ghost" onClick={() => void saveStudy()}>Salvar estudo</button><button className="button button--ghost" onClick={addScenario}>Duplicar cenário</button></div></>}
    </div><CapResultPanel scenario={currentScenario} onApply={apply} /></section>}
    {tab === "studies" && <section className="cap-panel"><h2>Estudos do projeto</h2>{studies.length ? <div className="cap-study-list">{studies.map((item) => <article key={item.id}><div><strong>{item.name}</strong><p>{capLibrary.environments.find((environment) => environment.id === item.environmentId)?.label} · {item.scenarios.length} cenário(s) · {item.status}</p></div><button onClick={() => { setStudy(item); setSelectedEnvironmentId(item.environmentId); setTab("calculator"); }}>Abrir</button><button onClick={() => void repository.duplicate(item.id).then(async () => setStudies(await repository.listByProject(projectId)))}>Duplicar</button>{item.status === "archived" ? <button onClick={() => void repository.restore(item.id).then(async () => setStudies(await repository.listByProject(projectId)))}>Restaurar</button> : <button onClick={() => void repository.archive(item.id).then(async () => setStudies(await repository.listByProject(projectId)))}>Arquivar</button>}</article>)}</div> : <p>Nenhum estudo salvo para o projeto selecionado.</p>}</section>}
    {tab === "compare" && <CapScenarioComparator study={study} onPrefer={(scenarioId) => setStudy((current) => current ? { ...current, selectedScenarioId: scenarioId } : current)} />}
    {tab === "sources" && <section className="cap-panel"><h2>Fontes, conflitos e avisos</h2><div className="cap-source-grid"><div><h3>Fontes</h3>{capLibrary.sources.map((source) => <article key={source.id}><strong>{source.code}</strong><p>{source.title} · {source.authors.join(", ")} · {source.edition} · {source.year}</p></article>)}</div><div><h3>Conflitos preservados</h3>{capLibrary.conflicts.map((conflict) => <article key={conflict.id}><strong>{conflict.parameter}</strong><p>{conflict.sourceA}</p><p>{conflict.sourceB}</p><small>{conflict.description}</small></article>)}</div><div><h3>Avisos</h3>{capLibrary.warnings.map((warning) => <article key={warning.id}><strong>{warning.title}</strong><p>{warning.message}</p>{warning.normativeReferenceRequiresReview && <small>Referência técnica a verificar conforme norma vigente.</small>}</article>)}</div></div></section>}
    {notice && <div className="toast" role="status" aria-live="polite"><strong>{notice}</strong><button type="button" aria-label="Fechar aviso" onClick={() => setNotice("")}>Fechar</button></div>}
  </main>;
}
