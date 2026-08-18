import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type HealthState = "checking" | "healthy" | "unavailable";

type HealthResponse = {
  status: "ok";
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function App(): React.JSX.Element {
  const [healthState, setHealthState] = useState<HealthState>("checking");

  useEffect(() => {
    const checkHealth = async (): Promise<void> => {
      try {
        const response = await fetch(`${apiBaseUrl}/health`);
        const body = (await response.json()) as HealthResponse;
        setHealthState(response.ok && body.status === "ok" ? "healthy" : "unavailable");
      } catch {
        setHealthState("unavailable");
      }
    };

    void checkHealth();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PipePatch AI</Text>
      <Text style={styles.subtitle}>Backend health</Text>
      {healthState === "checking" ? (
        <ActivityIndicator accessibilityLabel="Checking backend health" size="large" />
      ) : (
        <Text
          accessibilityLiveRegion="polite"
          style={healthState === "healthy" ? styles.healthy : styles.unavailable}
        >
          {healthState === "healthy" ? "Connected" : "Unavailable"}
        </Text>
      )}
      <Text style={styles.endpoint}>{apiBaseUrl}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#f7f9fb",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#12304a",
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    color: "#4b6275",
    fontSize: 18,
    marginBottom: 16,
    marginTop: 8,
  },
  healthy: {
    color: "#147a42",
    fontSize: 20,
    fontWeight: "600",
  },
  unavailable: {
    color: "#a22b25",
    fontSize: 20,
    fontWeight: "600",
  },
  endpoint: {
    color: "#4b6275",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
});
