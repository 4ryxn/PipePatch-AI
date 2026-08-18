import type { AnalysisResponse } from "../types/analysis";
import type { ReadyForAnalysis, SelectedImage } from "../types/image";

export type PhotoScreen = "home" | "guidance" | "source" | "camera" | "preparing" | "review" | "ready" | "uploading" | "analysis_error" | "result";
export type PhotoFlowState = { screen: PhotoScreen; image: SelectedImage | null; ready: ReadyForAnalysis | null; analysis: AnalysisResponse | null; operationId: number };
export const initialPhotoFlow: PhotoFlowState = { screen: "home", image: null, ready: null, analysis: null, operationId: 0 };
export type PhotoFlowEvent = { type: "START" } | { type: "SHOW_SOURCE" } | { type: "OPEN_CAMERA" } | { type: "BEGIN_PREPARE"; operationId: number } | { type: "IMAGE_READY"; operationId: number; image: SelectedImage } | { type: "CANCEL"; operationId: number } | { type: "REPLACE"; operationId: number } | { type: "CONFIRM" } | { type: "BEGIN_ANALYSIS"; operationId: number } | { type: "ANALYSIS_SUCCESS"; operationId: number; analysis: AnalysisResponse } | { type: "ANALYSIS_FAILURE"; operationId: number } | { type: "CANCEL_ANALYSIS"; operationId: number } | { type: "RETRY_ANALYSIS"; operationId: number } | { type: "RESET"; operationId: number };
export function photoFlowReducer(state: PhotoFlowState, event: PhotoFlowEvent): PhotoFlowState {
  switch (event.type) {
    case "START": return state.screen === "home" ? { ...state, screen: "guidance" } : state;
    case "SHOW_SOURCE": return state.screen === "guidance" ? { ...state, screen: "source" } : state;
    case "OPEN_CAMERA": return state.screen === "source" ? { ...state, screen: "camera" } : state;
    case "BEGIN_PREPARE": return state.screen === "source" || state.screen === "camera" ? { ...state, screen: "preparing", operationId: event.operationId } : state;
    case "IMAGE_READY": return state.screen === "preparing" && state.operationId === event.operationId ? { ...state, screen: "review", image: event.image, ready: null } : state;
    case "CANCEL": return { ...state, screen: state.screen === "camera" || state.screen === "preparing" ? "source" : "guidance", operationId: event.operationId };
    case "REPLACE": return state.screen === "review" || state.screen === "analysis_error" ? { ...state, screen: "source", image: null, ready: null, analysis: null, operationId: event.operationId } : state;
    case "CONFIRM": return state.screen === "review" && state.image ? { ...state, screen: "ready", ready: { status: "ready_for_analysis", image: state.image } } : state;
    case "BEGIN_ANALYSIS": return state.screen === "ready" && state.image ? { ...state, screen: "uploading", operationId: event.operationId } : state;
    case "ANALYSIS_SUCCESS": return state.screen === "uploading" && state.operationId === event.operationId ? { ...state, screen: "result", analysis: event.analysis } : state;
    case "ANALYSIS_FAILURE": return state.screen === "uploading" && state.operationId === event.operationId ? { ...state, screen: "analysis_error" } : state;
    case "CANCEL_ANALYSIS": return state.screen === "uploading" && state.operationId === event.operationId ? { ...state, screen: "review", ready: null } : state;
    case "RETRY_ANALYSIS": return state.screen === "analysis_error" && state.image ? { ...state, screen: "uploading", operationId: event.operationId } : state;
    case "RESET": return { ...initialPhotoFlow, operationId: event.operationId };
  }
}
