import { AccessibilityProfile, CapCapability, ComfortLevel } from "../domain/cap-library-types";

export const capabilityLabels: Record<CapCapability, string> = {
  full_calculator: "Cálculo completo", preliminary_calculator: "Cálculo preliminar",
  reference_only: "Somente referência", experimental: "Experimental",
};
export const comfortLabels: Record<ComfortLevel, string> = {
  compact: "Mínimo / compacto", comfortable: "Confortável / recomendado", generous: "Generoso", custom: "Personalizado",
};
export const accessibilityLabels: Record<AccessibilityProfile, string> = {
  standard: "Padrão", reduced_mobility: "Mobilidade reduzida", wheelchair: "Acessível — referência NBR 9050",
  elderly: "Pessoa idosa", custom: "Personalizado",
};
