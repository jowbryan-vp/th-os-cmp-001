"use client";

import { useMemo, useState } from "react";
import logoHorizontalPositive from "../src/assets/brand/th-logo-horizontal-positive.png";
import logoVerticalPositive from "../src/assets/brand/th-logo-vertical-positive.png";

const phases = [
  "Estudo preliminar e moodboard",
  "Imagens e perspectivas 3D",
  "Projeto legal / arquitetônico",
  "Projeto executivo de interiores",
];

const scopeGroups = [
  {
    title: "Estudo preliminar",
    items: ["Briefing", "Moodboard", "Planta baixa", "Planta com layout"],
  },
  {
    title: "Projeto arquitetônico",
    items: [
      "Detalhamento de fachadas",
      "Planta de cortes",
      "Planta de cobertura",
      "Emissão de RRT",
    ],
  },
  {
    title: "Projeto de interiores",
    items: [
      "Projeto luminotécnico",
      "Paginação de piso e parede",
      "Detalhamento de bancadas",
      "Detalhamento de marcenaria",
    ],
  },
];

function BrandLogo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const source = compact ? logoVerticalPositive : logoHorizontalPositive;
  return (
    <span
      className={`brand-crop ${
        compact ? "brand-crop--vertical" : "brand-crop--horizontal"
      } ${className}`}
    >
      <img src={source.src} alt="TH Arquitetura" />
    </span>
  );
}

export default function Home() {
  const [selectedScope, setSelectedScope] = useState<string[]>([
    "Briefing",
    "Moodboard",
    "Planta baixa",
    "Imagens e perspectivas 3D",
    "Detalhamento de fachadas",
    "Emissão de RRT",
  ]);
  const [saved, setSaved] = useState(false);

  const scopeCount = useMemo(() => selectedScope.length, [selectedScope]);

  function toggleScope(item: string) {
    setSelectedScope((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
    );
  }

  function saveDraft() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3200);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="#inicio" className="brand-link" aria-label="TH Arquitetura - início">
          <BrandLogo className="desktop-logo" />
          <BrandLogo compact className="mobile-logo" />
        </a>
        <nav className="main-nav" aria-label="Navegação principal">
          <a className="nav-link nav-link--active" href="#contrato">
            Contrato
          </a>
          <a className="nav-link" href="#escopo">
            Escopo
          </a>
          <a className="nav-link" href="#prazos">
            Prazos
          </a>
        </nav>
        <div className="topbar-actions">
          <span className="draft-status">
            <span aria-hidden="true" />
            Rascunho salvo
          </span>
          <button className="button button--ghost" type="button" onClick={saveDraft}>
            Salvar
          </button>
          <button className="button button--primary" type="button" onClick={() => window.print()}>
            Emitir contrato
          </button>
        </div>
      </header>

      <main id="inicio" className="workspace">
        <section className="content-column" aria-labelledby="page-title">
          <div className="print-logo" aria-hidden="true">
            <BrandLogo />
          </div>
          <div className="eyebrow-row">
            <span className="eyebrow">Novo contrato</span>
            <span className="contract-id">TH-2026-014</span>
          </div>
          <div className="page-heading">
            <div>
              <h1 id="page-title">Projeto residencial</h1>
              <p>
                Organize as informações essenciais antes de emitir o instrumento
                contratual.
              </p>
            </div>
            <span className="status-badge">Em preparação</span>
          </div>

          <section id="contrato" className="form-section">
            <div className="section-heading">
              <span className="section-number">01</span>
              <div>
                <h2>Contratante e projeto</h2>
                <p>Dados que identificam as partes e o objeto do contrato.</p>
              </div>
            </div>
            <div className="card form-card">
              <div className="field-grid">
                <label className="field field--wide">
                  <span>Nome completo do contratante</span>
                  <input defaultValue="Marina Albuquerque" />
                </label>
                <label className="field">
                  <span>CPF</span>
                  <input defaultValue="000.000.000-00" inputMode="numeric" />
                </label>
                <label className="field">
                  <span>E-mail</span>
                  <input defaultValue="marina@exemplo.com.br" type="email" />
                </label>
                <label className="field field--wide">
                  <span>Local do projeto</span>
                  <input defaultValue="Condomínio Reserva do Bosque, Manaus - AM" />
                </label>
                <label className="field">
                  <span>Área estimada</span>
                  <div className="input-suffix">
                    <input defaultValue="285" inputMode="decimal" />
                    <span>m²</span>
                  </div>
                </label>
                <label className="field">
                  <span>Tipologia</span>
                  <select defaultValue="Residencial">
                    <option>Residencial</option>
                    <option>Comercial</option>
                    <option>Interiores</option>
                  </select>
                </label>
                <label className="field field--full">
                  <span>Ambientes contemplados</span>
                  <textarea defaultValue="Sala integrada, cozinha, varanda, suíte principal, duas suítes, escritório e área externa." />
                </label>
              </div>
            </div>
          </section>

          <section id="escopo" className="form-section">
            <div className="section-heading">
              <span className="section-number">02</span>
              <div>
                <h2>Escopo contratado</h2>
                <p>Selecione as entregas previstas para este projeto.</p>
              </div>
            </div>
            <div className="scope-grid">
              {scopeGroups.map((group) => (
                <article className="card scope-card" key={group.title}>
                  <h3>{group.title}</h3>
                  <div className="check-list">
                    {group.items.map((item) => {
                      const checked = selectedScope.includes(item);
                      return (
                        <label className="check-row" key={item}>
                          <input
                            checked={checked}
                            onChange={() => toggleScope(item)}
                            type="checkbox"
                          />
                          <span className="custom-check" aria-hidden="true">
                            {checked ? "✓" : ""}
                          </span>
                          <span>{item}</span>
                        </label>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
            <button className="text-action" type="button">
              + Adicionar entrega personalizada
            </button>
          </section>

          <section id="prazos" className="form-section">
            <div className="section-heading">
              <span className="section-number">03</span>
              <div>
                <h2>Etapas e prazos</h2>
                <p>Planejamento das quatro fases previstas no contrato-base.</p>
              </div>
            </div>
            <div className="card timeline-card">
              {phases.map((phase, index) => (
                <div className="phase-row" key={phase}>
                  <span className="phase-index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="phase-copy">
                    <strong>{phase}</strong>
                    <span>Após aprovação da etapa anterior</span>
                  </div>
                  <label className="days-field">
                    <span className="sr-only">Prazo de {phase}</span>
                    <input defaultValue={index === 0 ? "20" : "15"} inputMode="numeric" />
                    <span>dias</span>
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">04</span>
              <div>
                <h2>Honorários</h2>
                <p>Valor, parcelas e condições comerciais do projeto.</p>
              </div>
            </div>
            <div className="card form-card">
              <div className="field-grid">
                <label className="field">
                  <span>Valor total</span>
                  <div className="input-prefix">
                    <span>R$</span>
                    <input defaultValue="24.000,00" inputMode="decimal" />
                  </div>
                </label>
                <label className="field">
                  <span>Número de parcelas</span>
                  <select defaultValue="3 parcelas">
                    <option>À vista</option>
                    <option>2 parcelas</option>
                    <option>3 parcelas</option>
                    <option>4 parcelas</option>
                  </select>
                </label>
                <label className="field">
                  <span>Visitas incluídas</span>
                  <div className="input-suffix">
                    <input defaultValue="4" inputMode="numeric" />
                    <span>visitas</span>
                  </div>
                </label>
                <label className="field">
                  <span>Validade do contrato</span>
                  <div className="input-suffix">
                    <input defaultValue="12" inputMode="numeric" />
                    <span>meses</span>
                  </div>
                </label>
              </div>
            </div>
          </section>

          <div className="completion-card">
            <span className="completion-mark" aria-hidden="true">✓</span>
            <div>
              <strong>Informações essenciais preenchidas</strong>
              <p>Revise o resumo antes de emitir o contrato para assinatura.</p>
            </div>
            <button className="button button--primary" type="button" onClick={() => window.print()}>
              Revisar e emitir
            </button>
          </div>
        </section>

        <aside className="summary-column" aria-label="Resumo do contrato">
          <div className="summary-card">
            <div className="summary-brand">
              <BrandLogo />
            </div>
            <span className="summary-kicker">Resumo do contrato</span>
            <h2>Marina Albuquerque</h2>
            <p>Projeto arquitetônico e de interiores residencial</p>

            <dl className="summary-list">
              <div>
                <dt>Local</dt>
                <dd>Manaus - AM</dd>
              </div>
              <div>
                <dt>Área estimada</dt>
                <dd>285 m²</dd>
              </div>
              <div>
                <dt>Entregas</dt>
                <dd>{scopeCount} selecionadas</dd>
              </div>
              <div>
                <dt>Prazo estimado</dt>
                <dd>65 dias úteis</dd>
              </div>
            </dl>

            <div className="summary-total">
              <span>Honorários</span>
              <strong>R$ 24.000,00</strong>
              <small>3 parcelas de R$ 8.000,00</small>
            </div>
            <div className="summary-note">
              <span aria-hidden="true">i</span>
              <p>
                A emissão abre a versão de impressão, pronta para salvar em PDF
                ou encaminhar para assinatura.
              </p>
            </div>
            <button className="button button--dark button--full" type="button" onClick={() => window.print()}>
              Visualizar contrato
            </button>
          </div>
          <p className="privacy-note">
            Os dados deste rascunho permanecem neste dispositivo.
          </p>
        </aside>
      </main>

      {saved && (
        <div className="toast" role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Rascunho atualizado</strong>
            <p>Suas alterações foram salvas.</p>
          </div>
        </div>
      )}
    </div>
  );
}
