export function parsePtBrDecimal(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = value?.trim();
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPtBrDecimal(value: number | null | undefined, maximumFractionDigits = 2): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? ""
    : value.toLocaleString("pt-BR", { maximumFractionDigits });
}

export function isValidPositiveDimension(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
