import type { AnalysisResponse } from "../types/analysis";
import type { CalibrationResponse } from "../types/calibration";
import type { ReadyForAnalysis, SelectedImage } from "../types/image";
import type { RepairAssessmentResponse } from "../types/repair";

export type CapturePurpose = "analysis" | "calibration";
export type PhotoScreen = "home" | "guidance" | "source" | "camera" | "preparing" | "review" | "ready" | "uploading" | "analysis_error" | "result" | "confirmations" | "assessing" | "assessment_error" | "assessment" | "calibration_guide" | "calibrating" | "calibration_error" | "calibration_result";
export type PhotoFlowState = { screen: PhotoScreen; purpose: CapturePurpose; image: SelectedImage | null; ready: ReadyForAnalysis | null; analysis: AnalysisResponse | null; assessment: RepairAssessmentResponse | null; calibration: CalibrationResponse | null; operationId: number };
export const initialPhotoFlow: PhotoFlowState = { screen: "home", purpose: "analysis", image: null, ready: null, analysis: null, assessment: null, calibration: null, operationId: 0 };
export type PhotoFlowEvent = { type: "START" } | { type: "SHOW_SOURCE" } | { type: "OPEN_CAMERA" } | { type: "BEGIN_PREPARE"; operationId: number } | { type: "IMAGE_READY"; operationId: number; image: SelectedImage } | { type: "CANCEL"; operationId: number } | { type: "REPLACE"; operationId: number } | { type: "CONFIRM" } | { type: "BEGIN_ANALYSIS"; operationId: number } | { type: "ANALYSIS_SUCCESS"; operationId: number; analysis: AnalysisResponse } | { type: "ANALYSIS_FAILURE"; operationId: number } | { type: "CANCEL_ANALYSIS"; operationId: number } | { type: "RETRY_ANALYSIS"; operationId: number } | { type: "OPEN_CONFIRMATIONS" } | { type: "BEGIN_ASSESSMENT"; operationId: number } | { type: "ASSESSMENT_SUCCESS"; operationId: number; assessment: RepairAssessmentResponse } | { type: "ASSESSMENT_FAILURE"; operationId: number } | { type: "CANCEL_ASSESSMENT"; operationId: number; nextOperationId: number } | { type: "RETRY_ASSESSMENT"; operationId: number } | { type: "OPEN_CALIBRATION_GUIDE" } | { type: "BEGIN_CALIBRATION_CAPTURE"; operationId: number } | { type: "BEGIN_CALIBRATION"; operationId: number } | { type: "CALIBRATION_SUCCESS"; operationId: number; calibration: CalibrationResponse } | { type: "CALIBRATION_FAILURE"; operationId: number } | { type: "CANCEL_CALIBRATION"; operationId: number; nextOperationId: number } | { type: "RETRY_CALIBRATION"; operationId: number } | { type: "RETURN_TO_RESULT" } | { type: "RESET"; operationId: number };

export function photoFlowReducer(state: PhotoFlowState, event: PhotoFlowEvent): PhotoFlowState {
  switch (event.type) {
    case "START": return state.screen === "home" ? { ...state, screen: "guidance", purpose: "analysis" } : state;
    case "SHOW_SOURCE": return state.screen === "guidance" ? { ...state, screen: "source" } : state;
    case "OPEN_CAMERA": return state.screen === "source" ? { ...state, screen: "camera" } : state;
    case "BEGIN_PREPARE": return state.screen === "source" || state.screen === "camera" ? { ...state, screen: "preparing", operationId: event.operationId } : state;
    case "IMAGE_READY": return state.screen === "preparing" && state.operationId === event.operationId ? { ...state, screen: "review", image: event.image, ready: null } : state;
    case "CANCEL": return { ...state, screen: state.screen === "camera" || state.screen === "preparing" ? "source" : state.purpose === "calibration" ? "calibration_guide" : "guidance", operationId: event.operationId };
    case "REPLACE": return state.screen === "review" || state.screen === "analysis_error" || state.screen === "calibration_error" ? { ...state, screen: "source", image: null, ready: null, assessment: null, calibration: null, operationId: event.operationId } : state;
    case "CONFIRM": return state.screen === "review" && state.image ? { ...state, screen: "ready", ready: { status: "ready_for_analysis", image: state.image } } : state;
    case "BEGIN_ANALYSIS": return state.screen === "ready" && state.purpose === "analysis" && state.image ? { ...state, screen: "uploading", operationId: event.operationId } : state;
    case "ANALYSIS_SUCCESS": return state.screen === "uploading" && state.operationId === event.operationId ? { ...state, screen: "result", analysis: event.analysis } : state;
    case "ANALYSIS_FAILURE": return state.screen === "uploading" && state.operationId === event.operationId ? { ...state, screen: "analysis_error" } : state;
    case "CANCEL_ANALYSIS": return state.screen === "uploading" && state.operationId === event.operationId ? { ...state, screen: "review", ready: null } : state;
    case "RETRY_ANALYSIS": return state.screen === "analysis_error" && state.image ? { ...state, screen: "uploading", operationId: event.operationId } : state;
    case "OPEN_CONFIRMATIONS": return state.screen === "result" && state.analysis && !state.analysis.is_mock ? { ...state, screen: "confirmations", assessment: null } : state;
    case "BEGIN_ASSESSMENT": return state.screen === "confirmations" && state.analysis && !state.analysis.is_mock ? { ...state, screen: "assessing", operationId: event.operationId } : state;
    case "ASSESSMENT_SUCCESS": return state.screen === "assessing" && state.operationId === event.operationId ? { ...state, screen: "assessment", assessment: event.assessment } : state;
    case "ASSESSMENT_FAILURE": return state.screen === "assessing" && state.operationId === event.operationId ? { ...state, screen: "assessment_error" } : state;
    case "CANCEL_ASSESSMENT": return state.screen === "assessing" && state.operationId === event.operationId ? { ...state, screen: "confirmations", operationId: event.nextOperationId } : state;
    case "RETRY_ASSESSMENT": return state.screen === "assessment_error" && state.analysis ? { ...state, screen: "assessing", operationId: event.operationId } : state;
    case "OPEN_CALIBRATION_GUIDE": return state.screen === "result" && state.analysis ? { ...state, screen: "calibration_guide", calibration: null } : state;
    case "BEGIN_CALIBRATION_CAPTURE": return state.screen === "calibration_guide" ? { ...state, screen: "source", purpose: "calibration", image: null, ready: null, calibration: null, operationId: event.operationId } : state;
    case "BEGIN_CALIBRATION": return state.screen === "ready" && state.purpose === "calibration" && state.image ? { ...state, screen: "calibrating", operationId: event.operationId } : state;
    case "CALIBRATION_SUCCESS": return state.screen === "calibrating" && state.operationId === event.operationId ? { ...state, screen: "calibration_result", calibration: event.calibration } : state;
    case "CALIBRATION_FAILURE": return state.screen === "calibrating" && state.operationId === event.operationId ? { ...state, screen: "calibration_error" } : state;
    case "CANCEL_CALIBRATION": return state.screen === "calibrating" && state.operationId === event.operationId ? { ...state, screen: "review", operationId: event.nextOperationId } : state;
    case "RETRY_CALIBRATION": return state.screen === "calibration_error" && state.image ? { ...state, screen: "calibrating", operationId: event.operationId } : state;
    case "RETURN_TO_RESULT": return (state.screen === "calibration_guide" || state.screen === "calibration_result") && state.analysis ? { ...state, screen: "result", purpose: "analysis" } : state;
    case "RESET": return { ...initialPhotoFlow, operationId: event.operationId };
  }
}
