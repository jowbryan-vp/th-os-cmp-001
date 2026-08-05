"use client";
import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";
import { LoaderCircle, LucideIcon } from "../../icons";
import { cn } from "../../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive" | "success" | "ghost" | "link";
export type ButtonSize = "small" | "medium" | "large";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; icon?: LucideIcon; iconEnd?: LucideIcon; children: ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", size = "medium", loading = false, icon: Icon, iconEnd: EndIcon, className, disabled, children, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={cn("ds-button", `ds-button--${variant}`, `ds-button--${size}`, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    <span className="ds-button__content">{loading ? <LoaderCircle className="ds-spinner ds-icon" aria-hidden="true" /> : Icon ? <Icon className="ds-icon" aria-hidden="true" /> : null}<span>{children}</span>{EndIcon ? <EndIcon className="ds-icon" aria-hidden="true" /> : null}</span>
  </button>;
});
export function LoadingButton(props: ButtonProps) { return <Button {...props} loading />; }
