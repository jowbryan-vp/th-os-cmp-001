import { z } from "zod";

export const catalogTypes = ["city", "state", "projectSector", "floor", "environmentSector", "environmentType",
  "propertyType", "propertyCondition", "contactOrigin", "professionalRole", "documentCategory", "visitType", "custom"] as const;
export type ReferenceCatalog = typeof catalogTypes[number];

export const catalogOptionSchema = z.object({
  id: z.string().min(3), catalogType: z.enum(catalogTypes), value: z.string().min(1), label: z.string().min(1),
  active: z.boolean(), system: z.boolean(), order: z.number().int().nonnegative(), createdAt: z.string(), updatedAt: z.string(),
  parentId: z.string().nullable().default(null), projectId: z.string().nullable().default(null),
}).strict();
export type CatalogOption = z.infer<typeof catalogOptionSchema>;

export function normalizeCatalogValue(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

const now = "2026-01-01T00:00:00.000Z";
function preset(catalogType: ReferenceCatalog, value: string, label = value, order = 0, parentId: string | null = null): CatalogOption {
  return { id: `catalog-${catalogType}-${normalizeCatalogValue(value).replace(/[^a-z0-9]+/g, "-")}`, catalogType, value, label,
    active: true, system: true, order, createdAt: now, updatedAt: now, parentId, projectId: null };
}
export const referenceCatalogPresets: CatalogOption[] = [
  preset("state", "RO", "Rondônia (RO)"),
  ...["Cacoal", "Vilhena", "Ji-Paraná"].map((v, i) => preset("city", v, v, i, "catalog-state-ro")),
  ...["Subsolo", "Térreo", "Mezanino", "1º Pavimento", "2º Pavimento", "3º Pavimento", "Cobertura", "Ático", "Externo", "Sem pavimento definido"].map((v, i) => preset("floor", v, v, i)),
  ...["Residencial", "Comercial"].map((v, i) => preset("projectSector", v, v, i)),
  ...["Social", "Íntimo", "Privativo", "Serviço", "Apoio", "Lazer", "Trabalho", "Higiene", "Circulação", "Externo", "Técnico", "Outros",
    "Atendimento", "Exposição", "Vendas", "Operacional", "Administrativo", "Estoque", "Produção"].map((v, i) => preset("environmentSector", v, v, i)),
  ...["Casa", "Apartamento", "Comercial", "Institucional", "Misto", "Terreno"].map((v, i) => preset("propertyType", v, v, i)),
  ...["Novo", "Existente", "Em reforma", "Em construção", "A regularizar"].map((v, i) => preset("propertyCondition", v, v, i)),
  ...["Indicação", "Site", "Instagram", "WhatsApp", "Retorno", "Outro"].map((v, i) => preset("contactOrigin", v, v, i)),
  ...["Cliente", "Arquiteto", "Engenheiro", "Fornecedor", "Consultor", "Construtor"].map((v, i) => preset("professionalRole", v, v, i)),
  ...["Identificação", "Imóvel", "Levantamento", "Projeto", "Contrato", "Licença", "Outro"].map((v, i) => preset("documentCategory", v, v, i)),
  ...["Primeira reunião", "Levantamento", "Visita técnica", "Acompanhamento de obra", "Reunião com cliente", "Outra"].map((v, i) => preset("visitType", v, v, i)),
];
