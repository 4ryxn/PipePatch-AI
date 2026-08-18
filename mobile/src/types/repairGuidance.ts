import type { AnalysisResponse } from "./analysis";
import type { MeasurementResponse } from "./measurement";
import type { RepairConfirmations, RepairDecision } from "./repair";
export type RepairGuidanceRequest = { analysis: AnalysisResponse; confirmations: RepairConfirmations; measurement: MeasurementResponse };
export type RepairGuidanceResponse = { decision: RepairDecision; repair_method_id: "two_slip_coupling_section_replacement" | null; reasons: string[]; preparation_checklist: string[]; materials_tools_checklist: string[]; steps: string[]; stop_conditions: string[]; post_repair_verification: string[]; limitations: string[]; source_links: string[] };
