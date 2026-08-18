import type { AnalysisResponse } from "./analysis";

export type Confirmation = "yes" | "no" | "unknown";
export type LineType = "outdoor_irrigation" | "gas" | "sewer" | "electrical_conduit" | "potable_household" | "unknown";
export type NominalPipeSize = "1/2" | "3/4" | "1";
export type RepairDecision = "eligible" | "needs_more_information" | "professional_required";
export type RepairConfirmations = { line_type: LineType; outdoor_irrigation: Confirmation; water_supply_shut_off: Confirmation; pvc_schedule_40_marking: Confirmation; nominal_size: NominalPipeSize | null; clean_transverse_cut: Confirmation; no_additional_damage: Confirmation; straight_section: Confirmation; safely_away_from_components: Confirmation; pipe_ends_accessible: Confirmation };
export type RepairAssessmentRequest = { analysis: AnalysisResponse; confirmations: RepairConfirmations };
export type RepairAssessmentResponse = { decision: RepairDecision; reasons: string[]; safety_warnings: string[]; confirmed_pipe_size: NominalPipeSize | null; repair_method_id: "two_slip_coupling_section_replacement" | null; parts: string[]; tools: string[] };
