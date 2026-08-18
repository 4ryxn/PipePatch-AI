import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "../components/AppButton";
import { colors } from "../theme";

export function CalibrationGuideScreen({ onCapture, onBack }: { onCapture: () => void; onBack: () => void }): React.JSX.Element {
  return <><Text style={styles.eyebrow}>REFERENCE SCALE</Text><Text style={styles.title}>Prepare the 50 mm marker</Text><Text style={styles.body}>This checks only a printed reference scale. It does not detect or measure a pipe, pipe size, or cut gap.</Text><View style={styles.card}>{["Print the PipePatch marker card at 100% / actual size.", "Use a physical ruler to verify the black square and verification line are exactly 50 mm.", "Place the card flat beside the pipe, in the same plane.", "Capture from directly above in good light, with both pipe ends and the full marker visible.", "Retake if the image is blurred, shadowed, or angled."].map((tip) => <Text key={tip} style={styles.body}>• {tip}</Text>)}</View><View style={styles.spacer} /><AppButton label="Capture calibration photo" onPress={onCapture} /><AppButton label="Back to AI result" variant="secondary" onPress={onBack} /></>;
}

const styles = StyleSheet.create({ eyebrow: { color: colors.limeDark, fontSize: 13, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.green, flexShrink: 1, fontSize: 30, fontWeight: "800", lineHeight: 37 }, body: { color: colors.ink, flexShrink: 1, fontSize: 16, lineHeight: 23 }, card: { backgroundColor: colors.white, borderColor: colors.creamDark, borderRadius: 16, borderWidth: 1, gap: 8, padding: 18 }, spacer: { flex: 1, minHeight: 12 } });
