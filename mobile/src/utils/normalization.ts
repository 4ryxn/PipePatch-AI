import { imageConfig } from "../config/image";
import type { ImageCandidate } from "../types/image";

export type NormalizationDecision =
  | { normalize: false }
  | { normalize: true; targetWidth: number; targetHeight: number };

export function decideNormalization(candidate: ImageCandidate): NormalizationDecision {
  if (!Number.isInteger(candidate.width) || !Number.isInteger(candidate.height) || candidate.width <= 0 || candidate.height <= 0) {
    return { normalize: false };
  }
  const longestSide = Math.max(candidate.width, candidate.height);
  const exceedsSize = candidate.fileSize !== null && candidate.fileSize > imageConfig.maxFileSizeBytes;
  if (longestSide <= imageConfig.maxDimension && !exceedsSize) {
    return { normalize: false };
  }

  const scale = Math.min(1, imageConfig.maxDimension / longestSide);
  return {
    normalize: true,
    targetWidth: Math.max(1, Math.round(candidate.width * scale)),
    targetHeight: Math.max(1, Math.round(candidate.height * scale)),
  };
}
