"use client";

import { useState } from "react";
import { Button, Field, Input, Modal, NumberInput, Select, Textarea } from "../../../../design-system";
import { FeeServiceInput, ServiceCategory } from "../../domain/hon-types";
import { serviceCategoryLabels, serviceCategoryOrder } from "../../services/hon-catalog-content";

const linesToList = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);
const listToLines = (items: string[]) => items.join("\n");

interface FormState {
  name: string; category: ServiceCategory; displayOrder: number;
  clientDescription: string; technicalDescription: string;
  deliverables: string; exclusions: string; assumptions: string;
}

function toFormState(service: FeeServiceInput): FormState {
  return {
    name: service.name, category: service.category, displayOrder: service.displayOrder,
    clientDescription: service.customDescription?.clientDescription ?? "",
    technicalDescription: service.customDescription?.technicalDescription ?? "",
    deliverables: listToLines(service.customDescription?.deliverables ?? []),
    exclusions: listToLines(service.customDescription?.exclusions ?? []),
    assumptions: listToLines(service.customDescription?.assumptions ?? []),
  };
}

// Formulário isolado, montado com `key={service.id}` pelo componente pai: assim o React
// descarta e recria o estado local sempre que o serviço editado muda, sem precisar de um
// useEffect + setState para "resetar estado quando uma prop muda" (padrão documentado em
// https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes,
// e aqui simples de aplicar porque não há nada para preservar entre um item e outro).
function CustomServiceForm({ service, onClose, onSave }: { service: FeeServiceInput; onClose: () => void; onSave: (next: FeeServiceInput) => void }) {
  const [form, setForm] = useState<FormState>(() => toFormState(service));

  function save() {
    onSave({
      ...service, name: form.name.trim() || service.name, category: form.category, displayOrder: form.displayOrder,
      customDescription: {
        clientDescription: form.clientDescription.trim(), technicalDescription: form.technicalDescription.trim(),
        deliverables: linesToList(form.deliverables), exclusions: linesToList(form.exclusions), assumptions: linesToList(form.assumptions),
      },
    });
    onClose();
  }

  return <div className="hon-custom-service-form">
    <div className="hon-form-grid">
      <Field label="Nome"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="Categoria"><Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ServiceCategory })}>
        {serviceCategoryOrder.map((key) => <option key={key} value={key}>{serviceCategoryLabels[key]}</option>)}
      </Select></Field>
      <Field label="Ordem de exibição"><NumberInput min="0" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })} /></Field>
    </div>
    <Field label="Descrição para o cliente"><Textarea rows={3} value={form.clientDescription} onChange={(event) => setForm({ ...form, clientDescription: event.target.value })} /></Field>
    <Field label="Descrição técnica"><Textarea rows={3} value={form.technicalDescription} onChange={(event) => setForm({ ...form, technicalDescription: event.target.value })} /></Field>
    <Field label="Entregáveis" helpText="Um item por linha"><Textarea rows={3} value={form.deliverables} onChange={(event) => setForm({ ...form, deliverables: event.target.value })} /></Field>
    <Field label="Não inclui" helpText="Um item por linha"><Textarea rows={3} value={form.exclusions} onChange={(event) => setForm({ ...form, exclusions: event.target.value })} /></Field>
    <Field label="Premissas" helpText="Um item por linha"><Textarea rows={3} value={form.assumptions} onChange={(event) => setForm({ ...form, assumptions: event.target.value })} /></Field>
    <div className="hon-actions">
      <Button onClick={save}>Salvar item personalizado</Button>
      <Button variant="secondary" onClick={onClose}>Cancelar</Button>
    </div>
  </div>;
}

// Edição/enriquecimento de um item PERSONALIZADO da composição (HON-002C item 10) — só
// renderizado para serviços com catalogItemId nulo (o chamador garante isso; este componente
// não valida de novo). Nunca reaproveitado para editar um item padrão do catálogo: essa
// distinção é o que impede alterar silenciosamente o conteúdo curado do catálogo.
export function HonCustomServiceEditorModal({ service, onClose, onSave }: { service: FeeServiceInput | null; onClose: () => void; onSave: (next: FeeServiceInput) => void }) {
  return <Modal open={service !== null} title="Editar serviço personalizado" onClose={onClose}>
    {service && <CustomServiceForm key={service.id} service={service} onClose={onClose} onSave={onSave} />}
  </Modal>;
}
