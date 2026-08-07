"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Calculator, CheckCircle2, Copy, Plus, Save } from "../../../design-system/icons";
import { Badge, Button, EmptyState, Field as DsField, PageActionBar, Spinner, Tabs, Toast } from "../../../design-system";
import { ProjectMasterRecord, createId } from "../../../domain/project-master-record";
import { getParametricStudyRepository } from "../../cap/repositories/parametric-study-repository";
import {
  FeeCalculationStudy, FeeScenario, PaymentPlan, ServiceCatalogItem, StructureProfile,
} from "../domain/hon-types";
import {
  FeeScenarioRepository, FeeSnapshotRepository, FeeStudyRepository, PaymentPlanRepository,
  ServiceCatalogRepository, StructureProfileRepository,
} from "../repositories/hon-repositories";
import { calculateHourlyCost, createPaymentPlan } from "../services/hon-engine";
import {
  approveStudy, assessCapacity, calculateAndVersionStudy, createFeeStudy, createProposalPricingSnapshot, createScenario,
} from "../services/hon-study-service";
import { HonServiceCatalogPanel } from "./catalog/hon-service-catalog-panel";
import { domainErrorMessage, inputMoney, money, parseMoney } from "./hon-formatters";
import { Metric } from "./hon-metric";
import { Warnings } from "./hon-warnings";
import { HonResultPanel } from "./results/hon-result-panel";

const tabs = [
  ["overview", "Visão geral"], ["structure", "Estrutura do escritório"], ["services", "Serviços e horas"],
  ["complexity", "Complexidade"], ["risk", "Urgência e riscos"], ["bim", "BIM e revisões"],
  ["partners", "Parceiros"], ["travel", "Deslocamentos e visitas"], ["construction", "Obra e gerenciamento"],
  ["result", "Resultado"], ["scenarios", "Cenários"], ["payments", "Pagamentos"],
  ["history", "Histórico e snapshots"], ["settings", "Configurações"],
] as const;
type Tab = (typeof tabs)[number][0];
type NoticeVariant = "success" | "error" | "info";
type ResultState = "not_calculated" | "updated" | "stale";

// Mensagens de erro que o motor/domínio HON já produz em português, curadas e seguras para
// exibição direta ao usuário (guiam uma correção específica). Qualquer erro fora dessa lista
// — bug, falha de IndexedDB, schema inválido — é tratado como desconhecido por
// domainErrorMessage() e recebe uma mensagem genérica segura em vez do texto técnico bruto.
const CALCULATE_KNOWN_ERRORS = ["As horas faturáveis devem ser maiores que zero.", "O imposto deve estar entre 0% e 100%."] as const;
const APPROVE_KNOWN_ERRORS = ["Calcule o estudo antes de aprová-lo.", "Não é possível aprovar sem estimativa de horas.", "Snapshots aprovados são imutáveis; crie uma nova versão."] as const;

// Assinatura determinística, independente da ordem de inserção de chaves — usada apenas
// para comparar localmente o estudo atual com a última versão persistida/calculada.
function stableSignature(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSignature).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSignature(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
function computeSaveSignature(study: FeeCalculationStudy) {
  return stableSignature({ ...study, updatedAt: undefined });
}
const pick = <T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> =>
  Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>;

// Somente os campos efetivamente lidos por calculateHourlyCost/calculateFeeStudy
// (hon-engine.ts) entram na assinatura de "cálculo relevante" — confirmado campo a campo
// contra o motor. Ficam de fora: identificadores (id/code/catalogItemId), texto puramente
// descritivo (notes/name/service/city/responsibility/stage) e study.risks (o array inteiro
// não é lido pelo motor; só study.inputs.riskPercentage é). complexitySuggestedLevel e
// complexityJustification também ficam de fora: só decidem se um alerta aparece no resultado,
// não alteram nenhum valor numérico — "desatualizado" aqui é sobre o preço, não sobre o texto
// dos alertas. Se hon-engine.ts passar a ler um novo campo, esta lista precisa acompanhar.
const RELEVANT_INPUT_FIELDS = [
  "calculationDate", "complexityLevel", "urgencyLevel", "riskPercentage", "profitMarkup",
  "taxPercentage", "taxMode", "discountCents", "donationCents", "commercialPriceCents",
  "minimumContractCents", "directExpensesCents",
] as const;
const RELEVANT_SERVICE_FIELDS = ["included", "estimatedHours", "hourlyCostCents", "fixedCostCents"] as const;
const RELEVANT_PARTNER_FIELDS = ["includedInContract", "costCents", "urgencyCents", "managementPercentage"] as const;
const RELEVANT_TRAVEL_FIELDS = [
  "roundTripKm", "costPerKmCents", "travelHours", "technicalHours", "reportHours",
  "perDiemDays", "perDiemCents", "directExpensesCents", "calendarSurchargePercentage",
] as const;
const RELEVANT_REVISION_FIELDS = ["method", "stageValueCents", "percentage", "additionalHours", "fixedValueCents"] as const;
const RELEVANT_BIM_FIELDS = ["mode", "percentage", "affectedBaseCents", "additionalHours"] as const;
const RELEVANT_CONSTRUCTION_FIELDS = [
  "monitoringWeeks", "visitsPerWeek", "hoursPerVisit", "managementWeeklyHours", "managementWeeks", "dedicatedTeamCostCents",
] as const;

function computeCalcSignature(study: FeeCalculationStudy, profile: StructureProfile) {
  return stableSignature({
    inputs: pick(study.inputs, RELEVANT_INPUT_FIELDS),
    services: study.services.map((item) => pick(item, RELEVANT_SERVICE_FIELDS)),
    partners: study.partners.map((item) => pick(item, RELEVANT_PARTNER_FIELDS)),
    travel: study.travel.map((item) => pick(item, RELEVANT_TRAVEL_FIELDS)),
    revisions: study.revisions.map((item) => pick(item, RELEVANT_REVISION_FIELDS)),
    bim: pick(study.bim, RELEVANT_BIM_FIELDS),
    construction: pick(study.construction, RELEVANT_CONSTRUCTION_FIELDS),
    structureProfileId: study.structureProfileId, profile,
  });
}
function focusAndReveal(node: HTMLElement | null | undefined) {
  if (!node) return;
  node.focus();
  const rect = node.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const inView = rect.top >= 0 && rect.bottom <= viewportHeight;
  if (!inView) node.scrollIntoView({ block: "start", behavior: "smooth" });
}

export function HonWorkspace({ projects, initialProjectId, onBack }: { projects: ProjectMasterRecord[]; initialProjectId?: string; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [projectId, setProjectId] = useState(initialProjectId ?? projects[0]?.id ?? "");
  const [profiles, setProfiles] = useState<StructureProfile[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [studies, setStudies] = useState<FeeCalculationStudy[]>([]);
  const [study, setStudy] = useState<FeeCalculationStudy | null>(null);
  const [scenarios, setScenarios] = useState<FeeScenario[]>([]);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [notice, setNoticeState] = useState<{ text: string; variant: NoticeVariant } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [calcStatus, setCalcStatus] = useState<"idle" | "calculating">("idle");
  const studyRepo = useMemo(() => new FeeStudyRepository(), []);
  const profileRepo = useMemo(() => new StructureProfileRepository(), []);
  const catalogRepo = useMemo(() => new ServiceCatalogRepository(), []);
  const scenarioRepo = useMemo(() => new FeeScenarioRepository(), []);
  const snapshotRepo = useMemo(() => new FeeSnapshotRepository(), []);
  const paymentRepo = useMemo(() => new PaymentPlanRepository(), []);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const pricingFormRef = useRef<HTMLDivElement>(null);
  const justCalculatedRef = useRef(false);
  // Assinaturas da última versão salva/calculada: estado (não ref), pois precisam ser lidas
  // durante a renderização para derivar os badges de status — refs não podem ser lidas no render.
  const [lastSavedSignature, setLastSavedSignature] = useState<string | null>(null);
  const [lastCalculatedSignature, setLastCalculatedSignature] = useState<string | null>(null);

  const showNotice = (text: string, variant: NoticeVariant = "info") => setNoticeState({ text, variant });

  useEffect(() => { void (async () => {
    try {
      const loadedProfiles = await profileRepo.ensureDefaults(); const loadedCatalog = await catalogRepo.ensureDefaults();
      const loadedStudies = await studyRepo.list(); setProfiles(loadedProfiles); setCatalog(loadedCatalog); setStudies(loadedStudies);
      const selected = loadedStudies.find((item) => item.projectId === projectId) ?? null;
      setStudy(selected); if (selected) { setScenarios(await scenarioRepo.listByStudy(selected.id)); setSnapshotCount((await snapshotRepo.listByStudy(selected.id)).length); }
    } catch (reason) { showNotice(reason instanceof Error ? reason.message : "Falha ao abrir HON-001.", "error"); }
    finally { setLoading(false); }
  })(); }, [catalogRepo, profileRepo, projectId, scenarioRepo, snapshotRepo, studyRepo]);

  const profile = profiles.find((item) => item.id === study?.structureProfileId) ?? profiles[0];
  const selectedProject = projects.find((item) => item.id === projectId);
  const hourly = profile ? calculateHourlyCost(profile, study?.inputs.calculationDate) : null;
  const capacity = profile ? assessCapacity(profile, studies.filter((item) => item.status === "approved"), 1) : null;
  const mutate = (patch: Partial<FeeCalculationStudy>) => setStudy((current) => current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current);
  const inputs = (patch: Partial<FeeCalculationStudy["inputs"]>) => study && mutate({ inputs: { ...study.inputs, ...patch } });

  // Reseta a assinatura de "última versão salva/calculada" sempre que um estudo diferente é
  // aberto (troca de seleção, criação, reload) — sem herdar o status do estudo anterior.
  //
  // Ajuste de estado durante a renderização (padrão documentado pelo React para "resetar
  // estado quando uma prop/id muda": https://react.dev/learn/you-might-not-need-an-effect
  // #adjusting-some-state-when-a-prop-changes), em vez de useEffect ou useMemo:
  //
  // - useEffect rodaria DEPOIS do primeiro paint com o estudo novo, causando um flash visível
  //   de "alterações não salvas"/"resultado desatualizado" antes de corrigir, e o linter do
  //   React Compiler bloqueia setState incondicional dentro de efeito (react-hooks/set-state-in-effect).
  // - useMemo não serve aqui: o valor não é uma derivação pura do `study` atual — é "o que foi
  //   lembrado no último evento discreto" (salvar/calcular/trocar de estudo). Se fosse
  //   `useMemo(() => computeSaveSignature(study), [study])`, a assinatura "salva" recalcularia
  //   a cada tecla digitada (mutate() gera um novo objeto a cada edição) e seria sempre igual
  //   à atual — "dirty" nunca ficaria true.
  // - Não dá para resolver só nos handlers de mutate/saveStudy/calculate: esses já atualizam as
  //   assinaturas quando fazem sentido (saveStudy e calculate o fazem). O que falta é o reset ao
  //   TROCAR de estudo carregado, que acontece em 3 pontos fora desses handlers (seletor de
  //   estudo, criação de estudo, carga inicial); centralizar aqui evita duplicar a mesma lógica
  //   de reset em cada um deles.
  //
  // Segurança contra loop infinito: a condição do `if` compara `study?.id` com o id "lembrado"
  // na renderização anterior (`baselineStudyId`). A primeira ação dentro do `if` é justamente
  // igualar `baselineStudyId` a `study?.id` — ou seja, a MESMA mudança que tornou a condição
  // verdadeira já a torna falsa na re-renderização seguinte. Como nada dentro deste bloco altera
  // `study?.id`, a condição não pode voltar a ficar verdadeira sem um evento externo real (troca
  // de estudo) — converge em exatamente uma renderização extra a cada troca, nunca em loop.
  const [baselineStudyId, setBaselineStudyId] = useState<string | null>(null);
  if ((study?.id ?? null) !== baselineStudyId) {
    setBaselineStudyId(study?.id ?? null);
    if (!study) { setLastSavedSignature(null); setLastCalculatedSignature(null); }
    else {
      const activeProfile = profiles.find((item) => item.id === study.structureProfileId) ?? profiles[0];
      setLastSavedSignature(computeSaveSignature(study));
      setLastCalculatedSignature(study.results && activeProfile ? computeCalcSignature(study, activeProfile) : null);
    }
  }

  // Move o foco para o resumo executivo somente quando a troca para "result" foi
  // consequência direta de um cálculo bem-sucedido (não em navegação manual de aba).
  useEffect(() => {
    if (tab !== "result" || !justCalculatedRef.current) return;
    justCalculatedRef.current = false;
    focusAndReveal(resultHeadingRef.current);
  }, [tab]);

  const saveSignatureNow = study ? computeSaveSignature(study) : null;
  const calcSignatureNow = study && profile ? computeCalcSignature(study, profile) : null;
  const dirty = study ? saveSignatureNow !== lastSavedSignature : false;
  const saveLabel = !study ? null : saveStatus === "saving" ? "Salvando…" : saveStatus === "error" ? "Erro ao salvar" : dirty ? "Alterações não salvas" : "Salvo";
  const saveTone = saveStatus === "error" ? "error" : saveStatus === "saving" ? "info" : dirty ? "warning" : "success";
  const resultState: ResultState = !study?.results ? "not_calculated"
    : calcSignatureNow !== null && calcSignatureNow === lastCalculatedSignature ? "updated" : "stale";
  const resultLabel = resultState === "not_calculated" ? "Resultado não calculado" : resultState === "updated" ? "Resultado atualizado" : "Resultado desatualizado";
  const resultTone = resultState === "not_calculated" ? "neutral" : resultState === "updated" ? "success" : "warning";

  async function newStudy() {
    if (!selectedProject || !profiles.length) return;
    const capStudies = await getParametricStudyRepository().listByProject(selectedProject.id);
    const catalog = await catalogRepo.list();
    const created = createFeeStudy(selectedProject, capStudies, profiles[0], catalog, studies.filter((item) => item.projectId === selectedProject.id).length + 1);
    await studyRepo.save(created); setStudies((items) => [created, ...items]); setStudy(created); setScenarios([]); setSnapshotCount(0); showNotice("Estudo criado com cópia de trabalho CMP/CAP rastreável.", "success"); setTab("services");
  }
  async function saveStudy(next = study) {
    if (!next) return undefined;
    setSaveStatus("saving");
    try {
      const saved = await studyRepo.save(next);
      setStudy(saved); setStudies((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setLastSavedSignature(computeSaveSignature(saved));
      setSaveStatus("idle"); showNotice("Estudo salvo neste dispositivo.", "success");
      return saved;
    } catch (reason) {
      setSaveStatus("error");
      // Sem lista de mensagens conhecidas: uma falha aqui (Zod, IndexedDB) é sempre inesperada
      // do ponto de vista do usuário, então a mensagem é sempre genérica e segura.
      showNotice(domainErrorMessage(reason, [], "Não foi possível salvar o estudo neste dispositivo. Tente novamente."), "error");
      throw reason;
    }
  }
  async function calculate() {
    if (!study || !profile) { showNotice("Selecione um projeto e crie um estudo antes de calcular.", "error"); return; }
    setCalcStatus("calculating");
    let calculated: FeeCalculationStudy;
    try {
      calculated = calculateAndVersionStudy(study, profile);
    } catch (reason) {
      setCalcStatus("idle");
      const message = domainErrorMessage(reason, CALCULATE_KNOWN_ERRORS, "Não foi possível calcular os honorários com os dados atuais. Revise os parâmetros e tente novamente.");
      showNotice(message, "error");
      setTab(message === CALCULATE_KNOWN_ERRORS[0] ? "structure" : "result");
      return;
    }
    if (!calculated.results) {
      setCalcStatus("idle");
      showNotice("Não foi possível calcular os honorários com os dados atuais. Revise os parâmetros e tente novamente.", "error");
      return;
    }
    try {
      await saveStudy(calculated);
    } catch {
      setCalcStatus("idle");
      return; // saveStudy já exibiu o motivo do erro; o estudo em edição permanece intacto.
    }
    setLastCalculatedSignature(computeCalcSignature(calculated, profile));
    justCalculatedRef.current = true;
    setCalcStatus("idle");
    setTab("result");
    showNotice(`Honorários calculados. Valor final negociado: ${money(calculated.results.finalPrice)}.`, "success");
  }
  function adjustParameters() {
    const container = pricingFormRef.current;
    const firstField = container?.querySelector<HTMLElement>("input, select, textarea");
    focusAndReveal(firstField ?? container);
  }
  async function approve() {
    if (!study) return;
    try { const approved = approveStudy(study); await snapshotRepo.save(approved.snapshot); await saveStudy(approved.study); setSnapshotCount((count) => count + 1); showNotice("Snapshot imutável aprovado.", "success"); }
    catch (reason) { showNotice(domainErrorMessage(reason, APPROVE_KNOWN_ERRORS, "Não foi possível aprovar o estudo."), "error"); }
  }
  async function addScenario() {
    if (!study?.results) return;
    if (scenarios.length >= 4) { showNotice("O comparador exibe quatro cenários por estudo; remova ou use outro estudo.", "info"); return; }
    const scenario = createScenario(study, `Cenário ${scenarios.length + 1}`, study.paymentPlan?.name ?? "A definir");
    await scenarioRepo.save(scenario); setScenarios((items) => [...items, scenario]);
  }
  async function generatePlan(preset: PaymentPlan["preset"]) {
    if (!study?.results || !profile) return;
    const label = preset === "upfront" ? "Pagamento integral antecipado" : preset === "fifty_milestones" ? "50% + entregas" : "30% + etapas";
    const priced = preset === "upfront"
      ? calculateAndVersionStudy({ ...study, inputs: { ...study.inputs, discountCents: Math.round(study.results.commercialPrice * 0.05) } }, profile)
      : study;
    const plan = createPaymentPlan(priced.id, label, preset, priced.results!.finalPrice, new Date().toISOString().slice(0, 10));
    await paymentRepo.save(plan); const updated = { ...priced, paymentPlan: plan }; await saveStudy(updated);
  }
  async function duplicateProfile() {
    if (!profile) return; const duplicated = await profileRepo.duplicate(profile.id, `${profile.name} — personalizado`);
    setProfiles((items) => [...items, duplicated]); if (study) mutate({ structureProfileId: duplicated.id }); showNotice("Perfil duplicado para edição personalizada.", "success");
  }
  function download(name: string, content: string, type = "application/json") {
    const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
  }
  function exportInternal() { if (study) download(`${study.code.toLowerCase()}-memoria-interna.json`, JSON.stringify(study, null, 2)); }
  function exportCommercial() { if (study?.results) download(`${study.code.toLowerCase()}-resumo-cliente.json`, JSON.stringify(createProposalPricingSnapshot(study, scenarios[0]?.id ?? null), null, 2)); }
  function exportCsv() { if (study) download(`${study.code.toLowerCase()}-servicos.csv`, `servico;etapa;horas;incluido\n${study.services.map((item) => `"${item.name}";"${item.stage}";${String(item.estimatedHours).replace(".", ",")};${item.included ? "sim" : "nao"}`).join("\n")}`, "text/csv;charset=utf-8"); }

  if (loading) return <main className="hon-loading"><Spinner label="Carregando Calculadora de Honorários" /><span>Carregando Calculadora de Honorários…</span></main>;
  return <main className="hon-shell">
    <div className="hon-action-bar-sticky">
      <PageActionBar
        eyebrow="TH OS · HON-001 · v1.0.0"
        title="Calculadora de Honorários"
        breadcrumb={<Button variant="ghost" icon={ArrowLeft} onClick={onBack}>Voltar ao CMP-001</Button>}
        status={study ? <div className="hon-status-group"><Badge tone={saveTone}>{saveLabel}</Badge><Badge tone={resultTone}>{resultLabel}</Badge></div> : null}
        primaryAction={<Button icon={Calculator} loading={calcStatus === "calculating"} disabled={!study || !profile} onClick={() => void calculate()}>Calcular honorários</Button>}
        secondaryActions={<Button variant="secondary" icon={Save} loading={saveStatus === "saving"} disabled={!study} onClick={() => void saveStudy()}>Salvar</Button>}
      />
    </div>
    <p className="hon-lede">Formação de preço baseada no custo do serviço. Área é referência de esforço, nunca preço automático por m².</p>
    <Tabs ariaLabel="Etapas da calculadora" items={tabs.map(([id, label]) => ({ id, label }))} value={tab} onChange={(value) => setTab(value as Tab)} />
    {notice && <Toast variant={notice.variant} title={notice.text} onClose={() => setNoticeState(null)} />}
    <section className="hon-panel" role="tabpanel" aria-label={tabs.find(([id]) => id === tab)?.[1]} tabIndex={-1}>
      {tab === "overview" && <><PanelTitle title="Selecionar projeto e estudo" help="Os dados CMP/CAP são lidos para uma cópia de trabalho; o cadastro mestre não é alterado." />
        <div className="hon-form-grid"><Field label="Projeto CMP-001"><select value={projectId} onChange={(event) => { setProjectId(event.target.value); setStudy(null); }}><option value="">Selecione</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.internalName}</option>)}</select></Field>
          <Field label="Estudo HON-001"><select value={study?.id ?? ""} onChange={async (event) => { const selected = studies.find((item) => item.id === event.target.value) ?? null; setStudy(selected); setScenarios(selected ? await scenarioRepo.listByStudy(selected.id) : []); }}><option value="">Novo estudo</option>{studies.filter((item) => item.projectId === projectId).map((item) => <option key={item.id} value={item.id}>{item.code} · v{item.version} · {item.status}</option>)}</select></Field></div>
        {!study && <Button icon={Plus} disabled={!selectedProject} onClick={() => void newStudy()}>Criar estudo e importar escopo</Button>}
        {study && <div className="hon-summary"><Metric label="Projeto" value={study.projectSnapshot.projectCode} /><Metric label="Cidade" value={`${study.projectSnapshot.city}/${study.projectSnapshot.state}`} /><Metric label="Área CAP aplicada" value={`${study.projectSnapshot.areas.capApplied.toLocaleString("pt-BR")} m²`} /><Metric label="Status" value={study.status} /></div>}
        {study && <details><summary>Rastreabilidade CMP/CAP</summary><pre>{JSON.stringify(study.projectSnapshot, null, 2)}</pre></details>}</>}

      {tab === "structure" && profile && hourly && <><PanelTitle title="Estrutura do escritório" help="Custos são divididos somente pelas horas faturáveis. Lucro e imposto entram depois." />
        <div className="hon-form-grid"><Field label="Perfil"><select value={profile.id} onChange={(event) => mutate({ structureProfileId: event.target.value })}>{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Button variant="secondary" icon={Copy} onClick={() => void duplicateProfile()}>Duplicar perfil</Button></div>
        <div className="hon-summary"><Metric label="Horas disponíveis/mês" value={hourly.availableHoursMonthly.toFixed(2)} /><Metric label="Horas faturáveis/mês" value={hourly.billableHoursMonthly.toFixed(2)} /><Metric label="Não faturáveis/mês" value={hourly.nonBillableHoursMonthly.toFixed(2)} /><Metric label="Custo mensal completo" value={money(hourly.totalMonthlyCostCents)} /></div>
        <div className="hon-summary"><Metric label="Sem pró-labore" value={money(hourly.hourlyWithoutProLaboreCents)} /><Metric label="Com pró-labore" value={money(hourly.hourlyWithProLaboreCents)} /><Metric label="Com investimento" value={money(hourly.hourlyWithInvestmentCents)} /><Metric label="Sustentável completo" value={money(hourly.sustainableHourlyCostCents)} /></div>
        <div className="hon-table-wrap"><table><thead><tr><th>Custo</th><th>Periodicidade</th><th>Valor</th><th>Origem</th></tr></thead><tbody>{profile.costs.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.periodicity}</td><td>{money(item.amountCents)}</td><td>{item.origin}</td></tr>)}</tbody></table></div>
        <h3>Investimentos</h3><div className="hon-table-wrap"><table><thead><tr><th>Item</th><th>Valor</th><th>Recuperação</th><th>Revisão</th></tr></thead><tbody>{profile.investments.map((item) => <tr key={item.id}><td>{item.name}</td><td>{money(item.amountCents)}</td><td>{item.recoverySuspended ? "Suspensa" : `${item.recoveryMonths} meses`}</td><td>{item.recoverableDeposit ? "Caução recuperável" : item.possibleOverlapWith.length ? "Possível sobreposição" : "—"}</td></tr>)}</tbody></table></div>
        {hourly.warnings.length > 0 && <Warnings items={hourly.warnings} />}</>}

      {tab === "services" && study && <><PanelTitle title="Serviços e estimativa manual de horas" help="A estimativa assistida permanece identificada como sugestão; nenhuma hora foi inventada pelo sistema." />
        <div className="hon-table-wrap"><table><thead><tr><th>Inclui</th><th>Serviço</th><th>Etapa</th><th>Horas estimadas</th><th>Observações</th></tr></thead><tbody>{study.services.map((service) => <tr key={service.id}><td><input aria-label={`Incluir ${service.name}`} type="checkbox" checked={service.included} onChange={(event) => mutate({ services: study.services.map((item) => item.id === service.id ? { ...item, included: event.target.checked } : item) })} /></td><td>{service.name}</td><td>{service.stage}</td><td><input aria-label={`Horas de ${service.name}`} type="number" min="0" step="0.5" value={service.estimatedHours} onChange={(event) => mutate({ services: study.services.map((item) => item.id === service.id ? { ...item, estimatedHours: Number(event.target.value) } : item) })} /></td><td><input aria-label={`Observações de ${service.name}`} value={service.notes} onChange={(event) => mutate({ services: study.services.map((item) => item.id === service.id ? { ...item, notes: event.target.value } : item) })} /></td></tr>)}</tbody></table></div><Button variant="secondary" icon={Save} onClick={() => void saveStudy()}>Salvar horas</Button>
        <PanelTitle title="Catálogo de serviços" help="Consulte o catálogo completo do escritório para entender cada serviço antes de ajustar o escopo acima." />
        <HonServiceCatalogPanel catalog={catalog} study={study} />
      </>}

      {tab === "complexity" && study && <><PanelTitle title="Complexidade" help="O ajuste manual divergente da sugestão exige justificativa." /><div className="hon-form-grid"><Field label="Nível sugerido"><input readOnly value={study.inputs.complexitySuggestedLevel} /></Field><Field label="Pontuação"><input type="number" min="0" value={study.inputs.complexityScore} onChange={(e) => inputs({ complexityScore: Number(e.target.value) })} /></Field><Field label="Nível escolhido"><select value={study.inputs.complexityLevel} onChange={(e) => inputs({ complexityLevel: e.target.value as FeeCalculationStudy["inputs"]["complexityLevel"] })}>{[["very_simple", "Muito simples · 0,85"], ["simple", "Simples · 1,00"], ["medium", "Médio · 1,20"], ["complex", "Complexo · 1,45"], ["very_complex", "Muito complexo · 1,80"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Justificativa"><textarea value={study.inputs.complexityJustification} onChange={(e) => inputs({ complexityJustification: e.target.value })} /></Field></div><p className="hon-help">Avalie construção existente, levantamento, pavimentos, terreno, legislação, condomínio, ocupação, ambientes, disciplinas, detalhamento, decisores, prazo, BIM, risco e incerteza de escopo.</p></>}

      {tab === "risk" && study && <><PanelTitle title="Urgência e riscos" help="Urgência incide no trabalho interno; custo fixo do parceiro só muda quando ele informar adicional." /><div className="hon-form-grid"><Field label="Urgência"><select value={study.inputs.urgencyLevel} onChange={(e) => inputs({ urgencyLevel: e.target.value as FeeCalculationStudy["inputs"]["urgencyLevel"] })}>{[["normal", "Normal · 0%"], ["accelerated", "Acelerado · 15%"], ["urgent", "Urgente · 25%"], ["very_urgent", "Muito urgente · 40%"], ["emergency", "Emergencial · 60%"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Risco independente da complexidade (%)"><input type="number" min="0" value={study.inputs.riskPercentage} onChange={(e) => inputs({ riskPercentage: Number(e.target.value) })} /></Field></div><p className="hon-help">Registre escopo indefinido, documentação incompleta, obra iniciada, múltiplos decisores, aprovação pública, ocupação, responsabilidade ampliada e retrabalho provável.</p></>}

      {tab === "bim" && study && <><PanelTitle title="BIM e revisões" help="BIM como método interno não implica entrega nem responsabilidade contratual." /><div className="hon-form-grid"><Field label="Modo BIM"><select value={study.bim.mode} onChange={(e) => mutate({ bim: { ...study.bim, mode: e.target.value as FeeCalculationStudy["bim"]["mode"] } })}><option value="internal_method">Método interno · sem adicional</option><option value="basic_delivery">Entrega básica · 10–15%</option><option value="information_requirements">Requisitos de informação · 15–30%</option><option value="coordination">Coordenação BIM · serviço específico</option></select></Field><Field label="Adicional BIM (%)"><input type="number" min="0" value={study.bim.percentage} onChange={(e) => mutate({ bim: { ...study.bim, percentage: Number(e.target.value) } })} /></Field><Field label="Base afetada"><input value={inputMoney(study.bim.affectedBaseCents)} onChange={(e) => mutate({ bim: { ...study.bim, affectedBaseCents: parseMoney(e.target.value) } })} /></Field><Field label="Horas BIM adicionais"><input type="number" min="0" value={study.bim.additionalHours} onChange={(e) => mutate({ bim: { ...study.bim, additionalHours: Number(e.target.value) } })} /></Field></div><p className="hon-help">Presets de revisão: simples 10%, intermediária 20%, ampla 35%. Alteração de programa deve recalcular horas e etapas afetadas.</p><button onClick={() => mutate({ revisions: [...study.revisions, { id: createId("revision"), category: "simple", method: "stage_percentage", stageValueCents: study.results?.internalLaborCost ?? 0, percentage: 10, additionalHours: 0, fixedValueCents: 0, notes: "Revisão simples extra" }] })}>+ Revisão extra de 10%</button></>}

      {tab === "partners" && study && <><PanelTitle title="Parceiros" help="A gestão padrão é 15% e aparece separada do custo do parceiro." /><button onClick={() => mutate({ partners: [...study.partners, { id: createId("partner"), name: "", service: "", costCents: 0, managementPercentage: 15, urgencyCents: 0, responsibility: "", includedInContract: true, notes: "" }] })}>+ Parceiro</button><div className="hon-card-list">{study.partners.map((partner) => <article key={partner.id} className="hon-edit-card"><Field label="Parceiro"><input value={partner.name} onChange={(e) => mutate({ partners: study.partners.map((item) => item.id === partner.id ? { ...item, name: e.target.value } : item) })} /></Field><Field label="Serviço"><input value={partner.service} onChange={(e) => mutate({ partners: study.partners.map((item) => item.id === partner.id ? { ...item, service: e.target.value } : item) })} /></Field><Field label="Custo"><input value={inputMoney(partner.costCents)} onChange={(e) => mutate({ partners: study.partners.map((item) => item.id === partner.id ? { ...item, costCents: parseMoney(e.target.value) } : item) })} /></Field><Field label="Gestão (%)"><input type="number" min="0" value={partner.managementPercentage} onChange={(e) => mutate({ partners: study.partners.map((item) => item.id === partner.id ? { ...item, managementPercentage: Number(e.target.value) } : item) })} /></Field></article>)}</div></>}

      {tab === "travel" && study && <><PanelTitle title="Deslocamentos e visitas" help="R$ 200,00 é ajuda de custo diária, não diária técnica." /><button onClick={() => mutate({ travel: [...study.travel, { id: createId("travel"), city: "", roundTripKm: 0, costPerKmCents: 150, travelHours: 0, technicalHours: 2, reportHours: 1, perDiemDays: 0, perDiemCents: 20_000, directExpensesCents: 0, calendarSurchargePercentage: 0, notes: "" }] })}>+ Deslocamento/visita</button><div className="hon-card-list">{study.travel.map((travel) => <article key={travel.id} className="hon-edit-card"><Field label="Cidade"><input value={travel.city} onChange={(e) => mutate({ travel: study.travel.map((item) => item.id === travel.id ? { ...item, city: e.target.value } : item) })} /></Field><Field label="Km ida e volta"><input type="number" min="0" value={travel.roundTripKm} onChange={(e) => mutate({ travel: study.travel.map((item) => item.id === travel.id ? { ...item, roundTripKm: Number(e.target.value) } : item) })} /></Field><Field label="Custo/km"><input value={inputMoney(travel.costPerKmCents)} onChange={(e) => mutate({ travel: study.travel.map((item) => item.id === travel.id ? { ...item, costPerKmCents: parseMoney(e.target.value) } : item) })} /></Field><Field label="Horas de viagem"><input type="number" min="0" value={travel.travelHours} onChange={(e) => mutate({ travel: study.travel.map((item) => item.id === travel.id ? { ...item, travelHours: Number(e.target.value) } : item) })} /></Field><Field label="Horas técnicas"><input type="number" min="0" value={travel.technicalHours} onChange={(e) => mutate({ travel: study.travel.map((item) => item.id === travel.id ? { ...item, technicalHours: Number(e.target.value) } : item) })} /></Field><Field label="Ajuda de custo/dia"><input value={inputMoney(travel.perDiemCents)} onChange={(e) => mutate({ travel: study.travel.map((item) => item.id === travel.id ? { ...item, perDiemCents: parseMoney(e.target.value) } : item) })} /></Field></article>)}</div></>}

      {tab === "construction" && study && <><PanelTitle title="Acompanhamento e gerenciamento" help="Acompanhamento segue o cronograma; gerenciamento segue a carga semanal contratada." /><div className="hon-form-grid"><Field label="Semanas de acompanhamento"><input type="number" min="0" value={study.construction.monitoringWeeks} onChange={(e) => mutate({ construction: { ...study.construction, monitoringWeeks: Number(e.target.value) } })} /></Field><Field label="Visitas por semana"><input type="number" min="0" value={study.construction.visitsPerWeek} onChange={(e) => mutate({ construction: { ...study.construction, visitsPerWeek: Number(e.target.value) } })} /></Field><Field label="Horas por visita"><input type="number" min="0" value={study.construction.hoursPerVisit} onChange={(e) => mutate({ construction: { ...study.construction, hoursPerVisit: Number(e.target.value) } })} /></Field><Field label="Semanas de gerenciamento"><input type="number" min="0" value={study.construction.managementWeeks} onChange={(e) => mutate({ construction: { ...study.construction, managementWeeks: Number(e.target.value) } })} /></Field><Field label="Carga semanal de gerenciamento"><input type="number" min="0" value={study.construction.managementWeeklyHours} onChange={(e) => mutate({ construction: { ...study.construction, managementWeeklyHours: Number(e.target.value) } })} /></Field></div>{capacity && <div className="hon-summary"><Metric label="Capacidade mensal" value={`${capacity.monthlyCapacity.toFixed(1)} h`} /><Metric label="Comprometido" value={`${capacity.committedHours.toFixed(1)} h`} /><Metric label="Sobrecarga" value={`${capacity.overloadHours.toFixed(1)} h`} /><Metric label="Risco de prazo" value={capacity.deadlineRisk} /></div>}</>}

      {tab === "result" && study && <><PanelTitle title="Configuração comercial" help="Ajuste lucro, imposto e condições; o resumo, a composição e o escopo aparecem logo abaixo." />
        <div className="hon-form-grid" ref={pricingFormRef}><Field label="Lucro sobre custo (%)"><input type="number" min="0" value={study.inputs.profitMarkup} onChange={(e) => inputs({ profitMarkup: Number(e.target.value) })} /></Field><Field label="Imposto (%)"><input type="number" min="0" max="99" value={study.inputs.taxPercentage} onChange={(e) => inputs({ taxPercentage: Number(e.target.value) })} /></Field><Field label="Valor comercial manual"><input placeholder="vazio = recomendado" value={study.inputs.commercialPriceCents === null ? "" : inputMoney(study.inputs.commercialPriceCents)} onChange={(e) => inputs({ commercialPriceCents: e.target.value ? parseMoney(e.target.value) : null })} /></Field><Field label="Desconto"><input value={inputMoney(study.inputs.discountCents)} onChange={(e) => inputs({ discountCents: parseMoney(e.target.value) })} /></Field><Field label="Doação"><input value={inputMoney(study.inputs.donationCents)} onChange={(e) => inputs({ donationCents: parseMoney(e.target.value) })} /></Field></div>
        <HonResultPanel study={study} resultHeadingRef={resultHeadingRef}
          onAdjustParameters={adjustParameters} onGoToServices={() => setTab("services")} onGoToScenarios={() => setTab("scenarios")}
          onGoToPayments={() => setTab("payments")} onExportInternal={exportInternal} onExportCommercial={exportCommercial} onExportCsv={exportCsv} />
      </>}

      {tab === "scenarios" && study && <><PanelTitle title="Comparador de cenários" help="Compare até quatro combinações sem substituir o cálculo técnico por média simples." /><Button variant="secondary" icon={Plus} disabled={!study.results || scenarios.length >= 4} onClick={() => void addScenario()}>Salvar cenário atual</Button>{scenarios.length > 0 && <div className="hon-scenario-grid">{scenarios.map((scenario) => <article key={scenario.id}><h3>{scenario.name}</h3><strong>{money(scenario.result.finalPrice)}</strong><p>{scenario.complexity} · {scenario.urgency}</p><small>{scenario.paymentCondition}</small></article>)}</div>}</>}

      {tab === "payments" && study && <><PanelTitle title="Cronograma de pagamentos" help="A soma é validada em percentual e centavos, inclusive o arredondamento da última parcela." /><div className="hon-actions"><button disabled={!study.results} onClick={() => void generatePlan("upfront")}>100% antecipado</button><button disabled={!study.results} onClick={() => void generatePlan("thirty_installments")}>30% + etapas</button><button disabled={!study.results} onClick={() => void generatePlan("fifty_milestones")}>50% + entregas</button></div>{study.paymentPlan && <><Warnings items={study.paymentPlan.warnings} /><div className="hon-table-wrap"><table><thead><tr><th>Parcela</th><th>Percentual</th><th>Valor</th><th>Vencimento</th><th>Marco</th></tr></thead><tbody>{study.paymentPlan.installments.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.percentage}%</td><td>{money(item.amountCents)}</td><td>{item.dueDate || "No marco"}</td><td>{item.milestone}</td></tr>)}</tbody></table></div></>}</>}

      {tab === "history" && study && <><PanelTitle title="Histórico e snapshots" help="Cálculos aprovados são imutáveis; alterações futuras exigem nova versão." /><div className="hon-summary"><Metric label="Versão do estudo" value={String(study.version)} /><Metric label="Status" value={study.status} /><Metric label="Snapshots" value={String(snapshotCount)} /><Metric label="Atualizado" value={new Date(study.updatedAt).toLocaleString("pt-BR")} /></div><Button icon={CheckCircle2} disabled={!study.results || study.status === "approved"} onClick={() => void approve()}>Aprovar snapshot imutável</Button></>}

      {tab === "settings" && study && <><PanelTitle title="Configurações e referências" help="Sem tabela técnica formal importada, a referência CAU permanece uma entrada manual identificada pelo arquiteto." /><div className="hon-form-grid"><Field label="Método principal"><select value={study.calculationMethod} onChange={(e) => mutate({ calculationMethod: e.target.value as FeeCalculationStudy["calculationMethod"] })}><option value="service_cost">Custo do serviço</option><option value="cau_reference">Referência CAU/custo da obra</option><option value="commercial_reference">Referência comercial</option></select></Field><Field label="Custo estimado da obra"><input value={inputMoney(study.inputs.constructionCostReferenceCents ?? 0)} onChange={(e) => inputs({ constructionCostReferenceCents: parseMoney(e.target.value) })} /></Field><Field label="Percentual comparativo informado"><input type="number" min="0" value={study.inputs.cauReferencePercentage ?? ""} onChange={(e) => inputs({ cauReferencePercentage: e.target.value ? Number(e.target.value) : null })} /></Field><Field label="Fonte e versão"><input value={study.inputs.cauReferenceSource} onChange={(e) => inputs({ cauReferenceSource: e.target.value })} /></Field><Field label="Área de referência (não define preço)"><input type="number" min="0" value={study.inputs.areaReferenceM2 ?? ""} onChange={(e) => inputs({ areaReferenceM2: e.target.value ? Number(e.target.value) : null })} /></Field><Field label="Notas comerciais"><textarea value={study.inputs.commercialReferenceNotes} onChange={(e) => inputs({ commercialReferenceNotes: e.target.value })} /></Field></div><Button variant="secondary" icon={Save} onClick={() => void saveStudy()}>Salvar configurações</Button></>}

      {!study && tab !== "overview" && <EmptyState title="Crie ou selecione um estudo" description="Comece na Visão geral para vincular um projeto CMP-001." action={{ children: "Ir para Visão geral", onClick: () => setTab("overview") }} />}
    </section>
  </main>;
}

function PanelTitle({ title, help }: { title: string; help: string }) { return <div className="hon-panel-title"><div><h2>{title}</h2><p>{help}</p></div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <DsField label={label} className="hon-field">{children}</DsField>; }
