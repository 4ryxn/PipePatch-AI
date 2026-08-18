/* eslint-disable import/first */
const mockFetch = jest.fn();
jest.mock("../config/api", () => ({ apiBaseUrl: "http://example.test" }));
import { requestCalibration } from "./calibrationService";

const image = { localUri: "file:///marker.png", width: 1200, height: 1200, mimeType: "image/png", fileSize: null, source: "camera" as const, originalOwnership: "app_owned" as const, normalizedStatus: "original" as const, appOwnedUris: ["file:///marker.png"] };
const calibrated = { status: "calibrated" as const, pixels_per_mm: 4.1, marker_id: 23 as const, known_marker_side_mm: 50 as const, quality_score: 0.9, retake_reasons: [], capture_tips: [], scope_note: "Scale only." };
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(global, "fetch", { configurable: true, value: mockFetch }); mockFetch.mockResolvedValue({ ok: true, json: async () => calibrated }); });
test("posts a calibration image without manually setting multipart content type", async () => { await expect(requestCalibration(image, new AbortController().signal)).resolves.toEqual(calibrated); expect(mockFetch).toHaveBeenCalledWith("http://example.test/api/v1/calibration", expect.objectContaining({ method: "POST", body: expect.any(FormData) })); expect(mockFetch.mock.calls[0][1].headers).toBeUndefined(); });
