export type LogStatus = "pending" | "synced" | "failed";

export type FieldLog = {
  id: string;
  customerName: string;
  notes: string;
  timestamp: string;
  imageUri?: string | null;
  status: LogStatus;
};