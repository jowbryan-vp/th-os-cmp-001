"use client";
import { useEffect, useRef, useState } from "react";
import { LucideIcon, MoreHorizontal } from "../../icons";
import { Button } from "../button/button";
export interface ActionMenuItem { label: string; onSelect: () => void; icon?: LucideIcon; destructive?: boolean; disabled?: boolean; }
export function ActionMenu({ label = "Mais ações", items }: { label?: string; items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("mousedown", close); document.addEventListener("keydown", key); return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); }; }, [open]);
  return <div className="ds-action-menu" ref={ref}><Button variant="secondary" size="small" icon={MoreHorizontal} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{label}</Button>{open ? <div role="menu">{items.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" role="menuitem" className={item.destructive ? "is-destructive" : undefined} disabled={item.disabled} onClick={() => { item.onSelect(); setOpen(false); }}>{Icon ? <Icon aria-hidden="true" /> : null}<span>{item.label}</span></button>; })}</div> : null}</div>;
}
