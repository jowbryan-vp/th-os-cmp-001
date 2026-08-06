// Rótulo/valor apresentacional puro, sem estado nem regra de negócio.
// Compartilhado por HonWorkspace e HonResultPanel.
export function Metric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
