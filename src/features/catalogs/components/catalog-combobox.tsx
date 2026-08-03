"use client";

import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { CatalogOption, ReferenceCatalog, normalizeCatalogValue } from "../domain/reference-catalog";
import { getReferenceCatalogRepository } from "../repositories/reference-catalog-repository";

interface Props {
  label: string; catalogType: ReferenceCatalog; value: string; onChange: (value: string) => void;
  projectId?: string | null; parentId?: string | null; allowCreate?: boolean; readOnly?: boolean;
  options?: CatalogOption[];
}
const repository = getReferenceCatalogRepository();

export function CatalogCombobox({ label, catalogType, value, onChange, projectId = null, parentId = null, allowCreate = true, readOnly = false, options: providedOptions }: Props) {
  const listId = useId(); const inputId = useId(); const inputRef = useRef<HTMLInputElement>(null);
  const [storedOptions, setStoredOptions] = useState<CatalogOption[]>([]); const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => providedOptions?.find((option) => option.value === value)?.label ?? value);
  const [activeIndex, setActiveIndex] = useState(-1);
  useEffect(() => { if (!providedOptions) void repository.listByType(catalogType, projectId).then((items) => setStoredOptions(parentId ? items.filter((v) => !v.parentId || v.parentId === parentId) : items)); }, [catalogType, parentId, projectId, providedOptions]);
  const options = providedOptions ?? storedOptions;
  const filtered = useMemo(() => { const key = normalizeCatalogValue(query); return key ? options.filter((v) => normalizeCatalogValue(v.label).includes(key)) : options; }, [options, query]);
  const exact = options.some((v) => normalizeCatalogValue(v.label) === normalizeCatalogValue(query));
  function choose(option: CatalogOption) { setQuery(option.label); onChange(option.value); setOpen(false); setActiveIndex(-1); }
  async function createOption() { const option = await repository.create(catalogType, query, projectId, parentId); setStoredOptions(await repository.listByType(catalogType, projectId)); choose(option); }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((v) => Math.min(v + 1, filtered.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((v) => Math.max(v - 1, 0)); }
    if (event.key === "Enter" && open) { event.preventDefault(); if (activeIndex >= 0 && filtered[activeIndex]) choose(filtered[activeIndex]); else if (allowCreate && query.trim() && !exact) void createOption(); }
  }
  return <div className="field catalog-combobox"><label htmlFor={inputId}>{label}</label><div className="catalog-combobox__control">
    <input id={inputId} ref={inputRef} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
      aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined} value={query} readOnly={readOnly}
      onFocus={() => setOpen(true)} onKeyDown={onKeyDown} onChange={(event) => { setQuery(event.target.value); onChange(event.target.value); setOpen(true); setActiveIndex(-1); }} />
    <button type="button" aria-label={`Abrir opções de ${label}`} aria-expanded={open} onClick={() => { setOpen((v) => !v); inputRef.current?.focus(); }}>⌄</button>
  </div>{open && <div className="catalog-combobox__popover"><ul id={listId} role="listbox">
    {filtered.map((option, index) => <li id={`${listId}-${index}`} role="option" aria-selected={option.value === value} className={index === activeIndex ? "is-active" : ""} key={option.id}
      onMouseDown={(event) => { event.preventDefault(); choose(option); }}>{option.label}</li>)}
    {!filtered.length && <li className="catalog-combobox__empty">Nenhuma opção encontrada.</li>}
  </ul>{allowCreate && query.trim() && !exact && <button type="button" className="catalog-combobox__create" onMouseDown={(event) => event.preventDefault()} onClick={() => void createOption()}>+ Adicionar “{query.trim()}”</button>}</div>}</div>;
}
