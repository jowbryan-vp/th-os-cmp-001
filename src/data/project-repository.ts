"use client";

import { ProjectMasterRecord } from "../domain/project-master-record";
import { ParametricEnvironmentStudy } from "../features/cap/domain/cap-library-types";
import { IndexedDbProjectRepository } from "./indexed-db-project-repository";

export interface ProjectRepository {
  list(): Promise<ProjectMasterRecord[]>;
  get(id: string): Promise<ProjectMasterRecord | undefined>;
  save(project: ProjectMasterRecord): Promise<ProjectMasterRecord>;
  replaceAll(projects: ProjectMasterRecord[]): Promise<ProjectMasterRecord[]>;
  restoreAll(projects: ProjectMasterRecord[], studies: ParametricEnvironmentStudy[]): Promise<{
    projects: ProjectMasterRecord[]; studies: ParametricEnvironmentStudy[];
  }>;
  remove(id: string): Promise<void>;
  nextCode(year?: number): Promise<string>;
  ensurePilot(): Promise<void>;
}

let repository: ProjectRepository | null = null;
export function getProjectRepository(): ProjectRepository {
  repository ??= new IndexedDbProjectRepository();
  return repository;
}
