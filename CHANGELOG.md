# Changelog

## Não lançado — HON-003 (Proposal Builder)

- adiciona `ProposalDraft`: proposta comercial montada a partir de um estudo HON calculado, com
  snapshot imutável do escopo (nome, descrições, entregáveis, exclusões, premissas) e cópia dos
  totais — nunca recalculados dentro da proposta;
- nova aba "Proposta comercial" no `HonWorkspace` e botão "Incorporar à proposta" no Resultado;
- idempotência (uma proposta por estudo, aplicada na camada de aplicação) e detecção de
  "cálculo mais recente disponível" com confirmação explícita antes de sobrescrever;
- campos manuais (título, introdução, condições comerciais, observações, exclusões/premissas
  adicionais, validade) livres e nunca sobrescritos por uma atualização a partir do HON;
- prévia interna consolidada dentro da própria aba;
- IndexedDB v6 e backup v4 com `honSchemaVersion` 4, mantendo compatibilidade com backups
  anteriores ao HON-003.

## Não lançado — DS-001

- consolida tokens de marca, tipografia, espaço, bordas, sombras, movimento, camadas e breakpoints;
- introduz biblioteca acessível de ações, formulários, navegação, feedback, dados e estados;
- migra incrementalmente CMP-001, CAP-001 e HON-001 sem alterar regras de negócio;
- adiciona vitrine exclusiva de desenvolvimento, documentação, testes de interação e referências visuais responsivas;
- padroniza Lucide como única biblioteca de ícones.

## Não lançado — HON-001 v1.0.0

- motor de preço baseado no custo do serviço;
- perfis, custo-hora, investimentos, serviços, fatores, parceiros, viagens e obra;
- cenários, pagamentos, snapshots e exportações interna/comercial;
- integração CMP/CAP, IndexedDB v5 e backup v4;
- testes financeiros, integração, E2E e documentação técnica.

## Não lançado — CAP-001 v1.2

- integra biblioteca ampliada com 59 mobiliários, 42 equipamentos e 19 ambientes;
- preserva os IDs estáveis de piscina, deck/solário, casa de máquinas e despensa e acrescenta jardim como `AMB-019`;
- organiza camas, mesas, sofás, área gourmet, piscina e demais famílias em seletores tipo sanfona;
- adiciona mesas de 4 a 12 lugares e faz o cálculo reconhecer a variante selecionada, sem depender de um ID fixo;
- permite aplicar presets de piscina aos campos de largura, comprimento, profundidade, volume e reserva estrutural;
- mantém referências sem fonte documental validada como inferidas e pendentes de revisão técnica;

- preserva e audita a fonte CAP-001 com normalização determinística;
- adiciona 14 ambientes com maturidade explícita e oito estratégias TypeScript;
- separa conforto de acessibilidade, preserva inferências e conflitos;
- inclui calculadora, estudos, comparador de quatro cenários e breakdown rastreável;
- aplica resultados ao Programa de Necessidades com confirmação e metadados;
- registra as três opções de área por ambiente, acumula os três totais com quantidade e permite escolher depois;
- transforma a configuração em fluxo sequencial com conforto e acessibilidade sempre visíveis e avanço automático para o próximo ambiente;
- adiciona extensões técnicas separadas para piscina, deck/solário, casa de máquinas e despensa;
- adiciona terceira coluna com relatório vivo dos ambientes, quantidades e totais líquidos e bruto preliminar;
- sincroniza o nome escolhido na calculadora com o Programa de Necessidades e recupera nomes de estudos já salvos;
- permite editar ou excluir ambientes diretamente no relatório acumulado, com confirmação e remoção dos estudos vinculados;
- migra o IndexedDB para v3 e inclui estudos no backup/restauração atômicos.

## Não lançado — Backup consolidado

- exportação versionada de todos os cadastros em um único JSON;
- validação de versão, schema, IDs e códigos antes da restauração;
- substituição atômica da base local após confirmação explícita;
- testes unitários, integração IndexedDB e fluxo E2E de recuperação.

## Não lançado — Correções do piloto

- corrige o recorte da logo de 2000×2000 no cabeçalho sticky para impedir que
  sua área bloqueie a rolagem;
- adiciona regressão E2E para altura do cabeçalho e scroll sobre a logo em
  desktop e mobile.

## v0.2.0-pilot — 2026-07-28

- configuração do Worker `th-os-cmp-001-pilot` para Vinext/Vite e Wrangler 4;
- scripts de preview, dry-run real do bundle e implantação manual;
- aviso acessível de que os dados permanecem somente no navegador/dispositivo;
- cobertura E2E de aviso local, exportação móvel e isolamento entre contextos;
- guia de implantação, rollback, segredos e checklist pós-deploy;
- implantação validada em
  `https://th-os-cmp-001-pilot.jowbryan.workers.dev`;
- smoke test público sem erros de navegador e sete cenários E2E aprovados.

## 2026-07-28 — Consolidação v2 para uso piloto

- seed canônico de Cacoal/RO sem dados pessoais inventados;
- modelo v2, enums, Zod e migração explícita v1 → v2;
- escopo, programa, planejamento, orçamento e registros ampliados;
- progresso ponderado e quatro níveis de prontidão sem mutação;
- importação/exportação envelopada e autosave serializado;
- workspace com 14 seções, busca, filtros e ordenação;
- testes unitários, IndexedDB, smoke, Playwright e CI.

## 2026-07-28 — Reestruturação para CMP-001

### Adicionado

- identificação institucional TH Arquitetura / TH OS / CMP-001;
- entidade central `ProjectMasterRecord` e `schemaVersion`;
- `ProjectRepository` com IndexedDB;
- geração de código `TH-AAAA-NNN`;
- projeto piloto `TH-2026-001`;
- listagem, criação, edição, duplicação, arquivamento, restauração e exclusão;
- autosave, importação e exportação JSON;
- seções completas do Cadastro Mestre do Projeto;
- progresso e validações para rascunho, reunião e proposta;
- resumo institucional para impressão;
- `DATA_MODEL.md` e `NEXT_STEPS.md`.

### Removido

- conceito e nomenclatura “TH Arquitetura — Contratos”;
- fluxo Contrato → Escopo → Prazos;
- botões e textos de emissão contratual;
- honorários, parcelamento e validade de contrato;
- dados fictícios da antiga tela e código `TH-2026-014`;
- helper de autenticação não utilizado;
- scaffold de D1/Drizzle não utilizado.

### Preservado

- arquivos oficiais selecionados em `src/assets/brand`;
- `src/styles/tokens.css`;
- decisões válidas de identidade, tipografia substituta e uso das marcas;
- fundamentos visuais genéricos de botões, formulários, cartões,
  responsividade e impressão.
# Não publicado — correções do PR #5

- Layout CAP responsivo e toast acessível.
- Entrada decimal pt-BR e ciclo completo de itens personalizados.
- Catálogos referenciais reutilizáveis com combobox e IndexedDB v4.
- Backup consolidado v3 com catálogos e compatibilidade de leitura anterior.
