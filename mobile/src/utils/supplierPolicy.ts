import type { AnalysisResponse } from "../types/analysis";
import type { MeasurementResponse } from "../types/measurement";
import type { RepairAssessmentResponse, RepairConfirmations } from "../types/repair";
import type { SupplierSearchRequest } from "../types/supplier";

export function supplierBlock(analysis: AnalysisResponse, assessment: RepairAssessmentResponse, measurement: MeasurementResponse | null, confirmations: Partial<RepairConfirmations>): string | null {
  if (analysis.is_mock) return "Demo analysis cannot be used for nearby supplier discovery. Use a live AI analysis.";
  if (assessment.decision !== "eligible") return "The repair assessment did not authorize this limited case. Reassess before looking for materials.";
  if (!measurement || measurement.status !== "measured") return "A completed assisted measurement is required. Retake or remeasure the photo.";
  if (measurement.gap_range_status !== "within_mvp_range") return "The measured cut gap is outside the MVP range. Remeasure or reassess.";
  if (!measurement.suggested_nominal_size) return "The visible-diameter size suggestion is ambiguous. Retake or remeasure.";
  if (measurement.suggested_nominal_size !== confirmations.nominal_size) return "The suggested size conflicts with your confirmed size. Reassess the pipe size.";
  return null;
}

export function makeSupplierRequest(base: Omit<SupplierSearchRequest, "area" | "radius_km" | "max_results">, area: string, radiusKm: number): SupplierSearchRequest {
  return { ...base, area: area.trim(), radius_km: radiusKm, max_results: 10 };
}

export function validSupplierArea(area: string): boolean { return area.trim().length >= 2 && area.trim().length <= 120; }
