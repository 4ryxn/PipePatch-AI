import { CameraView } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { AppButton } from "../components/AppButton";
import type { ImageCandidate } from "../types/image";

type Props = { onCapture: (image: ImageCandidate) => void; onBack: () => void; onUnavailable: () => void };
export function CameraCaptureScreen({ onCapture, onBack, onUnavailable }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const ref = useRef<CameraView>(null);
  const [active, setActive] = useState(true);
  const [taking, setTaking] = useState(false);
  useEffect(() => { const subscription = AppState.addEventListener("change", (next: AppStateStatus) => setActive(next === "active")); return () => subscription.remove(); }, []);
  const takePhoto = async (): Promise<void> => { if (!ref.current || taking) return; setTaking(true); try { const photo = await ref.current.takePictureAsync({ base64: false, exif: false, quality: 1 }); if (photo) onCapture({ localUri: photo.uri, width: photo.width, height: photo.height, mimeType: "image/jpeg", fileSize: null, source: "camera", originalOwnership: "app_owned" }); } finally { setTaking(false); } };
  const landscape = width > height;
  return <View style={styles.root}><CameraView ref={ref} active={active} facing="back" onMountError={onUnavailable} style={styles.camera}><View pointerEvents="none" style={[styles.overlay, { paddingTop: insets.top + 16 }]}><Text style={styles.overlayText}>Frame both pipe ends, the complete marker, and surrounding context.</Text><View style={styles.frame} /></View></CameraView><SafeAreaView edges={["bottom"]} style={[styles.controls, landscape && styles.controlsLandscape]}><View style={landscape ? styles.action : undefined}><AppButton label={taking ? "Capturing…" : "Take photo"} disabled={taking} onPress={() => void takePhoto()} /></View><View style={landscape ? styles.action : undefined}><AppButton label="Back" variant="secondary" disabled={taking} onPress={onBack} /></View></SafeAreaView></View>;
}
const styles = StyleSheet.create({ root: { backgroundColor: colors.green, flex: 1 }, camera: { flex: 1 }, overlay: { alignItems: "center", flex: 1, justifyContent: "space-between", padding: 24 }, overlayText: { backgroundColor: "#163F32D9", borderRadius: 10, color: colors.white, flexShrink: 1, fontSize: 15, padding: 12, textAlign: "center" }, frame: { borderColor: colors.lime, borderRadius: 16, borderWidth: 3, height: "58%", width: "90%" }, controls: { backgroundColor: colors.cream, gap: 10, padding: 20 }, controlsLandscape: { flexDirection: "row", paddingVertical: 10 }, action: { flex: 1 } });
