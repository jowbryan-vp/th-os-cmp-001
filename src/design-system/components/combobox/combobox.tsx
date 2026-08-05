"use client";
import { KeyboardEvent, useId, useMemo, useState } from "react";
import { ChevronDown } from "../../icons";
export function Combobox({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; disabled?: boolean }) {
  const id = useId(); const [open, setOpen] = useState(false); const [query, setQuery] = useState("");
  const filtered = useMemo(() => options.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())), [options, query]);
  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } if (event.key === "Escape") setOpen(false); };
  return <div className="ds-field ds-combobox"><label htmlFor={id}>{label}</label><div className="ds-combobox__control"><input id={id} className="ds-input" role="combobox" aria-expanded={open} aria-controls={`${id}-listbox`} value={open ? query : options.find((item) => item.value === value)?.label ?? value} onFocus={() => { setQuery(""); setOpen(true); }} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={handleKey} disabled={disabled} /><button type="button" aria-label={`Abrir opções de ${label}`} aria-expanded={open} onClick={() => setOpen((current) => !current)} disabled={disabled}><ChevronDown aria-hidden="true" /></button></div>{open ? <ul id={`${id}-listbox`} role="listbox">{filtered.map((item) => <li key={item.value} role="option" aria-selected={item.value === value} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(item.value); setOpen(false); setQuery(""); }}>{item.label}</li>)}</ul> : null}</div>;
}
