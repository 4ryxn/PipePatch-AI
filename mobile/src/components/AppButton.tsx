import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme";

type Props = { label: string; onPress: () => void; variant?: "primary" | "secondary"; disabled?: boolean };

export function AppButton({ label, onPress, variant = "primary", disabled = false }: Props): React.JSX.Element {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.button, variant === "primary" ? styles.primary : styles.secondary, disabled && styles.disabled]}><Text style={[styles.text, variant === "primary" ? styles.primaryText : styles.secondaryText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({ button: { alignItems: "center", borderRadius: 14, minHeight: 52, justifyContent: "center", paddingHorizontal: 18, width: "100%" }, primary: { backgroundColor: colors.green }, secondary: { backgroundColor: colors.creamDark, borderWidth: 1, borderColor: colors.green }, disabled: { opacity: 0.5 }, text: { fontSize: 16, fontWeight: "700" }, primaryText: { color: colors.white }, secondaryText: { color: colors.green } });
