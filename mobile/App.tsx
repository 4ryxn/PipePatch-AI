import { Camera, CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppButton } from "./src/components/AppButton";
import { Screen } from "./src/components/Screen";
import { apiBaseUrl } from "./src/config/api";
import { CameraCaptureScreen } from "./src/screens/CameraCaptureScreen";
import { AnalysisResultScreen } from "./src/screens/AnalysisResultScreen";
import { RepairAssessmentScreen } from "./src/screens/RepairAssessmentScreen";
import { RepairConfirmationScreen } from "./src/screens/RepairConfirmationScreen";
import { CalibrationGuideScreen } from "./src/screens/CalibrationGuideScreen";
import { CalibrationResultScreen } from "./src/screens/CalibrationResultScreen";
import { AssistedMeasurementScreen } from "./src/screens/AssistedMeasurementScreen";
import { RepairGuidanceScreen } from "./src/screens/RepairGuidanceScreen";
import { isRequestCancellation, requestAnalysis } from "./src/services/analysisService";
import { requestRepairAssessment } from "./src/services/repairAssessmentService";
import { requestCalibration } from "./src/services/calibrationService";
import { requestRepairGuidance } from "./src/services/repairGuidanceService";
import { candidateFromAsset, cleanupSelectedImage, normalizeImage } from "./src/services/photoService";
import { colors } from "./src/theme";
import type { ImageCandidate, SelectedImage } from "./src/types/image";
import type { RepairConfirmations } from "./src/types/repair";
import type { MeasurementResponse } from "./src/types/measurement";
import type { RepairGuidanceResponse } from "./src/types/repairGuidance";
import { permissionState, shouldOfferSettings, type PermissionViewState } from "./src/utils/captureController";
import { validateImage } from "./src/utils/imageValidation";
import { initialPhotoFlow, photoFlowReducer } from "./src/utils/photoFlow";
import { reviewImageHeight } from "./src/utils/responsive";
import { guidanceBlock } from "./src/utils/guidancePolicy";

type HealthState = "checking" | "healthy" | "unavailable";
type HealthResponse = { status: "ok" };

export default function App(): React.JSX.Element {
  const [healthState, setHealthState] = useState<HealthState>("checking");
  const [flow, dispatch] = useReducer(photoFlowReducer, initialPhotoFlow);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionViewState>("idle");
  const [preparing, setPreparing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const operation = useRef(0);
  const mounted = useRef(true);
  const imageRef = useRef<SelectedImage | null>(null);
  const analysisAbort = useRef<AbortController | null>(null);
  const analysisInFlight = useRef(false);
  const assessmentAbort = useRef<AbortController | null>(null);
  const assessmentInFlight = useRef(false);
  const calibrationAbort = useRef<AbortController | null>(null);
  const calibrationInFlight = useRef(false);
  const [confirmations, setConfirmations] = useState<Partial<RepairConfirmations>>({});
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [measurementSuggestion, setMeasurementSuggestion] = useState<"1/2" | "3/4" | "1" | null>(null);
  const [measurement, setMeasurement] = useState<MeasurementResponse | null>(null);
  const [guidance, setGuidance] = useState<RepairGuidanceResponse | null>(null);
  const [guidanceBusy, setGuidanceBusy] = useState(false);
  const guidanceAbort = useRef<AbortController | null>(null);

  useEffect(() => { imageRef.current = flow.image; }, [flow.image]);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void checkHealth(setHealthState, controller.signal, mounted);
    return () => { mounted.current = false; controller.abort(); analysisAbort.current?.abort(); assessmentAbort.current?.abort(); calibrationAbort.current?.abort(); void cleanupSelectedImage(imageRef.current); };
  }, []);

  const invalidate = (): number => ++operation.current;
  const prepare = async (candidate: ImageCandidate): Promise<void> => {
    const id = invalidate();
    setError(null);
    const result = validateImage(candidate);
    if (!result.valid) { if (mounted.current) setError(result.message); return; }
    dispatch({ type: "BEGIN_PREPARE", operationId: id });
    setPreparing(true);
    try {
      const image = await normalizeImage(candidate);
      if (mounted.current && operation.current === id) dispatch({ type: "IMAGE_READY", operationId: id, image });
      else await cleanupSelectedImage(image);
    } catch {
      if (mounted.current && operation.current === id) setError("This photo could not be prepared on this device. Choose or capture another image.");
    } finally { if (mounted.current && operation.current === id) setPreparing(false); }
  };

  const openCamera = async (): Promise<void> => {
    if (requesting || preparing || submitting) return;
    const id = operation.current;
    setRequesting(true); setError(null); setPermission("idle");
    try {
      if (!(await CameraView.isAvailableAsync())) { if (operation.current === id) setPermission("unavailable"); return; }
      const response = await Camera.requestCameraPermissionsAsync();
      if (operation.current !== id) return;
      if (response.granted) dispatch({ type: "OPEN_CAMERA" }); else setPermission(permissionState("camera", response));
    } finally { if (mounted.current && operation.current === id) setRequesting(false); }
  };

  const chooseLibrary = async (): Promise<void> => {
    if (requesting || preparing || submitting) return;
    const id = operation.current;
    setRequesting(true); setError(null); setPermission("idle");
    try {
      const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (operation.current !== id) return;
      if (!response.granted) { setPermission(permissionState("library", response)); return; }
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, base64: false, exif: false, quality: 1 });
      if (operation.current === id && !picked.canceled && picked.assets[0]) await prepare(candidateFromAsset(picked.assets[0], "library"));
    } catch { if (mounted.current && operation.current === id) setPermission("unavailable"); }
    finally { if (mounted.current && operation.current === id) setRequesting(false); }
  };

  const startAnalysis = (retry: boolean): void => {
    if (!flow.image || submitting || analysisInFlight.current) return;
    const id = invalidate();
    const controller = new AbortController();
    analysisAbort.current = controller;
    analysisInFlight.current = true;
    setSubmitting(true); setError(null);
    dispatch(retry ? { type: "RETRY_ANALYSIS", operationId: id } : { type: "BEGIN_ANALYSIS", operationId: id });
    void requestAnalysis(flow.image, controller.signal).then((analysis) => {
      if (mounted.current && operation.current === id) dispatch({ type: "ANALYSIS_SUCCESS", operationId: id, analysis });
    }).catch((reason: unknown) => {
      if (isRequestCancellation(reason)) return;
      if (mounted.current && operation.current === id) dispatch({ type: "ANALYSIS_FAILURE", operationId: id });
    }).finally(() => { if (operation.current === id) analysisInFlight.current = false; if (mounted.current && operation.current === id) setSubmitting(false); });
  };

  const cancelAnalysis = (): void => {
    const id = operation.current;
    analysisAbort.current?.abort();
    analysisInFlight.current = false;
    invalidate();
    dispatch({ type: "CANCEL_ANALYSIS", operationId: id });
    setSubmitting(false);
  };
  const startAssessment = (retry: boolean): void => {
    if (!flow.analysis || flow.analysis.is_mock || assessmentInFlight.current || !isComplete(confirmations)) return;
    const id = invalidate(); const controller = new AbortController(); assessmentAbort.current = controller; assessmentInFlight.current = true;
    dispatch(retry ? { type: "RETRY_ASSESSMENT", operationId: id } : { type: "BEGIN_ASSESSMENT", operationId: id });
    void requestRepairAssessment({ analysis: flow.analysis, confirmations: confirmations as RepairConfirmations }, controller.signal).then((assessment) => { if (mounted.current && operation.current === id) dispatch({ type: "ASSESSMENT_SUCCESS", operationId: id, assessment }); }).catch((reason: unknown) => { if (!isRequestCancellation(reason) && mounted.current && operation.current === id) dispatch({ type: "ASSESSMENT_FAILURE", operationId: id }); }).finally(() => { if (operation.current === id) assessmentInFlight.current = false; });
  };
  const cancelAssessment = (): void => { const id = operation.current; assessmentAbort.current?.abort(); assessmentInFlight.current = false; const nextOperationId = invalidate(); dispatch({ type: "CANCEL_ASSESSMENT", operationId: id, nextOperationId }); };
  const startCalibration = (retry: boolean): void => { if (!flow.image || calibrationInFlight.current) return; const id = invalidate(); const controller = new AbortController(); calibrationAbort.current = controller; calibrationInFlight.current = true; dispatch(retry ? { type: "RETRY_CALIBRATION", operationId: id } : { type: "BEGIN_CALIBRATION", operationId: id }); void requestCalibration(flow.image, controller.signal).then((calibration) => { if (mounted.current && operation.current === id) dispatch({ type: "CALIBRATION_SUCCESS", operationId: id, calibration }); }).catch((reason: unknown) => { if (!isRequestCancellation(reason) && mounted.current && operation.current === id) dispatch({ type: "CALIBRATION_FAILURE", operationId: id }); }).finally(() => { if (operation.current === id) calibrationInFlight.current = false; }); };
  const cancelCalibration = (): void => { const id = operation.current; calibrationAbort.current?.abort(); calibrationInFlight.current = false; const nextOperationId = invalidate(); dispatch({ type: "CANCEL_CALIBRATION", operationId: id, nextOperationId }); };
  const beginCalibrationCapture = (): void => { const id = invalidate(); void cleanupSelectedImage(flow.image); dispatch({ type: "BEGIN_CALIBRATION_CAPTURE", operationId: id }); };
  const replace = (): void => { const id = invalidate(); void cleanupSelectedImage(flow.image); dispatch({ type: "REPLACE", operationId: id }); };
  const restart = (): void => { const id = invalidate(); void cleanupSelectedImage(flow.image); setConfirmations({}); dispatch({ type: "RESET", operationId: id }); };
  const startGuidance = (): void => { if (!flow.analysis || !flow.assessment || !measurement || !isComplete(confirmations) || guidanceBusy) return; const id = invalidate(); const controller = new AbortController(); guidanceAbort.current = controller; setGuidanceBusy(true); void requestRepairGuidance({ analysis: flow.analysis, confirmations: confirmations as RepairConfirmations, measurement }, controller.signal).then((value) => { if (mounted.current && operation.current === id) setGuidance(value); }).catch(() => { if (mounted.current && operation.current === id) setError("Guidance could not be loaded. Retry the assessment."); }).finally(() => { if (mounted.current && operation.current === id) setGuidanceBusy(false); }); };
  const cancelGuidance = (): void => { guidanceAbort.current?.abort(); invalidate(); setGuidanceBusy(false); };

  if (flow.screen === "camera") return <SafeAreaProvider><CameraCaptureScreen onBack={() => dispatch({ type: "CANCEL", operationId: invalidate() })} onCapture={(image) => void prepare(image)} onUnavailable={() => { setPermission("unavailable"); dispatch({ type: "CANCEL", operationId: invalidate() }); }} /></SafeAreaProvider>;
  if (measurementOpen && flow.image) return <SafeAreaProvider><Screen><AssistedMeasurementScreen image={flow.image} onBack={() => setMeasurementOpen(false)} onRetake={replace} onMeasured={(result) => { setMeasurement(result); setMeasurementSuggestion(result.suggested_nominal_size); }} /></Screen></SafeAreaProvider>;
  if (guidance) return <SafeAreaProvider><Screen><RepairGuidanceScreen guidance={guidance} onBack={() => setGuidance(null)} /></Screen></SafeAreaProvider>;
  return <SafeAreaProvider><Screen><StatusBar style="dark" />
    {flow.screen === "home" && <Home healthState={healthState} onStart={() => dispatch({ type: "START" })} />}
    {flow.screen === "guidance" && <Guidance onContinue={() => dispatch({ type: "SHOW_SOURCE" })} />}
    {(flow.screen === "source" || flow.screen === "preparing") && <Source error={error} permission={permission} loading={preparing || requesting} onCamera={() => void openCamera()} onLibrary={() => void chooseLibrary()} onSettings={() => { void Linking.openSettings().catch(() => setError("Device settings could not be opened. Try again from this screen.")); }} onBack={() => dispatch({ type: "CANCEL", operationId: invalidate() })} />}
    {flow.screen === "review" && flow.image && <Review image={flow.image} calibration={flow.purpose === "calibration"} onReplace={replace} onConfirm={() => { dispatch({ type: "CONFIRM" }); if (flow.purpose === "calibration") startCalibration(false); else startAnalysis(false); }} />}
    {(flow.screen === "ready" || flow.screen === "uploading") && <Uploading onCancel={cancelAnalysis} />}
    {flow.screen === "analysis_error" && <AnalysisError onRetry={() => startAnalysis(true)} onReplace={replace} />}
    {flow.screen === "result" && flow.analysis && <AnalysisResultScreen analysis={flow.analysis} onStartOver={restart} onContinue={flow.analysis.is_mock ? undefined : () => dispatch({ type: "OPEN_CONFIRMATIONS" })} onCalibration={() => dispatch({ type: "OPEN_CALIBRATION_GUIDE" })} />}
    {flow.screen === "calibration_guide" && <CalibrationGuideScreen onCapture={beginCalibrationCapture} onBack={() => dispatch({ type: "RETURN_TO_RESULT" })} />}
    {flow.screen === "calibrating" && <AssessmentLoading onCancel={cancelCalibration} />}
    {flow.screen === "calibration_error" && <AssessmentError onRetry={() => startCalibration(true)} onRestart={replace} />}
    {flow.screen === "calibration_result" && flow.calibration && <CalibrationResultScreen calibration={flow.calibration} onRetake={replace} onDone={() => dispatch({ type: "RETURN_TO_RESULT" })} onMeasure={() => setMeasurementOpen(true)} />}
    {flow.screen === "confirmations" && <RepairConfirmationScreen value={confirmations} suggestedSize={measurementSuggestion} onChange={setConfirmations} onSubmit={() => startAssessment(false)} />}
    {flow.screen === "assessing" && <AssessmentLoading onCancel={cancelAssessment} />}
    {flow.screen === "assessment_error" && <AssessmentError onRetry={() => startAssessment(true)} onRestart={restart} />}
    {flow.screen === "assessment" && flow.assessment && <RepairAssessmentScreen assessment={flow.assessment} onRestart={restart} onGuidance={startGuidance} onCancelGuidance={cancelGuidance} guidanceBusy={guidanceBusy} blocked={guidanceBlock(flow.analysis, flow.assessment, measurement, confirmations)} />}
  </Screen></SafeAreaProvider>;
}

function Home({ healthState, onStart }: { healthState: HealthState; onStart: () => void }): React.JSX.Element { return <><Text style={s.eyebrow}>LOCAL PHOTO PREP</Text><Text style={s.title}>PipePatch AI</Text><Text style={s.body}>Prepare one clear pipe-damage photo for the configured backend analysis. Results never include repair advice.</Text><View style={s.card}><Text style={s.cardTitle}>Backend health</Text>{healthState === "checking" ? <ActivityIndicator accessibilityLabel="Checking backend health" color={colors.green} /> : <Text accessibilityLiveRegion="polite" style={healthState === "healthy" ? s.ok : s.warning}>{healthState === "healthy" ? "Connected" : "Unavailable — photo preparation still works locally"}</Text>}</View><View style={s.spacer} /><AppButton label="Prepare a pipe photo" onPress={onStart} /></>; }
function Guidance({ onContinue }: { onContinue: () => void }): React.JSX.Element { return <><Text style={s.eyebrow}>PHOTO GUIDANCE</Text><Text style={s.title}>Frame the repair area clearly</Text><Text style={s.body}>This guidance does not detect the pipe, damage, lighting, or calibration marker.</Text><View style={s.card}>{["Both damaged pipe ends", "Visible pipe markings when possible", "The complete ArUco calibration marker", "Adequate surrounding context", "Good lighting", "A steady, unobstructed image"].map((item) => <Text key={item} style={s.list}>• {item}</Text>)}</View><View style={s.spacer} /><AppButton label="Choose photo source" onPress={onContinue} /></>; }
function Source({ error, permission, loading, onCamera, onLibrary, onSettings, onBack }: { error: string | null; permission: PermissionViewState; loading: boolean; onCamera: () => void; onLibrary: () => void; onSettings: () => void; onBack: () => void }): React.JSX.Element { const blocked = permission.startsWith("blocked"); const resource = permission.includes("camera") ? "Camera" : "Photo library"; return <><Text style={s.eyebrow}>PHOTO SOURCE</Text><Text style={s.title}>Take or select a photo</Text><Text style={s.body}>PipePatch asks only for access needed to capture or choose this photo.</Text>{loading && <Loading label="Preparing your photo locally…" />}{permission !== "idle" && <View style={s.errorCard}><Text style={s.errorTitle}>{permission === "unavailable" ? "Photo access is unavailable" : `${resource} permission was not granted`}</Text><Text style={s.body}>{blocked ? `Allow ${resource.toLowerCase()} access in device settings, then return here.` : "You can try again or choose the other source."}</Text>{shouldOfferSettings(permission) && <AppButton label="Open device settings" onPress={onSettings} />}</View>}{error && <View style={s.errorCard}><Text style={s.errorTitle}>Choose another photo</Text><Text style={s.body}>{error}</Text></View>}<View style={s.spacer} /><AppButton label="Use rear camera" disabled={loading} onPress={onCamera} /><AppButton label="Choose from photo library" variant="secondary" disabled={loading} onPress={onLibrary} /><AppButton label="Back to guidance" variant="secondary" disabled={loading} onPress={onBack} /></>; }
function Review({ image, calibration, onReplace, onConfirm }: { image: SelectedImage; calibration: boolean; onReplace: () => void; onConfirm: () => void }): React.JSX.Element { const viewport = useWindowDimensions(); return <><Text style={s.eyebrow}>PHOTO REVIEW</Text><Text style={s.title}>Review your photo</Text><Image accessibilityLabel="Selected pipe-damage photo" source={{ uri: image.localUri }} style={[s.preview, { height: reviewImageHeight(viewport) }]} resizeMode="contain" /><View style={s.card}><Text style={s.cardTitle}>{calibration ? "Ready for reference-scale check" : image.normalizedStatus === "normalized" ? "Prepared for analysis upload" : "Ready for analysis upload"}</Text><Text style={s.body}>{image.width} × {image.height} pixels{image.fileSize !== null ? ` • ${Math.round(image.fileSize / 1024)} KB` : " • file size unavailable"}</Text><Text style={s.caption}>{calibration ? "Confirming checks only the printed marker reference scale. It does not measure the pipe or cut gap." : "Confirming uploads this photo once to the configured backend. The backend does not persist the image and never returns repair advice."}</Text></View><View style={s.spacer} /><AppButton label={calibration ? "Confirm reference-scale photo" : "Confirm and upload photo"} onPress={onConfirm} /><AppButton label="Retake or choose another" variant="secondary" onPress={onReplace} /></>; }
function Uploading({ onCancel }: { onCancel: () => void }): React.JSX.Element { return <><Text style={s.eyebrow}>ANALYSIS</Text><Text style={s.title}>Uploading your photo</Text><Loading label="Sending the confirmed photo to the configured backend…" /><View style={s.card}><Text style={s.body}>This is a one-time upload. The backend does not save the image, and the result is limited to observations and safety flags.</Text></View><View style={s.spacer} /><AppButton label="Cancel upload" variant="secondary" onPress={onCancel} /></>; }
function AnalysisError({ onRetry, onReplace }: { onRetry: () => void; onReplace: () => void }): React.JSX.Element { return <><Text style={s.eyebrow}>ANALYSIS</Text><Text style={s.title}>Analysis unavailable</Text><View style={s.errorCard}><Text style={s.errorTitle}>No analysis was completed</Text><Text style={s.body}>The backend could not complete the upload. Your photo remains only in this active app flow.</Text></View><View style={s.spacer} /><AppButton label="Retry upload" onPress={onRetry} /><AppButton label="Choose another photo" variant="secondary" onPress={onReplace} /></>; }
function Loading({ label }: { label: string }): React.JSX.Element { return <View style={s.loading}><ActivityIndicator color={colors.green} /><Text style={s.body}>{label}</Text></View>; }
function AssessmentLoading({ onCancel }: { onCancel: () => void }): React.JSX.Element { return <><Text style={s.eyebrow}>SAFETY ASSESSMENT</Text><Text style={s.title}>Checking confirmations</Text><Loading label="Applying deterministic safety rules…" /><View style={s.spacer} /><AppButton label="Cancel assessment" variant="secondary" onPress={onCancel} /></>; }
function AssessmentError({ onRetry, onRestart }: { onRetry: () => void; onRestart: () => void }): React.JSX.Element { return <><Text style={s.eyebrow}>SAFETY ASSESSMENT</Text><Text style={s.title}>Assessment unavailable</Text><View style={s.errorCard}><Text style={s.errorTitle}>No parts guidance was shown</Text><Text style={s.body}>The safety assessment could not be completed. Try again or start over.</Text></View><View style={s.spacer} /><AppButton label="Retry assessment" onPress={onRetry} /><AppButton label="Start over" variant="secondary" onPress={onRestart} /></>; }
function isComplete(value: Partial<RepairConfirmations>): value is RepairConfirmations { return value.line_type !== undefined && value.outdoor_irrigation !== undefined && value.water_supply_shut_off !== undefined && value.pvc_schedule_40_marking !== undefined && value.nominal_size !== undefined && value.clean_transverse_cut !== undefined && value.no_additional_damage !== undefined && value.straight_section !== undefined && value.safely_away_from_components !== undefined && value.pipe_ends_accessible !== undefined; }
async function checkHealth(setHealth: (state: HealthState) => void, signal: AbortSignal, mounted: { current: boolean }): Promise<void> { try { const response = await fetch(`${apiBaseUrl}/health`, { signal }); const body = (await response.json()) as HealthResponse; if (mounted.current) setHealth(response.ok && body.status === "ok" ? "healthy" : "unavailable"); } catch { if (mounted.current && !signal.aborted) setHealth("unavailable"); } }
const s = StyleSheet.create({ eyebrow: { color: colors.limeDark, fontSize: 13, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.green, flexShrink: 1, fontSize: 34, fontWeight: "800", lineHeight: 40 }, body: { color: colors.ink, flexShrink: 1, fontSize: 16, lineHeight: 23 }, card: { backgroundColor: colors.white, borderColor: colors.creamDark, borderRadius: 16, borderWidth: 1, gap: 8, padding: 18 }, cardTitle: { color: colors.green, fontSize: 18, fontWeight: "800" }, list: { color: colors.ink, fontSize: 16, lineHeight: 27 }, ok: { color: colors.greenLight, fontWeight: "700" }, warning: { color: colors.danger, fontWeight: "700" }, errorCard: { backgroundColor: "#F9E5E0", borderColor: colors.danger, borderRadius: 14, borderWidth: 1, gap: 10, padding: 16 }, errorTitle: { color: colors.danger, fontSize: 17, fontWeight: "800" }, preview: { backgroundColor: colors.creamDark, borderRadius: 16, width: "100%" }, caption: { color: colors.muted, fontSize: 13, lineHeight: 19 }, loading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 }, spacer: { flex: 1, minHeight: 12 } });
