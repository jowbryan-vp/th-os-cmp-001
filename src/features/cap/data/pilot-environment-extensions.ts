import { CapEnvironment } from "../domain/cap-library-types";

// Extensões técnicas do piloto, separadas da fonte bibliográfica CAP-001 v1.1.0.
export const pilotEnvironmentExtensions: CapEnvironment[] = [
  { id: "AMB-015", label: "Piscina — Espelho d’água", category: "Lazer",
    description: "Superfície de água da piscina, calculada separadamente de deck e áreas técnicas.",
    capability: "preliminary_calculator",
    maturityNote: "Extensão do piloto. A área bruta usa reserva estrutural preliminar e exige validação de projeto, estrutura e instalações." },
  { id: "AMB-016", label: "Deck / Solário da Piscina", category: "Lazer",
    description: "Área externa de permanência e circulação ao redor da piscina.",
    capability: "preliminary_calculator",
    maturityNote: "Extensão do piloto. Não é tratada como ambiente fechado e não recebe reserva de paredes por padrão." },
  { id: "AMB-017", label: "Casa de Máquinas da Piscina", category: "Apoio",
    description: "Área técnica fechada destinada aos equipamentos e à manutenção da piscina.",
    capability: "preliminary_calculator",
    maturityNote: "Extensão do piloto. O dimensionamento final depende dos equipamentos, acessos, ventilação e requisitos técnicos." },
  { id: "AMB-018", label: "Despensa", category: "Serviço",
    description: "Área de armazenamento de alimentos, utensílios e suprimentos domésticos.",
    capability: "preliminary_calculator",
    maturityNote: "Extensão do piloto. Prateleiras, porta, circulação e ventilação devem ser validadas no layout." },
];
