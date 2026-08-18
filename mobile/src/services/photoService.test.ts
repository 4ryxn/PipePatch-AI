/* eslint-disable import/first */
jest.mock("expo-file-system", () => ({ deleteAsync: jest.fn() }));
jest.mock("expo-image-manipulator", () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: "jpeg" } }));

import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { cleanupAppOwnedUris, cleanupSelectedImage, normalizeImage } from "./photoService";

const remove = FileSystem.deleteAsync as jest.Mock;
const manipulate = ImageManipulator.manipulateAsync as jest.Mock;
const camera = { localUri: "file:///camera.jpg", width: 3000, height: 1500, mimeType: "image/jpeg", fileSize: null, source: "camera" as const, originalOwnership: "app_owned" as const };
const library = { ...camera, localUri: "content://library/42", source: "library" as const, originalOwnership: "user_owned" as const };

beforeEach(() => { jest.clearAllMocks(); remove.mockResolvedValue(undefined); manipulate.mockResolvedValue({ uri: "file:///normalized.jpg", width: 1600, height: 800 }); });
test("deletes an app-owned camera original after successful normalization", async () => { const result = await normalizeImage(camera); expect(remove).toHaveBeenCalledWith(camera.localUri, { idempotent: true }); expect(result.appOwnedUris).toEqual(["file:///normalized.jpg"]); });
test("does not delete a user-owned library original and cleans only its normalized copy", async () => { const result = await normalizeImage(library); expect(remove).not.toHaveBeenCalled(); await cleanupSelectedImage(result); expect(remove).toHaveBeenCalledWith("file:///normalized.jpg", { idempotent: true }); });
test("cleans active app-owned files during replacement or stale-result cleanup", async () => { await cleanupSelectedImage({ ...camera, normalizedStatus: "original", appOwnedUris: ["file:///camera.jpg", "file:///other.jpg"] }); expect(remove).toHaveBeenCalledTimes(2); });
test("swallows already-missing and deletion failures without logging", async () => { remove.mockRejectedValue(new Error("missing")); await expect(cleanupAppOwnedUris(["file:///temporary.jpg"])).resolves.toBeUndefined(); });
test("surfaces manipulator failure for the controller recovery path", async () => { manipulate.mockRejectedValue(new Error("failed")); await expect(normalizeImage(camera)).rejects.toThrow("failed"); });
test("normalization uses the configured JPEG output policy", async () => { await normalizeImage(camera); expect(manipulate).toHaveBeenCalledWith(camera.localUri, expect.any(Array), expect.objectContaining({ base64: false, compress: 0.82, format: "jpeg" })); });
