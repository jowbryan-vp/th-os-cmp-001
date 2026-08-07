"use client";

import { useMemo, useState } from "react";
import { Badge, BadgeTone, Button, EmptyState, Field, Input, NumberInput, Select } from "../../../../design-system";
import { Info, Pencil, Plus, Trash2 } from "../../../../design-system/icons";
import {
  computeCompositionTotals, createCustomService, groupServicesByCategory,
  serviceCommercialStateLabels, serviceCommercialStateOrder, serviceLineNetCents, withCommercialState,
} from "../../domain/hon-service-composition";
import { FeeServiceInput, ServiceCatalogItem, ServiceCategory, ServiceCommercialState } from "../../domain/hon-types";
import { serviceCategoryLabels, serviceCategoryOrder } from "../../services/hon-catalog-content";
import { HonServiceDetailModal, ServiceDetailContent } from "../catalog/hon-service-detail-modal";
import { inputMoney, money, parseMoney } from "../hon-formatters";
import { HonCustomServiceEditorModal } from "./hon-custom-service-editor-modal";

const normalize = (value: string) => value.trim().toLowerCase();
const stateTone: Record<ServiceCommercialState, BadgeTone> = { included: "success", optional: "warning", complimentary: "info", not_contracted: "neutral" };

function detailContentFor(service: FeeServiceInput, catalog: ServiceCatalogItem[]): ServiceDetailContent | null {
  if (service.catalogItemId) {
    const item = catalog.find((entry) => entry.id === service.catalogItemId);
    return item ?? null;
  }
  return {
    name: service.name, category: service.category,
    clientDescription: service.customDescription?.clientDescription ?? "",
    technicalDescription: service.customDescription?.technicalDescription ?? "",
    deliverables: service.customDescription?.deliverables ?? [],
    exclusions: service.customDescription?.exclusions ?? [],
    assumptions: service.customDescription?.assumptions ?? [],
  };
}

export interface HonServiceCompositionPanelProps {
  services: FeeServiceInput[];
  catalog: ServiceCatalogItem[];
  hourlyCents: number;
  onChange: (services: FeeServiceInput[]) => void;
}

// Painel de composição: lista os serviços já na composição do estudo, agrupados por categoria,
// com estado comercial/quantidade/desconto editáveis e totais separados. Adicionar novos
// serviços do catálogo é responsabilidade de HonServiceCatalogPanel (renderizado à parte,
// abaixo, na aba "Serviços e horas" de hon-workspace.tsx); aqui só "+ Serviço personalizado"
// cria uma linha nova, sem depender do catálogo.
export function HonServiceCompositionPanel({ services, catalog, hourlyCents, onChange }: HonServiceCompositionPanelProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ServiceCategory>("all");
  const [stateFilter, setStateFilter] = useState<"all" | ServiceCommercialState>("all");
  const [detailService, setDetailService] = useState<FeeServiceInput | null>(null);
  const [editingCustom, setEditingCustom] = useState<FeeServiceInput | null>(null);

  const totals = useMemo(() => computeCompositionTotals(services, hourlyCents), [services, hourlyCents]);

  const filtered = useMemo(() => {
    const term = normalize(search);
    return services
      .filter((service) => category === "all" || service.category === category)
      .filter((service) => stateFilter === "all" || service.commercialState === stateFilter)
      .filter((service) => !term || normalize(service.name).includes(term) || normalize(serviceCategoryLabels[service.category]).includes(term));
  }, [services, category, stateFilter, search]);

  const groups = useMemo(() => groupServicesByCategory(filtered, hourlyCents), [filtered, hourlyCents]);

  function updateService(id: string, patch: Partial<FeeServiceInput>) {
    onChange(services.map((service) => service.id === id ? { ...service, ...patch } : service));
  }
  function setState(service: FeeServiceInput, state: ServiceCommercialState) {
    onChange(services.map((item) => item.id === service.id ? withCommercialState(item, state) : item));
  }
  function removeService(id: string) {
    onChange(services.filter((service) => service.id !== id));
  }
  function addCustomService() {
    onChange([...services, createCustomService()]);
  }

  if (services.length === 0) {
    return <EmptyState title="Nenhum serviço na composição ainda" description="Adicione serviços do catálogo abaixo ou crie um serviço personalizado."
      action={{ children: "Adicionar serviço personalizado", onClick: addCustomService }} />;
  }

  return <div className="hon-composition">
    <div className="hon-summary hon-composition-totals">
      <div><span>Subtotal incluído</span><strong>{money(totals.includedCents)}</strong></div>
      <div><span>Total de opcionais</span><strong>{money(totals.optionalCents)}</strong></div>
      <div><span>Total de cortesias</span><strong>{money(totals.complimentaryCents)}</strong></div>
      <div><span>Descontos aplicados</span><strong>{money(totals.discountCents)}</strong></div>
      <div><span>Total contratado</span><strong>{money(totals.contractedCents)}</strong></div>
    </div>

    <div className="hon-catalog-toolbar hon-composition-toolbar">
      <Field label="Buscar na composição" className="hon-field"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou categoria" /></Field>
      <Field label="Categoria" className="hon-field">
        <Select value={category} onChange={(event) => setCategory(event.target.value as "all" | ServiceCategory)}>
          <option value="all">Todas</option>
          {serviceCategoryOrder.map((key) => <option key={key} value={key}>{serviceCategoryLabels[key]}</option>)}
        </Select>
      </Field>
      <Field label="Estado comercial" className="hon-field">
        <Select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as "all" | ServiceCommercialState)}>
          <option value="all">Todos</option>
          {serviceCommercialStateOrder.map((key) => <option key={key} value={key}>{serviceCommercialStateLabels[key]}</option>)}
        </Select>
      </Field>
    </div>
    <Button variant="secondary" icon={Plus} onClick={addCustomService}>Serviço personalizado</Button>

    {groups.length === 0
      ? <EmptyState title="Nenhum serviço encontrado" description="Ajuste a busca, a categoria ou o estado comercial selecionado." />
      : groups.map((group) => <section key={group.category} className="hon-composition-group">
        <div className="hon-composition-group__header">
          <h3>{serviceCategoryLabels[group.category]}</h3>
          <Badge tone="neutral">Subtotal incluído: {money(group.subtotalCents)}</Badge>
        </div>
        <ul className="hon-catalog-grid">
          {group.services.map((service) => {
            const isCustom = service.catalogItemId === null;
            const netCents = serviceLineNetCents(service, hourlyCents);
            return <li key={service.id} className="hon-catalog-card hon-composition-card">
              <div className="hon-catalog-card__header"><h3>{service.name}</h3><Badge tone={stateTone[service.commercialState]}>{serviceCommercialStateLabels[service.commercialState]}</Badge></div>
              <p>{detailContentFor(service, catalog)?.clientDescription || "Descrição ainda não cadastrada para este serviço."}</p>
              <div className="hon-composition-card__controls">
                <Field label={`Estado de ${service.name}`}><Select value={service.commercialState} onChange={(event) => setState(service, event.target.value as ServiceCommercialState)}>
                  {serviceCommercialStateOrder.map((key) => <option key={key} value={key}>{serviceCommercialStateLabels[key]}</option>)}
                </Select></Field>
                <Field label={`Horas de ${service.name}`}><NumberInput min="0" step="0.5" value={service.estimatedHours} onChange={(event) => updateService(service.id, { estimatedHours: Number(event.target.value) })} /></Field>
                <Field label={`Quantidade de ${service.name}`}><NumberInput min="1" step="1" value={service.quantity} onChange={(event) => updateService(service.id, { quantity: Math.max(1, Math.round(Number(event.target.value) || 1)) })} /></Field>
                <Field label={`Desconto de ${service.name}`}><Input value={inputMoney(service.individualDiscountCents)} onChange={(event) => updateService(service.id, { individualDiscountCents: parseMoney(event.target.value) })} /></Field>
                <Field label={`Observações de ${service.name}`}><Input value={service.notes} onChange={(event) => updateService(service.id, { notes: event.target.value })} /></Field>
              </div>
              <div className="hon-catalog-card__footer">
                <Badge tone="neutral">Subtotal: {money(netCents)}</Badge>
                <div className="hon-catalog-card__actions">
                  <Button variant="tertiary" size="small" icon={Info} onClick={() => setDetailService(service)}>Entenda este serviço</Button>
                  {isCustom && <Button variant="tertiary" size="small" icon={Pencil} onClick={() => setEditingCustom(service)}>Editar item personalizado</Button>}
                  <Button variant="tertiary" size="small" icon={Trash2} onClick={() => removeService(service.id)}>Remover</Button>
                </div>
              </div>
            </li>;
          })}
        </ul>
      </section>)}

    <HonServiceDetailModal item={detailService ? detailContentFor(detailService, catalog) : null} onClose={() => setDetailService(null)} />
    <HonCustomServiceEditorModal service={editingCustom} onClose={() => setEditingCustom(null)} onSave={(next) => updateService(next.id, next)} />
  </div>;
}
