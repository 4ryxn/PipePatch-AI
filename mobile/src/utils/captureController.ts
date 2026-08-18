export type CaptureResource = "camera" | "library";
export type PermissionViewState = "idle" | "denied_camera" | "blocked_camera" | "denied_library" | "blocked_library" | "unavailable";
export type PermissionResult = { granted: boolean; canAskAgain: boolean };
export function permissionState(resource: CaptureResource, result: PermissionResult): PermissionViewState { if (result.granted) return "idle"; return result.canAskAgain ? `denied_${resource}` : `blocked_${resource}`; }
export function permissionMessage(state: PermissionViewState): string | null { if (state === "denied_camera") return "Camera permission was not granted"; if (state === "denied_library") return "Photo library permission was not granted"; if (state === "blocked_camera") return "Allow camera access in device settings, then return here."; if (state === "blocked_library") return "Allow photo library access in device settings, then return here."; if (state === "unavailable") return "Photo access is unavailable"; return null; }
export function shouldOfferSettings(state: PermissionViewState): boolean { return state === "blocked_camera" || state === "blocked_library" || state === "unavailable"; }
export function isCurrentOperation(expected: number, current: number): boolean { return expected === current; }
export function canStartCapture(busy: boolean): boolean { return !busy; }
export function cancellationResult(): { imageCreated: false; advance: false; error: null } { return { imageCreated: false, advance: false, error: null }; }
