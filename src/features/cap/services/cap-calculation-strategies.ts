import { CapCalculationContext, CapCalculationStrategy } from "../domain/cap-calculation-strategy";
import { ParametricCalculationResult } from "../domain/cap-library-types";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const comfortFactor = (context: CapCalculationContext) => ({ compact: 1, comfortable: 1.25, generous: 1.5,
  custom: context.scenario.customParameters.clearanceFactor ?? 1 }[context.scenario.comfortLevel]);
const accessibleClearance = (context: CapCalculationContext) => context.scenario.accessibilityProfile === "wheelchair" ? 1.5
  : context.scenario.accessibilityProfile === "reduced_mobility" || context.scenario.accessibilityProfile === "elderly" ? 1.0 : 0;
const itemArea = (context: CapCalculationContext, sourceType: string) => round(context.items
  .filter((item) => item.selection.sourceType === sourceType)
  .reduce((sum, item) => sum + item.footprintAreaM2 * item.selection.quantity, 0));

function result(context: CapCalculationContext, strategy: CapCalculationStrategy, geometry: {
  minimumWidthM: number; minimumLengthM: number; recommendedWidthM: number; recommendedLengthM: number;
  overlapAreaRemovedM2?: number; overlapJustification?: string; zones?: string[]; overlapped?: string[];
  assumptions?: string[]; warnings?: string[]; conflicts?: string[]; drivers?: string[]; confidence?: "high" | "medium" | "low" | "inferred" | "conflicting_sources";
}): ParametricCalculationResult {
  const furniture = itemArea(context, "furniture"); const equipment = itemArea(context, "equipment");
  const custom = itemArea(context, "custom"); const footprint = furniture + equipment + custom;
  const minimumNet = round(geometry.minimumWidthM * geometry.minimumLengthM);
  const recommendedNet = round(geometry.recommendedWidthM * geometry.recommendedLengthM);
  const functional = round(Math.min(recommendedNet, footprint * 0.25));
  const overlap = round(geometry.overlapAreaRemovedM2 ?? 0);
  const circulation = round(Math.max(0, recommendedNet - footprint - functional + overlap));
  const reserve = round(recommendedNet * context.scenario.geometricReservePercentage / 100);
  const sourceRefs = [...new Set(context.items.filter((item) => item.sourceId)
    .map((item) => `${item.sourceId} p.${item.page ?? "?"}`))];
  const warnings = [...(geometry.warnings ?? []), ...strategy.limitations,
    ...(context.environment.capability !== "full_calculator" ? ["Resultado identificado como preliminar ou experimental."] : []),
    ...(context.scenario.accessibilityProfile !== "standard"
      ? ["Referência técnica de acessibilidade a verificar conforme norma vigente e condições do projeto."] : [])];
  return {
    minimumWidthM: round(geometry.minimumWidthM), minimumLengthM: round(geometry.minimumLengthM),
    recommendedWidthM: round(geometry.recommendedWidthM), recommendedLengthM: round(geometry.recommendedLengthM),
    minimumNetAreaM2: minimumNet, recommendedNetAreaM2: recommendedNet,
    estimatedGrossAreaM2: round(recommendedNet + reserve), furnitureFootprintAreaM2: furniture,
    equipmentFootprintAreaM2: equipment, functionalUseAreaM2: functional,
    circulationAreaM2: circulation, geometricReserveAreaM2: reserve,
    efficiencyRatio: round(Math.max(0.01, footprint / recommendedNet)), confidence: geometry.confidence ?? "medium",
    assumptions: geometry.assumptions ?? [], warnings, conflicts: geometry.conflicts ?? [], sourceRefs,
    breakdown: {
      strategyId: strategy.id, strategyVersion: strategy.version,
      itemAreas: context.items.map((item) => ({ itemId: item.selection.id, label: item.label,
        quantity: item.selection.quantity, footprintAreaM2: round(item.footprintAreaM2 * item.selection.quantity) })),
      zonesConsidered: geometry.zones ?? [], zonesOverlapped: geometry.overlapped ?? [],
      overlapAreaRemovedM2: overlap, overlapJustification: geometry.overlapJustification ?? "Nenhuma sobreposição aplicada.",
      primaryAreaDrivers: geometry.drivers ?? [],
    }, calculatedAt: context.calculatedAt,
  };
}
const requireItems = (context: CapCalculationContext) => context.items.length ? [] : ["Selecione ao menos um item."];

export const bedroomBoundingBoxStrategy: CapCalculationStrategy = {
  id: "bedroom-bounding-box", version: "1.0.0", environmentIds: ["AMB-001", "AMB-002"],
  inputs: ["cama", "armazenamento", "circulação", "conforto", "acessibilidade"],
  limitations: ["O arranjo deve ser confirmado em estudo de layout."], validate: requireItems,
  calculate(context) {
    const bed = context.items.find((item) => /^MOB-00[1-5]$/.test(item.selection.libraryItemId ?? "")) ?? context.items[0]!;
    const wardrobes = context.items.filter((item) => ["MOB-006", "MOB-007", "MOB-008"].includes(item.selection.libraryItemId ?? ""));
    const wardrobeDepth = wardrobes.length ? Math.max(...wardrobes.map((item) => item.lengthM)) : 0;
    const factor = comfortFactor(context); const minSide = 0.6; const recommendedSide = Math.max(0.6 * factor, accessibleClearance(context));
    const minimumWidth = Math.max(bed.widthM + 2 * minSide, ...wardrobes.map((item) => item.widthM + minSide));
    const minimumLength = bed.lengthM + minSide + wardrobeDepth;
    const recommendedWidth = Math.max(bed.widthM + 2 * recommendedSide, ...wardrobes.map((item) => item.widthM + recommendedSide));
    const recommendedLength = bed.lengthM + recommendedSide + wardrobeDepth;
    return result(context, bedroomBoundingBoxStrategy, {
      minimumWidthM: minimumWidth, minimumLengthM: minimumLength, recommendedWidthM: recommendedWidth,
      recommendedLengthM: recommendedLength, overlapAreaRemovedM2: wardrobeDepth ? round(minSide * wardrobeDepth) : 0,
      overlapJustification: "Circulação geral e faixa aos pés da cama podem compartilhar parte da mesma zona.",
      zones: ["repouso", "vestuário", "circulação"], overlapped: wardrobeDepth ? ["circulação aos pés", "circulação geral"] : [],
      assumptions: ["Cama e armazenamento considerados em paredes opostas ou adjacentes."],
      warnings: wardrobes.some((item) => item.selection.libraryItemId === "MOB-006") && recommendedSide < 0.8
        ? ["Armário de abrir requer verificação da faixa livre frontal."] : [],
      conflicts: context.items.some((item) => item.selection.libraryItemId === "MOB-003") ? ["CFL-001"] : [],
      drivers: [bed.label, ...wardrobes.map((item) => item.label)], confidence: "high",
    });
  },
};

export const closetLinearStrategy: CapCalculationStrategy = {
  id: "closet-linear", version: "1.0.0", environmentIds: ["AMB-003"],
  inputs: ["módulos", "faces", "corredor", "acessibilidade"],
  limitations: ["Ilhas são tratadas apenas como item customizado."], validate: requireItems,
  calculate(context) {
    const arrangement = context.scenario.arrangement || "one_face";
    const faces = arrangement === "two_faces" ? 2 : arrangement === "u" ? 3 : arrangement === "l" ? 2 : 1;
    const modules = context.items.filter((item) => item.selection.functionalRole !== "island");
    const depth = Math.max(...modules.map((item) => item.lengthM), 0.55);
    const linear = modules.reduce((sum, item) => sum + item.widthM * item.selection.quantity, 0);
    const corridorMin = 0.8; const corridorRec = Math.max(0.8 * comfortFactor(context), accessibleClearance(context));
    const minimumWidth = (faces >= 2 ? 2 : 1) * depth + corridorMin;
    const recommendedWidth = (faces >= 2 ? 2 : 1) * depth + corridorRec;
    const minimumLength = Math.max(1.2, linear / faces); const recommendedLength = Math.max(1.5, linear / faces + 0.2);
    return result(context, closetLinearStrategy, { minimumWidthM: minimumWidth, minimumLengthM: minimumLength,
      recommendedWidthM: recommendedWidth, recommendedLengthM: recommendedLength,
      zones: ["armazenamento", "abertura", "corredor central"], assumptions: [`Arranjo ${arrangement} com ${faces} face(s).`],
      warnings: context.items.some((item) => item.selection.functionalRole === "island") ? ["Ilha customizada exige validação do corredor em todos os lados."] : [],
      drivers: ["profundidade dos módulos", "corredor central", "comprimento linear"], confidence: "high" });
  },
};

export const bathroomFixtureStrategy: CapCalculationStrategy = {
  id: "bathroom-fixture", version: "1.0.0", environmentIds: ["AMB-006", "AMB-007"],
  inputs: ["louças", "box", "arranjo", "circulação", "acessibilidade"],
  limitations: ["Portas, shafts e paredes hidráulicas exigem validação no layout."], validate: requireItems,
  calculate(context) {
    const linear = context.scenario.arrangement !== "lateral";
    const clearanceMin = 0.6; const clearanceRec = Math.max(clearanceMin * comfortFactor(context), accessibleClearance(context));
    const widthMin = linear ? Math.max(...context.items.map((item) => item.widthM), 1) : context.items.reduce((sum, item) => sum + item.widthM, 0);
    const lengthMin = linear ? context.items.reduce((sum, item) => sum + item.lengthM, 0) : Math.max(...context.items.map((item) => item.lengthM));
    return result(context, bathroomFixtureStrategy, { minimumWidthM: widthMin + clearanceMin, minimumLengthM: Math.max(1.5, lengthMin),
      recommendedWidthM: widthMin + clearanceRec, recommendedLengthM: Math.max(1.5 + clearanceRec / 2, lengthMin),
      zones: ["uso das peças", "abertura", "circulação"], assumptions: [`Configuração ${linear ? "linear" : "lateral"}.`],
      warnings: ["Composição de referência não comprova validação geométrica completa."],
      drivers: context.items.map((item) => item.label), confidence: "high" });
  },
};

export const diningEnvelopeStrategy: CapCalculationStrategy = {
  id: "dining-envelope", version: "1.0.0", environmentIds: ["AMB-005"],
  inputs: ["mesa", "cadeiras", "lados com passagem", "conforto"], limitations: ["Aberturas e aparadores devem ser conferidos no layout."],
  validate: requireItems,
  calculate(context) {
    const table = context.items.find((item) => item.selection.libraryItemId === "MOB-012") ?? context.items[0]!;
    const sides = Math.max(1, Math.min(4, context.scenario.customParameters.circulationSides ?? 4));
    const chair = 0.5; const passMin = 0.6; const passRec = 0.8 * comfortFactor(context);
    const widthSides = sides >= 2 ? 2 : 1; const lengthSides = sides >= 4 ? 2 : sides >= 3 ? 1 : 0;
    return result(context, diningEnvelopeStrategy, { minimumWidthM: table.widthM + widthSides * (chair + passMin),
      minimumLengthM: table.lengthM + lengthSides * (chair + passMin),
      recommendedWidthM: table.widthM + widthSides * (chair + passRec),
      recommendedLengthM: table.lengthM + lengthSides * (chair + passRec), zones: ["mesa", "cadeiras ocupadas", "passagem atrás"],
      assumptions: [`Circulação configurada em ${sides} lado(s); lados sem passagem não recebem folga automática.`],
      drivers: [table.label, `${sides} lado(s) com circulação`], confidence: "high" });
  },
};

export const officeWorkstationStrategy: CapCalculationStrategy = {
  id: "office-workstation", version: "1.0.0", environmentIds: ["AMB-010"],
  inputs: ["postos", "cadeiras", "armazenamento", "atendimento"], limitations: ["Acústica, iluminação e ergonomia detalhada não são verificadas."],
  validate: requireItems,
  calculate(context) {
    const desks = context.items.filter((item) => item.selection.libraryItemId === "MOB-014");
    const people = Math.max(1, context.scenario.customParameters.people ?? desks.reduce((sum, item) => sum + item.selection.quantity, 0));
    const desk = desks[0] ?? context.items[0]!; const chairMovement = 0.9; const circulation = Math.max(0.6, 0.8 * comfortFactor(context), accessibleClearance(context));
    return result(context, officeWorkstationStrategy, { minimumWidthM: Math.max(1.2, desk.widthM * people),
      minimumLengthM: desk.lengthM + chairMovement + 0.6, recommendedWidthM: Math.max(1.5, desk.widthM * people + 0.2),
      recommendedLengthM: desk.lengthM + chairMovement + circulation, zones: ["bancada", "recuo de cadeira", "circulação"],
      assumptions: [`${people} posto(s) lado a lado.`], drivers: ["quantidade de postos", "recuo de cadeira"], confidence: "high" });
  },
};

export const garageVehicleEnvelopeStrategy: CapCalculationStrategy = {
  id: "garage-vehicle-envelope", version: "1.0.0", environmentIds: ["AMB-013"],
  inputs: ["veículos", "abertura de portas", "circulação lateral", "circulação traseira"],
  limitations: ["Área de manobra externa não está incluída automaticamente."], validate: requireItems,
  calculate(context) {
    const vehicles = context.items.filter((item) => item.selection.libraryItemId === "EQP-012" || item.selection.functionalRole === "vehicle");
    const vehicle = vehicles[0] ?? context.items[0]!; const count = vehicles.reduce((sum, item) => sum + item.selection.quantity, 0) || 1;
    const door = context.scenario.customParameters.doorClearanceM ?? 0.5;
    const lateral = context.scenario.customParameters.pedestrianClearanceM ?? 0.3;
    const rear = context.scenario.customParameters.rearClearanceM ?? 0.5;
    const recommendedSide = Math.max(door, 0.8 * comfortFactor(context), accessibleClearance(context));
    return result(context, garageVehicleEnvelopeStrategy, { minimumWidthM: count * vehicle.widthM + (count + 1) * door,
      minimumLengthM: vehicle.lengthM + rear, recommendedWidthM: count * vehicle.widthM + (count + 1) * recommendedSide + lateral,
      recommendedLengthM: vehicle.lengthM + Math.max(rear, 0.8), zones: ["veículo", "abertura de porta", "acesso de pedestres"],
      assumptions: [`${count} vaga(s) lado a lado.`], drivers: [vehicle.label, "abertura de portas", "acesso lateral"], confidence: "high" });
  },
};

export const genericReferenceStrategy: CapCalculationStrategy = {
  id: "generic-reference", version: "1.0.0", environmentIds: ["AMB-004", "AMB-008", "AMB-009", "AMB-011", "AMB-012"],
  inputs: ["itens", "circulação", "preset de referência"],
  limitations: ["Estratégia preliminar: não valida integralmente arranjos, aberturas ou relações funcionais."], validate: requireItems,
  calculate(context) {
    const footprint = context.items.reduce((sum, item) => sum + item.footprintAreaM2 * item.selection.quantity, 0);
    const preset = context.scenario.customParameters.referenceNetAreaM2 ?? 0;
    const minimumArea = Math.max(footprint * 1.8, preset * 0.85, 1.5); const recommendedArea = Math.max(footprint * 2.3, preset, minimumArea);
    const ratio = context.scenario.customParameters.aspectRatio ?? 1.25;
    const widthMin = Math.sqrt(minimumArea / ratio); const widthRec = Math.sqrt(recommendedArea / ratio);
    return result(context, genericReferenceStrategy, { minimumWidthM: widthMin, minimumLengthM: widthMin * ratio,
      recommendedWidthM: widthRec, recommendedLengthM: widthRec * ratio, zones: ["projeção dos itens", "reserva funcional", "circulação"],
      assumptions: ["Geometria preliminar derivada de projeção, preset e proporção configurável."],
      warnings: ["Não usar como resposta normativa ou layout definitivo."],
      conflicts: context.environment.id === "AMB-008" ? ["CFL-002"] : [],
      drivers: context.items.map((item) => item.label), confidence: "inferred" });
  },
};

export const stairPreliminaryStrategy: CapCalculationStrategy = {
  id: "stair-preliminary", version: "1.0.0", environmentIds: ["AMB-014"],
  inputs: ["desnível", "espelho", "piso", "largura", "lances", "patamar"],
  limitations: ["Não calcula rampas.", "Verificar legislação, normas, estrutura, altura livre, guarda-corpo e condições específicas."],
  validate(context) { return ["levelHeightM", "targetRiserM", "treadM", "stairWidthM"].filter((key) => !(context.scenario.customParameters[key] > 0))
    .map((key) => `Parâmetro obrigatório ausente: ${key}.`); },
  calculate(context) {
    const height = context.scenario.customParameters.levelHeightM; const target = context.scenario.customParameters.targetRiserM;
    const tread = context.scenario.customParameters.treadM; const width = context.scenario.customParameters.stairWidthM;
    const flights = Math.max(1, Math.round(context.scenario.customParameters.flights ?? 1));
    const risers = Math.max(1, Math.round(height / target)); const adjusted = height / risers;
    const steps = Math.max(1, risers - flights); const landing = context.scenario.customParameters.landingLengthM ?? width;
    const development = steps * tread / flights + (flights - 1) * landing; const blondel = 2 * adjusted + tread;
    return result(context, stairPreliminaryStrategy, { minimumWidthM: width, minimumLengthM: development,
      recommendedWidthM: width, recommendedLengthM: development, zones: ["degraus", "patamar"],
      assumptions: [`${risers} espelhos de ${round(adjusted)}m; Blondel ${round(blondel)}m.`],
      warnings: blondel < 0.63 || blondel > 0.65 ? ["Relação preliminar de Blondel fora da faixa de referência de 0,63m a 0,65m."] : [],
      drivers: ["desnível", "piso", "quantidade de lances"], confidence: "medium" });
  },
};

export const capCalculationStrategies = [bedroomBoundingBoxStrategy, closetLinearStrategy, bathroomFixtureStrategy,
  diningEnvelopeStrategy, officeWorkstationStrategy, garageVehicleEnvelopeStrategy, genericReferenceStrategy,
  stairPreliminaryStrategy] as const;
