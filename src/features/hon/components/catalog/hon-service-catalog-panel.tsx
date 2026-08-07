"use client";

import { useMemo, useState } from "react";
import { Badge, BadgeTone, Button, EmptyState, Field, Input, Select } from "../../../../design-system";
import { Info } from "../../../../design-system/icons";
import { FeeCalculationStudy, ServiceCatalogItem } from "../../domain/hon-types";
import { serviceCategoryLabels, serviceCategoryOrder } from "../../services/hon-catalog-content";
import { HonServiceDetailModal } from "./hon-service-detail-modal";

const normalize = (value: string) => value.trim().toLowerCase();

function inclusionStatus(item: ServiceCatalogItem, study: FeeCalculationStudy): { label: string; tone: BadgeTone } {
  const match = study.services.find((service) => service.catalogItemId === item.id);
  if (!match) return { label: "Fora do estudo atual", tone: "neutral" };
  return match.included ? { label: "Incluído no estudo", tone: "success" } : { label: "No estudo, não incluído", tone: "warning" };
}

// Consulta ao catálogo de serviços: navegação/leitura apenas. A composição personalizada
// (selecionar, adicionar quantidade, opcionais) fica para uma fase seguinte (HON-002C) — aqui o
// objetivo é só permitir ao arquiteto entender cada serviço antes de editar a tabela de horas.
export function HonServiceCatalogPanel({ catalog, study }: { catalog: ServiceCatalogItem[]; study: FeeCalculationStudy }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ServiceCatalogItem["category"]>("all");
  const [detailItem, setDetailItem] = useState<ServiceCatalogItem | null>(null);

  const filtered = useMemo(() => {
    const term = normalize(search);
    // Ordena por posição em serviceCategoryOrder (não alfabeticamente pela slug em inglês —
    // "bim" viria antes de "diagnosis" e quebraria a ordem comercial pretendida).
    return catalog
      .filter((item) => item.active)
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => !term
        || normalize(item.name).includes(term)
        || normalize(item.clientDescription).includes(term)
        || normalize(serviceCategoryLabels[item.category]).includes(term))
      .sort((a, b) => serviceCategoryOrder.indexOf(a.category) - serviceCategoryOrder.indexOf(b.category)
        || a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "pt-BR"));
  }, [catalog, category, search]);

  return <div className="hon-catalog">
    <div className="hon-catalog-toolbar">
      <Field label="Buscar serviço" className="hon-field"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, descrição ou categoria" /></Field>
      <Field label="Categoria" className="hon-field">
        <Select value={category} onChange={(event) => setCategory(event.target.value as "all" | ServiceCatalogItem["category"])}>
          <option value="all">Todas</option>
          {serviceCategoryOrder.map((key) => <option key={key} value={key}>{serviceCategoryLabels[key]}</option>)}
        </Select>
      </Field>
    </div>
    {filtered.length === 0
      ? <EmptyState title="Nenhum serviço encontrado" description="Ajuste a busca ou a categoria selecionada." />
      : <ul className="hon-catalog-grid">
        {filtered.map((item) => {
          const status = inclusionStatus(item, study);
          return <li key={item.id} className="hon-catalog-card">
            <div className="hon-catalog-card__header"><h3>{item.name}</h3><Badge tone="neutral">{serviceCategoryLabels[item.category]}</Badge></div>
            <p>{item.clientDescription || "Descrição ainda não cadastrada para este serviço."}</p>
            <div className="hon-catalog-card__footer">
              <Badge tone={status.tone}>{status.label}</Badge>
              <Button variant="tertiary" size="small" icon={Info} onClick={() => setDetailItem(item)}>Entenda este serviço</Button>
            </div>
          </li>;
        })}
      </ul>}
    <HonServiceDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
  </div>;
}
