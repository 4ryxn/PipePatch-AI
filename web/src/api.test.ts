import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalysisRequestError, analysisUrl, analyze } from "./api";

const liveResult = {
  is_mock: false, supported_case: true, material: "PVC", pipe_schedule: "Schedule 40", nominal_size: null,
  damage_type: "clean transverse cut", damage_category: "clean_transverse_cut", confidence: 0.84,
  summary: "A clean cut is visible.", evidence: ["Two exposed pipe ends"], unknowns: ["Size needs confirmation"],
  safety_flags: ["Shut off water"], next_action: "Continue with safety confirmation.",
};

describe("analysis request", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts a valid live result, including damage_category, to the normalized analysis URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => liveResult }));
    const result = await analyze(new File(["x"], "pipe.jpg", { type: "image/jpeg" }));
    expect(result).toEqual(liveResult);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/analyze"), expect.objectContaining({ method: "POST", body: expect.any(FormData) }));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers).toBeUndefined();
  });

  it("removes a trailing slash before building the analysis route", () => {
    expect(analysisUrl("https://pipepatch.example/")).toBe("https://pipepatch.example/api/v1/analyze");
  });

  it("returns a safe validation message for an unsuccessful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({ detail: "too large" }) }));
    await expect(analyze(new File(["x"], "pipe.jpg"))).rejects.toEqual(new AnalysisRequestError("The image is larger than the 8 MB upload limit."));
  });

  it("does not accept an incomplete successful response as an analysis result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ is_mock: false }) }));
    await expect(analyze(new File(["x"], "pipe.jpg"))).rejects.toBeInstanceOf(AnalysisRequestError);
  });
});
