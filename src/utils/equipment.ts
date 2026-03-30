import type { EquipmentRow } from "../components/EquipmentTable";

export const EQUIPMENT: EquipmentRow[] = [
  {
    id: 1,
    name: "Rescue Truck 1",
    category: "Vehicle",
    location: "Station 1",
    status: "Active",
    agency: "Fire Dept",
  },
  {
    id: 2,
    name: "Thermal Camera",
    category: "Electronics",
    location: "Station 1",
    status: "Maintenance",
    agency: "Fire Dept",
  },
  {
    id: 3,
    name: "HazMat Trailer",
    category: "Trailer",
    location: "Depot",
    status: "Decommissioned",
    agency: "Fire Dept",
  },
  {
    id: 4,
    name: "Medical Kit Alpha",
    category: "Medical",
    location: "Station 3",
    status: "Active",
    agency: "EMS",
  },
  {
    id: 5,
    name: "Air Monitoring Kit",
    category: "Medical",
    location: "Station 1",
    status: "Decommissioned",
    agency: "Fire Dept",
  },
];