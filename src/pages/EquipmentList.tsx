import { useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import EquipmentTable from "../components/EquipmentTable";
import type { EquipmentRow } from "../components/EquipmentTable";

/* =========================
   Mock data (same style as before)
   ========================= */

const ALL_EQUIPMENT: EquipmentRow[] = [
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
    location: "Station 2",
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
];

/* =========================
   Page
   ========================= */

export default function EquipmentList() {
  const user = useCurrentUser();

  const [equipment, setEquipment] =
    useState<EquipmentRow[]>(ALL_EQUIPMENT);

  // ✅ Organization-bound visibility only (stable behavior)
  const visibleEquipment = useMemo(
    () =>
      equipment.filter(
        (e) => e.agency === user.agency
      ),
    [equipment, user.agency]
  );

  return (
    <div>
      <h1>My Equipment</h1>

      <EquipmentTable
        rows={visibleEquipment}
        onChange={setEquipment}
      />
    </div>
  );
}