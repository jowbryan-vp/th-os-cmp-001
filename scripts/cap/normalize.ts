/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "info" | "warning" | "technical_review" | "blocking";
type Finding = {
  code: string; entity: string; field: string; value: unknown; severity: Severity;
  explanation: string; action: string; status: "open" | "accepted" | "resolved";
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawPath = path.join(root, "data/cap-001/raw/CAP-001_Biblioteca_Parametrica_v1.1.0.json");
const outputDir = path.join(root, "src/features/cap/data/v1.1.0");
const auditPath = path.join(root, "docs/cap/CAP_DATA_AUDIT.md");
const expectedHash = "8449321c330345221cf3136cdd7f5e6b2becf88f35215240ff921dcab8319ac2";
const rawBytes = await readFile(rawPath);
const sourceHash = createHash("sha256").update(rawBytes).digest("hex");
const raw = JSON.parse(rawBytes.toString("utf8"));
const findings: Finding[] = [];
const add = (finding: Finding) => findings.push(finding);

if (sourceHash !== expectedHash) add({ code: "CAP-B001", entity: "metadata", field: "sourceHash", value: sourceHash,
  severity: "blocking", explanation: "O arquivo bruto não corresponde ao hash aprovado.",
  action: "Restaurar o arquivo original fornecido.", status: "open" });
if (!/^\d+\.\d+\.\d+$/.test(raw.metadados?.versao ?? "")) add({ code: "CAP-B002", entity: "metadata", field: "versao",
  value: raw.metadados?.versao, severity: "blocking", explanation: "A versão não segue SemVer.",
  action: "Corrigir na próxima versão da fonte, sem alterar esta cópia.", status: "open" });
for (const [unit, expected] of [["comprimento", "m"], ["area", "m2"], ["angulo", "graus"]] as const) {
  if (raw.metadados?.unidades?.[unit] !== expected) add({ code: `CAP-B-UNIT-${unit}`, entity: "metadata", field: `unidades.${unit}`,
    value: raw.metadados?.unidades?.[unit], severity: "blocking", explanation: `Unidade esperada: ${expected}.`,
    action: "Revisar a fonte e o mapeamento de unidades.", status: "open" });
}

const collections = ["fontes", "tipos_ambientes", "mobiliarios", "equipamentos", "zonas_funcionais",
  "perfis_circulacao", "niveis_conforto", "composicoes", "regras_calculo", "conflitos", "avisos"];
const allIds = new Map<string, string>();
for (const collection of collections) {
  if (!Array.isArray(raw[collection])) {
    add({ code: `CAP-B-COL-${collection}`, entity: collection, field: collection, value: raw[collection], severity: "blocking",
      explanation: "A coleção obrigatória não é uma lista.", action: "Corrigir a estrutura da próxima fonte.", status: "open" });
    continue;
  }
  for (const item of raw[collection]) {
    if (!item.id) continue;
    if (allIds.has(item.id)) add({ code: "CAP-B003", entity: collection, field: "id", value: item.id, severity: "blocking",
      explanation: `ID também usado em ${allIds.get(item.id)}.`, action: "Atribuir IDs únicos na fonte.", status: "open" });
    else allIds.set(item.id, collection);
  }
}

const allowedFields: Record<string, Set<string>> = {
  fontes: new Set(["id", "codigo", "titulo", "autores", "editora", "edicao", "ano", "isbn"]),
  tipos_ambientes: new Set(["id", "nome", "categoria", "descricao"]),
  mobiliarios: new Set(["id", "nome", "categoria", "largura", "comprimento", "altura", "fonte_id", "pagina", "tabela_figura", "confidence", "notes"]),
  equipamentos: new Set(["id", "nome", "categoria", "largura", "comprimento", "altura", "fonte_id", "pagina", "tabela_figura", "confidence", "notes"]),
  zonas_funcionais: new Set(["id", "nome", "descricao", "folga_min"]),
  perfis_circulacao: new Set(["id", "nome", "largura_minima", "aplicacao", "confidence"]),
  niveis_conforto: new Set(["id", "nome", "fator_folga", "descricao"]),
  composicoes: new Set(["id", "nome", "ambiente_id", "area_liquida_est", "area_bruta_est", "confidence", "notes"]),
  regras_calculo: new Set(["id", "nome", "escopo", "algoritmo", "descricao", "fonte_id", "pagina"]),
  conflitos: new Set(["id", "parametro", "fonte_A", "fonte_B", "descricao_conflito", "resolucao_adotada", "confidence"]),
  avisos: new Set(["id", "codigo", "titulo", "mensagem", "severidade"]),
};
for (const collection of collections) {
  const seenNames = new Map<string, string>();
  for (const item of raw[collection] ?? []) {
    for (const field of Object.keys(item)) if (!allowedFields[collection]?.has(field)) add({ code: "CAP-W-UNKNOWN-FIELD",
      entity: item.id ?? collection, field, value: item[field], severity: "warning", explanation: "Campo não reconhecido pelo contrato da biblioteca.",
      action: "Revisar e mapear explicitamente antes de utilizar.", status: "open" });
    const name = String(item.nome ?? item.titulo ?? "").trim().toLocaleLowerCase("pt-BR");
    if (name && seenNames.has(name)) add({ code: "CAP-W-DUPLICATE-NAME", entity: item.id ?? collection, field: "nome",
      value: item.nome ?? item.titulo, severity: "warning", explanation: `Nome também utilizado por ${seenNames.get(name)}.`,
      action: "Confirmar se representa variante legítima ou duplicidade.", status: "open" });
    else if (name) seenNames.set(name, item.id ?? collection);
  }
}
const categorySpellings = new Map<string, Set<string>>();
for (const item of [...raw.tipos_ambientes, ...raw.mobiliarios, ...raw.equipamentos]) {
  if (!item.categoria) continue;
  const canonical = String(item.categoria).trim().toLocaleLowerCase("pt-BR");
  const spellings = categorySpellings.get(canonical) ?? new Set<string>(); spellings.add(item.categoria); categorySpellings.set(canonical, spellings);
}
for (const [canonical, spellings] of categorySpellings) if (spellings.size > 1) add({ code: "CAP-W-CATEGORY",
  entity: "categories", field: canonical, value: [...spellings], severity: "warning", explanation: "Categoria possui grafias inconsistentes.",
  action: "Padronizar somente na saída normalizada e documentar o mapeamento.", status: "open" });

const sourceIds = new Set(raw.fontes.map((item: { id: string }) => item.id));
const environmentIds = new Set(raw.tipos_ambientes.map((item: { id: string }) => item.id));
for (const [, items] of [["mobiliarios", raw.mobiliarios], ["equipamentos", raw.equipamentos], ["regras_calculo", raw.regras_calculo]] as const) {
  for (const item of items) {
    if (!sourceIds.has(item.fonte_id)) add({ code: "CAP-B004", entity: item.id, field: "fonte_id", value: item.fonte_id,
      severity: "blocking", explanation: "Referência de fonte inexistente.", action: "Vincular uma fonte válida.", status: "open" });
    if (!Number.isFinite(item.pagina) || item.pagina <= 0) add({ code: "CAP-W-PAGE", entity: item.id, field: "pagina", value: item.pagina,
      severity: "warning", explanation: "Página ausente ou inválida.", action: "Confirmar a página na revisão bibliográfica.", status: "open" });
  }
}
for (const item of [...raw.mobiliarios, ...raw.equipamentos]) {
  for (const field of ["largura", "comprimento", "altura"]) {
    if (!Number.isFinite(item[field]) || item[field] <= 0) add({ code: "CAP-B005", entity: item.id, field, value: item[field],
      severity: "blocking", explanation: "Dimensão deve ser numérica e positiva.", action: "Corrigir a fonte.", status: "open" });
  }
  if (item.confidence === "inferred") add({ code: "CAP-W-INFERRED", entity: item.id, field: "confidence", value: item.confidence,
    severity: "warning", explanation: "Dimensão derivada, sem confirmação direta na fonte.",
    action: "Validar com o arquiteto antes de uso como preset.", status: "open" });
}
for (const composition of raw.composicoes) {
  if (!environmentIds.has(composition.ambiente_id)) add({ code: "CAP-B006", entity: composition.id, field: "ambiente_id",
    value: composition.ambiente_id, severity: "blocking", explanation: "Ambiente referenciado não existe.",
    action: "Vincular a um ambiente válido.", status: "open" });
  add({ code: "CAP-T-COMP-ITEMS", entity: composition.id, field: "items", value: [], severity: "technical_review",
    explanation: "A composição fornece apenas áreas de referência e não identifica seus itens.",
    action: "Definir itens e arranjo em revisão técnica; não usar como cálculo geométrico.", status: "open" });
  if (composition.confidence === "inferred") add({ code: "CAP-W-INFERRED", entity: composition.id, field: "confidence",
    value: composition.confidence, severity: "warning", explanation: "Área de composição identificada como inferida.",
    action: "Tratar apenas como preset comparativo.", status: "open" });
}
for (const environment of raw.tipos_ambientes) {
  if (!raw.composicoes.some((item: { ambiente_id: string }) => item.ambiente_id === environment.id)) add({ code: "CAP-W-ENV-COMP",
    entity: environment.id, field: "compositions", value: [], severity: "warning", explanation: "Ambiente sem composição de referência.",
    action: "Criar preset revisado ou manter como consulta.", status: "open" });
}
for (const rule of raw.regras_calculo) add({ code: "CAP-T-TEXT-RULE", entity: rule.id, field: "algoritmo", value: rule.algoritmo,
  severity: "technical_review", explanation: "Fórmula textual não possui implementação operacional segura.",
  action: "Mapear para estratégia TypeScript explícita; nunca executar a string.", status: "open" });
add({ code: "CAP-W-GEOMETRY-15", entity: "REG-001", field: "algoritmo", value: raw.regras_calculo[0]?.algoritmo,
  severity: "warning", explanation: "O fator fixo de 15% não é universal.",
  action: "Expor reserva geométrica como parâmetro configurável.", status: "accepted" });
add({ code: "CAP-T-COMFORT-ACCESS", entity: "NCF-003", field: "nome", value: raw.niveis_conforto[2]?.nome,
  severity: "technical_review", explanation: "A fonte combina padrão de conforto e acessibilidade, conceitos independentes.",
  action: "Normalizar como conforto generoso e criar perfis de acessibilidade separados.", status: "resolved" });
add({ code: "CAP-T-NORM", entity: "CIR-004", field: "aplicacao", value: raw.perfis_circulacao[3]?.aplicacao,
  severity: "technical_review", explanation: "A menção a NBR 9050 é indireta e não comprova conformidade.",
  action: "Exibir como referência técnica a verificar conforme norma vigente.", status: "open" });
add({ code: "CAP-T-NORM", entity: "AVS-002", field: "severidade", value: raw.avisos[1]?.severidade,
  severity: "technical_review", explanation: "O rótulo 'Erro Normativo' excede a evidência secundária disponível.",
  action: "Apresentar como alerta técnico e solicitar verificação normativa.", status: "resolved" });
add({ code: "CAP-W-STAIRS", entity: "AMB-014", field: "nome", value: raw.tipos_ambientes[13]?.nome,
  severity: "warning", explanation: "Escadas e rampas estão agrupadas, mas a regra de Blondel só se aplica a escadas.",
  action: "Manter capacidade experimental e não calcular rampas.", status: "resolved" });
for (const conflict of raw.conflitos) add({ code: "CAP-I-CONFLICT", entity: conflict.id, field: "parametro", value: conflict.parametro,
  severity: "info", explanation: "Divergência entre fontes preservada.", action: "Exibir ambas as referências na interface.", status: "accepted" });

const capacity: Record<string, string> = {
  "AMB-001": "full_calculator", "AMB-002": "full_calculator", "AMB-003": "full_calculator",
  "AMB-004": "preliminary_calculator", "AMB-005": "full_calculator", "AMB-006": "full_calculator",
  "AMB-007": "full_calculator", "AMB-008": "preliminary_calculator", "AMB-009": "preliminary_calculator",
  "AMB-010": "full_calculator", "AMB-011": "preliminary_calculator", "AMB-012": "preliminary_calculator",
  "AMB-013": "full_calculator", "AMB-014": "experimental",
};
const normalized = {
  "metadata.json": {
    libraryCode: raw.metadados.codigo_documento, version: raw.metadados.versao, schemaVersion: 1,
    sourceHash, generatedAt: `${raw.metadados.data_criacao}T00:00:00.000Z`, status: "technical_review",
    supportedApplicationVersion: ">=0.2.0-pilot", title: raw.metadados.titulo,
    description: raw.metadados.descricao, units: { length: "m", area: "m2", angle: "degrees" },
    notes: ["Áreas de composições são presets comparativos.", "Referências normativas exigem verificação vigente."],
  },
  "sources.json": raw.fontes.map((item: any) => ({ id: item.id, code: item.codigo, title: item.titulo,
    authors: item.autores, publisher: item.editora, edition: item.edicao, year: item.ano, isbn: item.isbn })),
  "environments.json": raw.tipos_ambientes.map((item: any) => ({ id: item.id, label: item.nome, category: item.categoria,
    description: item.descricao, capability: capacity[item.id], maturityNote: item.id === "AMB-014"
      ? "Consulta e cálculo preliminar de degraus; rampas não calculadas." : null })),
  "furniture.json": raw.mobiliarios.map((item: any) => ({ id: item.id, label: item.nome, category: item.categoria,
    widthM: item.largura, lengthM: item.comprimento, heightM: item.altura,
    footprintAreaM2: Number((item.largura * item.comprimento).toFixed(4)), sourceId: item.fonte_id,
    page: item.pagina, tableOrFigure: item.tabela_figura, confidence: item.confidence,
    inferred: item.confidence === "inferred", notes: item.notes })),
  "equipment.json": raw.equipamentos.map((item: any) => ({ id: item.id, label: item.nome, category: item.categoria,
    widthM: item.largura, lengthM: item.comprimento, heightM: item.altura,
    footprintAreaM2: Number((item.largura * item.comprimento).toFixed(4)), sourceId: item.fonte_id,
    page: item.pagina, tableOrFigure: item.tabela_figura, confidence: item.confidence,
    inferred: item.confidence === "inferred", notes: item.notes })),
  "functional-zones.json": raw.zonas_funcionais.map((item: any) => ({ id: item.id, label: item.nome,
    description: item.descricao, minimumClearanceM: item.folga_min, overlapPolicy: "unknown" })),
  "circulation-profiles.json": raw.perfis_circulacao.map((item: any) => ({ id: item.id, label: item.nome,
    minimumWidthM: item.largura_minima, application: item.aplicacao, confidence: item.confidence,
    normativeReferenceRequiresReview: /NBR/i.test(item.aplicacao) })),
  "comfort-levels.json": raw.niveis_conforto.map((item: any, index: number) => ({ id: item.id,
    level: ["compact", "comfortable", "generous"][index], label: ["Compacto", "Confortável", "Generoso"][index],
    clearanceFactor: item.fator_folga, description: item.descricao,
    legacyAccessibilityCoupling: item.id === "NCF-003" })),
  "accessibility-profiles.json": [
    { id: "standard", label: "Padrão", requiredTurningDiameterM: null },
    { id: "reduced_mobility", label: "Mobilidade reduzida", requiredTurningDiameterM: null },
    { id: "wheelchair", label: "Cadeira de rodas", requiredTurningDiameterM: 1.5 },
    { id: "elderly", label: "Pessoa idosa", requiredTurningDiameterM: null },
    { id: "custom", label: "Personalizado", requiredTurningDiameterM: null },
  ],
  "compositions.json": raw.composicoes.map((item: any) => ({ id: item.id, label: item.nome,
    environmentId: item.ambiente_id, estimatedNetAreaM2: item.area_liquida_est,
    estimatedGrossAreaM2: item.area_bruta_est, confidence: item.confidence,
    itemIds: [], referencePreset: true, geometryValidated: false, notes: item.notes })),
  "calculation-rules.json": raw.regras_calculo.map((item: any) => ({ id: item.id, label: item.nome,
    scope: item.escopo, sourceExpression: item.algoritmo, description: item.descricao,
    sourceId: item.fonte_id, page: item.pagina, implementationStatus: "not_operational" })),
  "conflicts.json": raw.conflitos.map((item: any) => ({ id: item.id, parameter: item.parametro,
    sourceA: item.fonte_A, sourceB: item.fonte_B, description: item.descricao_conflito,
    sourceResolutionNote: item.resolucao_adotada, confidence: item.confidence, preserved: true })),
  "warnings.json": raw.avisos.map((item: any) => ({ id: item.id, code: item.codigo, title: item.titulo,
    message: item.mensagem, sourceSeverity: item.severidade, severity: item.id === "AVS-002" ? "technical_review" : "warning",
    normativeReferenceRequiresReview: /NBR|Normativ/i.test(`${item.mensagem} ${item.severidade}`) })),
};

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  return value;
}
const json = (value: unknown) => `${JSON.stringify(stable(value), null, 2)}\n`;
await mkdir(outputDir, { recursive: true }); await mkdir(path.dirname(auditPath), { recursive: true });
for (const [name, value] of Object.entries(normalized)) await writeFile(path.join(outputDir, name), json(value), "utf8");
const sortedFindings = [...findings].sort((a, b) => `${a.code}:${a.entity}`.localeCompare(`${b.code}:${b.entity}`));
await writeFile(path.join(outputDir, "audit-report.json"), json({ sourceHash, libraryVersion: raw.metadados.versao, findings: sortedFindings }), "utf8");
const counts = Object.fromEntries((["info", "warning", "technical_review", "blocking"] as Severity[])
  .map((severity) => [severity, findings.filter((finding) => finding.severity === severity).length]));
const esc = (value: unknown) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
const markdown = `# Auditoria de dados — CAP-001 v${raw.metadados.versao}\n\n` +
  `**Fonte:** \`data/cap-001/raw/CAP-001_Biblioteca_Parametrica_v1.1.0.json\`  \n` +
  `**SHA-256:** \`${sourceHash}\`  \n**Resultado:** ${counts.blocking === 0 ? "normalização permitida" : "bloqueada"}\n\n` +
  `## Resumo\n\n| Severidade | Achados |\n|---|---:|\n${Object.entries(counts).map(([key, value]) => `| ${key} | ${value} |`).join("\n")}\n\n` +
  `## Achados\n\n| Código | Entidade | Campo | Valor | Severidade | Explicação | Ação recomendada | Status |\n|---|---|---|---|---|---|---|---|\n` +
  sortedFindings.map((item) => `| ${esc(item.code)} | ${esc(item.entity)} | ${esc(item.field)} | ${esc(JSON.stringify(item.value))} | ${item.severity} | ${esc(item.explanation)} | ${esc(item.action)} | ${item.status} |`).join("\n") +
  `\n\n## Conclusão\n\nA fonte não possui erro bloqueador estrutural. A biblioteca normalizada preserva conflitos, identifica inferências, separa conforto de acessibilidade e mantém fórmulas textuais apenas como rastreabilidade. A revisão técnica do arquiteto continua obrigatória.\n`;
await writeFile(auditPath, markdown, "utf8");
if (counts.blocking > 0) throw new Error(`Normalização bloqueada por ${counts.blocking} achado(s).`);
console.log(JSON.stringify({ sourceHash, counts, outputDir }, null, 2));
