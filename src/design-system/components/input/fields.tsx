"use client";
import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Field({ label, htmlFor, helpText, errorText, required, children, className }: { label: string; htmlFor?: string; helpText?: string; errorText?: string; required?: boolean; children: ReactNode; className?: string }) {
  return <div className={cn("ds-field", errorText && "ds-field--invalid", className)}><label htmlFor={htmlFor}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>{children}{errorText ? <p className="ds-field__error" role="alert">{errorText}</p> : helpText ? <p className="ds-field__help">{helpText}</p> : null}</div>;
}
export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) { return <input className={cn("ds-input", className)} aria-invalid={invalid || undefined} {...props} />; }
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) { return <Input type="number" inputMode="decimal" {...props} />; }
export function CurrencyInput(props: InputHTMLAttributes<HTMLInputElement>) { return <Input inputMode="decimal" placeholder="0,00" {...props} />; }
export function PercentageInput(props: InputHTMLAttributes<HTMLInputElement>) { return <Input type="number" inputMode="decimal" min="0" max="100" {...props} />; }
export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) { return <Input type="date" {...props} />; }
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={cn("ds-input ds-textarea", className)} {...props} />; }
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={cn("ds-input ds-select", className)} {...props}>{children}</select>; }
export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) { return <label className={cn("ds-choice", className)}><input type="checkbox" {...props} /><span className="ds-choice__control" aria-hidden="true" /><span>{label}</span></label>; }
export function Radio({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) { return <label className={cn("ds-choice ds-choice--radio", className)}><input type="radio" {...props} /><span className="ds-choice__control" aria-hidden="true" /><span>{label}</span></label>; }
export function Switch({ label, checked, onChange, disabled, id }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; id?: string }) { return <label className="ds-switch" htmlFor={id}><span>{label}</span><button id={id} type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}><span /></button></label>; }
