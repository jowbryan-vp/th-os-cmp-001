"use client";

import { ParametricEnvironmentStudy } from "../domain/cap-library-types";
import { IndexedDbParametricStudyRepository } from "./indexed-db-parametric-study-repository";

export interface ParametricStudyRepository {
  create(study: ParametricEnvironmentStudy): Promise<ParametricEnvironmentStudy>;
  update(study: ParametricEnvironmentStudy): Promise<ParametricEnvironmentStudy>;
  findById(id: string): Promise<ParametricEnvironmentStudy | undefined>;
  listAll(): Promise<ParametricEnvironmentStudy[]>;
  listByProject(projectId: string): Promise<ParametricEnvironmentStudy[]>;
  duplicate(id: string): Promise<ParametricEnvironmentStudy>;
  archive(id: string): Promise<ParametricEnvironmentStudy>;
  restore(id: string): Promise<ParametricEnvironmentStudy>;
  delete(id: string): Promise<void>;
}
let repository: ParametricStudyRepository | null = null;
export function getParametricStudyRepository() { repository ??= new IndexedDbParametricStudyRepository(); return repository; }
