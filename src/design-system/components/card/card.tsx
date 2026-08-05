"use client";
import { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { ChevronRight } from "../../icons";
import { cn } from "../../utils/cn";
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) { return <section className={cn("ds-card", className)} {...props} />; }
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <header className={cn("ds-card__header", className)} {...props} />; }
export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("ds-card__body", className)} {...props} />; }
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <footer className={cn("ds-card__footer", className)} {...props} />; }
export function ClickableCard({ title, description, onActivate, children, className }: { title: string; description?: string; onActivate: () => void; children?: ReactNode; className?: string }) {
  const key = (event: KeyboardEvent<HTMLElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onActivate(); } };
  return <article role="button" tabIndex={0} className={cn("ds-card ds-card--clickable", className)} onClick={onActivate} onKeyDown={key} aria-label={title}><div className="ds-card__body"><div><h3>{title}</h3>{description ? <p>{description}</p> : null}{children}</div><ChevronRight aria-hidden="true" /></div></article>;
}
