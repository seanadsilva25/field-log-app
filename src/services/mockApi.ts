import { FieldLog } from "../types/log";

export const uploadLog = async (
  log: FieldLog
): Promise<FieldLog> => {
  console.log(
    "MOCK API: Uploading",
    log.customerName
  );

  await new Promise((resolve) =>
    setTimeout(resolve, 1000)
  );

  console.log(
    "MOCK API: Success",
    log.customerName
  );

  return {
    ...log,
    status: "synced",
  };
};