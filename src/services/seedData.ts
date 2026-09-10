import { FieldLog } from "../types/log";

export const generateSeedLogs = (): FieldLog[] => {
  const logs: FieldLog[] = [];

  for (let i = 1; i <= 100; i++) {
    logs.push({
      id: `historical-${i}`,
      customerName: `Customer ${i}`,
      notes: `Historical field log entry ${i}`,
      timestamp: new Date(
        Date.now() - i * 60 * 60 * 1000
      ).toISOString(),
      imageUri: null,
      status: "synced",
    });
  }

  return logs;
};