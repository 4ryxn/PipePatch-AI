import { apiBaseUrl } from "../config/api";
import type { CalibrationResponse } from "../types/calibration";
import type { SelectedImage } from "../types/image";

export class CalibrationRequestError extends Error {
  constructor(message: string) { super(message); this.name = "CalibrationRequestError"; }
}

function inferredMimeType(image: SelectedImage): string | null {
  if (image.mimeType === "image/jpeg" || image.mimeType === "image/png" || image.mimeType === "image/webp") return image.mimeType;
  const extension = image.localUri.split(/[?#]/, 1)[0].split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
}

function isCalibrationResponse(value: unknown): value is CalibrationResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<CalibrationResponse>;
  return (response.status === "calibrated" || response.status === "needs_retake")
    && (typeof response.pixels_per_mm === "number" || response.pixels_per_mm === null)
    && response.marker_id === 23 && response.known_marker_side_mm === 50
    && typeof response.quality_score === "number" && Array.isArray(response.retake_reasons)
    && Array.isArray(response.capture_tips) && typeof response.scope_note === "string";
}

export async function requestCalibration(image: SelectedImage, signal: AbortSignal): Promise<CalibrationResponse> {
  const type = inferredMimeType(image);
  if (!type) throw new CalibrationRequestError("This photo has no supported upload type. Choose another photo.");
  const form = new FormData();
  form.append("image", { uri: image.localUri, name: "calibration-image", type } as unknown as Blob);
  const response = await fetch(`${apiBaseUrl}/api/v1/calibration`, { method: "POST", body: form, signal });
  if (!response.ok) throw new CalibrationRequestError("The reference scale could not be checked. Try again.");
  const body: unknown = await response.json();
  if (!isCalibrationResponse(body)) throw new CalibrationRequestError("The calibration response was invalid. Try again.");
  return body;
}
