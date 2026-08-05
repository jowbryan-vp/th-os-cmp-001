"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NeedsItem, ProjectMasterRecord } from "../../../domain/project-master-record";
import { ParametricEnvironmentStudy, ParametricScenario } from "../domain/cap-library-types";
import { getParametricStudyRepository } from "../repositories/parametric-study-repository";
import { capLibrary, getEnvironmentReferences, searchCapEnvironments } from "../services/cap-library-service";
import {
  calculateScenario, createParametricStudy, createSelectedCustomItem, createSelectedLibraryItem, duplicateScenario,
} from "../services/cap-scenario-service";
import { capabilityLabels } from "../utils/cap-labels";
import { CapResultPanel } from "./results/cap-result-panel";
import { CapProgramSummaryPanel } from "./results/cap-program-summary-panel";
import { CapScenarioComparator } from "./scenarios/cap-scenario-comparator";
import { formatPtBrDecimal, isValidPositiveDimension, parsePtBrDecimal } from "../../../utils/pt-br-decimal";
import { ActionMenu, Button, ConfirmDialog, EmptyState, Tabs, Toast } from "../../../design-system";
import { Archive, ArrowLeft, Calculator, Copy, Edit3, Plus, RotateCcw, Save, Trash2 } from "../../../design-system/icons";

type CapTab = "library" | "calculator" | "studies" | "compare" | "sources";
type ApplyAreaType = NonNullable<NeedsItem["appliedAreaType"]>;
export interface CapApplyPayload {
  study: ParametricEnvironmentStudy; scenario: ParametricScenario; areaType: ApplyAreaType; areaM2: number;
}
export interface CapSaveOptionsPayload {
  study: ParametricEnvironmentStudy; scenario: ParametricScenario; continueToNext?: boolean;
}
export interface CapSaveOptionsResult { savedNeedsItemId: string; }
export interface CapDeleteNeedsItemResult { deletedStudyIds: string[]; }
interface Props {
  projects: ProjectMasterRecord[]; initialProjectId?: string; initialNeedsItemId?: string;
  onBack: () => void; onApply: (payload: CapApplyPayload) => Promise<void>;
  onSaveOptions: (payload: CapSaveOptionsPayload) => Promise<CapSaveOptionsResult>;
  onDeleteNeedsItem: (projectId: string, needsItemId: string) => Promise<CapDeleteNeedsItemResult>;
}
const repository = getParametricStudyRepository();
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
  "AMB-015": [], "AMB-016": [], "AMB-017": [], "AMB-018": [], "AMB-019": [],
};
const defaultParameters: Record<string, Record<string, number>> = {
  "AMB-005": { circulationSides: 4 }, "AMB-008": { referenceNetAreaM2: 6.5 },
  "AMB-009": { referenceNetAreaM2: 3.8 }, "AMB-011": { referenceNetAreaM2: 8 },
  "AMB-012": { referenceNetAreaM2: 2.5 }, "AMB-010": { people: 1 },
  "AMB-013": { doorClearanceM: 0.5, pedestrianClearanceM: 0.3, rearClearanceM: 0.5 },
  "AMB-014": { levelHeightM: 2.8, targetRiserM: 0.175, treadM: 0.28, stairWidthM: 0.9, flights: 2, landingLengthM: 0.9 },
  "AMB-015": { poolWidthM: 3, poolLengthM: 5 }, "AMB-016": { referenceNetAreaM2: 20 },
  "AMB-017": { referenceNetAreaM2: 4 }, "AMB-018": { referenceNetAreaM2: 3 },
  "AMB-019": { referenceNetAreaM2: 20 },
};
const arrangementDefault: Record<string, string> = { "AMB-003": "two_faces", "AMB-006": "linear", "AMB-007": "linear" };
const itemCategories: Record<string, string[]> = {
  "AMB-001": ["Dormitório", "Armazenamento", "Trabalho"], "AMB-002": ["Dormitório", "Armazenamento", "Trabalho"],
  "AMB-003": ["Armazenamento", "Trabalho"], "AMB-004": ["Estar"], "AMB-005": ["Jantar"],
  "AMB-006": ["Sanitário"], "AMB-007": ["Sanitário"], "AMB-008": ["Cozinha"], "AMB-009": ["Serviço"],
  "AMB-010": ["Trabalho", "Armazenamento"], "AMB-011": ["Lazer", "Lazer/Cozinha", "Jantar"],
  "AMB-012": ["Circulação"], "AMB-013": ["Apoio"], "AMB-014": [],
  "AMB-015": ["Piscina"], "AMB-016": ["Deck e área externa"], "AMB-017": ["Casa de Máquinas"],
  "AMB-018": ["Armazenamento", "Serviço/Despensa"], "AMB-019": ["Deck e área externa"],
};
const comfortChoices: Array<{ value: ParametricScenario["comfortLevel"]; label: string; description: string }> = [
  { value: "compact", label: "Mínimo / compacto", description: "Folgas operacionais mínimas para reduzir a área." },
  { value: "comfortable", label: "Confortável / recomendado", description: "Equilíbrio entre área, circulação e uso cotidiano." },
  { value: "generous", label: "Generoso", description: "Folgas ampliadas e maior liberdade de circulação." },
];
const accessibilityChoices: Array<{ value: ParametricScenario["accessibilityProfile"]; label: string; description: string }> = [
  { value: "standard", label: "Padrão", description: "Sem reserva específica de acessibilidade." },
  { value: "wheelchair", label: "Acessível — referência NBR 9050", description: "Considera giro de 1,50 m; a conformidade completa deve ser verificada no projeto." },
  { value: "reduced_mobility", label: "Mobilidade reduzida", description: "Amplia circulações para apoio a pessoas com mobilidade reduzida." },
  { value: "elderly", label: "Pessoa idosa", description: "Amplia circulações como apoio preliminar ao uso por pessoa idosa." },
];

function scenarioWithDefaults(study: ParametricEnvironmentStudy, environmentId: string) {
  const scenario = study.scenarios[0]!;
  return { ...study, environmentId, scenarios: [{ ...scenario, environmentId,
    selectedItems: (defaults[environmentId] ?? []).map(([id, quantity]) => createSelectedLibraryItem(id, id.startsWith("EQP") ? "equipment" : "furniture", quantity)),
    arrangement: arrangementDefault[environmentId] ?? "", customParameters: defaultParameters[environmentId] ?? {},
    geometricReservePercentage: ["AMB-016", "AMB-019"].includes(environmentId) ? 0 : scenario.geometricReservePercentage, result: null }],
    selectedScenarioId: scenario.id };
}
function format(value: number) { return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function CapWorkspace({ projects, initialProjectId, initialNeedsItemId, onBack, onApply, onSaveOptions, onDeleteNeedsItem }: Props) {
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
  const [pendingDeleteNeed, setPendingDeleteNeed] = useState<string | null>(null);
  const [customItem, setCustomItem] = useState(emptyCustomItem);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [resultStale, setResultStale] = useState(false);
  const [openItemGroups, setOpenItemGroups] = useState<Set<string>>(() => new Set());
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
  const itemGroups = useMemo(() => {
    const groups = new Map<string, typeof relevantItems>();
    for (const item of relevantItems) {
      const groupLabel = item.group === "Área gourmet" && item.subgroup ? item.subgroup : item.group;
      groups.set(groupLabel, [...(groups.get(groupLabel) ?? []), item]);
    }
    return [...groups.entries()];
  }, [relevantItems]);

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
    const libraryItem = relevantItems.find((item) => item.id === itemId);
    if (libraryItem) setOpenItemGroups((current) => new Set(current).add(libraryItem.group));
    const withoutConflicts = checked && libraryItem?.selectionType === "unica"
      ? currentScenario.selectedItems.filter((selected) => {
        const candidate = selected.libraryItemId ? relevantItems.find((item) => item.id === selected.libraryItemId) : undefined;
        const candidateSet = candidate?.subgroup || candidate?.group;
        const selectedSet = libraryItem.subgroup || libraryItem.group;
        return candidateSet !== selectedSet || candidate?.selectionType !== "unica";
      }) : currentScenario.selectedItems;
    const selectedItems = checked && !existing ? [...withoutConflicts, createSelectedLibraryItem(itemId, sourceType)]
      : !checked ? currentScenario.selectedItems.filter((item) => item.libraryItemId !== itemId) : currentScenario.selectedItems;
    const pool = checked ? libraryItem?.poolParameters : null;
    updateScenario({ selectedItems, ...(pool ? { customParameters: { ...currentScenario.customParameters,
      poolWidthM: libraryItem!.widthM, poolLengthM: libraryItem!.lengthM,
      poolMinimumDepthM: pool.minimumDepthM ?? 0, poolMaximumDepthM: pool.maximumDepthM ?? 0,
      poolVolumeM3: pool.estimatedVolumeM3 ?? 0, circulationSides: pool.circulationSides ?? 4 },
      geometricReservePercentage: pool.structuralReservePercentage ?? currentScenario.geometricReservePercentage } : {}) });
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
  function calculateCurrent() {
    if (!study || !currentScenario) return;
    try {
      const calculated = calculateScenario(currentScenario); const calculatedStudy = { ...study, status: "calculated" as const,
        scenarios: study.scenarios.map((scenario) => scenario.id === calculated.id ? calculated : scenario), updatedAt: calculated.updatedAt };
      setStudy(calculatedStudy);
      setResultStale(false); setNotice("Cenário calculado. Revise premissas e alertas."); setTab("calculator");
      return { calculatedStudy, calculated };
    } catch { setNotice("Não foi possível calcular. Revise os campos destacados e tente novamente."); return; }
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
  function editNeedsItem(nextNeedsItemId: string) {
    const item = selectedProject?.needsProgram.find((candidate) => candidate.id === nextNeedsItemId); if (!item) return;
    const savedStudy = studies.find((candidate) => candidate.id === item.parametricStudyId)
      ?? studies.find((candidate) => candidate.needsProgramItemId === item.id);
    const environmentId = savedStudy?.environmentId ?? capLibrary.environments.find((environment) =>
      item.environment && environment.label.toLocaleLowerCase("pt-BR").includes(item.environment.toLocaleLowerCase("pt-BR")))?.id ?? "AMB-001";
    setNeedsItemId(item.id); setSelectedEnvironmentId(environmentId);
    setStudy(savedStudy ?? scenarioWithDefaults(createParametricStudy(projectId, environmentId, item.id), environmentId));
    setResultStale(false); setTab("calculator"); setNotice(`Editando ${item.environment || "ambiente"}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function selectNeedsItem(nextNeedsItemId: string) {
    if (nextNeedsItemId) { editNeedsItem(nextNeedsItemId); return; }
    setNeedsItemId("");
    setStudy(scenarioWithDefaults(createParametricStudy(projectId, selectedEnvironmentId, null), selectedEnvironmentId));
    setResultStale(false); setNotice("Novo ambiente: escolha as opções e registre quando terminar.");
  }
  async function deleteNeedsItem(nextNeedsItemId: string) {
    const item = selectedProject?.needsProgram.find((candidate) => candidate.id === nextNeedsItemId); if (!item) return;
    const label = item.environment || "este ambiente";
    const deleted = await onDeleteNeedsItem(projectId, item.id);
    setStudies((current) => current.filter((studyItem) => !deleted.deletedStudyIds.includes(studyItem.id)));
    if (needsItemId === item.id) {
      const remaining = selectedProject?.needsProgram.find((candidate) => candidate.id !== item.id);
      if (remaining) editNeedsItem(remaining.id);
      else { setNeedsItemId(""); setStudy((current) => current ? { ...current, needsProgramItemId: null } : current); }
    }
    setNotice(`${label} excluído. A recuperação exige um backup exportado anteriormente.`);
  }
  async function saveOptions() {
    if (!study || !currentScenario?.result) return;
    const saved = await onSaveOptions({ study, scenario: currentScenario, continueToNext: false });
    setNeedsItemId(saved.savedNeedsItemId);
    setStudy((current) => current ? { ...current, needsProgramItemId: saved.savedNeedsItemId } : current);
    setStudies(await repository.listByProject(projectId));
    setNotice("As três áreas foram registradas para escolha posterior.");
  }
  async function calculateAndContinue() {
    const output = calculateCurrent(); if (!output) return;
    await onSaveOptions({ study: output.calculatedStudy, scenario: output.calculated, continueToNext: true });
    setStudies(await repository.listByProject(projectId));
    const nextEnvironmentId = "AMB-001";
    setNeedsItemId(""); setSelectedEnvironmentId(nextEnvironmentId);
    setStudy(scenarioWithDefaults(createParametricStudy(projectId, nextEnvironmentId, null), nextEnvironmentId));
    setResultStale(false); setNotice("Ambiente registrado. Configure agora o próximo ambiente.");
  }
  return <main className="cap-shell">
    <header className="cap-header"><div><Button variant="tertiary" size="small" icon={ArrowLeft} className="text-action" onClick={onBack}>Voltar ao CMP</Button>
      <span className="eyebrow">CAP-001 · Biblioteca v{capLibrary.metadata.version}</span><h1>Biblioteca e Calculadora Paramétrica</h1>
      <p>Pré-dimensionamento para apoio ao programa de necessidades. Não substitui layout, levantamento, legislação, normas, acessibilidade, compatibilização ou projeto arquitetônico.</p></div></header>
    <Tabs ariaLabel="Navegação CAP-001" value={tab} onChange={(value) => setTab(value as CapTab)} items={[{ id: "library", label: "Biblioteca" }, { id: "calculator", label: "Calculadora" }, { id: "studies", label: "Estudos do projeto" }, { id: "compare", label: "Comparador" }, { id: "sources", label: "Fontes e conflitos" }]} />
    {tab === "library" && <section className="cap-panel"><div className="cap-toolbar"><label>Buscar ambientes<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas</option>{[...new Set(capLibrary.environments.map((item) => item.category))].map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="cap-library-layout"><div className="cap-environment-grid">{environments.map((environment) => <button className={`cap-environment-card ${environment.id === selectedEnvironmentId ? "is-selected" : ""}`} key={environment.id} onClick={() => setSelectedEnvironmentId(environment.id)}>
        <span>{environment.id}</span><strong>{environment.label}</strong><small>{environment.category} · {capabilityLabels[environment.capability]}</small><p>{environment.description}</p></button>)}</div>
        <aside className="cap-detail"><span className={`cap-maturity cap-maturity--${selectedEnvironment.capability}`}>{capabilityLabels[selectedEnvironment.capability]}</span><h2>{selectedEnvironment.label}</h2>
          <p>{selectedEnvironment.description}</p>{selectedEnvironment.maturityNote && <p className="cap-warning">{selectedEnvironment.maturityNote}</p>}
          <h3>Composição de referência</h3><p>{references.composition ? `${references.composition.label}: ${format(references.composition.estimatedNetAreaM2)} m² líquidos de referência.` : "Sem composição."}</p>
          <h3>Itens relacionados</h3><ul>{relevantItems.map((item) => <li key={item.id}><strong>{item.label}</strong> — {format(item.widthM)} × {format(item.lengthM)} m · {item.sourceId ? `${item.sourceId} p.${item.page}` : "fonte pendente de revisão"}{item.inferred ? " · inferido" : ""}</li>)}</ul>
          <Button variant="primary" icon={Calculator} onClick={() => { selectEnvironment(selectedEnvironment.id); setTab("calculator"); }}>Usar na calculadora</Button></aside></div></section>}
    {tab === "calculator" && <section className="cap-calculator"><div className="cap-config-panel"><h2>Monte este ambiente</h2><p className="cap-step-intro">Escolha as opções abaixo. Ao finalizar, registre as três áreas e avance diretamente para o próximo ambiente.</p>
      <label>Projeto<select value={projectId} onChange={(event) => selectProject(event.target.value)}><option value="">Selecione</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.internalName}</option>)}</select></label>
      <label>Ambiente que será calculado<select value={needsItemId} onChange={(event) => selectNeedsItem(event.target.value)}><option value="">+ Criar novo ambiente</option>{selectedProject?.needsProgram.map((item) => <option key={item.id} value={item.id}>Editar: {item.environment || "ambiente ainda não configurado"}</option>)}</select></label>
      <label>Ambiente<select value={selectedEnvironmentId} onChange={(event) => selectEnvironment(event.target.value)}>{capLibrary.environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.label}</option>)}</select></label>
      <span className={`cap-maturity cap-maturity--${selectedEnvironment.capability}`}>{capabilityLabels[selectedEnvironment.capability]}</span>
      {currentScenario && <><label>Nome do cenário<input value={currentScenario.name} onChange={(event) => updateScenario({ name: event.target.value })} /></label>
        <fieldset className="cap-choice-group"><legend>Conforto</legend>{comfortChoices.map((choice) => <label key={choice.value} className={currentScenario.comfortLevel === choice.value ? "is-selected" : ""}><input type="radio" name="comfort-level" value={choice.value} checked={currentScenario.comfortLevel === choice.value} onChange={() => updateScenario({ comfortLevel: choice.value })} /><span><strong>{choice.label}</strong><small>{choice.description}</small></span></label>)}</fieldset>
        <fieldset className="cap-choice-group"><legend>Acessibilidade</legend>{accessibilityChoices.map((choice) => <label key={choice.value} className={currentScenario.accessibilityProfile === choice.value ? "is-selected" : ""}><input type="radio" name="accessibility-profile" value={choice.value} checked={currentScenario.accessibilityProfile === choice.value} onChange={() => updateScenario({ accessibilityProfile: choice.value })} /><span><strong>{choice.label}</strong><small>{choice.description}</small></span></label>)}<p>A opção acessível é uma referência preliminar e não certifica atendimento integral à NBR 9050.</p></fieldset>
        <label>{selectedEnvironmentId === "AMB-015" ? "Reserva estrutural preliminar (%)" : selectedEnvironmentId === "AMB-016" ? "Reserva de bordas/ajustes (%)" : "Reserva geométrica para paredes/ajustes (%)"}<input type="number" min="0" max="100" value={currentScenario.geometricReservePercentage} onChange={(event) => { const value = parsePtBrDecimal(event.target.value); if (value !== null) updateScenario({ geometricReservePercentage: Math.min(100, Math.max(0, value)) }); }} /></label>
        {(selectedEnvironmentId === "AMB-003" || selectedEnvironmentId === "AMB-006" || selectedEnvironmentId === "AMB-007") && <label>Arranjo<select value={currentScenario.arrangement} onChange={(event) => updateScenario({ arrangement: event.target.value })}><option value="one_face">Uma face</option><option value="two_faces">Duas faces</option><option value="l">Em L</option><option value="u">Em U</option><option value="linear">Linear</option><option value="lateral">Lateral</option></select></label>}
        {selectedEnvironmentId === "AMB-015" && <><div className="cap-parameter-grid"><label>Largura do espelho d’água (m)<input type="number" step="0.1" min="0.1" value={currentScenario.customParameters.poolWidthM ?? ""} onChange={(event) => updateScenario({ customParameters: { ...currentScenario.customParameters, poolWidthM: Number(event.target.value) } })} /></label><label>Comprimento do espelho d’água (m)<input type="number" step="0.1" min="0.1" value={currentScenario.customParameters.poolLengthM ?? ""} onChange={(event) => updateScenario({ customParameters: { ...currentScenario.customParameters, poolLengthM: Number(event.target.value) } })} /></label></div><p className="cap-warning">Este ambiente calcula o espelho d’água e sua reserva estrutural preliminar. Para completar o conjunto, adicione também Deck / Solário e Casa de Máquinas como ambientes separados.</p></>}
        {["AMB-016", "AMB-017", "AMB-018", "AMB-019"].includes(selectedEnvironmentId) && <div className="cap-parameter-grid"><label>Área útil de referência (m²)<input type="number" step="0.1" min="0.1" value={currentScenario.customParameters.referenceNetAreaM2 ?? ""} onChange={(event) => updateScenario({ customParameters: { ...currentScenario.customParameters, referenceNetAreaM2: Number(event.target.value) } })} /></label></div>}
        <><fieldset className="cap-items cap-items--accordion"><legend>Mobiliários e equipamentos</legend>{itemGroups.map(([group, items], groupIndex) => { const selectedCount = items.filter((item) => currentScenario.selectedItems.some((entry) => entry.libraryItemId === item.id)).length; return <details key={`${selectedEnvironmentId}-${group}`} className="cap-item-group" open={groupIndex === 0 || selectedCount > 0 || openItemGroups.has(group)} onToggle={(event) => { const isOpen = event.currentTarget.open; setOpenItemGroups((current) => { const next = new Set(current); if (isOpen) next.add(group); else next.delete(group); return next; }); }}><summary><strong>{group}</strong><span>{selectedCount ? `${selectedCount} selecionado(s)` : "Escolher"}</span></summary><div className="cap-item-group__options">{items.map((item) => { const selected = currentScenario.selectedItems.find((entry) => entry.libraryItemId === item.id); return <div className={selected ? "cap-item-option is-selected" : "cap-item-option"} key={item.id}><label><input type="checkbox" checked={Boolean(selected)} onChange={(event) => toggleItem(item.id, event.target.checked)} /><span><strong>{item.label}</strong><small>{format(item.widthM)} × {format(item.lengthM)} m{item.peopleCapacity ? ` · ${item.peopleCapacity} pessoa(s)` : ""}{item.inferred ? " · referência preliminar" : ""}</small></span></label>{selected && item.selectionType !== "unica" && item.selectionType !== "parametrica" && <input aria-label={`Quantidade de ${item.label}`} type="number" min="1" value={selected.quantity} onChange={(event) => setQuantity(item.id, Number(event.target.value))} />}</div>; })}</div></details>; })}</fieldset>
        <fieldset className="cap-custom-item"><legend>Item com dimensões personalizadas</legend>
          <label>Nome<input ref={customNameRef} value={customItem.name} onChange={(event) => setCustomItem((value) => ({ ...value, name: event.target.value }))} /></label>
          <label>Largura (m)<input ref={customWidthRef} inputMode="decimal" placeholder="0,60" value={customItem.widthM} onChange={(event) => setCustomItem((value) => ({ ...value, widthM: event.target.value }))} /></label>
          <label>Comprimento (m)<input ref={customLengthRef} inputMode="decimal" placeholder="1,60" value={customItem.lengthM} onChange={(event) => setCustomItem((value) => ({ ...value, lengthM: event.target.value }))} /></label>
          <label>Altura opcional (m)<input inputMode="decimal" value={customItem.heightM} onChange={(event) => setCustomItem((value) => ({ ...value, heightM: event.target.value }))} /></label>
          <label>Quantidade<input inputMode="numeric" value={customItem.quantity} onChange={(event) => setCustomItem((value) => ({ ...value, quantity: event.target.value }))} /></label>
          <label>Função<input value={customItem.functionalRole} onChange={(event) => setCustomItem((value) => ({ ...value, functionalRole: event.target.value }))} /></label>
          <label className="cap-custom-item__notes">Observações<input value={customItem.notes} onChange={(event) => setCustomItem((value) => ({ ...value, notes: event.target.value }))} /></label>
          <div className="cap-custom-item__actions"><Button variant="secondary" size="small" icon={editingCustomId ? Save : Plus} onClick={addCustomItem}>{editingCustomId ? "Salvar alterações" : "Adicionar item"}</Button>{editingCustomId && <Button variant="tertiary" size="small" onClick={() => { setEditingCustomId(null); setCustomItem(emptyCustomItem); }}>Cancelar</Button>}</div>
          {currentScenario.selectedItems.filter((item) => item.sourceType === "custom").map((item) => { const pending = !item.customWidthM || !item.customLengthM; return <div className={`cap-custom-item__row ${pending ? "is-pending" : ""}`} key={item.id}><span><strong>{item.notes || "Item personalizado"}</strong><small>{pending ? "Pendente: informe largura e comprimento" : `${formatPtBrDecimal(item.customWidthM)} × ${formatPtBrDecimal(item.customLengthM)} m · qtd. ${item.quantity}`}</small></span><ActionMenu items={[{ label: "Editar", icon: Edit3, onSelect: () => editCustomItem(item) }, { label: "Duplicar", icon: Copy, onSelect: () => duplicateCustomItem(item) }, { label: "Remover", icon: Trash2, destructive: true, onSelect: () => { updateScenario({ selectedItems: currentScenario.selectedItems.filter((candidate) => candidate.id !== item.id) }); setResultStale(Boolean(currentScenario.result)); } }]} /></div>; })}</fieldset></>
        {selectedEnvironmentId === "AMB-014" && <div className="cap-parameter-grid">{[["levelHeightM", "Desnível (m)"], ["targetRiserM", "Espelho pretendido (m)"], ["treadM", "Piso (m)"], ["stairWidthM", "Largura (m)"], ["flights", "Lances"], ["landingLengthM", "Patamar (m)"]].map(([key, label]) => <label key={key}>{label}<input type="number" step="0.01" value={currentScenario.customParameters[key] ?? ""} onChange={(event) => { const value = parsePtBrDecimal(event.target.value); if (value !== null) updateScenario({ customParameters: { ...currentScenario.customParameters, [key]: value } }); }} /></label>)}</div>}
        {resultStale && currentScenario.result && <p className="cap-stale-result" role="status">Resultado anterior: os dados mudaram. Recalcule para atualizar.</p>}
        <div className="cap-actions"><Button variant="primary" icon={Calculator} onClick={calculateCurrent}>Calcular e revisar</Button><Button variant="success" icon={Calculator} disabled={!projectId} onClick={() => void calculateAndContinue()}>Calcular, registrar e próximo ambiente</Button><Button variant="secondary" icon={Save} onClick={() => void saveStudy()}>Salvar estudo</Button><Button variant="tertiary" icon={Copy} onClick={addScenario}>Duplicar cenário</Button></div></>}
    </div><CapResultPanel scenario={currentScenario} onApply={apply} onSaveOptions={saveOptions} canSaveOptions={Boolean(projectId)} />
      <CapProgramSummaryPanel project={selectedProject} currentNeedsItemId={needsItemId}
        currentEnvironmentLabel={selectedEnvironment.label} studies={studies}
        onEdit={editNeedsItem} onDelete={(itemId) => setPendingDeleteNeed(itemId)} /></section>}
    {tab === "studies" && <section className="cap-panel"><h2>Estudos do projeto</h2>{studies.length ? <div className="cap-study-list">{studies.map((item) => <article key={item.id}><div><strong>{item.name}</strong><p>{capLibrary.environments.find((environment) => environment.id === item.environmentId)?.label} · {item.scenarios.length} cenário(s) · {item.status}</p></div><Button variant="secondary" size="small" onClick={() => { setStudy(item); setSelectedEnvironmentId(item.environmentId); setTab("calculator"); }}>Abrir</Button><ActionMenu items={[{ label: "Duplicar", icon: Copy, onSelect: () => void repository.duplicate(item.id).then(async () => setStudies(await repository.listByProject(projectId))) }, item.status === "archived" ? { label: "Restaurar", icon: RotateCcw, onSelect: () => void repository.restore(item.id).then(async () => setStudies(await repository.listByProject(projectId))) } : { label: "Arquivar", icon: Archive, onSelect: () => void repository.archive(item.id).then(async () => setStudies(await repository.listByProject(projectId))) }]} /></article>)}</div> : <EmptyState title="Nenhum estudo salvo" description="Calcule e salve um ambiente para vê-lo aqui." action={{ children: "Abrir calculadora", icon: Calculator, onClick: () => setTab("calculator") }} />}</section>}
    {tab === "compare" && <CapScenarioComparator study={study} onPrefer={(scenarioId) => setStudy((current) => current ? { ...current, selectedScenarioId: scenarioId } : current)} />}
    {tab === "sources" && <section className="cap-panel"><h2>Fontes, conflitos e avisos</h2><div className="cap-source-grid"><div><h3>Fontes</h3>{capLibrary.sources.map((source) => <article key={source.id}><strong>{source.code}</strong><p>{source.title} · {source.authors.join(", ")} · {source.edition} · {source.year}</p></article>)}</div><div><h3>Conflitos preservados</h3>{capLibrary.conflicts.map((conflict) => <article key={conflict.id}><strong>{conflict.parameter}</strong><p>{conflict.sourceA}</p><p>{conflict.sourceB}</p><small>{conflict.description}</small></article>)}</div><div><h3>Avisos</h3>{capLibrary.warnings.map((warning) => <article key={warning.id}><strong>{warning.title}</strong><p>{warning.message}</p>{warning.normativeReferenceRequiresReview && <small>Referência técnica a verificar conforme norma vigente.</small>}</article>)}</div></div></section>}
    {notice && <Toast variant={notice.toLowerCase().includes("não foi possível") || notice.toLowerCase().includes("revise") ? "error" : "success"} title={notice} onClose={() => setNotice("")} />}
    <ConfirmDialog open={Boolean(pendingDeleteNeed)} title="Excluir ambiente e estudos CAP?" description={`Esta ação remove ${selectedProject?.needsProgram.find((item) => item.id === pendingDeleteNeed)?.environment || "o ambiente"} e seus estudos vinculados. Use um backup para recuperação.`} confirmLabel="Excluir ambiente" confirmVariant="destructive" onClose={() => setPendingDeleteNeed(null)} onConfirm={() => { if (pendingDeleteNeed) void deleteNeedsItem(pendingDeleteNeed); }} />
  </main>;
}
