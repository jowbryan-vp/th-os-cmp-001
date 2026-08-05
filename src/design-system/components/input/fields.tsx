"use client";
import { cloneElement, InputHTMLAttributes, isValidElement, ReactElement, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, useId } from "react";
import { cn } from "../../utils/cn";

interface FieldControlProps {
  id?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  "aria-required"?: boolean | "true" | "false";
}

export function Field({ label, htmlFor, helpText, errorText, required, children, className }: { label: string; htmlFor?: string; helpText?: string; errorText?: string; required?: boolean; children: ReactNode; className?: string }) {
  const autoId = useId();
  const control = isValidElement<FieldControlProps>(children) ? (children as ReactElement<FieldControlProps>) : null;
  const id = htmlFor ?? control?.props.id ?? autoId;
  const describedBy = errorText ? `${id}-error` : helpText ? `${id}-help` : undefined;
  const associatedControl = control
    ? cloneElement(control, {
        id: control.props.id ?? id,
        "aria-invalid": control.props["aria-invalid"] ?? (errorText ? true : undefined),
        "aria-describedby": control.props["aria-describedby"] ?? describedBy,
        "aria-required": control.props["aria-required"] ?? (required ? true : undefined),
      })
    : children;
  return <div className={cn("ds-field", errorText && "ds-field--invalid", className)}><label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>{associatedControl}{errorText ? <p id={`${id}-error`} className="ds-field__error" role="alert">{errorText}</p> : helpText ? <p id={`${id}-help`} className="ds-field__help">{helpText}</p> : null}</div>;
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
