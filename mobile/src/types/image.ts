export type ImageSource = "camera" | "library";
export type FileOwnership = "app_owned" | "user_owned";
export type NormalizedStatus = "original" | "normalized";
export type ImageCandidate = { localUri: string; width: number; height: number; mimeType: string | null; fileSize: number | null; source: ImageSource; originalOwnership: FileOwnership };
export type SelectedImage = ImageCandidate & { normalizedStatus: NormalizedStatus; appOwnedUris: string[] };
export type ReadyForAnalysis = { status: "ready_for_analysis"; image: SelectedImage };
