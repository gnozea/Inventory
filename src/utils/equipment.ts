import type { EquipmentRow } from "../components/EquipmentTable";

/**
 * Step 2:
 * Locally extend the base EquipmentRow with optional inspection metadata.
 *
 * This does NOT change the global equipment model.
 * Other parts of the app can keep treating equipment as EquipmentRow.
 */
export type EquipmentWithInspection = EquipmentRow & {
  lastInspected?: string; // ISO date string (YYYY-MM-DD)
};

/**
 * Mock equipment dataset.
 * Some records include inspection dates.
 * Some intentionally omit them.
 */
export const EQUIPMENT: EquipmentWithInspection[] = [
  {
    id: 1,
    name: "Hydraulic Rescue Tool",
    category: "Rescue",
    location: "Station 1",
    status: "Active",
    agency: "Fire Department",
    lastInspected: "2024-06-15", // ~9 months ago
  },
  {
    id: 2,
    name: "Portable Generator",
    category: "Electronics",
    location: "Depot",
    status: "Maintenance",
    agency: "Rescue Unit",
    lastInspected: "2023-02-10", // > 12 months ago (overdue)
  },
  {
    id: 3,
    name: "Thermal Camera",
    category: "Electronics",
    location: "Station 2",
    status: "Active",
    agency: "Fire Department",
    lastInspected: "2025-01-05", // recently inspected
  },
  {
    id: 4,
    name: "Air Monitoring Kit",
    category: "Medical",
    location: "Station 3",
    status: "Decommissioned",
    agency: "EMS",
    lastInspected: "2022-09-20", // very overdue
  },
  {
    id: 5,
    name: "Rescue Rope Kit",
    category: "Rescue",
    location: "Station 1",
    status: "Active",
    agency: "Fire Department",
    // intentionally no lastInspected
  },
  {
    id: 6,
    name: "Command Laptop",
    category: "Electronics",
    location: "HQ",
    status: "Active",
    agency: "Police",
    lastInspected: "2024-11-30",
  },
];