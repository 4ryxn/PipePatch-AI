import { describe, expect, it } from "vitest";
import type { Analysis } from "./api";
import { completeAnalysis } from "./analysisFlow";

const result: Analysis = {
  is_mock: false, supported_case: true, damage_category: "clean_transverse_cut", confidence: 0.82,
  summary: "Observation complete.", evidence: [], unknowns: [], safety_flags: [], next_action: "Continue safely.",
};

describe("analysis result transition", () => {
  it("moves a valid live analysis response into the result state", () => {
    expect(completeAnalysis(4, 4, result)).toEqual({ view: "analysis", result });
  });

  it("ignores a stale response after cancellation or replacement", () => {
    expect(completeAnalysis(5, 4, result)).toBeNull();
  });
});
