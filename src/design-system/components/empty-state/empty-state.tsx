import { LucideIcon, FolderOpen } from "../../icons";
import { Button, ButtonProps } from "../button/button";
export function EmptyState({ title, description, action, icon: Icon = FolderOpen }: { title: string; description: string; action?: Pick<ButtonProps, "children" | "onClick" | "icon">; icon?: LucideIcon }) { return <div className="ds-empty-state"><Icon aria-hidden="true" /><h2>{title}</h2><p>{description}</p>{action ? <Button variant="primary" {...action} /> : null}</div>; }
