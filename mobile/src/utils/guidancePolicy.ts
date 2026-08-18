import type { AnalysisResponse } from "../types/analysis";
import type { MeasurementResponse } from "../types/measurement";
import type { RepairAssessmentResponse, RepairConfirmations } from "../types/repair";

export function guidanceBlock(analysis: AnalysisResponse | null, assessment: RepairAssessmentResponse, measurement: MeasurementResponse | null, confirmations: Partial<RepairConfirmations>): string | null {
  if (analysis?.is_mock) return "Demo analysis cannot receive repair guidance. Prepare a live analysis.";
  if (assessment.decision !== "eligible") return "Reassess the safety confirmations.";
  if (!measurement) return "Take a calibration photo and complete assisted measurement.";
  if (measurement.status !== "measured") return "Retake or remeasure the calibration photo.";
  if (measurement.gap_range_status !== "within_mvp_range") return "The cut gap is outside the limited MVP range; reassess the repair.";
  if (!measurement.suggested_nominal_size) return "The visible size is ambiguous; retake or remeasure.";
  if (measurement.suggested_nominal_size !== confirmations.nominal_size) return "The measured suggestion conflicts with your confirmed size; reassess.";
  return null;
}

export type GuidanceRequestState = { status: "idle" | "loading" | "error"; operationId: number };
export const initialGuidanceRequestState: GuidanceRequestState = { status: "idle", operationId: 0 };
export function guidanceRequestReducer(state: GuidanceRequestState, event: { type: "START" | "RETRY"; operationId: number } | { type: "SUCCESS" | "FAILURE" | "CANCEL"; operationId: number }): GuidanceRequestState {
  if ((event.type === "START" || event.type === "RETRY") && state.status !== "loading") return { status: "loading", operationId: event.operationId };
  if (event.operationId !== state.operationId) return state;
  if (event.type === "CANCEL" || event.type === "SUCCESS") return { status: "idle", operationId: event.operationId };
  if (event.type === "FAILURE") return { status: "error", operationId: event.operationId };
  return state;
}
