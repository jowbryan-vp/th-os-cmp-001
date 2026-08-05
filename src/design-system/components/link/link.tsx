import { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
export function Link({ variant = "inline", className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: "inline" | "standalone" | "navigation" | "subtle"; children: ReactNode }) {
  return <a className={cn("ds-link", `ds-link--${variant}`, className)} {...props}>{children}</a>;
}
