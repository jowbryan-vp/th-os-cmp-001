"use client";

import { Badge, Modal } from "../../../../design-system";
import { ServiceCategory } from "../../domain/hon-types";
import { serviceCategoryLabels } from "../../services/hon-catalog-content";

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <section className="hon-catalog-detail-section"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

// Formato mínimo que o modal precisa — não amarrado a ServiceCatalogItem: um ServiceCatalogItem
// satisfaz esta forma estruturalmente (usado para itens do catálogo), e o HON-002C também
// monta um objeto deste formato a partir de FeeServiceInput.customDescription para reusar o
// mesmo modal em itens personalizados da composição, sem duplicar o componente.
export interface ServiceDetailContent {
  name: string;
  category: ServiceCategory;
  clientDescription: string;
  technicalDescription: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string[];
}

// "Entenda este serviço": Modal do Design System já resolve trap de foco, Escape e
// restauração de foco — este componente só monta o conteúdo.
export function HonServiceDetailModal({ item, onClose }: { item: ServiceDetailContent | null; onClose: () => void }) {
  return <Modal open={item !== null} title={item?.name ?? ""} onClose={onClose}>
    {item && <div className="hon-catalog-detail">
      <Badge tone="neutral">{serviceCategoryLabels[item.category]}</Badge>
      {item.clientDescription && <p className="hon-catalog-detail__lede">{item.clientDescription}</p>}
      {item.technicalDescription && <section className="hon-catalog-detail-section"><h3>Descrição técnica</h3><p>{item.technicalDescription}</p></section>}
      <DetailList title="Entregáveis" items={item.deliverables} />
      <DetailList title="Não inclui" items={item.exclusions} />
      <DetailList title="Premissas" items={item.assumptions} />
    </div>}
  </Modal>;
}
