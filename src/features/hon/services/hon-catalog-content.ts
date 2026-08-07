import { ServiceCategory } from "../domain/hon-types";

// Conteúdo comercial/técnico do catálogo de serviços (HON-002B), por código de serviço.
// Fonte única: alimenta tanto o preset (`defaultServiceCatalog`) quanto a migração de
// registros já persistidos (`migrateServiceCatalogItem`), para nunca haver duas versões
// divergentes do mesmo texto. `displayOrder` segue blocos de 100 por categoria e 10 por item,
// deixando espaço para inserções futuras sem precisar renumerar o catálogo inteiro.
export interface ServiceCatalogContent {
  category: ServiceCategory;
  clientDescription: string;
  technicalDescription: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string[];
  displayOrder: number;
}

export const serviceCategoryLabels: Record<ServiceCategory, string> = {
  diagnosis: "Diagnóstico e levantamento",
  design: "Projeto",
  interiors_specialties: "Interiores e especialidades",
  bim: "BIM e coordenação",
  sustainability: "Sustentabilidade e desempenho",
  legal: "Legalização e regularização",
  construction: "Obra e acompanhamento",
  management: "Gestão",
  visualization: "Visualização e documentação",
  complementary: "Serviços complementares",
};

// Ordem de exibição das categorias (não é o displayOrder do item, é a ordem entre categorias).
export const serviceCategoryOrder: ServiceCategory[] = [
  "diagnosis", "design", "interiors_specialties", "bim", "sustainability",
  "legal", "construction", "management", "visualization", "complementary",
];

export const serviceCatalogContent: Record<string, ServiceCatalogContent> = {
  // Diagnóstico e levantamento (100)
  data_survey: {
    category: "diagnosis", displayOrder: 100,
    clientDescription: "Reunimos as informações do seu imóvel e da sua necessidade — documentos, medidas existentes, restrições legais e expectativas — para começar o projeto com uma base confiável.",
    technicalDescription: "Coleta e organização de dados de entrada do projeto: documentação do imóvel, levantamentos disponíveis, normas incidentes e informações fornecidas pelo cliente. Não inclui medição física do imóvel, que é escopo do Levantamento cadastral.",
    deliverables: ["Dossiê organizado com os dados coletados", "Lista de pendências documentais"],
    exclusions: ["Levantamento métrico/planialtimétrico do imóvel", "Obtenção de documentos junto a órgãos públicos"],
    assumptions: ["Cliente fornece os documentos e informações disponíveis", "Acesso a registros e certidões, quando existentes"],
  },
  cadastral_survey: {
    category: "diagnosis", displayOrder: 110,
    clientDescription: "Medimos o imóvel como ele está hoje — paredes, níveis, instalações visíveis — e registramos tudo em planta, servindo de base confiável para o projeto.",
    technicalDescription: "Levantamento planialtimétrico e cadastral das condições físicas existentes do imóvel: medidas, níveis, esquadrias, instalações aparentes e demais elementos construtivos. Referência-base para as etapas de projeto.",
    deliverables: ["Planta de levantamento cadastral", "Registro fotográfico do estado atual"],
    exclusions: ["Sondagem de solo", "Levantamento topográfico do terreno, quando distinto do cadastral do imóvel", "Investigação de instalações embutidas ou ocultas"],
    assumptions: ["Acesso completo ao imóvel para medição"],
  },
  briefing: {
    category: "diagnosis", displayOrder: 120,
    clientDescription: "Conversamos com você para entender como quer viver ou usar o espaço, e transformamos isso numa lista clara de ambientes e requisitos que vai guiar todo o projeto.",
    technicalDescription: "Estruturação do programa de necessidades a partir de reuniões com o cliente: ambientes desejados, usos, prioridades, restrições de orçamento e prazo. Serve de referência para as etapas de projeto seguintes.",
    deliverables: ["Programa de necessidades documentado", "Registro de prioridades e restrições do cliente"],
    exclusions: [],
    assumptions: ["Disponibilidade do cliente para reuniões de briefing"],
  },
  feasibility: {
    category: "diagnosis", displayOrder: 130,
    clientDescription: "Antes de investir no projeto completo, avaliamos se a ideia é viável dentro do terreno, da legislação e do orçamento — para você decidir com mais segurança.",
    technicalDescription: "Análise preliminar de viabilidade técnica, legal e de ocupação do terreno ou imóvel frente ao programa pretendido, incluindo parâmetros urbanísticos aplicáveis. Não substitui projeto legal nem aprovação de órgãos.",
    deliverables: ["Relatório de viabilidade", "Parâmetros urbanísticos aplicáveis identificados"],
    exclusions: ["Aprovação ou protocolo junto a órgãos públicos", "Estudo de solo ou sondagem"],
    assumptions: ["Informações do terreno/imóvel fornecidas pelo cliente ou levantadas separadamente"],
  },
  massing: {
    category: "diagnosis", displayOrder: 140,
    clientDescription: "Testamos volumetrias possíveis para o terreno antes do projeto detalhado, para explorar opções de ocupação e aproveitamento.",
    technicalDescription: "Estudo volumétrico preliminar de ocupação do terreno, explorando alternativas de massa edificada frente a parâmetros urbanísticos e ao programa pretendido, sem definição de plantas internas.",
    deliverables: ["Estudos volumétricos alternativos", "Comparativo de aproveitamento por alternativa"],
    exclusions: ["Definição de plantas internas", "Projeto legal ou executivo"],
    assumptions: ["Parâmetros urbanísticos do terreno verificados"],
  },

  // Projeto (200)
  preliminary_study: {
    category: "design", displayOrder: 200,
    clientDescription: "A primeira versão visual do seu projeto: plantas e volumetria iniciais para você validar a ideia antes de avançarmos para o detalhamento.",
    technicalDescription: "Desenvolvimento de plantas, cortes e volumetria em nível de estudo, representando a solução arquitetônica proposta a partir do programa de necessidades. Sujeito a ajustes nas etapas seguintes.",
    deliverables: ["Plantas e cortes em nível de estudo", "Volumetria/massa da proposta"],
    exclusions: ["Detalhamento construtivo", "Especificação de materiais e acabamentos"],
    assumptions: ["Programa de necessidades e levantamento do imóvel já definidos"],
  },
  draft_design: {
    category: "design", displayOrder: 210,
    clientDescription: "Evoluímos o estudo preliminar para um projeto mais definido, já com medidas consolidadas, pronto para orçamentos preliminares e para seguir à etapa legal ou executiva.",
    technicalDescription: "Desenvolvimento do anteprojeto arquitetônico com definição de layout, áreas, aberturas e sistemas construtivos principais, a partir do estudo preliminar aprovado pelo cliente.",
    deliverables: ["Plantas, cortes e fachadas em nível de anteprojeto", "Quadro de áreas"],
    exclusions: ["Projeto legal para aprovação", "Detalhamento executivo"],
    assumptions: ["Estudo preliminar aprovado pelo cliente"],
  },
  architectural_design: {
    category: "design", displayOrder: 220,
    clientDescription: "O projeto completo da sua obra — do estudo à entrega — coordenando todas as etapas para transformar a ideia num conjunto de desenhos pronto para construir.",
    technicalDescription: "Condução integral do projeto arquitetônico, articulando as etapas de estudo, anteprojeto, projeto legal e executivo conforme contratadas, com responsabilidade técnica pela solução arquitetônica.",
    deliverables: ["Conjunto de pranchas conforme etapas contratadas", "Memorial descritivo do projeto"],
    exclusions: ["Projetos complementares de terceiros (estrutural, elétrico, hidráulico etc.)", "Execução da obra"],
    assumptions: ["Escopo e etapas específicas definidas junto ao cliente"],
  },
  executive_design: {
    category: "design", displayOrder: 230,
    clientDescription: "A versão final e detalhada do projeto, com todas as informações que o construtor precisa para executar a obra com precisão.",
    technicalDescription: "Detalhamento executivo do anteprojeto aprovado, com especificações construtivas, compatibilização básica entre disciplinas e informações necessárias à execução da obra.",
    deliverables: ["Pranchas executivas detalhadas", "Especificações técnicas e memorial"],
    exclusions: ["Projetos complementares de terceiros", "Orçamento detalhado de obra"],
    assumptions: ["Anteprojeto e definições de acabamento aprovados pelo cliente"],
  },
  detailing: {
    category: "design", displayOrder: 240,
    clientDescription: "Ampliamos pontos específicos do projeto — como um banheiro, uma escada ou uma marcenaria — em desenhos mais precisos, para garantir que sejam executados como planejado.",
    technicalDescription: "Desenvolvimento de detalhes construtivos ampliados de elementos específicos do projeto, além do nível padrão do executivo, quando a complexidade do elemento exige representação adicional.",
    deliverables: ["Pranchas de detalhamento dos elementos definidos", "Especificações complementares dos detalhes"],
    exclusions: [],
    assumptions: ["Elementos a detalhar definidos previamente com o cliente ou a equipe"],
  },
  coordination: {
    category: "design", displayOrder: 250,
    clientDescription: "Conferimos se o projeto de arquitetura conversa bem com os demais projetos (estrutura, elétrica, hidráulica), evitando conflitos na hora de construir.",
    technicalDescription: "Verificação de interferências entre o projeto arquitetônico e os projetos complementares fornecidos pelo cliente ou por terceiros, por sobreposição de desenhos, sem uso de modelo BIM federado.",
    deliverables: ["Relatório de interferências identificadas", "Pranchas compatibilizadas"],
    exclusions: ["Elaboração dos projetos complementares", "Modelagem BIM federada (ver Compatibilização BIM)"],
    assumptions: ["Projetos complementares entregues pelo cliente ou pelos respectivos responsáveis técnicos"],
  },
  renovation: {
    category: "design", displayOrder: 260,
    clientDescription: "Projetamos as mudanças no seu imóvel existente, aproveitando o que já funciona e resolvendo o que não funciona mais.",
    technicalDescription: "Desenvolvimento de projeto de reforma a partir do levantamento cadastral do imóvel existente, incluindo definição de demolições, construções novas e adequações necessárias.",
    deliverables: ["Plantas de demolir e construir", "Plantas do projeto reformado"],
    exclusions: ["Levantamento cadastral do estado atual (serviço separado)", "Execução da obra"],
    assumptions: ["Levantamento cadastral do imóvel disponível e atualizado"],
  },
  expansion: {
    category: "design", displayOrder: 270,
    clientDescription: "Projetamos o crescimento do seu imóvel, integrando a área nova à construção existente de forma coerente, dentro do que a legislação permite.",
    technicalDescription: "Desenvolvimento de projeto de ampliação de área construída, considerando integração com a edificação existente e parâmetros urbanísticos e legais aplicáveis à expansão.",
    deliverables: ["Plantas da área ampliada e sua integração com o existente", "Quadro de áreas antes e depois"],
    exclusions: ["Levantamento cadastral do estado atual (serviço separado)", "Aprovação legal (ver Projeto legal)"],
    assumptions: ["Levantamento cadastral do imóvel disponível", "Parâmetros urbanísticos do lote verificados"],
  },

  // Interiores e especialidades (300)
  interiors: {
    category: "interiors_specialties", displayOrder: 300,
    clientDescription: "Definimos móveis, acabamentos, cores e ambientação dos espaços internos, para que o resultado tenha a cara que você imaginou.",
    technicalDescription: "Projeto de interiores com definição de layout de mobiliário, acabamentos, revestimentos e ambientação dos espaços internos, complementando o projeto arquitetônico.",
    deliverables: ["Plantas de layout de mobiliário", "Especificação de acabamentos e revestimentos"],
    exclusions: ["Fabricação e instalação do mobiliário", "Projeto arquitetônico de base (serviço separado)"],
    assumptions: ["Projeto arquitetônico de base definido"],
  },
  lighting: {
    category: "interiors_specialties", displayOrder: 310,
    clientDescription: "Planejamos a luz de cada ambiente — natural e artificial — para conforto visual e para valorizar o projeto.",
    technicalDescription: "Projeto luminotécnico com definição de pontos de luz, tipos de luminária e estratégia de iluminação por ambiente, compatibilizado com o projeto de interiores e o projeto elétrico.",
    deliverables: ["Planta de pontos de luz", "Especificação de luminárias"],
    exclusions: ["Projeto elétrico de instalações (ver Pontos elétricos)", "Fornecimento e instalação das luminárias"],
    assumptions: ["Layout de mobiliário/interiores definido"],
  },
  electrical_points: {
    category: "interiors_specialties", displayOrder: 320,
    clientDescription: "Indicamos onde ficam as tomadas, interruptores e pontos de força, pensados a partir de como você vai usar cada ambiente.",
    technicalDescription: "Locação de pontos elétricos (tomadas, interruptores, pontos de força) compatibilizados com o layout de mobiliário e a iluminação, como referência para o projeto elétrico de instalações.",
    deliverables: ["Planta de locação de pontos elétricos"],
    exclusions: ["Projeto elétrico dimensionado (quadros, circuitos, cargas)", "Execução da instalação elétrica"],
    assumptions: ["Layout de mobiliário definido"],
  },
  plumbing_points: {
    category: "interiors_specialties", displayOrder: 330,
    clientDescription: "Indicamos onde ficam torneiras, ralos e saídas de água, alinhados com o layout dos ambientes molhados.",
    technicalDescription: "Locação de pontos hidráulicos (água fria/quente, esgoto) compatibilizados com o layout de mobiliário dos ambientes molhados, como referência para o projeto hidráulico dimensionado.",
    deliverables: ["Planta de locação de pontos hidráulicos"],
    exclusions: ["Projeto hidráulico dimensionado", "Execução da instalação hidráulica"],
    assumptions: ["Layout de mobiliário dos ambientes molhados definido"],
  },
  furniture: {
    category: "interiors_specialties", displayOrder: 340,
    clientDescription: "Desenhamos móveis sob medida — marcenaria, bancadas, armários — encaixados exatamente no seu espaço.",
    technicalDescription: "Projeto de mobiliário planejado/marcenaria com desenhos técnicos para fabricação, incluindo dimensões, materiais e ferragens especificados.",
    deliverables: ["Desenhos técnicos de marcenaria para fabricação", "Especificação de materiais e ferragens"],
    exclusions: ["Fabricação e instalação do mobiliário", "Móveis soltos e decoração (ver Interiores)"],
    assumptions: ["Layout de interiores aprovado"],
  },
  landscape: {
    category: "interiors_specialties", displayOrder: 350,
    clientDescription: "Projetamos as áreas externas — jardim, quintal, área de lazer — pensando em plantas, materiais e como você vai usar o espaço.",
    technicalDescription: "Projeto paisagístico com definição de espécies vegetais, pisos externos, mobiliário de área externa e sistema básico de irrigação, quando aplicável.",
    deliverables: ["Plantas de paisagismo e especificação vegetal", "Especificação de pisos e mobiliário externo"],
    exclusions: ["Execução de jardim e plantio", "Projeto estrutural de elementos externos (piscina, deck elevado etc.)"],
    assumptions: ["Levantamento cadastral da área externa disponível"],
  },

  // BIM e coordenação (400)
  bim_modeling: {
    category: "bim", displayOrder: 400,
    clientDescription: "Construímos seu projeto num modelo digital tridimensional, que ajuda a visualizar melhor e antecipar problemas antes da obra.",
    technicalDescription: "Modelagem do projeto arquitetônico em ambiente BIM conforme o modo definido no estudo (método interno, entrega básica ou requisitos de informação), sem coordenação com outras disciplinas.",
    deliverables: ["Modelo BIM arquitetônico", "Extrações de pranchas a partir do modelo"],
    exclusions: ["Coordenação com modelos de outras disciplinas (ver Coordenação BIM)", "Entrega de arquivo nativo ou IFC, salvo se contratado"],
    assumptions: ["Nível de desenvolvimento (LOD/LOI) definido previamente"],
  },
  bim_delivery: {
    category: "bim", displayOrder: 410,
    clientDescription: "Entregamos o modelo do seu projeto em formatos compatíveis para uso por outros profissionais ou pela construtora.",
    technicalDescription: "Preparação e entrega do modelo BIM em formato nativo e/ou IFC, conforme requisitos de informação combinados, para uso por terceiros no processo da obra.",
    deliverables: ["Arquivo do modelo em formato nativo e/ou IFC", "Documento de requisitos de informação atendidos"],
    exclusions: ["Modelagem federada com outras disciplinas"],
    assumptions: ["Modelo BIM arquitetônico já desenvolvido", "Formato de entrega definido com o destinatário"],
  },
  bim_compatibility: {
    category: "bim", displayOrder: 420,
    clientDescription: "Cruzamos digitalmente os modelos de arquitetura, estrutura e instalações para encontrar conflitos antes da obra começar.",
    technicalDescription: "Compatibilização de disciplinas por federação de modelos BIM, com detecção de interferências e emissão de relatório de clashes para resolução conjunta com os demais responsáveis técnicos.",
    deliverables: ["Modelo federado", "Relatório de interferências (clash detection)"],
    exclusions: ["Elaboração dos modelos das disciplinas complementares", "Resolução unilateral de conflitos que dependam de projetos de terceiros"],
    assumptions: ["Modelos das disciplinas complementares fornecidos em formato compatível"],
  },
  bim_coordination: {
    category: "bim", displayOrder: 430,
    clientDescription: "Coordenamos o processo BIM do projeto como um todo, organizando como cada profissional envolvido modela e compartilha suas informações.",
    technicalDescription: "Coordenação do fluxo de trabalho BIM entre os envolvidos no projeto: definição de padrões, requisitos de informação, ciclos de entrega e gestão do ambiente comum de dados.",
    deliverables: ["Plano de execução BIM (BEP)", "Registro dos ciclos de coordenação"],
    exclusions: ["Modelagem das disciplinas individuais"],
    assumptions: ["Equipe e disciplinas envolvidas definidas e engajadas no processo BIM"],
  },

  // Sustentabilidade e desempenho (500)
  bioclimatic: {
    category: "sustainability", displayOrder: 500,
    clientDescription: "Avaliamos como o sol, o vento e o clima local afetam seu projeto, para orientar decisões que tragam mais conforto com menos energia.",
    technicalDescription: "Análise bioclimática do projeto considerando orientação solar, ventilação natural e características climáticas locais, com recomendações de diretrizes de projeto.",
    deliverables: ["Relatório de análise bioclimática", "Recomendações de diretrizes de projeto"],
    exclusions: ["Simulação computacional avançada de desempenho, salvo se contratada à parte", "Certificação de sustentabilidade"],
    assumptions: ["Dados climáticos e de orientação do terreno disponíveis"],
  },
  sustainability: {
    category: "sustainability", displayOrder: 510,
    clientDescription: "Orientamos escolhas mais sustentáveis para o projeto — materiais, sistemas, uso de água e energia — dentro do que faz sentido para o seu orçamento.",
    technicalDescription: "Consultoria em estratégias de sustentabilidade aplicáveis ao projeto: eficiência energética, gestão de água, escolha de materiais e sistemas, sem compromisso com certificação formal salvo se explicitamente contratada.",
    deliverables: ["Relatório de recomendações de sustentabilidade"],
    exclusions: ["Certificação formal (ex. LEED, AQUA), salvo se contratada à parte", "Execução das medidas recomendadas"],
    assumptions: ["Escopo do projeto e orçamento de referência conhecidos"],
  },

  // Legalização e regularização (600)
  legal_design: {
    category: "legal", displayOrder: 600,
    clientDescription: "Preparamos os desenhos e documentos no formato exigido pela prefeitura ou órgão competente para dar entrada na aprovação do seu projeto.",
    technicalDescription: "Elaboração do projeto arquitetônico no formato e conteúdo exigidos pela legislação municipal/estadual aplicável, para fins de aprovação junto ao órgão competente.",
    deliverables: ["Pranchas legais conforme exigência do órgão", "Formulários e documentos exigidos para protocolo"],
    exclusions: ["Taxas e emolumentos públicos", "Garantia de aprovação pelo órgão", "Protocolo e acompanhamento do processo (ver Regularização, quando contratado)"],
    assumptions: ["Documentação do imóvel regular ou em processo de regularização paralelo"],
  },
  regularization: {
    category: "legal", displayOrder: 610,
    clientDescription: "Ajudamos a colocar seu imóvel em conformidade legal, cuidando dos trâmites junto aos órgãos públicos.",
    technicalDescription: "Elaboração da documentação técnica necessária e acompanhamento do processo de regularização do imóvel junto ao órgão competente, incluindo protocolo e respostas a exigências.",
    deliverables: ["Documentação técnica de regularização", "Registro do andamento do processo"],
    exclusions: ["Taxas, multas e emolumentos públicos", "Garantia de deferimento pelo órgão", "Resolução de pendências jurídicas do imóvel"],
    assumptions: ["Documentação do imóvel disponibilizada pelo cliente", "Prazos de órgãos públicos fora do controle do escritório"],
  },

  // Obra e acompanhamento (700)
  monitoring: {
    category: "construction", displayOrder: 700,
    clientDescription: "Visitamos a obra periodicamente para conferir se está sendo executada conforme o projeto, e orientamos ajustes quando necessário.",
    technicalDescription: "Visitas técnicas periódicas à obra para verificação de aderência ao projeto, com registro fotográfico e relatório de observações, sem responsabilidade pela execução ou gestão direta da obra.",
    deliverables: ["Relatório de visita técnica", "Registro fotográfico do andamento"],
    exclusions: ["Execução ou gestão direta da obra", "Responsabilidade técnica pela construtora/empreiteira"],
    assumptions: ["Cronograma de obra compartilhado com o escritório", "Acesso à obra nas datas de visita"],
  },
  management: {
    category: "construction", displayOrder: 710,
    clientDescription: "Assumimos a gestão do dia a dia da obra em seu nome, coordenando equipes e fornecedores para que tudo ande conforme o planejado.",
    technicalDescription: "Gerenciamento técnico da execução da obra, incluindo coordenação de equipes e fornecedores, controle de cronograma físico e verificação de qualidade da execução frente ao projeto.",
    deliverables: ["Relatórios periódicos de gerenciamento", "Controle de cronograma físico da obra"],
    exclusions: ["Execução direta dos serviços de construção", "Responsabilidade contratual pela mão de obra empregada"],
    assumptions: ["Carga semanal e duração do gerenciamento definidas no estudo"],
  },
  partial_management: {
    category: "construction", displayOrder: 720,
    clientDescription: "Acompanhamos etapas específicas da obra com mais proximidade, sem assumir a gestão completa do canteiro.",
    technicalDescription: "Gerenciamento técnico limitado a etapas ou frentes específicas da obra, com carga de dedicação inferior ao gerenciamento intensivo, conforme definido no escopo contratado.",
    deliverables: ["Relatórios de gerenciamento das etapas acompanhadas"],
    exclusions: ["Gestão das etapas fora do escopo contratado", "Execução direta dos serviços de construção"],
    assumptions: ["Etapas objeto do gerenciamento parcial definidas previamente"],
  },
  intensive_management: {
    category: "construction", displayOrder: 730,
    clientDescription: "Acompanhamos a obra com dedicação alta e presença frequente, para obras que exigem controle mais próximo.",
    technicalDescription: "Gerenciamento técnico com carga de dedicação intensiva, presença frequente em obra e controle detalhado de cronograma, qualidade e coordenação de equipes.",
    deliverables: ["Relatórios frequentes de gerenciamento", "Controle detalhado de cronograma e qualidade"],
    exclusions: ["Execução direta dos serviços de construção", "Responsabilidade contratual pela mão de obra empregada"],
    assumptions: ["Carga semanal intensiva viável dentro da capacidade do escritório"],
  },
  dedicated_management: {
    category: "construction", displayOrder: 740,
    clientDescription: "Um profissional dedicado acompanha sua obra com prioridade máxima, como se fosse parte da sua equipe.",
    technicalDescription: "Gerenciamento técnico com alocação dedicada de profissional à obra, priorizando esta frente sobre outras demandas do escritório, conforme carga definida no estudo.",
    deliverables: ["Relatórios de gerenciamento com prioridade dedicada"],
    exclusions: ["Execução direta dos serviços de construção"],
    assumptions: ["Disponibilidade de profissional para alocação dedicada"],
  },
  closeout: {
    category: "construction", displayOrder: 750,
    clientDescription: "Conferimos os últimos detalhes da obra junto com você antes da entrega final das chaves.",
    technicalDescription: "Vistoria final de obra frente ao projeto, elaboração de lista de pendências (punch list) e acompanhamento do encerramento e entrega ao cliente.",
    deliverables: ["Lista de pendências (punch list)", "Registro de entrega da obra"],
    exclusions: ["Execução das pendências identificadas", "Emissão de habite-se ou documentos legais de conclusão"],
    assumptions: ["Obra em fase final de execução"],
  },

  // Gestão (800)
  procurement: {
    category: "management", displayOrder: 800,
    clientDescription: "Ajudamos você a escolher e contratar a construtora ou empreiteira certa, analisando propostas e esclarecendo dúvidas técnicas do processo.",
    technicalDescription: "Assistência técnica ao cliente no processo de seleção e contratação de construtora/empreiteira: análise comparativa de propostas, esclarecimento de escopo e apoio na formalização contratual.",
    deliverables: ["Análise comparativa de propostas recebidas", "Apoio na definição do escopo contratual"],
    exclusions: ["Elaboração ou revisão jurídica do contrato de obra", "Garantia de desempenho da construtora contratada"],
    assumptions: ["Propostas de construtoras/empreiteiras obtidas pelo cliente"],
  },

  // Visualização e documentação (900)
  rendering: {
    category: "visualization", displayOrder: 900,
    clientDescription: "Criamos imagens realistas do seu projeto antes de ele existir, para você visualizar o resultado com muito mais clareza.",
    technicalDescription: "Produção de imagens tridimensionais renderizadas do projeto a partir do modelo desenvolvido, conforme quantidade e ambientes definidos no escopo.",
    deliverables: ["Imagens renderizadas dos ambientes/vistas definidos"],
    exclusions: ["Animações e vídeos, salvo se contratados à parte", "Modelagem 3D do projeto (pré-requisito, não incluso aqui)"],
    assumptions: ["Modelo 3D do projeto já desenvolvido", "Ambientes/vistas a renderizar definidos previamente"],
  },
  as_built: {
    category: "visualization", displayOrder: 910,
    clientDescription: "Registramos como a obra ficou de fato construída, para você ter um projeto atualizado e confiável para o futuro.",
    technicalDescription: "Levantamento e elaboração do projeto as built, documentando as condições efetivamente construídas em comparação ao projeto executivo, ao final da obra.",
    deliverables: ["Pranchas as built", "Registro das divergências entre projetado e executado"],
    exclusions: ["Levantamento de instalações ocultas não acessíveis"],
    assumptions: ["Obra concluída ou em fase final para o levantamento"],
  },

  // Serviços complementares (1000)
  complementary: {
    category: "complementary", displayOrder: 1000,
    clientDescription: "Coordenamos a contratação e a integração de projetos como estrutura, elétrica e hidráulica com profissionais parceiros especializados.",
    technicalDescription: "Coordenação da interface entre o projeto arquitetônico e os projetos complementares desenvolvidos por profissionais parceiros (estrutural, elétrico, hidráulico, entre outros), conforme parceiros envolvidos no estudo.",
    deliverables: ["Repasse de informações de interface aos parceiros", "Registro dos projetos complementares recebidos"],
    exclusions: ["Elaboração técnica dos projetos complementares em si, de responsabilidade dos parceiros", "Compatibilização detalhada (ver Compatibilização/Compatibilização BIM)"],
    assumptions: ["Parceiros técnicos contratados separadamente, conforme registrado no estudo"],
  },
  consulting: {
    category: "complementary", displayOrder: 1010,
    clientDescription: "Oferecemos orientação técnica pontual sobre um tema específico do seu projeto, fora do escopo padrão dos demais serviços.",
    technicalDescription: "Consultoria técnica pontual sobre tema específico definido com o cliente, não enquadrado nos demais serviços do catálogo, com escopo e entregas combinados caso a caso.",
    deliverables: ["Parecer ou orientação técnica sobre o tema consultado"],
    exclusions: [],
    assumptions: ["Tema e escopo da consultoria definidos previamente com o cliente"],
  },
  technical_visit: {
    category: "complementary", displayOrder: 1020,
    clientDescription: "Uma visita pontual ao imóvel ou à obra para uma verificação específica, fora de um programa contínuo de acompanhamento.",
    technicalDescription: "Visita técnica avulsa e pontual, não vinculada a um programa contínuo de acompanhamento ou gerenciamento de obra, para finalidade específica definida previamente.",
    deliverables: ["Registro/relatório da visita técnica"],
    exclusions: ["Acompanhamento contínuo (ver Acompanhamento de obra)"],
    assumptions: ["Finalidade da visita definida previamente", "Acesso ao local na data agendada"],
  },
  other: {
    category: "complementary", displayOrder: 1030,
    clientDescription: "Um item para registrar um serviço combinado com você que ainda não tem uma descrição própria no catálogo.",
    technicalDescription: "Item genérico para serviços específicos não enquadrados nas demais categorias do catálogo. O escopo deve ser descrito nas observações do item ao ser incluído no estudo.",
    deliverables: [],
    exclusions: [],
    assumptions: ["Escopo específico descrito nas observações do serviço no estudo"],
  },
};

// Defaults seguros para um item cujo código não está no conteúdo curado acima (ex.: item
// personalizado criado pelo próprio usuário) — nunca deixa um campo novo undefined.
export const fallbackServiceCatalogContent: ServiceCatalogContent = {
  category: "complementary",
  clientDescription: "",
  technicalDescription: "",
  deliverables: [],
  exclusions: [],
  assumptions: [],
  displayOrder: 9999,
};
