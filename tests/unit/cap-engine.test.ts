import assert from "node:assert/strict";
import test from "node:test";
import { ParametricScenario, SelectedItem } from "../../src/features/cap/domain/cap-library-types";
import { calculateParametricScenario } from "../../src/features/cap/services/cap-calculation-engine";

const AT = "2026-08-03T12:00:00.000Z";
const item = (libraryItemId: string, sourceType: "furniture" | "equipment" = "furniture", quantity = 1,
  functionalRole = "primary"): SelectedItem => ({ id: `selected-${libraryItemId}`, sourceType, libraryItemId, quantity,
  dimensionsMode: "library", customWidthM: null, customLengthM: null, customHeightM: null,
  functionalRole, circulationProfileId: "CIR-002", notes: "" });
const scenario = (environmentId: string, selectedItems: SelectedItem[], patch: Partial<ParametricScenario> = {}): ParametricScenario => ({
  id: "scenario-test", name: "Teste", environmentId, comfortLevel: "comfortable", accessibilityProfile: "standard",
  selectedItems, arrangement: "", customParameters: {}, geometricReservePercentage: 15, result: null,
  createdAt: AT, updatedAt: AT, notes: "", ...patch,
});

test("calculates known bedroom envelopes for casal, queen, king, solteiro and beliche", () => {
  const cases = [
    ["MOB-003", 2.6, 2.5, 2.9, 2.65], ["MOB-002", 2.78, 2.58, 3.08, 2.73],
    ["MOB-001", 3.13, 2.63, 3.43, 2.78], ["MOB-004", 2, 2.5, 2.3, 2.65],
    ["MOB-005", 2.05, 2.55, 2.35, 2.7], ["MOB-037", 2.1, 2.5, 2.4, 2.65],
  ] as const;
  for (const [id, minW, minL, recW, recL] of cases) {
    const result = calculateParametricScenario(scenario(id === "MOB-004" || id === "MOB-005" ? "AMB-002" : "AMB-001", [item(id)]), AT);
    assert.deepEqual([result.minimumWidthM, result.minimumLengthM, result.recommendedWidthM, result.recommendedLengthM],
      [minW, minL, recW, recL]);
  }
});

test("handles opening and sliding wardrobes, overlap and source conflicts", () => {
  const open = calculateParametricScenario(scenario("AMB-001", [item("MOB-003"), item("MOB-006")]), AT);
  const sliding = calculateParametricScenario(scenario("AMB-001", [item("MOB-002"), item("MOB-007")]), AT);
  assert.ok(open.warnings.some((warning) => warning.includes("Armário de abrir")));
  assert.equal(open.breakdown.overlapAreaRemovedM2, 0.36);
  assert.deepEqual(open.conflicts, ["CFL-001"]);
  assert.equal(sliding.warnings.some((warning) => warning.includes("Armário de abrir")), false);
});

test("calcula item personalizado 0,60 x 1,60 sem altura e ignora legado incompleto com aviso amigável", () => {
  const custom = { id: "custom-valid", sourceType: "custom", libraryItemId: null, quantity: 1, dimensionsMode: "custom",
    customWidthM: 0.6, customLengthM: 1.6, customHeightM: null, functionalRole: "primary", circulationProfileId: "CIR-002", notes: "Mesa especial" } as const;
  const pending = { ...custom, id: "custom-pending", customWidthM: null, notes: "Item antigo" };
  const result = calculateParametricScenario(scenario("AMB-004", [custom, pending]), AT);
  assert.ok(result.breakdown.itemAreas.some((entry) => entry.itemId === "custom-valid"));
  assert.equal(result.breakdown.itemAreas.some((entry) => entry.itemId === "custom-pending"), false);
  assert.ok(result.warnings.some((warning) => warning.includes("Item antigo") && warning.includes("pendente")));
});

test("calculates one-face and two-face closet arrangements", () => {
  const one = calculateParametricScenario(scenario("AMB-003", [item("MOB-008")], { arrangement: "one_face" }), AT);
  const two = calculateParametricScenario(scenario("AMB-003", [item("MOB-008")], { arrangement: "two_faces" }), AT);
  assert.deepEqual([one.recommendedWidthM, one.recommendedLengthM], [1.55, 1.7]);
  assert.deepEqual([two.recommendedWidthM, two.recommendedLengthM], [2.1, 1.5]);
});

test("calculates bathroom and lavabo fixtures with explicit geometry", () => {
  const bathroom = calculateParametricScenario(scenario("AMB-007", [item("EQP-001", "equipment"), item("EQP-002", "equipment"), item("EQP-004", "equipment")]), AT);
  const lavabo = calculateParametricScenario(scenario("AMB-006", [item("EQP-001", "equipment"), item("EQP-002", "equipment")]), AT);
  assert.deepEqual([bathroom.minimumWidthM, bathroom.minimumLengthM, bathroom.recommendedWidthM, bathroom.recommendedLengthM], [1.6, 2.1, 1.75, 2.1]);
  assert.deepEqual([lavabo.minimumWidthM, lavabo.minimumLengthM, lavabo.recommendedWidthM, lavabo.recommendedLengthM], [1.6, 1.5, 1.75, 1.88]);
});

test("calculates dining, office and garage known cases", () => {
  const dining = calculateParametricScenario(scenario("AMB-005", [item("MOB-012"), item("MOB-013", "furniture", 6)],
    { customParameters: { circulationSides: 4 } }), AT);
  const office = calculateParametricScenario(scenario("AMB-010", [item("MOB-014"), item("MOB-015")],
    { customParameters: { people: 1 } }), AT);
  const garage = calculateParametricScenario(scenario("AMB-013", [item("EQP-012", "equipment", 1, "vehicle")]), AT);
  assert.deepEqual([dining.minimumWidthM, dining.minimumLengthM, dining.recommendedWidthM, dining.recommendedLengthM], [3.1, 4, 3.9, 4.8]);
  assert.deepEqual([office.minimumWidthM, office.minimumLengthM, office.recommendedWidthM, office.recommendedLengthM], [1.2, 2.1, 1.5, 2.5]);
  assert.deepEqual([garage.minimumWidthM, garage.minimumLengthM, garage.recommendedWidthM, garage.recommendedLengthM], [2.7, 5, 4, 5.3]);
});

test("applies comfort, accessibility, geometry reserve and preliminary conflicts independently", () => {
  const compact = calculateParametricScenario(scenario("AMB-001", [item("MOB-001")], { comfortLevel: "compact" }), AT);
  const wheelchair = calculateParametricScenario(scenario("AMB-001", [item("MOB-001")], { accessibilityProfile: "wheelchair" }), AT);
  const kitchen = calculateParametricScenario(scenario("AMB-008", [item("EQP-006", "equipment"), item("EQP-007", "equipment")],
    { geometricReservePercentage: 10, customParameters: { referenceNetAreaM2: 6.5 } }), AT);
  assert.equal(compact.recommendedWidthM, 3.13);
  assert.equal(wheelchair.recommendedWidthM, 4.93);
  assert.ok(wheelchair.warnings.some((warning) => warning.includes("norma vigente")));
  assert.equal(kitchen.geometricReserveAreaM2, Number((kitchen.recommendedNetAreaM2 * 0.1).toFixed(2)));
  assert.deepEqual(kitchen.conflicts, ["CFL-002"]);
  assert.equal(kitchen.confidence, "inferred");
});

test("calculates the experimental stair with adjusted riser and Blondel", () => {
  const stair = calculateParametricScenario(scenario("AMB-014", [], { customParameters: {
    levelHeightM: 2.8, targetRiserM: 0.175, treadM: 0.28, stairWidthM: 0.9, flights: 2, landingLengthM: 0.9,
  } }), AT);
  assert.deepEqual([stair.minimumWidthM, stair.minimumLengthM], [0.9, 2.86]);
  assert.ok(stair.assumptions.some((assumption) => assumption.includes("16 espelhos de 0.18m; Blondel 0.63m")));
  assert.ok(stair.warnings.some((warning) => warning.includes("Não calcula rampas")));
});

test("uses the selected dining-table variant instead of a fixed six-seat item", () => {
  const fourSeats = calculateParametricScenario(scenario("AMB-005", [item("MOB-019")],
    { customParameters: { circulationSides: 4 } }), AT);
  const twelveSeats = calculateParametricScenario(scenario("AMB-005", [item("MOB-022")],
    { customParameters: { circulationSides: 4 } }), AT);
  assert.ok(twelveSeats.minimumNetAreaM2 > fourSeats.minimumNetAreaM2);
  assert.ok(twelveSeats.recommendedNetAreaM2 > fourSeats.recommendedNetAreaM2);
  assert.equal(fourSeats.breakdown.primaryAreaDrivers[0], "Mesa de Jantar Retangular 4 Lugares");
  assert.equal(twelveSeats.breakdown.primaryAreaDrivers[0], "Mesa de Jantar Retangular 12 Lugares");
});

test("separates pool water, deck and machine room pilot areas", () => {
  const pool = calculateParametricScenario(scenario("AMB-015", [], {
    customParameters: { poolWidthM: 3, poolLengthM: 5 }, geometricReservePercentage: 15,
  }), AT);
  const deck = calculateParametricScenario(scenario("AMB-016", [], {
    customParameters: { referenceNetAreaM2: 20 }, geometricReservePercentage: 0,
  }), AT);
  const machineRoom = calculateParametricScenario(scenario("AMB-017", [], {
    customParameters: { referenceNetAreaM2: 4 }, geometricReservePercentage: 15,
  }), AT);
  assert.deepEqual([pool.minimumNetAreaM2, pool.recommendedNetAreaM2, pool.estimatedGrossAreaM2], [15, 15, 17.25]);
  assert.deepEqual([deck.minimumNetAreaM2, deck.recommendedNetAreaM2, deck.estimatedGrossAreaM2], [17, 20, 20]);
  assert.deepEqual([machineRoom.minimumNetAreaM2, machineRoom.recommendedNetAreaM2, machineRoom.estimatedGrossAreaM2], [3.4, 4, 4.6]);
  assert.ok(pool.assumptions.some((assumption) => assumption.includes("espelho d’água")));
  assert.ok(deck.warnings.some((warning) => warning.includes("não representa paredes")));
});
