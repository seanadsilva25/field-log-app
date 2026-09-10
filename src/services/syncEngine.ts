import { getLogs, saveLogs } from "./storage";
import { uploadLog } from "./mockApi";

export const syncPendingLogs = async (): Promise<void> => {
  console.log("========== SYNC START ==========");

  const logs = await getLogs();

  console.log("ALL LOGS:", logs);

  const pendingLogs = logs
    .filter((log) => log.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    );

  console.log(
    "PENDING COUNT:",
    pendingLogs.length
  );

  for (const log of pendingLogs) {
    console.log(
      "SYNCING:",
      log.customerName
    );

    try {
      const syncedLog = await uploadLog(log);

      const currentLogs = await getLogs();

      const updatedLogs = currentLogs.map(
        (currentLog) =>
          currentLog.id === syncedLog.id
            ? syncedLog
            : currentLog
      );

      await saveLogs(updatedLogs);

      console.log(
        "SUCCESS:",
        log.customerName
      );
    } catch (error) {
      console.log(
        "FAILED:",
        log.customerName,
        error
      );

      break;
    }
  }

  console.log("========== SYNC END ==========");
};