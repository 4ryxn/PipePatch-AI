import type { Analysis } from "./api";

export type AnalysisSuccessTransition = { view: "analysis"; result: Analysis };

/** A completed response is usable only for the operation that started it. */
export function completeAnalysis(
  activeOperationId: number,
  responseOperationId: number,
  result: Analysis,
): AnalysisSuccessTransition | null {
  return activeOperationId === responseOperationId ? { view: "analysis", result } : null;
}
