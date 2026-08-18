import { apiBaseUrl } from "../config/api";
import type { RepairAssessmentRequest, RepairAssessmentResponse } from "../types/repair";

export async function requestRepairAssessment(payload: RepairAssessmentRequest, signal: AbortSignal): Promise<RepairAssessmentResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/repair-assessment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
  if (!response.ok) throw new Error("The safety assessment could not be completed. Try again.");
  const body: unknown = await response.json();
  if (!isRepairAssessment(body)) throw new Error("The safety assessment returned an invalid response. Try again.");
  return body;
}

function isRepairAssessment(value: unknown): value is RepairAssessmentResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<RepairAssessmentResponse>;
  return (response.decision === "eligible" || response.decision === "needs_more_information" || response.decision === "professional_required") && Array.isArray(response.reasons) && Array.isArray(response.safety_warnings) && Array.isArray(response.parts) && Array.isArray(response.tools);
}
