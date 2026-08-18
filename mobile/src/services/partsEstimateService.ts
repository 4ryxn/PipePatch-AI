import { apiBaseUrl } from "../config/api";
import type { RepairGuidanceRequest } from "../types/repairGuidance";
import type { PartsEstimateResponse } from "../types/partsEstimate";
export async function requestPartsEstimate(payload: RepairGuidanceRequest & { entered_quote_amount?: number | null }, signal: AbortSignal): Promise<PartsEstimateResponse> { const r=await fetch(`${apiBaseUrl}/api/v1/parts-estimate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal}); if(!r.ok) throw new Error("Parts estimate unavailable"); return await r.json() as PartsEstimateResponse; }
