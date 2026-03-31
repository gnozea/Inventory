export type StatusLogEntry = {
  equipmentId: string;
  agency: string;
  status: "Active" | "Maintenance" | "Decommissioned";
  changedAt: string; // ISO date
};

export const STATUS_LOG: StatusLogEntry[] = [
  { equipmentId: "EQ-001", agency: "Fire", status: "Active", changedAt: "2025-10-05" },
  { equipmentId: "EQ-002", agency: "Fire", status: "Maintenance", changedAt: "2025-11-12" },
  { equipmentId: "EQ-003", agency: "Fire", status: "Active", changedAt: "2025-12-01" },
  { equipmentId: "EQ-002", agency: "Fire", status: "Active", changedAt: "2026-01-15" },

  { equipmentId: "EQ-004", agency: "Police", status: "Maintenance", changedAt: "2025-10-18" },
  { equipmentId: "EQ-005", agency: "Police", status: "Decommissioned", changedAt: "2025-12-10" },
  { equipmentId: "EQ-006", agency: "Police", status: "Active", changedAt: "2026-02-02" },

  { equipmentId: "EQ-007", agency: "EMS", status: "Active", changedAt: "2025-11-04" },
  { equipmentId: "EQ-008", agency: "EMS", status: "Maintenance", changedAt: "2026-01-20" },
];