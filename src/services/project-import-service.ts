import { APPLICATION_ID, PROJECT_SCHEMA_VERSION, ProjectMasterRecord, createHistoryEvent, createId } from "../domain/project-master-record";
import { migrateProject } from "../domain/project-migrations";
import { backupEnvelopeSchema, importEnvelopeSchema } from "../domain/project-schemas";
import { parametricEnvironmentStudySchema } from "../features/cap/domain/cap-library-schema";
import { ParametricEnvironmentStudy } from "../features/cap/domain/cap-library-types";
import { capLibrary } from "../features/cap/services/cap-library-service";
import { CatalogOption, catalogOptionSchema, normalizeCatalogValue } from "../features/catalogs/domain/reference-catalog";
import { HON_SCHEMA_VERSION } from "../features/hon/domain/hon-types";
import { HonBackupData, parseHonBackupData } from "../features/hon/repositories/hon-repositories";

export interface ExportEnvelope {
  schemaVersion: number; exportedAt: string; application: typeof APPLICATION_ID;
  project: ProjectMasterRecord; parametricStudies: ParametricEnvironmentStudy[];
}
export interface ConsolidatedBackupEnvelope {
  kind: "consolidated-backup"; backupSchemaVersion: 4; honSchemaVersion: 1 | 2 | 3 | 4; schemaVersion: number; exportedAt: string;
  application: typeof APPLICATION_ID; projectRecords: ProjectMasterRecord[];
  parametricStudies: ParametricEnvironmentStudy[];
  referenceCatalogOptions: CatalogOption[];
  capLibraryReferences: Array<{ libraryCode: "CAP-001"; version: string; sourceHash: string }>;
  feeStudies: HonBackupData["feeStudies"]; feeScenarios: HonBackupData["feeScenarios"];
  structureProfiles: HonBackupData["structureProfiles"]; serviceCatalog: HonBackupData["serviceCatalog"];
  feeSnapshots: HonBackupData["feeSnapshots"]; paymentPlans: HonBackupData["paymentPlans"];
  feeCalibrationRecords: HonBackupData["feeCalibrationRecords"]; proposalDrafts: HonBackupData["proposalDrafts"];
}
export type ImportConflict = "none" | "id" | "code" | "both";
export function exportProject(project: ProjectMasterRecord, studies: ParametricEnvironmentStudy[] = []): ExportEnvelope {
  return {
    schemaVersion: project.schemaVersion, exportedAt: new Date().toISOString(),
    application: APPLICATION_ID,
    project: { ...project, history: [...project.history, createHistoryEvent("exported", "Cadastro exportado em JSON.")] },
    parametricStudies: studies.filter((study) => study.projectId === project.id),
  };
}
const emptyHonBackup = (): HonBackupData => ({ feeStudies: [], feeScenarios: [], structureProfiles: [], serviceCatalog: [], feeSnapshots: [], paymentPlans: [], feeCalibrationRecords: [], proposalDrafts: [] });
export function exportConsolidatedBackup(projects: ProjectMasterRecord[], studies: ParametricEnvironmentStudy[] = [], catalogs: CatalogOption[] = [], hon: HonBackupData = emptyHonBackup()): ConsolidatedBackupEnvelope {
  return {
    kind: "consolidated-backup", backupSchemaVersion: 4, honSchemaVersion: HON_SCHEMA_VERSION, schemaVersion: PROJECT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(), application: APPLICATION_ID,
    projectRecords: projects.map((project) => ({
      ...project,
      history: [...project.history, createHistoryEvent("exported", "Incluído em backup consolidado.")],
    })),
    parametricStudies: studies,
    referenceCatalogOptions: catalogs,
    capLibraryReferences: [{ libraryCode: "CAP-001", version: capLibrary.metadata.version, sourceHash: capLibrary.metadata.sourceHash }],
    ...hon,
  };
}
export function parseConsolidatedBackup(input: unknown): { projects: ProjectMasterRecord[]; studies: ParametricEnvironmentStudy[]; catalogs: CatalogOption[]; hon: HonBackupData } {
  const envelope = backupEnvelopeSchema.parse(input);
  if (envelope.schemaVersion > PROJECT_SCHEMA_VERSION) {
    throw new Error("O backup foi criado por uma versão futura do CMP.");
  }
  const legacy = "projects" in envelope;
  const projects = (legacy ? envelope.projects : envelope.projectRecords).map(migrateProject);
  const studies = legacy ? [] : parametricEnvironmentStudySchema.array().parse(envelope.parametricStudies);
  const catalogs = !legacy && (envelope.backupSchemaVersion === 3 || envelope.backupSchemaVersion === 4)
    ? catalogOptionSchema.array().parse(envelope.referenceCatalogOptions) : [];
  const ids = new Set<string>(); const codes = new Set<string>();
  for (const project of projects) {
    if (ids.has(project.id) || codes.has(project.code)) {
      throw new Error("O backup contém projetos com ID ou código duplicado.");
    }
    ids.add(project.id); codes.add(project.code);
  }
  const projectIds = new Set(projects.map((project) => project.id));
  if (studies.some((study) => !projectIds.has(study.projectId))) throw new Error("O backup contém estudo sem projeto correspondente.");
  if (!legacy) {
    const references = new Set(envelope.capLibraryReferences.map((reference) => `${reference.libraryCode}:${reference.version}:${reference.sourceHash}`));
    for (const study of studies) {
      if (!references.has(`${study.libraryCode}:${study.libraryVersion}:${study.libraryHash}`)) {
        throw new Error("O backup contém estudo sem referência de biblioteca compatível.");
      }
    }
  }
  const catalogKeys = new Set<string>();
  for (const option of catalogs) {
    const key = `${option.catalogType}:${option.projectId ?? "global"}:${normalizeCatalogValue(option.value)}`;
    if (catalogKeys.has(key)) throw new Error("O backup contém opções de catálogo duplicadas.");
    catalogKeys.add(key);
  }
  const catalogIds = new Set(catalogs.map((option) => option.id));
  if (catalogs.some((option) => option.parentId && !catalogIds.has(option.parentId))) throw new Error("O backup contém cidade sem estado correspondente.");
  const hon = !legacy && envelope.backupSchemaVersion === 4
    ? parseHonBackupData({ feeStudies: envelope.feeStudies, feeScenarios: envelope.feeScenarios, structureProfiles: envelope.structureProfiles, serviceCatalog: envelope.serviceCatalog, feeSnapshots: envelope.feeSnapshots, paymentPlans: envelope.paymentPlans, feeCalibrationRecords: envelope.feeCalibrationRecords, proposalDrafts: envelope.proposalDrafts }, projectIds)
    : emptyHonBackup();
  return { projects, studies, catalogs, hon };
}
export function parseProjectImport(input: unknown) {
  return parseProjectImportBundle(input).project;
}
export function parseProjectImportBundle(input: unknown): { project: ProjectMasterRecord; studies: ParametricEnvironmentStudy[] } {
  const envelope = importEnvelopeSchema.safeParse(input);
  if (envelope.success && envelope.data.schemaVersion > PROJECT_SCHEMA_VERSION) {
    throw new Error("O arquivo foi criado por uma versão futura do CMP.");
  }
  const project = migrateProject(envelope.success ? envelope.data.project : input);
  const studies = envelope.success ? envelope.data.parametricStudies : [];
  if (studies.some((study) => study.projectId !== project.id)) throw new Error("O arquivo contém estudo sem vínculo com o projeto exportado.");
  return { project, studies };
}
export function detectImportConflict(project: ProjectMasterRecord, existing: ProjectMasterRecord[]): ImportConflict {
  const id = existing.some((item) => item.id === project.id);
  const code = existing.some((item) => item.code === project.code && item.id !== project.id);
  return id && code ? "both" : id ? "id" : code ? "code" : "none";
}
export function importAsNew(project: ProjectMasterRecord, code: string): ProjectMasterRecord {
  return {
    ...project, id: createId("project"), code, recordStatus: "draft", archivedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    history: [...project.history, createHistoryEvent("imported", `Importado como novo; código original ${project.code}.`)],
  };
}
