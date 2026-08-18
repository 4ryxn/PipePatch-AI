import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { imageConfig } from "../config/image";
import type { ImageCandidate, ImageSource, SelectedImage } from "../types/image";
import { decideNormalization } from "../utils/normalization";
type PickerAsset = Pick<ImagePicker.ImagePickerAsset, "uri" | "width" | "height" | "mimeType" | "fileSize">;
export function candidateFromAsset(asset: PickerAsset, source: ImageSource): ImageCandidate { return { localUri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType ?? null, fileSize: asset.fileSize ?? null, source, originalOwnership: source === "camera" ? "app_owned" : "user_owned" }; }
export async function cleanupAppOwnedUris(uris: string[], remove: (uri: string) => Promise<void> = async (uri) => { new File(uri).delete(); }): Promise<void> { await Promise.all(uris.map(async (uri) => { try { await remove(uri); } catch { /* best effort */ } })); }
export async function cleanupSelectedImage(image: SelectedImage | null): Promise<void> { await cleanupAppOwnedUris(image?.appOwnedUris ?? []); }
export async function normalizeImage(candidate: ImageCandidate): Promise<SelectedImage> { const decision = decideNormalization(candidate); if (!decision.normalize) return { ...candidate, normalizedStatus: "original", appOwnedUris: candidate.originalOwnership === "app_owned" ? [candidate.localUri] : [] }; const result = await ImageManipulator.manipulateAsync(candidate.localUri, [{ resize: { width: decision.targetWidth, height: decision.targetHeight } }], { base64: false, compress: imageConfig.jpegQuality, format: ImageManipulator.SaveFormat.JPEG }); if (candidate.originalOwnership === "app_owned") await cleanupAppOwnedUris([candidate.localUri]); return { ...candidate, localUri: result.uri, width: result.width, height: result.height, mimeType: "image/jpeg", fileSize: null, normalizedStatus: "normalized", appOwnedUris: [result.uri] }; }
