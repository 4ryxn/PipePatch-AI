import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "../components/AppButton";
import { colors } from "../theme";
import type { AnalysisResponse } from "../types/analysis";

type Props = { analysis: AnalysisResponse; onStartOver: () => void; onContinue?: () => void };

export function AnalysisResultScreen({ analysis, onStartOver, onContinue }: Props): React.JSX.Element {
  const label = analysis.is_mock ? "DEMO ANALYSIS" : "AI ANALYSIS";
  const warning = analysis.is_mock ? "Demo analysis — not real AI" : "AI analysis — observations only";
  return <><Text style={styles.eyebrow}>{label}</Text><Text style={styles.title}>Upload flow complete</Text><View style={styles.warning}><Text style={styles.warningTitle}>{warning}</Text><Text style={styles.body}>{analysis.summary}</Text></View><View style={styles.card}><Detail label="Supported case" value={analysis.supported_case ? "Yes" : "No"} /><Detail label="Material" value={analysis.material ?? "Unknown"} /><Detail label="Schedule" value={analysis.pipe_schedule ?? "Unknown"} /><Detail label="Nominal size" value={analysis.nominal_size ?? "Not measured"} /><Detail label="Damage type" value={analysis.damage_type ?? "Unknown"} /><Detail label="Confidence" value={`${Math.round(analysis.confidence * 100)}%`} /></View><List title="Evidence" items={analysis.evidence} /><List title="Unknowns" items={analysis.unknowns} /><List title="Safety flags" items={analysis.safety_flags} /><View style={styles.card}><Text style={styles.cardTitle}>Next action</Text><Text style={styles.body}>{analysis.next_action}</Text></View>{analysis.is_mock && <View style={styles.warning}><Text style={styles.warningTitle}>Demo results are ineligible</Text><Text style={styles.body}>A mock analysis can never unlock parts guidance.</Text></View>}<View style={styles.spacer} />{onContinue && <AppButton label="Confirm safety details" onPress={onContinue} />}<AppButton label="Prepare another photo" variant={onContinue ? "secondary" : "primary"} onPress={onStartOver} /></>;
}

function Detail({ label, value }: { label: string; value: string }): React.JSX.Element { return <View style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }
function List({ title, items }: { title: string; items: string[] }): React.JSX.Element { return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{items.map((item) => <Text key={item} style={styles.body}>• {item}</Text>)}</View>; }

const styles = StyleSheet.create({ eyebrow: { color: colors.limeDark, fontSize: 13, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.green, flexShrink: 1, fontSize: 34, fontWeight: "800", lineHeight: 40 }, warning: { backgroundColor: "#F9E5E0", borderColor: colors.danger, borderRadius: 14, borderWidth: 1, gap: 8, padding: 16 }, warningTitle: { color: colors.danger, fontSize: 18, fontWeight: "800" }, card: { backgroundColor: colors.white, borderColor: colors.creamDark, borderRadius: 16, borderWidth: 1, gap: 8, padding: 18 }, cardTitle: { color: colors.green, fontSize: 18, fontWeight: "800" }, detail: { gap: 2 }, label: { color: colors.muted, fontSize: 13, fontWeight: "700" }, value: { color: colors.ink, flexShrink: 1, fontSize: 16, lineHeight: 22 }, body: { color: colors.ink, flexShrink: 1, fontSize: 16, lineHeight: 23 }, spacer: { flex: 1, minHeight: 12 } });
