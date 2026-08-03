import { AccessibilityProfile, CapCapability, ComfortLevel } from "../domain/cap-library-types";

export const capabilityLabels: Record<CapCapability, string> = {
  full_calculator: "Cálculo completo", preliminary_calculator: "Cálculo preliminar",
  reference_only: "Somente referência", experimental: "Experimental",
};
export const comfortLabels: Record<ComfortLevel, string> = {
  compact: "Compacto", comfortable: "Confortável", generous: "Generoso", custom: "Personalizado",
};
export const accessibilityLabels: Record<AccessibilityProfile, string> = {
  standard: "Padrão", reduced_mobility: "Mobilidade reduzida", wheelchair: "Cadeira de rodas",
  elderly: "Pessoa idosa", custom: "Personalizado",
};
