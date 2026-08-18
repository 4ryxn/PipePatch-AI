const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

/** The environment value is an origin, not a route. Trailing slashes are safe. */
export const baseUrl = (configuredBaseUrl || "http://127.0.0.1:8000").replace(/\/+$/, "");

export type Analysis = {
  is_mock: boolean;
  supported_case: boolean;
  material?: string | null;
  pipe_schedule?: string | null;
  nominal_size?: string | null;
  damage_type?: string | null;
  damage_category: string;
  confidence: number;
  summary: string;
  evidence: string[];
  unknowns: string[];
  safety_flags: string[];
  next_action: string;
};

export class AnalysisRequestError extends Error {}

export function analysisUrl(origin = baseUrl): string {
  return `${origin.replace(/\/+$/, "")}/api/v1/analyze`;
}

function safeErrorMessage(status: number, body: unknown): string {
  if (status === 413) return "The image is larger than the 8 MB upload limit.";
  if (status === 415 || status === 422) return "Choose a readable JPG, PNG, or WebP image and try again.";
  if (status === 400) return "The selected image could not be accepted. Choose another image and try again.";
  if (status === 503) return "Analysis is not configured or is temporarily unavailable. Check the backend configuration and try again.";
  if (status >= 500) return "The analysis service is temporarily unavailable. Try again shortly.";
  if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") return "The backend could not accept this analysis request. Check the image and try again.";
  return "Analysis could not be completed. Retry or select another photo.";
}

function isAnalysis(value: unknown): value is Analysis {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.is_mock === "boolean"
    && typeof candidate.supported_case === "boolean"
    && typeof candidate.damage_category === "string"
    && typeof candidate.confidence === "number"
    && typeof candidate.summary === "string"
    && Array.isArray(candidate.evidence)
    && Array.isArray(candidate.unknowns)
    && Array.isArray(candidate.safety_flags)
    && typeof candidate.next_action === "string";
}

export async function analyze(file: File, signal?: AbortSignal): Promise<Analysis> {
  const form = new FormData();
  form.append("image", file, file.name);
  const response = await fetch(analysisUrl(), { method: "POST", body: form, signal });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new AnalysisRequestError(safeErrorMessage(response.status, body));
  if (!isAnalysis(body)) throw new AnalysisRequestError("The backend returned an incomplete analysis result. Try again shortly.");
  return body;
}

export async function api<T>(path: string, payload: unknown, token?: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("Request unavailable");
  return response.json() as Promise<T>;
}
