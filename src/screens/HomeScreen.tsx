import React, { memo, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Image,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { generateSeedLogs } from "../services/seedData";
import { FieldLog } from "../types/log";
import { getLogs, saveLogs } from "../services/storage";
import { syncPendingLogs } from "../services/syncEngine";
import NetInfo from "@react-native-community/netinfo";

// -----------------------------
// LOG ITEM
// -----------------------------

const LogItem = memo(({ item }: { item: FieldLog }) => {
  let statusText = "";
  let statusStyle = styles.pending;

  if (item.status === "pending") {
    statusText = "⟳ Pending Sync";
    statusStyle = styles.pending;
  }

  if (item.status === "synced") {
    statusText = "✓ Synced";
    statusStyle = styles.synced;
  }

  if (item.status === "failed") {
    statusText = "⚠ Sync Failed";
    statusStyle = styles.failed;
  }

  return (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.customerName}>
          {item.customerName}
        </Text>

        <Text style={statusStyle}>
          {statusText}
        </Text>
      </View>

      <Text style={styles.logNotes}>
        {item.notes}
      </Text>

      {item.imageUri && (
        <Image
          source={{ uri: item.imageUri }}
          style={styles.logImage}
        />
      )}

      <Text style={styles.time}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  );
});

// -----------------------------
// MAIN SCREEN
// -----------------------------

export default function HomeScreen() {
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  const [logs, setLogs] = useState<FieldLog[]>([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // LOAD SAVED LOGS
  // -----------------------------

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      let savedLogs = await getLogs();

      // Add 100 historical logs if not already added
      const historicalLogs = generateSeedLogs();

      const historicalAlreadyAdded = savedLogs.some(
        (log) => log.id === "historical-1"
      );

      if (!historicalAlreadyAdded) {
        savedLogs = [...savedLogs, ...historicalLogs];

        await saveLogs(savedLogs);
      }

      setLogs(savedLogs);
    } catch (error) {
      console.log("LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // AUTO SYNC WHEN ONLINE
  // -----------------------------

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(
      async (state) => {
        if (state.isConnected && !offlineMode) {
          console.log(
            "Internet available → checking pending logs"
          );

          try {
            await syncPendingLogs();

            const updatedLogs = await getLogs();

            setLogs(updatedLogs);
          } catch (error) {
            console.log(
              "AUTO SYNC ERROR:",
              error
            );
          }
        }
      }
    );

    return () => unsubscribe();
  }, [offlineMode]);

  // -----------------------------
  // OFFLINE TOGGLE
  // -----------------------------

  const handleOfflineToggle = async () => {
    const newOfflineMode = !offlineMode;

    setOfflineMode(newOfflineMode);

    console.log(
      "Offline Mode:",
      newOfflineMode ? "ON" : "OFF"
    );

    // Turning OFF Offline Mode
    // triggers synchronization

    if (!newOfflineMode) {
      try {
        console.log(
          "Offline Mode OFF → Starting sync"
        );

        await syncPendingLogs();

        const updatedLogs = await getLogs();

        setLogs(updatedLogs);
      } catch (error) {
        console.log(
          "SYNC ERROR:",
          error
        );

        Alert.alert(
          "Sync Failed",
          "Could not synchronize pending logs."
        );
      }
    }
  };

  // -----------------------------
  // IMAGE PICKER
  // -----------------------------

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photos."
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.8,
        });

      if (!result.canceled) {
        const selectedImage =
          result.assets[0].uri;

        setImageUri(selectedImage);
      }
    } catch (error) {
      console.log(
        "IMAGE PICKER ERROR:",
        error
      );

      Alert.alert(
        "Image Error",
        "Could not select the image."
      );
    }
  };

  // -----------------------------
  // SUBMIT LOG
  // -----------------------------

  const handleSubmit = async () => {
    console.log("SUBMIT PRESSED");

    if (customerName.trim() === "") {
      Alert.alert(
        "Missing Information",
        "Please enter a customer name."
      );

      return;
    }

    if (notes.trim() === "") {
      Alert.alert(
        "Missing Information",
        "Please enter log notes."
      );

      return;
    }

    const newLog: FieldLog = {
      id: `log-${Date.now()}`,

      customerName:
        customerName.trim(),

      notes:
        notes.trim(),

      timestamp:
        new Date().toISOString(),

      imageUri: imageUri,

      status: "pending",
    };

    try {
      // Save locally FIRST
      const updatedLogs = [
        newLog,
        ...logs,
      ];

      await saveLogs(updatedLogs);

      setLogs(updatedLogs);

      // Clear form
      setCustomerName("");
      setNotes("");
      setImageUri(null);

      Alert.alert(
        "Log Saved",
        offlineMode
          ? "Saved locally. Status: Pending Sync."
          : "Saved locally. Synchronization will be attempted."
      );

      // If online, synchronize immediately
      if (!offlineMode) {
        const networkState =
          await NetInfo.fetch();

        if (networkState.isConnected) {
          await syncPendingLogs();

          const syncedLogs =
            await getLogs();

          setLogs(syncedLogs);
        }
      }
    } catch (error) {
      console.log(
        "SAVE ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Failed to save the log."
      );
    }
  };

  // -----------------------------
  // HEADER / FORM
  // -----------------------------

  const renderHeader = () => {
    return (
      <View>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.title}>
            Field Logs
          </Text>

          <Text style={styles.subtitle}>
            Offline-first customer logging
          </Text>
        </View>

        {/* OFFLINE MODE */}

        <View style={styles.offlineCard}>
          <View>
            <Text style={styles.offlineTitle}>
              Offline Mode
            </Text>

            <Text style={styles.offlineText}>
              {offlineMode
                ? "Forced Offline"
                : "Network Mode"}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.toggle,
              offlineMode &&
                styles.toggleOn,
            ]}
            onPress={
              handleOfflineToggle
            }
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.toggleCircle,
                offlineMode &&
                  styles.toggleCircleOn,
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* FORM */}

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            New Customer Log
          </Text>

          {/* CUSTOMER NAME */}

          <Text style={styles.label}>
            Customer Name
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter customer name"
            placeholderTextColor="#9CA3AF"
            value={customerName}
            onChangeText={
              setCustomerName
            }
            autoCorrect={false}
            autoCapitalize="words"
          />

          {/* NOTES */}

          <Text style={styles.label}>
            Log Notes
          </Text>

          <TextInput
            style={styles.notesInput}
            placeholder="Enter your notes"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            autoCorrect={false}
          />

          {/* TIMESTAMP */}

          <Text style={styles.label}>
            Timestamp
          </Text>

          <View style={styles.timestamp}>
            <Text style={styles.timestampText}>
              {new Date().toLocaleString()}
            </Text>
          </View>

          {/* IMAGE BUTTON */}

          <TouchableOpacity
            style={styles.imageButton}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Text style={styles.imageText}>
              📷 Add Image (Optional)
            </Text>
          </TouchableOpacity>

          {/* IMAGE PREVIEW */}

          {imageUri && (
            <View>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
              />

              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() =>
                  setImageUri(null)
                }
              >
                <Text
                  style={
                    styles.removeImageText
                  }
                >
                  Remove Image
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SUBMIT */}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.7}
          >
            <Text style={styles.submitText}>
              Submit Log
            </Text>
          </TouchableOpacity>
        </View>

        {/* RECENT LOGS */}

        <Text style={styles.logsTitle}>
          Recent Logs
        </Text>
      </View>
    );
  };

  // -----------------------------
  // EMPTY STATE
  // -----------------------------

  const renderEmpty = () => {
    if (loading) {
      return (
        <Text style={styles.message}>
          Loading logs...
        </Text>
      );
    }

    return (
      <Text style={styles.message}>
        No logs yet
      </Text>
    );
  };

  // -----------------------------
  // ITEM LAYOUT
  // -----------------------------

  const getItemLayout = (
    _data: ArrayLike<FieldLog> | null | undefined,
    index: number
  ) => {
    const ITEM_HEIGHT = 92;

    return {
      length: ITEM_HEIGHT,
      offset:
        ITEM_HEIGHT * index,
      index,
    };
  };

  // -----------------------------
  // SCREEN
  // -----------------------------

  return (
    <SafeAreaView
      style={styles.container}
    >
      <FlatList
        data={logs}

        renderItem={({ item }) => (
          <LogItem item={item} />
        )}

        keyExtractor={(item) =>
          item.id
        }

        ListHeaderComponent={
          renderHeader()
        }

        ListEmptyComponent={
          renderEmpty
        }

        getItemLayout={
          getItemLayout
        }

        showsVerticalScrollIndicator={
          true
        }

        persistentScrollbar={
          true
        }

        keyboardShouldPersistTaps="handled"

        contentContainerStyle={
          styles.list
        }
      />
    </SafeAreaView>
  );
}

// -----------------------------
// STYLES
// -----------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  list: {
    paddingBottom: 30,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  offlineCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  offlineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  offlineText: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },

  toggle: {
    width: 52,
    height: 30,
    borderRadius: 20,
    backgroundColor: "#D1D5DB",
    padding: 3,
    justifyContent: "center",
  },

  toggleOn: {
    backgroundColor: "#EF4444",
  },

  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  toggleCircleOn: {
    alignSelf: "flex-end",
  },

  formCard: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },

  formTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 14,
    color: "#111827",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  notesInput: {
    height: 80,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    marginBottom: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  timestamp: {
    height: 40,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 12,
    marginBottom: 12,
  },

  timestampText: {
    fontSize: 13,
    color: "#4B5563",
  },

  imageButton: {
    height: 42,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  imageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },

  removeImageButton: {
    alignItems: "center",
    marginBottom: 12,
  },

  removeImageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },

  submitButton: {
    height: 46,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  logsTitle: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
  },

  logCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    minHeight: 84,
  },

  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  customerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  pending: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D97706",
  },

  synced: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },

  failed: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },

  logNotes: {
    marginTop: 6,
    fontSize: 13,
    color: "#4B5563",
  },

  logImage: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    marginTop: 8,
  },

  time: {
    marginTop: 6,
    fontSize: 10,
    color: "#9CA3AF",
  },

  message: {
    marginHorizontal: 20,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 15,
    marginBottom: 20,
  },
});