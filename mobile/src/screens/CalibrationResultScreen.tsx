import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "../components/AppButton";
import { colors } from "../theme";
import type { CalibrationResponse } from "../types/calibration";

export function CalibrationResultScreen({ calibration, onRetake, onDone }: { calibration: CalibrationResponse; onRetake: () => void; onDone: () => void }): React.JSX.Element {
  const calibrated = calibration.status === "calibrated";
  return <><Text style={styles.eyebrow}>REFERENCE SCALE</Text><Text style={styles.title}>{calibrated ? "Reference scale detected" : "Calibration needs a retake"}</Text><View style={calibrated ? styles.card : styles.warning}>{calibrated ? <><Text style={styles.cardTitle}>Reference scale detected</Text><Text style={styles.scale}>{calibration.pixels_per_mm?.toFixed(2)} pixels per mm</Text><Text style={styles.body}>Quality score: {Math.round(calibration.quality_score * 100)}%</Text></> : <><Text style={styles.cardTitle}>No reference scale was accepted</Text>{calibration.retake_reasons.map((reason) => <Text key={reason} style={styles.body}>• {reason}</Text>)}</>}</View><View style={styles.card}><Text style={styles.cardTitle}>Important limit</Text><Text style={styles.body}>{calibration.scope_note}</Text></View><View style={styles.card}><Text style={styles.cardTitle}>Capture tips</Text>{calibration.capture_tips.map((tip) => <Text key={tip} style={styles.body}>• {tip}</Text>)}</View><View style={styles.spacer} />{!calibrated && <AppButton label="Retake calibration photo" onPress={onRetake} />}<AppButton label="Back to AI result" variant={calibrated ? "primary" : "secondary"} onPress={onDone} /></>;
}

const styles = StyleSheet.create({ eyebrow: { color: colors.limeDark, fontSize: 13, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.green, flexShrink: 1, fontSize: 30, fontWeight: "800", lineHeight: 37 }, card: { backgroundColor: colors.white, borderColor: colors.creamDark, borderRadius: 16, borderWidth: 1, gap: 8, padding: 18 }, warning: { backgroundColor: "#F9E5E0", borderColor: colors.danger, borderRadius: 16, borderWidth: 1, gap: 8, padding: 18 }, cardTitle: { color: colors.green, fontSize: 18, fontWeight: "800" }, scale: { color: colors.green, fontSize: 23, fontWeight: "800" }, body: { color: colors.ink, flexShrink: 1, fontSize: 16, lineHeight: 23 }, spacer: { flex: 1, minHeight: 12 } });
