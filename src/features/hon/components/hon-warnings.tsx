// Lista de alertas apresentacional pura: recebe os textos já prontos e só decide como
// exibi-los (alerta ou confirmação de "sem pendências"). Sem estado nem regra de negócio.
// Compartilhado por HonWorkspace e HonResultPanel.
export function Warnings({ items }: { items: string[] }) {
  return items.length
    ? <div className="hon-warnings" role="alert"><strong>Alertas financeiros ({items.length})</strong><ul>{items.map((item) => <li key={item}>⚠ {item}</li>)}</ul></div>
    : <div className="hon-ok" role="status">✓ Nenhum alerta financeiro ativo.</div>;
}
