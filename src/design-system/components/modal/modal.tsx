"use client";
import { ReactNode, useCallback, useId, useRef } from "react";
import { useFocusTrap } from "../../hooks/use-focus-trap";
import { X } from "../../icons";
import { Button, ButtonVariant } from "../button/button";
export function Modal({ open, title, description, onClose, children, footer }: { open: boolean; title: string; description?: string; onClose: () => void; children?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null); const titleId = useId(); const descriptionId = useId(); const close = useCallback(() => onClose(), [onClose]);
  useFocusTrap(ref, open, close); if (!open) return null;
  return <div className="ds-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={ref} className="ds-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1}><header><div><h2 id={titleId}>{title}</h2>{description ? <p id={descriptionId}>{description}</p> : null}</div><Button variant="ghost" size="small" icon={X} aria-label="Fechar diálogo" onClick={onClose}>Fechar</Button></header>{children ? <div className="ds-modal__body">{children}</div> : null}{footer ? <footer>{footer}</footer> : null}</div></div>;
}
export const Dialog = Modal;
export function ConfirmDialog({ open, title, description, confirmLabel, confirmVariant = "primary", onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel: string; confirmVariant?: ButtonVariant; onConfirm: () => void; onClose: () => void }) {
  return <Modal open={open} title={title} description={description} onClose={onClose} footer={<><Button variant="tertiary" onClick={onClose}>Cancelar</Button><Button variant={confirmVariant} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}/>;
}
