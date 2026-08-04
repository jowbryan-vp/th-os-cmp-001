import {
  FEE_CALIBRATION_STORE_NAME, FEE_SCENARIO_STORE_NAME, FEE_SNAPSHOT_STORE_NAME,
  FEE_STUDY_STORE_NAME, PAYMENT_PLAN_STORE_NAME, SERVICE_CATALOG_STORE_NAME,
  STRUCTURE_PROFILE_STORE_NAME, openThOsDatabase, requestResult, transactionDone,
} from "../../../data/th-os-database";
import {
  feeCalibrationSchema, feeScenarioSchema, feeSnapshotSchema, feeStudySchema,
  paymentPlanSchema, serviceCatalogItemSchema, structureProfileSchema,
} from "../domain/hon-schemas";
import {
  FeeCalculationStudy, FeeCalibrationRecord, FeeScenario, FeeSnapshot, PaymentPlan,
  ServiceCatalogItem, StructureProfile,
} from "../domain/hon-types";
import { defaultServiceCatalog, defaultStructureProfiles } from "../services/hon-presets";

type Entity = { id: string };
class IndexedDbEntityRepository<T extends Entity> {
  constructor(private readonly storeName: string, private readonly parse: (value: unknown) => T) {}
  async list(): Promise<T[]> {
    const db = await openThOsDatabase();
    const tx = db.transaction(this.storeName, "readonly");
    return (await requestResult(tx.objectStore(this.storeName).getAll())).map(this.parse);
  }
  async get(id: string): Promise<T | undefined> {
    const db = await openThOsDatabase(); const tx = db.transaction(this.storeName, "readonly");
    const raw = await requestResult(tx.objectStore(this.storeName).get(id)); return raw ? this.parse(raw) : undefined;
  }
  async save(value: T): Promise<T> {
    const parsed = this.parse(value); const db = await openThOsDatabase(); const tx = db.transaction(this.storeName, "readwrite");
    tx.objectStore(this.storeName).put(parsed); await transactionDone(tx); return parsed;
  }
  async remove(id: string) {
    const db = await openThOsDatabase(); const tx = db.transaction(this.storeName, "readwrite");
    tx.objectStore(this.storeName).delete(id); await transactionDone(tx);
  }
}

export class FeeStudyRepository extends IndexedDbEntityRepository<FeeCalculationStudy> {
  constructor() { super(FEE_STUDY_STORE_NAME, (value) => feeStudySchema.parse(value)); }
  async listByProject(projectId: string) { return (await this.list()).filter((item) => item.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
}
export class FeeScenarioRepository extends IndexedDbEntityRepository<FeeScenario> {
  constructor() { super(FEE_SCENARIO_STORE_NAME, (value) => feeScenarioSchema.parse(value)); }
  async listByStudy(studyId: string) { return (await this.list()).filter((item) => item.studyId === studyId); }
}
export class StructureProfileRepository extends IndexedDbEntityRepository<StructureProfile> {
  constructor() { super(STRUCTURE_PROFILE_STORE_NAME, (value) => structureProfileSchema.parse(value)); }
  async ensureDefaults() { if ((await this.list()).length === 0) for (const profile of defaultStructureProfiles) await this.save(profile); return this.list(); }
  async duplicate(id: string, name: string) {
    const source = await this.get(id); if (!source) throw new Error("Perfil de estrutura não encontrado.");
    const now = new Date().toISOString();
    return this.save({ ...structuredClone(source), id: `profile-${Date.now()}`, name, kind: "custom", parentProfileId: source.id, createdAt: now, updatedAt: now });
  }
}
export class ServiceCatalogRepository extends IndexedDbEntityRepository<ServiceCatalogItem> {
  constructor() { super(SERVICE_CATALOG_STORE_NAME, (value) => serviceCatalogItemSchema.parse(value)); }
  async ensureDefaults() { if ((await this.list()).length === 0) for (const item of defaultServiceCatalog) await this.save(item); return this.list(); }
}
export class FeeSnapshotRepository extends IndexedDbEntityRepository<FeeSnapshot> {
  constructor() { super(FEE_SNAPSHOT_STORE_NAME, (value) => feeSnapshotSchema.parse(value)); }
  override async save(value: FeeSnapshot) {
    if (await this.get(value.id)) throw new Error("Snapshots aprovados são imutáveis; crie uma nova versão.");
    return super.save(value);
  }
  async listByStudy(studyId: string) { return (await this.list()).filter((item) => item.studyId === studyId); }
}
export class PaymentPlanRepository extends IndexedDbEntityRepository<PaymentPlan> {
  constructor() { super(PAYMENT_PLAN_STORE_NAME, (value) => paymentPlanSchema.parse(value)); }
  async listByStudy(studyId: string) { return (await this.list()).filter((item) => item.studyId === studyId); }
}
export class FeeCalibrationRepository extends IndexedDbEntityRepository<FeeCalibrationRecord> {
  constructor() { super(FEE_CALIBRATION_STORE_NAME, (value) => feeCalibrationSchema.parse(value)); }
}

export interface HonBackupData {
  feeStudies: FeeCalculationStudy[]; feeScenarios: FeeScenario[]; structureProfiles: StructureProfile[];
  serviceCatalog: ServiceCatalogItem[]; feeSnapshots: FeeSnapshot[]; paymentPlans: PaymentPlan[];
  feeCalibrationRecords: FeeCalibrationRecord[];
}
export async function readHonBackupData(): Promise<HonBackupData> {
  const [feeStudies, feeScenarios, structureProfiles, serviceCatalog, feeSnapshots, paymentPlans, feeCalibrationRecords] = await Promise.all([
    new FeeStudyRepository().list(), new FeeScenarioRepository().list(), new StructureProfileRepository().list(),
    new ServiceCatalogRepository().list(), new FeeSnapshotRepository().list(), new PaymentPlanRepository().list(), new FeeCalibrationRepository().list(),
  ]);
  return { feeStudies, feeScenarios, structureProfiles, serviceCatalog, feeSnapshots, paymentPlans, feeCalibrationRecords };
}

export function parseHonBackupData(input: HonBackupData, projectIds: Set<string>): HonBackupData {
  const parsed: HonBackupData = {
    feeStudies: input.feeStudies.map((item) => feeStudySchema.parse(item)),
    feeScenarios: input.feeScenarios.map((item) => feeScenarioSchema.parse(item)),
    structureProfiles: input.structureProfiles.map((item) => structureProfileSchema.parse(item)),
    serviceCatalog: input.serviceCatalog.map((item) => serviceCatalogItemSchema.parse(item)),
    feeSnapshots: input.feeSnapshots.map((item) => feeSnapshotSchema.parse(item)),
    paymentPlans: input.paymentPlans.map((item) => paymentPlanSchema.parse(item)),
    feeCalibrationRecords: input.feeCalibrationRecords.map((item) => feeCalibrationSchema.parse(item)),
  };
  for (const [name, items] of Object.entries(parsed)) {
    const ids = new Set<string>();
    for (const item of items) { if (ids.has(item.id)) throw new Error(`O backup HON contém ID duplicado em ${name}.`); ids.add(item.id); }
  }
  if (parsed.feeStudies.some((item) => !projectIds.has(item.projectId))) throw new Error("O backup HON contém estudo sem projeto correspondente.");
  const studyIds = new Set(parsed.feeStudies.map((item) => item.id));
  if (parsed.feeScenarios.some((item) => !studyIds.has(item.studyId)) || parsed.feeSnapshots.some((item) => !studyIds.has(item.studyId)) || parsed.paymentPlans.some((item) => !studyIds.has(item.studyId))) {
    throw new Error("O backup HON contém cenário, snapshot ou pagamento sem estudo correspondente.");
  }
  return parsed;
}
