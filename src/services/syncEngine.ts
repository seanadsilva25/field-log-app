import { getLogs, saveLogs } from "./storage";
import { uploadLog } from "./mockApi";

export const syncPendingLogs = async (): Promise<void> => {
  console.log("========== SYNC START ==========");

  const logs = await getLogs();

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

      // Mark this particular log as failed
      const currentLogs = await getLogs();

      const failedLogs = currentLogs.map(
        (currentLog) =>
          currentLog.id === log.id
            ? {
                ...currentLog,
                status: "failed" as const,
              }
            : currentLog
      );

      await saveLogs(failedLogs);

      // Stop here so FIFO order is preserved.
      // The failed log can be retried later.
      break;
    }
  }

  console.log("========== SYNC END ==========");
};