import AsyncStorage from "@react-native-async-storage/async-storage";
import { FieldLog } from "../types/log";

const LOGS_KEY = "@field_logs";

export const saveLogs = async (logs: FieldLog[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error("Failed to save logs:", error);
    throw error;
  }
};

export const getLogs = async (): Promise<FieldLog[]> => {
  try {
    const data = await AsyncStorage.getItem(LOGS_KEY);

    if (!data) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to get logs:", error);
    return [];
  }
};

export const clearLogs = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LOGS_KEY);
  } catch (error) {
    console.error("Failed to clear logs:", error);
    throw error;
  }
};