import { ReactNode } from "react";
export function PageActionBar({ eyebrow, title, breadcrumb, status, primaryAction, secondaryActions }: { eyebrow?: string; title: string; breadcrumb?: ReactNode; status?: ReactNode; primaryAction?: ReactNode; secondaryActions?: ReactNode }) {
  return <header className="ds-page-action-bar"><div className="ds-page-action-bar__content">{breadcrumb ? <nav aria-label="Breadcrumb">{breadcrumb}</nav> : null}{eyebrow ? <span className="ds-eyebrow">{eyebrow}</span> : null}<div><h1>{title}</h1>{status}</div></div><div className="ds-page-action-bar__actions"><div>{secondaryActions}</div>{primaryAction}</div></header>;
}
