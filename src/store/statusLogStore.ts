export type StatusLogEntry = {
  equipmentId: number;
  previousDate?: string;
  newDate: string;
  changedAt: string;
  changedBy: string;
};

const statusLog: StatusLogEntry[] = [];

export function logInspection(entry: StatusLogEntry) {
  statusLog.push(entry);
  console.log("[StatusLog]", entry);
}

export function getStatusLog() {
  return statusLog;
}

export function getInspectionHistoryForEquipment(equipmentId: number) {
  return statusLog
    .filter(entry => entry.equipmentId === equipmentId)
    .sort(
      (a, b) =>
        new Date(b.changedAt).getTime() -
        new Date(a.changedAt).getTime()
    );
}