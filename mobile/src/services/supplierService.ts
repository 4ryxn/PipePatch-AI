import { apiBaseUrl } from "../config/api";
import type { SupplierSearchRequest, SupplierSearchResponse } from "../types/supplier";

export async function requestSuppliers(payload: SupplierSearchRequest, signal: AbortSignal): Promise<SupplierSearchResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/suppliers/search`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal,
  });
  if (!response.ok) throw new Error("Nearby supplier search is unavailable");
  return await response.json() as SupplierSearchResponse;
}
