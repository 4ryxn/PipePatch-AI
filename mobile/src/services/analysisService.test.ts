/* eslint-disable import/first */
const append = jest.fn();
const mockFetch = jest.fn();

jest.mock("../config/api", () => ({ apiBaseUrl: "http://example.test" }));

import { isRequestCancellation, requestDemoAnalysis } from "./analysisService";

const image = { localUri: "file:///pipe.jpg", width: 1200, height: 1200, mimeType: "image/jpeg", fileSize: null, source: "camera" as const, originalOwnership: "app_owned" as const, normalizedStatus: "original" as const, appOwnedUris: ["file:///pipe.jpg"] };
const response = { is_mock: true as const, supported_case: false, material: null, pipe_schedule: null, nominal_size: null, damage_type: null, confidence: 0, summary: "Demo", evidence: [], unknowns: [], safety_flags: [], next_action: "Stop" };

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(global, "FormData", { configurable: true, value: jest.fn().mockImplementation(() => ({ append })) });
  Object.defineProperty(global, "fetch", { configurable: true, value: mockFetch });
  mockFetch.mockResolvedValue({ ok: true, json: async () => response });
});

test("sends the confirmed image as multipart without manually setting a Content-Type boundary", async () => {
  await expect(requestDemoAnalysis(image, new AbortController().signal)).resolves.toEqual(response);

  expect(append).toHaveBeenCalledWith("image", expect.objectContaining({ type: "image/jpeg", uri: image.localUri }));
  expect(mockFetch).toHaveBeenCalledWith("http://example.test/api/v1/analyze", expect.objectContaining({ method: "POST", body: expect.anything() }));
  expect(mockFetch.mock.calls[0][1].headers).toBeUndefined();
});

test("recognizes request cancellation separately from a failed demo analysis", () => {
  const cancellation = new Error("cancelled");
  cancellation.name = "AbortError";
  expect(isRequestCancellation(cancellation)).toBe(true);
  expect(isRequestCancellation(new Error("network failed"))).toBe(false);
});
