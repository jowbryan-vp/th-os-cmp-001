"use client";
import { KeyboardEvent, useRef } from "react";
export interface TabItem { id: string; label: string; disabled?: boolean; }
export function Tabs({ items, value, onChange, ariaLabel }: { items: TabItem[]; value: string; onChange: (id: string) => void; ariaLabel: string }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const key = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1; let next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + direction + items.length) % items.length;
    while (items[next]?.disabled && next !== index) next = (next + direction + items.length) % items.length;
    refs.current[next]?.focus(); if (!items[next]?.disabled) onChange(items[next].id);
  };
  return <div className="ds-tabs" role="tablist" aria-label={ariaLabel}>{items.map((item, index) => <button ref={(node) => { refs.current[index] = node; }} key={item.id} role="tab" aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} disabled={item.disabled} onClick={() => onChange(item.id)} onKeyDown={(event) => key(event, index)}>{item.label}</button>)}</div>;
}
