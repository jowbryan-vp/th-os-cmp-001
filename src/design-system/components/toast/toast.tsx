"use client";
import { CircleAlert, CircleCheck, Info, X } from "../../icons";
import { Button } from "../button/button";
export function Toast({ variant = "info", title, message, onClose }: { variant?: "success" | "error" | "warning" | "info"; title: string; message?: string; onClose: () => void }) {
  const Icon = variant === "success" ? CircleCheck : variant === "info" ? Info : CircleAlert;
  return <div className={`ds-toast ds-toast--${variant}`} role={variant === "error" ? "alert" : "status"} aria-live={variant === "error" ? "assertive" : "polite"}><Icon aria-hidden="true" /><div><strong>{title}</strong>{message ? <p>{message}</p> : null}</div><Button variant="ghost" size="small" icon={X} aria-label="Fechar aviso" onClick={onClose}>Fechar</Button></div>;
}
