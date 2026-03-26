import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import EquipmentTable from "../components/EquipmentTable";
import type { EquipmentRow } from "../components/EquipmentTable";
import {
  filterVisibleEquipment,
} from "../utils/visibility";

/* ---------------- mock data ---------------- */

const ALL_EQUIPMENT: EquipmentRow[] = [
  {
    id: "1",
    name: "Engine 7 — Pumper Truck",
    category: "Vehicle",
    location: "Station 4",
    status: "Active",
    agency: "Fire Dept A",
  },
  {
    id: "2",
    name: "AED Unit — Cardiac Monitor",
    category: "Medical",
    location: "Station 2",
    status: "Maintenance",
    agency: "Fire Dept B",
  },
  {
    id: "3",
    name: "Thermal Imaging Camera",
    category: "Rescue",
    location: "Station 4",
    status: "Decommissioned",
    agency: "Fire Dept A",
  },
];

/* ---------------- equipment list ---------------- */

export default function EquipmentList() {
  const user = useCurrentUser();
  const navigate = useNavigate();

  const [equipment, setEquipment] =
    useState<EquipmentRow[]>(ALL_EQUIPMENT);

  const visible = useMemo(
    () => filterVisibleEquipment(user, equipment),
    [user, equipment]
  );

  const canAdd = user.role !== "Reporter";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>My Equipment</h1>

        {canAdd && (
          <button onClick={() => navigate("/equipment/new")}>
            + Add equipment
          </button>
        )}
      </div>

      <EquipmentTable
        rows={visible}
        onChange={setEquipment}
      />
    </div>
  );
}