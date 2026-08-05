import { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
export type BadgeTone = "neutral" | "success" | "warning" | "error" | "info" | "brand" | "experimental";
export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) { return <span className={cn("ds-badge", `ds-badge--${tone}`, className)} {...props} />; }
export const StatusBadge = Badge;
export function Tag(props: HTMLAttributes<HTMLSpanElement>) { return <Badge {...props} className={cn("ds-tag", props.className)} />; }
export function Chip(props: HTMLAttributes<HTMLSpanElement>) { return <Badge {...props} className={cn("ds-chip", props.className)} />; }
