import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";
import { contentWidth } from "../utils/responsive";

export function Screen({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { width } = useWindowDimensions();
  return <SafeAreaView edges={["top", "bottom"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={[styles.inner, { maxWidth: contentWidth(width) }]}>{children}</View></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { backgroundColor: colors.cream, flex: 1 }, content: { alignItems: "center", flexGrow: 1 }, inner: { alignSelf: "center", flex: 1, gap: 16, padding: 24, width: "100%" } });
