import { createId } from "../../../domain/project-master-record";
import { CAP_STUDY_STORE_NAME, PROJECT_STORE_NAME, openThOsDatabase, requestResult, transactionDone } from "../../../data/th-os-database";
import { parametricEnvironmentStudySchema } from "../domain/cap-library-schema";
import { ParametricEnvironmentStudy } from "../domain/cap-library-types";
import { ParametricStudyRepository } from "./parametric-study-repository";

export class IndexedDbParametricStudyRepository implements ParametricStudyRepository {
  private async save(study: ParametricEnvironmentStudy) {
    const parsed = parametricEnvironmentStudySchema.parse(study); const database = await openThOsDatabase();
    const transaction = database.transaction([PROJECT_STORE_NAME, CAP_STUDY_STORE_NAME], "readwrite");
    const project = await requestResult(transaction.objectStore(PROJECT_STORE_NAME).get(parsed.projectId));
    if (!project) { transaction.abort(); throw new Error("O estudo paramétrico referencia um projeto inexistente."); }
    transaction.objectStore(CAP_STUDY_STORE_NAME).put(parsed); await transactionDone(transaction); return parsed;
  }
  create(study: ParametricEnvironmentStudy) { return this.save(study); }
  update(study: ParametricEnvironmentStudy) { return this.save({ ...study, updatedAt: new Date().toISOString() }); }
  async findById(id: string) {
    const database = await openThOsDatabase(); const transaction = database.transaction(CAP_STUDY_STORE_NAME, "readonly");
    const raw = await requestResult(transaction.objectStore(CAP_STUDY_STORE_NAME).get(id));
    return raw ? parametricEnvironmentStudySchema.parse(raw) : undefined;
  }
  async listAll() {
    const database = await openThOsDatabase(); const transaction = database.transaction(CAP_STUDY_STORE_NAME, "readonly");
    const raw = await requestResult(transaction.objectStore(CAP_STUDY_STORE_NAME).getAll());
    return parametricEnvironmentStudySchema.array().parse(raw).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async listByProject(projectId: string) {
    const database = await openThOsDatabase(); const transaction = database.transaction(CAP_STUDY_STORE_NAME, "readonly");
    const raw = await requestResult(transaction.objectStore(CAP_STUDY_STORE_NAME).index("projectId").getAll(projectId));
    return parametricEnvironmentStudySchema.array().parse(raw).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async duplicate(id: string) {
    const source = await this.findById(id); if (!source) throw new Error("Estudo paramétrico não encontrado.");
    const now = new Date().toISOString(); return this.save({ ...structuredClone(source), id: createId("cap-study"),
      name: `${source.name} — cópia`, status: "draft", createdAt: now, updatedAt: now });
  }
  async archive(id: string) { const study = await this.findById(id); if (!study) throw new Error("Estudo paramétrico não encontrado.");
    return this.save({ ...study, status: "archived", updatedAt: new Date().toISOString() }); }
  async restore(id: string) { const study = await this.findById(id); if (!study) throw new Error("Estudo paramétrico não encontrado.");
    return this.save({ ...study, status: "draft", updatedAt: new Date().toISOString() }); }
  async delete(id: string) { const database = await openThOsDatabase(); const transaction = database.transaction(CAP_STUDY_STORE_NAME, "readwrite");
    transaction.objectStore(CAP_STUDY_STORE_NAME).delete(id); await transactionDone(transaction); }
}
