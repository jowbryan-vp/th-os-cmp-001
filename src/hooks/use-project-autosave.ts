"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProjectMasterRecord } from "../domain/project-master-record";

export type AutosaveState = "idle" | "dirty" | "saving" | "saved" | "error";
export function useProjectAutosave(
  project: ProjectMasterRecord,
  save: (project: ProjectMasterRecord) => Promise<ProjectMasterRecord>,
  enabled: boolean,
  debounceMs = 700,
) {
  const [state, setState] = useState<AutosaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const version = useRef(0);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const hydrated = useRef(false);
  const latest = useRef(project);
  useEffect(() => { latest.current = project; }, [project]);
  const persist = useCallback(async (record = latest.current) => {
    const token = ++version.current;
    setState("saving");
    saving.current = saving.current.then(async () => {
      try {
        await save(record);
        if (token === version.current) {
          setState("saved"); setLastSavedAt(new Date().toISOString()); setError(null);
        }
      } catch (reason) {
        if (token === version.current) {
          setState("error"); setError(reason instanceof Error ? reason : new Error("Falha ao salvar"));
        }
      }
    });
    await saving.current;
  }, [save]);
  useEffect(() => {
    if (!enabled) {
      hydrated.current = false;
      const idle = window.setTimeout(() => setState("idle"), 0);
      return () => window.clearTimeout(idle);
    }
    if (!hydrated.current) { hydrated.current = true; return; }
    const dirty = window.setTimeout(() => setState("dirty"), 0);
    const timer = window.setTimeout(() => void persist(project), debounceMs);
    return () => { window.clearTimeout(dirty); window.clearTimeout(timer); };
  }, [project, enabled, debounceMs, persist]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (state === "dirty" || state === "saving") { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);
  return { state, lastSavedAt, error, saveNow: persist, retry: persist };
}
