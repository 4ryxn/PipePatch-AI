import { makeSupplierRequest, supplierBlock, validSupplierArea } from "./supplierPolicy";

const analysis = { is_mock: false, supported_case: true, material: null, pipe_schedule: null, nominal_size: null, damage_type: null, confidence: 0.8, summary: "", evidence: [], unknowns: [], safety_flags: [], next_action: "" };
const assessment = { decision: "eligible" as const, reasons: [], safety_warnings: [], confirmed_pipe_size: "1/2" as const, repair_method_id: "two_slip_coupling_section_replacement" as const, parts: [], tools: [] };
const confirmations = { line_type: "outdoor_irrigation" as const, outdoor_irrigation: "yes" as const, water_supply_shut_off: "yes" as const, pvc_schedule_40_marking: "yes" as const, nominal_size: "1/2" as const, clean_transverse_cut: "yes" as const, no_additional_damage: "yes" as const, straight_section: "yes" as const, safely_away_from_components: "yes" as const, pipe_ends_accessible: "yes" as const };
const measurement = { status: "measured" as const, estimated_outer_diameter_mm: 21.3, estimated_gap_mm: 50, quality_score: 0.9, pixels_per_mm: 5, marker_id: 23 as const, known_marker_side_mm: 50 as const, suggested_nominal_size: "1/2" as const, gap_range_status: "within_mvp_range" as const, limitations: [], retake_reasons: [] };

describe("supplier policy", () => {
  test("allows only the same narrow deterministic context", () => {
    expect(supplierBlock(analysis, assessment, measurement, confirmations)).toBeNull();
    expect(makeSupplierRequest({ analysis, assessment: undefined } as never, " Pune ", 5)).toMatchObject({ area: "Pune", radius_km: 5, max_results: 10 });
  });
  test.each([
    ["mock", { ...analysis, is_mock: true }, assessment, measurement, confirmations],
    ["assessment", analysis, { ...assessment, decision: "needs_more_information" }, measurement, confirmations],
    ["missing measurement", analysis, assessment, null, confirmations],
    ["bad gap", analysis, assessment, { ...measurement, gap_range_status: "above_mvp_range" }, confirmations],
    ["ambiguous size", analysis, assessment, { ...measurement, suggested_nominal_size: null }, confirmations],
    ["size conflict", analysis, assessment, { ...measurement, suggested_nominal_size: "1" }, confirmations],
  ])("blocks %s", (_name, a, b, m, c) => expect(supplierBlock(a as never, b as never, m as never, c as never)).not.toBeNull());
  test("validates general area length", () => { expect(validSupplierArea("Pune")).toBe(true); expect(validSupplierArea(" ")).toBe(false); });
});
