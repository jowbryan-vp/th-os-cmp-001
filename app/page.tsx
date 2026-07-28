"use client";

import {
  ChangeEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import logoHorizontalPositive from "../src/assets/brand/th-logo-horizontal-positive.png";
import logoVerticalPositive from "../src/assets/brand/th-logo-vertical-positive.png";
import { getProjectRepository } from "../src/data/project-repository";
import {
  ClientRecord,
  DecisionRecord,
  DocumentReference,
  NeedsItem,
  PendingRecord,
  ProjectMasterRecord,
  ProjectReadiness,
  TeamMember,
  TimelineItem,
  ValidationResult,
  VisitRecord,
  calculateProjectProgress,
  createEmptyProject,
  createId,
  migrateProject,
  pilotProject,
  preliminaryScopeOptions,
  validateProject,
} from "../src/domain/project-master-record";

type WorkspaceView = "projects" | "record";
type SaveState = "loading" | "saved" | "saving" | "error";

const sections = [
  ["identification", "Identificação"],
  ["clients", "Clientes"],
  ["property", "Imóvel"],
  ["context", "Contexto"],
  ["scope", "Escopo e programa"],
  ["planning", "Prazos e orçamento"],
  ["visits", "Visitas e documentos"],
  ["team", "Responsáveis"],
  ["records", "Decisões e pendências"],
  ["history", "Histórico"],
] as const;

function BrandLogo({ compact = false }: { compact?: boolean }) {
  const source = compact ? logoVerticalPositive : logoHorizontalPositive;
  return (
    <span className={`brand-crop brand-crop--${compact ? "vertical" : "horizontal"}`}>
      <Image src={source} alt="TH Arquitetura" priority />
    </span>
  );
}

function formatDate(value: string) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value));
}

function historyEntry(action: string, detail: string) {
  return {
    id: createId("history"),
    at: new Date().toISOString(),
    action,
    detail,
  };
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-heading">
      <span className="section-number">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function EmptyCollection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">+</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export default function Home() {
  const repository = useMemo(() => getProjectRepository(), []);
  const [projects, setProjects] = useState<ProjectMasterRecord[]>([pilotProject]);
  const [current, setCurrent] = useState<ProjectMasterRecord>(pilotProject);
  const [view, setView] = useState<WorkspaceView>("projects");
  const [showArchived, setShowArchived] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [notice, setNotice] = useState("");
  const hydrated = useRef(false);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        await repository.ensurePilot();
        const records = await repository.list();
        setProjects(records);
        const pilot = records.find((record) => record.code === "TH-2026-001");
        if (pilot) setCurrent(pilot);
        setSaveState("saved");
        hydrated.current = true;
      } catch {
        setSaveState("error");
      }
    }
    void load();
  }, [repository]);

  useEffect(() => {
    if (!hydrated.current || view !== "record") return;
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        const saved = await repository.save(current);
        setProjects((items) => {
          const exists = items.some((item) => item.id === saved.id);
          const next = exists
            ? items.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...items];
          return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [current, repository, view]);

  const progress = calculateProjectProgress(current);
  const primaryClient =
    current.clients.find((client) => client.primary) ?? current.clients[0];
  const openPending = current.pending.filter((item) => item.status === "open").length;
  const visibleProjects = projects.filter(
    (project) => showArchived || project.status !== "archived",
  );

  function updateProject(patch: Partial<ProjectMasterRecord>) {
    setCurrent((project) => ({ ...project, ...patch }));
    setValidation(null);
  }

  function updateCollection<T extends { id: string }>(
    key:
      | "clients"
      | "needsProgram"
      | "timeline"
      | "visits"
      | "documents"
      | "team"
      | "decisions"
      | "pending",
    id: string,
    patch: Partial<T>,
  ) {
    setCurrent((project) => ({
      ...project,
      [key]: (project[key] as T[]).map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
    setValidation(null);
  }

  function removeCollectionItem(
    key:
      | "clients"
      | "needsProgram"
      | "timeline"
      | "visits"
      | "documents"
      | "team"
      | "decisions"
      | "pending",
    id: string,
  ) {
    setCurrent((project) => ({
      ...project,
      [key]: (project[key] as { id: string }[]).filter((item) => item.id !== id),
    }));
  }

  async function createProject() {
    const code = await repository.nextCode();
    const project = createEmptyProject(code);
    setCurrent(project);
    setProjects((items) => [project, ...items]);
    setView("record");
    setNotice(`Cadastro ${code} criado.`);
  }

  function openProject(project: ProjectMasterRecord) {
    setCurrent(project);
    setView("record");
    setValidation(null);
  }

  async function duplicateProject(project: ProjectMasterRecord) {
    const code = await repository.nextCode();
    const now = new Date().toISOString();
    const duplicate: ProjectMasterRecord = {
      ...structuredClone(project),
      id: createId("project"),
      code,
      title: `${project.title} — cópia`,
      status: "draft",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      history: [
        historyEntry("Cadastro duplicado", `Criado a partir de ${project.code}.`),
      ],
    };
    const saved = await repository.save(duplicate);
    setProjects((items) => [saved, ...items]);
    setCurrent(saved);
    setView("record");
    setNotice(`${code} criado a partir de ${project.code}.`);
  }

  async function changeArchiveState(project: ProjectMasterRecord, archive: boolean) {
    const updated: ProjectMasterRecord = {
      ...project,
      status: archive ? "archived" : "active",
      archivedAt: archive ? new Date().toISOString() : null,
      history: [
        ...project.history,
        historyEntry(archive ? "Cadastro arquivado" : "Cadastro restaurado", project.code),
      ],
    };
    const saved = await repository.save(updated);
    setProjects((items) => items.map((item) => (item.id === saved.id ? saved : item)));
    if (current.id === saved.id) setCurrent(saved);
    setNotice(archive ? "Projeto arquivado." : "Projeto restaurado.");
  }

  async function deleteProject(project: ProjectMasterRecord) {
    if (!window.confirm(`Excluir definitivamente ${project.code}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    await repository.remove(project.id);
    const remaining = projects.filter((item) => item.id !== project.id);
    setProjects(remaining);
    setView("projects");
    setNotice("Cadastro excluído.");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(current, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${current.code.toLowerCase()}-cmp.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Cadastro exportado em JSON.");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = migrateProject(JSON.parse(await file.text()));
      const conflict = projects.some(
        (project) => project.code === imported.code && project.id !== imported.id,
      );
      const project = conflict
        ? {
            ...imported,
            id: createId("project"),
            code: await repository.nextCode(),
            history: [
              ...imported.history,
              historyEntry("Cadastro importado", `Código original: ${imported.code}.`),
            ],
          }
        : imported;
      const saved = await repository.save(project);
      setProjects((items) => [
        saved,
        ...items.filter((item) => item.id !== saved.id),
      ]);
      setCurrent(saved);
      setView("record");
      setNotice(`Cadastro ${saved.code} importado.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível importar o JSON.");
    }
  }

  function runValidation(level: ProjectReadiness) {
    const result = validateProject(current, level);
    setValidation(result);
    if (result.valid && current.status === "draft") {
      updateProject({
        status: "active",
        history: [
          ...current.history,
          historyEntry("Cadastro validado", `Pronto para ${level}.`),
        ],
      });
    }
  }

  if (view === "projects") {
    return (
      <div className="app-shell">
        <header className="topbar">
          <a href="#projects" className="brand-link" aria-label="TH Arquitetura — TH OS">
            <BrandLogo />
          </a>
          <div className="product-signature">
            <strong>TH OS</strong>
            <span>Cadastro Mestre do Projeto · CMP-001</span>
          </div>
          <div className="topbar-actions">
            <button
              className="button button--ghost"
              type="button"
              onClick={() => importInput.current?.click()}
            >
              Importar JSON
            </button>
            <button className="button button--primary" type="button" onClick={createProject}>
              Novo projeto
            </button>
          </div>
        </header>

        <main id="projects" className="projects-page">
          <div className="projects-heading">
            <div>
              <span className="eyebrow">TH OS · CMP-001</span>
              <h1>Cadastro Mestre do Projeto</h1>
              <p>
                Uma fonte única para organizar contexto, pessoas, decisões e próximos
                passos de cada projeto.
              </p>
            </div>
            <div className="projects-metric">
              <strong>{projects.filter((project) => project.status !== "archived").length}</strong>
              <span>projetos ativos</span>
            </div>
          </div>

          <div className="list-toolbar">
            <h2>Projetos</h2>
            <label className="archive-filter">
              <input
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                type="checkbox"
              />
              Mostrar arquivados
            </label>
          </div>

          {visibleProjects.length === 0 ? (
            <EmptyCollection
              title="Nenhum projeto nesta visualização"
              description="Crie um cadastro ou exiba os projetos arquivados."
            />
          ) : (
            <div className="project-grid">
              {visibleProjects.map((project) => {
                const projectProgress = calculateProjectProgress(project);
                return (
                  <article className="project-card" key={project.id}>
                    <button
                      className="project-card__open"
                      type="button"
                      onClick={() => openProject(project)}
                    >
                      <div className="project-card__top">
                        <span className="record-code">{project.code}</span>
                        <span className={`status-chip status-chip--${project.status}`}>
                          {project.status === "archived"
                            ? "Arquivado"
                            : project.status === "active"
                              ? "Ativo"
                              : "Rascunho"}
                        </span>
                      </div>
                      <h3>{project.title}</h3>
                      <p>{project.projectType || "Tipo ainda não informado"}</p>
                      <div className="progress-row">
                        <span>Completude</span>
                        <strong>{projectProgress}%</strong>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${projectProgress}%` }} />
                      </div>
                      <small>Atualizado em {formatDate(project.updatedAt)}</small>
                    </button>
                    <div className="project-card__actions">
                      <button type="button" onClick={() => duplicateProject(project)}>
                        Duplicar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          changeArchiveState(project, project.status !== "archived")
                        }
                      >
                        {project.status === "archived" ? "Restaurar" : "Arquivar"}
                      </button>
                      {project.status === "archived" && (
                        <button
                          className="danger-action"
                          type="button"
                          onClick={() => deleteProject(project)}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
        <input
          ref={importInput}
          className="sr-only"
          accept="application/json,.json"
          type="file"
          onChange={importJson}
        />
        {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar record-topbar">
        <button
          className="brand-link brand-button"
          type="button"
          aria-label="Voltar para projetos"
          onClick={() => setView("projects")}
        >
          <BrandLogo />
        </button>
        <nav className="main-nav" aria-label="Seções do cadastro">
          {sections.slice(0, 5).map(([id, label], index) => (
            <a className={index === 0 ? "nav-link nav-link--active" : "nav-link"} href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </nav>
        <div className="topbar-actions">
          <span className={`save-status save-status--${saveState}`}>
            <span aria-hidden="true" />
            {saveState === "loading"
              ? "Carregando"
              : saveState === "saving"
                ? "Salvando…"
                : saveState === "error"
                  ? "Erro ao salvar"
                  : "Salvo neste dispositivo"}
          </span>
          <button className="button button--ghost" type="button" onClick={exportJson}>
            Exportar JSON
          </button>
          <button className="button button--primary" type="button" onClick={() => window.print()}>
            Imprimir resumo
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="content-column" aria-labelledby="page-title">
          <div className="print-header">
            <BrandLogo />
            <div>
              <strong>TH OS</strong>
              <span>Cadastro Mestre do Projeto · CMP-001</span>
            </div>
          </div>
          <div className="eyebrow-row">
            <button className="back-action" type="button" onClick={() => setView("projects")}>
              ← Todos os projetos
            </button>
            <span className="record-code">{current.code}</span>
          </div>
          <div className="page-heading">
            <div>
              <span className="eyebrow">Cadastro Mestre do Projeto</span>
              <h1 id="page-title">{current.title || "Projeto sem nome"}</h1>
              <p>
                Registro central de informações para orientar equipe, reuniões e
                futuras propostas.
              </p>
            </div>
            <span className={`status-chip status-chip--${current.status}`}>
              {current.status === "archived"
                ? "Arquivado"
                : current.status === "active"
                  ? "Ativo"
                  : "Rascunho"}
            </span>
          </div>

          <section id="identification" className="form-section">
            <SectionHeading
              number="01"
              title="Identificação do projeto"
              description="Informações essenciais para reconhecer e localizar o cadastro."
            />
            <div className="card form-card">
              <div className="field-grid">
                <label className="field field--wide">
                  <span>Nome do projeto</span>
                  <input
                    value={current.title}
                    onChange={(event) => updateProject({ title: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Tipo de projeto</span>
                  <input
                    value={current.projectType}
                    placeholder="Ex.: Arquitetura residencial"
                    onChange={(event) => updateProject({ projectType: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Fase atual</span>
                  <input
                    value={current.phase}
                    onChange={(event) => updateProject({ phase: event.target.value })}
                  />
                </label>
                <label className="field field--full">
                  <span>Síntese inicial</span>
                  <textarea
                    value={current.summary}
                    placeholder="Resuma a demanda, o momento do projeto e o resultado esperado."
                    onChange={(event) => updateProject({ summary: event.target.value })}
                  />
                </label>
              </div>
            </div>
          </section>

          <section id="clients" className="form-section">
            <SectionHeading
              number="02"
              title="Clientes"
              description="Pessoas relacionadas à contratação e às decisões do projeto."
            />
            <div className="collection-stack">
              {current.clients.map((client, index) => (
                <article className="card collection-card" key={client.id}>
                  <div className="collection-card__heading">
                    <h3>Cliente {index + 1}</h3>
                    {current.clients.length > 1 && (
                      <button type="button" onClick={() => removeCollectionItem("clients", client.id)}>
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="field-grid">
                    <label className="field field--wide">
                      <span>Nome</span>
                      <input
                        value={client.name}
                        onChange={(event) =>
                          updateCollection<ClientRecord>("clients", client.id, {
                            name: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Documento</span>
                      <input
                        value={client.document}
                        onChange={(event) =>
                          updateCollection<ClientRecord>("clients", client.id, {
                            document: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Papel no projeto</span>
                      <input
                        value={client.role}
                        onChange={(event) =>
                          updateCollection<ClientRecord>("clients", client.id, {
                            role: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>E-mail</span>
                      <input
                        type="email"
                        value={client.email}
                        onChange={(event) =>
                          updateCollection<ClientRecord>("clients", client.id, {
                            email: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Telefone</span>
                      <input
                        value={client.phone}
                        onChange={(event) =>
                          updateCollection<ClientRecord>("clients", client.id, {
                            phone: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="check-row field--full">
                      <input
                        checked={client.primary}
                        type="checkbox"
                        onChange={(event) =>
                          setCurrent((project) => ({
                            ...project,
                            clients: project.clients.map((item) => ({
                              ...item,
                              primary: event.target.checked ? item.id === client.id : false,
                            })),
                          }))
                        }
                      />
                      <span className="custom-check" aria-hidden="true">
                        {client.primary ? "✓" : ""}
                      </span>
                      <span>Contato principal</span>
                    </label>
                  </div>
                </article>
              ))}
            </div>
            <button
              className="text-action"
              type="button"
              onClick={() =>
                updateProject({
                  clients: [
                    ...current.clients,
                    {
                      id: createId("client"),
                      name: "",
                      document: "",
                      email: "",
                      phone: "",
                      role: "Cliente",
                      primary: false,
                    },
                  ],
                })
              }
            >
              + Adicionar cliente
            </button>
          </section>

          <section id="property" className="form-section">
            <SectionHeading
              number="03"
              title="Dados do imóvel"
              description="Localização, características conhecidas e condicionantes."
            />
            <div className="card form-card">
              <div className="field-grid">
                {[
                  ["address", "Endereço"],
                  ["city", "Cidade"],
                  ["state", "UF"],
                  ["postalCode", "CEP"],
                  ["area", "Área estimada"],
                  ["typology", "Tipologia"],
                  ["occupancy", "Uso ou ocupação"],
                ].map(([key, label], index) => (
                  <label className={`field ${index === 0 ? "field--wide" : ""}`} key={key}>
                    <span>{label}</span>
                    <input
                      value={current.property[key as keyof typeof current.property]}
                      onChange={(event) =>
                        updateProject({
                          property: { ...current.property, [key]: event.target.value },
                        })
                      }
                    />
                  </label>
                ))}
                <label className="field field--full">
                  <span>Condicionantes conhecidas</span>
                  <textarea
                    value={current.property.constraints}
                    onChange={(event) =>
                      updateProject({
                        property: {
                          ...current.property,
                          constraints: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </section>

          <section id="context" className="form-section">
            <SectionHeading
              number="04"
              title="Contexto do projeto"
              description="Cenário, motivações, clima, entorno e objetivos compartilhados."
            />
            <div className="card form-card">
              <div className="field-grid">
                <label className="field field--full">
                  <span>Contexto e condicionantes</span>
                  <textarea
                    value={current.context}
                    onChange={(event) => updateProject({ context: event.target.value })}
                  />
                </label>
                <label className="field field--full">
                  <span>Objetivos do projeto</span>
                  <textarea
                    value={current.objectives}
                    onChange={(event) => updateProject({ objectives: event.target.value })}
                  />
                </label>
              </div>
            </div>
          </section>

          <section id="scope" className="form-section">
            <SectionHeading
              number="05"
              title="Escopo preliminar e programa"
              description="Hipóteses iniciais, ainda sujeitas a validação e desenvolvimento."
            />
            <div className="card scope-card">
              <h3>Escopo preliminar</h3>
              <div className="scope-options">
                {preliminaryScopeOptions.map((option) => {
                  const checked = current.preliminaryScope.includes(option);
                  return (
                    <label className="check-row" key={option}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          updateProject({
                            preliminaryScope: checked
                              ? current.preliminaryScope.filter((item) => item !== option)
                              : [...current.preliminaryScope, option],
                          })
                        }
                      />
                      <span className="custom-check" aria-hidden="true">
                        {checked ? "✓" : ""}
                      </span>
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="subsection-heading">
              <h3>Programa inicial de necessidades</h3>
              <button
                className="text-action"
                type="button"
                onClick={() =>
                  updateProject({
                    needsProgram: [
                      ...current.needsProgram,
                      {
                        id: createId("need"),
                        environment: "",
                        quantity: 1,
                        requirements: "",
                      },
                    ],
                  })
                }
              >
                + Adicionar ambiente
              </button>
            </div>
            {current.needsProgram.length === 0 ? (
              <EmptyCollection
                title="Programa ainda não iniciado"
                description="Adicione ambientes ou grupos de necessidades identificados no briefing."
              />
            ) : (
              <div className="table-card">
                {current.needsProgram.map((item) => (
                  <div className="table-row table-row--needs" key={item.id}>
                    <label className="field">
                      <span>Ambiente ou necessidade</span>
                      <input
                        value={item.environment}
                        onChange={(event) =>
                          updateCollection<NeedsItem>("needsProgram", item.id, {
                            environment: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Qtd.</span>
                      <input
                        min="1"
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          updateCollection<NeedsItem>("needsProgram", item.id, {
                            quantity: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Requisitos iniciais</span>
                      <input
                        value={item.requirements}
                        onChange={(event) =>
                          updateCollection<NeedsItem>("needsProgram", item.id, {
                            requirements: event.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      className="row-remove"
                      type="button"
                      aria-label={`Remover ${item.environment || "item"}`}
                      onClick={() => removeCollectionItem("needsProgram", item.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="planning" className="form-section">
            <SectionHeading
              number="06"
              title="Prazos e orçamento"
              description="Referências preliminares para planejamento, sem gerar proposta ou contrato."
            />
            <div className="card form-card">
              <div className="field-grid">
                <label className="field">
                  <span>Orçamento estimado do projeto</span>
                  <input
                    value={current.estimatedBudget}
                    placeholder="Faixa ou valor informado"
                    onChange={(event) => updateProject({ estimatedBudget: event.target.value })}
                  />
                </label>
                <label className="field field--wide">
                  <span>Premissas e observações do orçamento</span>
                  <textarea
                    value={current.budgetNotes}
                    onChange={(event) => updateProject({ budgetNotes: event.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className="subsection-heading">
              <h3>Marcos preliminares</h3>
              <button
                className="text-action"
                type="button"
                onClick={() =>
                  updateProject({
                    timeline: [
                      ...current.timeline,
                      { id: createId("timeline"), title: "", targetDate: "", notes: "" },
                    ],
                  })
                }
              >
                + Adicionar marco
              </button>
            </div>
            {current.timeline.length === 0 ? (
              <EmptyCollection
                title="Nenhum marco definido"
                description="Registre datas desejadas, reuniões ou entregas preliminares."
              />
            ) : (
              <div className="table-card">
                {current.timeline.map((item) => (
                  <div className="table-row table-row--timeline" key={item.id}>
                    <label className="field">
                      <span>Marco</span>
                      <input
                        value={item.title}
                        onChange={(event) =>
                          updateCollection<TimelineItem>("timeline", item.id, {
                            title: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Data desejada</span>
                      <input
                        type="date"
                        value={item.targetDate}
                        onChange={(event) =>
                          updateCollection<TimelineItem>("timeline", item.id, {
                            targetDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Observações</span>
                      <input
                        value={item.notes}
                        onChange={(event) =>
                          updateCollection<TimelineItem>("timeline", item.id, {
                            notes: event.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      className="row-remove"
                      type="button"
                      onClick={() => removeCollectionItem("timeline", item.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="visits" className="form-section">
            <SectionHeading
              number="07"
              title="Visitas e documentos"
              description="Registros de campo e referências documentais; sem upload de arquivos."
            />
            <CollectionEditor
              title="Visitas"
              empty="Nenhuma visita registrada."
              action="+ Registrar visita"
              items={current.visits}
              onAdd={() =>
                updateProject({
                  visits: [
                    ...current.visits,
                    {
                      id: createId("visit"),
                      date: "",
                      purpose: "",
                      participants: "",
                      notes: "",
                    },
                  ],
                })
              }
              onRemove={(id) => removeCollectionItem("visits", id)}
              render={(item: VisitRecord) => (
                <>
                  <Input label="Data" type="date" value={item.date} onChange={(value) => updateCollection<VisitRecord>("visits", item.id, { date: value })} />
                  <Input label="Finalidade" value={item.purpose} onChange={(value) => updateCollection<VisitRecord>("visits", item.id, { purpose: value })} />
                  <Input label="Participantes" value={item.participants} onChange={(value) => updateCollection<VisitRecord>("visits", item.id, { participants: value })} />
                  <Input label="Notas" value={item.notes} onChange={(value) => updateCollection<VisitRecord>("visits", item.id, { notes: value })} />
                </>
              )}
            />
            <CollectionEditor
              title="Referências documentais"
              empty="Nenhuma referência cadastrada."
              action="+ Adicionar referência"
              items={current.documents}
              onAdd={() =>
                updateProject({
                  documents: [
                    ...current.documents,
                    {
                      id: createId("document"),
                      title: "",
                      type: "",
                      reference: "",
                      notes: "",
                    },
                  ],
                })
              }
              onRemove={(id) => removeCollectionItem("documents", id)}
              render={(item: DocumentReference) => (
                <>
                  <Input label="Documento" value={item.title} onChange={(value) => updateCollection<DocumentReference>("documents", item.id, { title: value })} />
                  <Input label="Tipo" value={item.type} onChange={(value) => updateCollection<DocumentReference>("documents", item.id, { type: value })} />
                  <Input label="Referência ou localização" value={item.reference} onChange={(value) => updateCollection<DocumentReference>("documents", item.id, { reference: value })} />
                  <Input label="Observações" value={item.notes} onChange={(value) => updateCollection<DocumentReference>("documents", item.id, { notes: value })} />
                </>
              )}
            />
          </section>

          <section id="team" className="form-section">
            <SectionHeading
              number="08"
              title="Responsáveis e parceiros"
              description="Equipe interna, consultores, fornecedores e interlocutores."
            />
            <CollectionEditor
              title="Participantes do projeto"
              empty="Nenhum responsável ou parceiro cadastrado."
              action="+ Adicionar participante"
              items={current.team}
              onAdd={() =>
                updateProject({
                  team: [
                    ...current.team,
                    { id: createId("team"), name: "", role: "", contact: "", organization: "" },
                  ],
                })
              }
              onRemove={(id) => removeCollectionItem("team", id)}
              render={(item: TeamMember) => (
                <>
                  <Input label="Nome" value={item.name} onChange={(value) => updateCollection<TeamMember>("team", item.id, { name: value })} />
                  <Input label="Responsabilidade" value={item.role} onChange={(value) => updateCollection<TeamMember>("team", item.id, { role: value })} />
                  <Input label="Organização" value={item.organization} onChange={(value) => updateCollection<TeamMember>("team", item.id, { organization: value })} />
                  <Input label="Contato" value={item.contact} onChange={(value) => updateCollection<TeamMember>("team", item.id, { contact: value })} />
                </>
              )}
            />
          </section>

          <section id="records" className="form-section">
            <SectionHeading
              number="09"
              title="Decisões e pendências"
              description="Memória objetiva do que foi definido e do que ainda precisa avançar."
            />
            <CollectionEditor
              title="Decisões"
              empty="Nenhuma decisão registrada."
              action="+ Registrar decisão"
              items={current.decisions}
              onAdd={() =>
                updateProject({
                  decisions: [
                    ...current.decisions,
                    {
                      id: createId("decision"),
                      date: new Date().toISOString().slice(0, 10),
                      title: "",
                      description: "",
                      responsible: "",
                    },
                  ],
                })
              }
              onRemove={(id) => removeCollectionItem("decisions", id)}
              render={(item: DecisionRecord) => (
                <>
                  <Input label="Data" type="date" value={item.date} onChange={(value) => updateCollection<DecisionRecord>("decisions", item.id, { date: value })} />
                  <Input label="Decisão" value={item.title} onChange={(value) => updateCollection<DecisionRecord>("decisions", item.id, { title: value })} />
                  <Input label="Descrição" value={item.description} onChange={(value) => updateCollection<DecisionRecord>("decisions", item.id, { description: value })} />
                  <Input label="Responsável" value={item.responsible} onChange={(value) => updateCollection<DecisionRecord>("decisions", item.id, { responsible: value })} />
                </>
              )}
            />
            <CollectionEditor
              title="Pendências"
              empty="Nenhuma pendência registrada."
              action="+ Adicionar pendência"
              items={current.pending}
              onAdd={() =>
                updateProject({
                  pending: [
                    ...current.pending,
                    {
                      id: createId("pending"),
                      title: "",
                      responsible: "",
                      dueDate: "",
                      priority: "medium",
                      status: "open",
                    },
                  ],
                })
              }
              onRemove={(id) => removeCollectionItem("pending", id)}
              render={(item: PendingRecord) => (
                <>
                  <Input label="Pendência" value={item.title} onChange={(value) => updateCollection<PendingRecord>("pending", item.id, { title: value })} />
                  <Input label="Responsável" value={item.responsible} onChange={(value) => updateCollection<PendingRecord>("pending", item.id, { responsible: value })} />
                  <Input label="Prazo" type="date" value={item.dueDate} onChange={(value) => updateCollection<PendingRecord>("pending", item.id, { dueDate: value })} />
                  <label className="field">
                    <span>Prioridade</span>
                    <select value={item.priority} onChange={(event) => updateCollection<PendingRecord>("pending", item.id, { priority: event.target.value as PendingRecord["priority"] })}>
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={item.status === "done"}
                      onChange={(event) => updateCollection<PendingRecord>("pending", item.id, { status: event.target.checked ? "done" : "open" })}
                    />
                    <span className="custom-check" aria-hidden="true">{item.status === "done" ? "✓" : ""}</span>
                    <span>Concluída</span>
                  </label>
                </>
              )}
            />
          </section>

          <section id="history" className="form-section">
            <SectionHeading
              number="10"
              title="Histórico"
              description="Eventos relevantes do ciclo de vida deste cadastro."
            />
            <div className="card history-list">
              {[...current.history].reverse().map((entry) => (
                <div className="history-row" key={entry.id}>
                  <span />
                  <div>
                    <strong>{entry.action}</strong>
                    <p>{entry.detail}</p>
                  </div>
                  <time>{formatDate(entry.at)}</time>
                </div>
              ))}
            </div>
          </section>

          <div className="validation-panel">
            <div>
              <span className="eyebrow">Prontidão do cadastro</span>
              <h2>Validar antes do próximo passo</h2>
              <p>As validações orientam o trabalho; não geram proposta nem contrato.</p>
            </div>
            <div className="validation-actions">
              <button className="button button--ghost" type="button" onClick={() => runValidation("draft")}>Rascunho</button>
              <button className="button button--ghost" type="button" onClick={() => runValidation("meeting")}>Reunião</button>
              <button className="button button--primary" type="button" onClick={() => runValidation("proposal")}>Proposta</button>
            </div>
          </div>
          {validation && (
            <div className={`validation-result ${validation.valid ? "validation-result--valid" : ""}`} role="status">
              <strong>
                {validation.valid
                  ? `Cadastro pronto para ${validation.level}.`
                  : `Faltam ${validation.missing.length} itens para ${validation.level}.`}
              </strong>
              {!validation.valid && (
                <ul>
                  {validation.missing.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </div>
          )}
        </section>

        <aside className="summary-column" aria-label="Resumo do cadastro">
          <div className="summary-card">
            <div className="summary-brand"><BrandLogo /></div>
            <span className="summary-kicker">TH OS · CMP-001</span>
            <h2>{current.code}</h2>
            <p>{current.title}</p>
            <div className="progress-summary">
              <div>
                <span>Completude</span>
                <strong>{progress}%</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            </div>
            <dl className="summary-list">
              <div><dt>Cliente principal</dt><dd>{primaryClient?.name || "Não informado"}</dd></div>
              <div><dt>Local</dt><dd>{[current.property.city, current.property.state].filter(Boolean).join(" · ") || "Não informado"}</dd></div>
              <div><dt>Fase</dt><dd>{current.phase || "Não informada"}</dd></div>
              <div><dt>Escopo</dt><dd>{current.preliminaryScope.length} itens</dd></div>
              <div><dt>Pendências abertas</dt><dd>{openPending}</dd></div>
              <div><dt>Versão do schema</dt><dd>v{current.schemaVersion}</dd></div>
            </dl>
            <div className="summary-note">
              <span aria-hidden="true">i</span>
              <p>Os dados são salvos automaticamente neste dispositivo por meio do IndexedDB.</p>
            </div>
            <button className="button button--dark button--full" type="button" onClick={() => window.print()}>
              Imprimir resumo
            </button>
          </div>
        </aside>
      </main>
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
    </div>
  );
}

function Input({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CollectionEditor<T extends { id: string }>({
  title,
  empty,
  action,
  items,
  onAdd,
  onRemove,
  render,
}: {
  title: string;
  empty: string;
  action: string;
  items: T[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  render: (item: T) => ReactNode;
}) {
  return (
    <div className="collection-editor">
      <div className="subsection-heading">
        <h3>{title}</h3>
        <button className="text-action" type="button" onClick={onAdd}>{action}</button>
      </div>
      {items.length === 0 ? (
        <EmptyCollection title={empty} description="Use a ação acima para criar o primeiro registro." />
      ) : (
        <div className="table-card">
          {items.map((item) => (
            <div className="table-row table-row--collection" key={item.id}>
              {render(item)}
              <button className="row-remove" type="button" onClick={() => onRemove(item.id)} aria-label="Remover registro">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return (
    <div className="toast" role="status">
      <span aria-hidden="true">✓</span>
      <div>
        <strong>{message}</strong>
        <button type="button" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
