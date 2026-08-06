// Formatação e parsing de valores monetários (centavos <-> texto pt-BR). Funções puras,
// sem estado nem regra de negócio, compartilhadas por HonWorkspace e HonResultPanel.

export const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const parseMoney = (value: string) => {
  const normalized = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!normalized) return 0;
  const decimal = normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const parsed = Number(decimal);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
};

export const inputMoney = (cents: number) => (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

// Traduz uma exceção capturada em texto seguro para o usuário. Só repassa a mensagem
// verbatim quando ela está numa lista de mensagens conhecidas e já curadas (frases de
// validação de domínio em português); qualquer outro erro — incluindo Error instances com
// mensagens técnicas inesperadas (bug, Zod, IndexedDB) — cai no fallback genérico, nunca
// expõe stack trace nem texto técnico bruto ao usuário.
export function domainErrorMessage(reason: unknown, knownMessages: readonly string[], fallback: string): string {
  if (reason instanceof Error && knownMessages.includes(reason.message)) return reason.message;
  return fallback;
}
