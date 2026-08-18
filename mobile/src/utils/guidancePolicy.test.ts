import { guidanceBlock, guidanceRequestReducer, initialGuidanceRequestState } from "./guidancePolicy";

const analysis = { is_mock: false, supported_case: true, material: null, pipe_schedule: null, nominal_size: null, damage_type: null, confidence: .8, summary: "", evidence: [], unknowns: [], safety_flags: [], next_action: "" };
const assessment = { decision: "eligible" as const, reasons: [], safety_warnings: [], confirmed_pipe_size: "1/2" as const, repair_method_id: "two_slip_coupling_section_replacement" as const, parts: [], tools: [] };
const confirmations = { line_type: "outdoor_irrigation" as const, outdoor_irrigation: "yes" as const, water_supply_shut_off: "yes" as const, pvc_schedule_40_marking: "yes" as const, nominal_size: "1/2" as const, clean_transverse_cut: "yes" as const, no_additional_damage: "yes" as const, straight_section: "yes" as const, safely_away_from_components: "yes" as const, pipe_ends_accessible: "yes" as const };
const measurement = { status: "measured" as const, estimated_outer_diameter_mm: 21.3, estimated_gap_mm: 50, quality_score: .9, pixels_per_mm: 5, marker_id: 23 as const, known_marker_side_mm: 50 as const, suggested_nominal_size: "1/2" as const, gap_range_status: "within_mvp_range" as const, limitations: [], retake_reasons: [] };

test("blocks every unsafe or incomplete local guidance condition", () => {
  expect(guidanceBlock({ ...analysis, is_mock: true }, assessment, measurement, confirmations)).toMatch(/Demo analysis/);
  expect(guidanceBlock(analysis, { ...assessment, decision: "needs_more_information" }, measurement, confirmations)).toMatch(/Reassess/);
  expect(guidanceBlock(analysis, assessment, null, confirmations)).toMatch(/calibration/);
  expect(guidanceBlock(analysis, assessment, { ...measurement, status: "needs_retake" }, confirmations)).toMatch(/Retake/);
  expect(guidanceBlock(analysis, assessment, { ...measurement, gap_range_status: "below_mvp_range" }, confirmations)).toMatch(/outside/);
  expect(guidanceBlock(analysis, assessment, { ...measurement, gap_range_status: "above_mvp_range" }, confirmations)).toMatch(/outside/);
  expect(guidanceBlock(analysis, assessment, { ...measurement, suggested_nominal_size: null }, confirmations)).toMatch(/ambiguous/);
  expect(guidanceBlock(analysis, assessment, { ...measurement, suggested_nominal_size: "1" }, confirmations)).toMatch(/conflicts/);
});

test("allows only matching eligible measured guidance context", () => { expect(guidanceBlock(analysis, assessment, measurement, confirmations)).toBeNull(); });

test("guards duplicate, stale, cancellation, and retry request transitions", () => {
  const loading = guidanceRequestReducer(initialGuidanceRequestState, { type: "START", operationId: 1 });
  expect(guidanceRequestReducer(loading, { type: "START", operationId: 2 })).toBe(loading);
  expect(guidanceRequestReducer(loading, { type: "SUCCESS", operationId: 2 })).toBe(loading);
  expect(guidanceRequestReducer(loading, { type: "CANCEL", operationId: 1 })).toEqual({ status: "idle", operationId: 1 });
  const error = guidanceRequestReducer(loading, { type: "FAILURE", operationId: 1 });
  expect(guidanceRequestReducer(error, { type: "RETRY", operationId: 3 })).toEqual({ status: "loading", operationId: 3 });
});
