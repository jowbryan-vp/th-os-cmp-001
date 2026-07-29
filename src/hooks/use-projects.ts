"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectMasterRecord } from "../domain/project-master-record";
import { ProjectRepository, getProjectRepository } from "../data/project-repository";

export function useProjects(repository: ProjectRepository = getProjectRepository()) {
  const [projects, setProjects] = useState<ProjectMasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const reload = useCallback(async () => {
    try {
      await repository.ensurePilot(); setProjects(await repository.list()); setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason : new Error("Falha ao carregar projetos"));
    } finally { setLoading(false); }
  }, [repository]);
  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  const upsert = useCallback((project: ProjectMasterRecord) =>
    setProjects((items) => [project, ...items.filter((item) => item.id !== project.id)]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))), []);
  return useMemo(() => ({ projects, setProjects, loading, error, reload, upsert, repository }),
    [projects, loading, error, reload, upsert, repository]);
}
