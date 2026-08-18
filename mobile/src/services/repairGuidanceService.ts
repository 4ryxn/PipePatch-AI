import { apiBaseUrl } from "../config/api";
import type { RepairGuidanceRequest, RepairGuidanceResponse } from "../types/repairGuidance";
export async function requestRepairGuidance(payload: RepairGuidanceRequest, signal: AbortSignal): Promise<RepairGuidanceResponse> { const response = await fetch(`${apiBaseUrl}/api/v1/repair-guidance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal }); if (!response.ok) throw new Error("Repair guidance could not be completed."); return await response.json() as RepairGuidanceResponse; }
