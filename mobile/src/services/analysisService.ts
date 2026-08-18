import { apiBaseUrl } from "../config/api";
import type { SelectedImage } from "../types/image";
import type { AnalysisResponse } from "../types/analysis";

export class AnalysisRequestError extends Error {
  constructor(message: string) { super(message); this.name = "AnalysisRequestError"; }
}

function inferredMimeType(image: SelectedImage): string | null {
  if (image.mimeType === "image/jpeg" || image.mimeType === "image/png" || image.mimeType === "image/webp") return image.mimeType;
  const extension = image.localUri.split(/[?#]/, 1)[0].split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
}

function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<AnalysisResponse>;
  return response.is_mock === true && typeof response.supported_case === "boolean" && typeof response.summary === "string" && Array.isArray(response.evidence) && Array.isArray(response.unknowns) && Array.isArray(response.safety_flags) && typeof response.next_action === "string";
}

export function isRequestCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function requestDemoAnalysis(image: SelectedImage, signal: AbortSignal): Promise<AnalysisResponse> {
  const type = inferredMimeType(image);
  if (!type) throw new AnalysisRequestError("This photo has no supported upload type. Choose another photo.");

  const form = new FormData();
  form.append("image", { uri: image.localUri, name: "pipe-image", type } as unknown as Blob);
  const response = await fetch(`${apiBaseUrl}/api/v1/analyze`, { method: "POST", body: form, signal });
  if (!response.ok) throw new AnalysisRequestError("The demo analysis could not be completed. Try again.");
  const body: unknown = await response.json();
  if (!isAnalysisResponse(body)) throw new AnalysisRequestError("The demo analysis returned an invalid response. Try again.");
  return body;
}
