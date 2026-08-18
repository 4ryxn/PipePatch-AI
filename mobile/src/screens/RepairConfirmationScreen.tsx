import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "../components/AppButton";
import { colors } from "../theme";
import type { Confirmation, LineType, NominalPipeSize, RepairConfirmations } from "../types/repair";

type Draft = Partial<RepairConfirmations>;
type Props = { value: Draft; onChange: (value: Draft) => void; onSubmit: () => void };
const questions: [keyof Omit<RepairConfirmations, "line_type" | "nominal_size">, string][] = [["outdoor_irrigation", "Is this an outdoor irrigation line?"], ["water_supply_shut_off", "Is the water supply shut off and the line made safe?"], ["pvc_schedule_40_marking", "Do visible markings confirm PVC Schedule 40?"], ["clean_transverse_cut", "Is there one clean transverse cut?"], ["no_additional_damage", "Are there no branching cracks, crushing, deformation, or missing fragments?"], ["straight_section", "Is damage on a straight section?"], ["safely_away_from_components", "Is it away from valves, fittings, manifolds, foundation penetrations, and other utilities?"], ["pipe_ends_accessible", "Are both pipe ends safely exposed and accessible?"]];

export function RepairConfirmationScreen({ value, onChange, onSubmit }: Props): React.JSX.Element {
  const complete = questions.every(([key]) => value[key] !== undefined) && value.line_type !== undefined && value.nominal_size !== undefined;
  const selectedSize = value.nominal_size === null ? "unknown" : value.nominal_size;

  return <>
    <Text style={styles.eyebrow}>SAFETY CONFIRMATIONS</Text>
    <Text style={styles.title}>Confirm what you can see</Text>
    <Text style={styles.body}>Do not guess. Choose Unknown whenever a safety-critical condition is unclear.</Text>
    <Question label="What type of line is this?" value={value.line_type} options={[["outdoor_irrigation", "Outdoor irrigation"], ["gas", "Gas"], ["sewer", "Sewer"], ["electrical_conduit", "Electrical conduit"], ["potable_household", "Household water"], ["unknown", "Unknown"]]} onSelect={(line_type) => onChange({ ...value, line_type: line_type as LineType })} />
    <Question label="Visibly confirmed nominal size" value={selectedSize} options={[["1/2", "1/2 in"], ["3/4", "3/4 in"], ["1", "1 in"], ["unknown", "Unknown"]]} onSelect={(size) => onChange({ ...value, nominal_size: size === "unknown" ? null : size as NominalPipeSize })} />
    {questions.map(([key, label]) => <Question key={key} label={label} value={value[key]} options={[["yes", "Yes"], ["no", "No"], ["unknown", "Unknown"]]} onSelect={(answer) => onChange({ ...value, [key]: answer as Confirmation })} />)}
    <View style={styles.spacer} />
    <AppButton label="Run safety assessment" disabled={!complete} onPress={onSubmit} />
  </>;
}

function Question({ label, value, options, onSelect }: { label: string; value: string | undefined; options: [string, string][]; onSelect: (value: string) => void }): React.JSX.Element { return <View style={styles.card}><Text style={styles.question}>{label}</Text><View style={styles.options}>{options.map(([key, text]) => <AppButton key={key} label={value === key ? `${text} selected` : text} variant={value === key ? "primary" : "secondary"} onPress={() => onSelect(key)} />)}</View></View>; }
const styles = StyleSheet.create({ eyebrow: { color: colors.limeDark, fontSize: 13, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.green, flexShrink: 1, fontSize: 30, fontWeight: "800", lineHeight: 37 }, body: { color: colors.ink, fontSize: 16, lineHeight: 23 }, card: { backgroundColor: colors.white, borderColor: colors.creamDark, borderRadius: 16, borderWidth: 1, gap: 12, padding: 16 }, question: { color: colors.green, flexShrink: 1, fontSize: 17, fontWeight: "800", lineHeight: 23 }, options: { gap: 8 }, spacer: { minHeight: 12 } });
