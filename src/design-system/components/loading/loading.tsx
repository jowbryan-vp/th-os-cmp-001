import { HTMLAttributes } from "react";
import { LoaderCircle } from "../../icons";
import { cn } from "../../utils/cn";
export function Spinner({ label = "Carregando", className }: { label?: string; className?: string }) { return <span className={cn("ds-loading", className)} role="status"><LoaderCircle className="ds-spinner" aria-hidden="true" /><span className="sr-only">{label}</span></span>; }
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("ds-skeleton", className)} aria-hidden="true" {...props} />; }
export function ProgressBar({ value, label }: { value: number; label: string }) { const safe = Math.min(100, Math.max(0, value)); return <div className="ds-progress"><div className="ds-progress__meta"><span>{label}</span><strong>{safe}%</strong></div><div className="ds-progress__track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}><span style={{ width: `${safe}%` }} /></div></div>; }
