import type { RepairGuidanceRequest } from "./repairGuidance";
import type { RepairDecision } from "./repair";

export type SupplierSearchRequest = RepairGuidanceRequest & {
  entered_quote_amount?: number | null;
  area: string;
  radius_km: number;
  max_results: number;
};

export type SupplierLead = {
  name: string;
  category: string;
  public_address: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
  directions_url: string;
  availability_status: "unknown";
  availability_message: string;
};

export type SupplierSearchResponse = {
  decision: RepairDecision;
  suppliers: SupplierLead[];
  reasons: string[];
  fallback_search_url: string;
  fallback_message: string | null;
  provider_enabled: boolean;
  attribution: string;
  data_disclaimer: string;
};
