import { useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import EquipmentTable from "../components/EquipmentTable";
import type { EquipmentRow } from "../components/EquipmentTable";
import { filterVisibleEquipment } from "../utils/visibility";

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

/* ---------------- dashboard ---------------- */

export default function Dashboard() {
  const user = useCurrentUser();

  const [equipment, setEquipment] =
    useState<EquipmentRow[]>(ALL_EQUIPMENT);

  const visible = useMemo(
    () => filterVisibleEquipment(user, equipment),
    [user, equipment]
  );

  const metrics = useMemo(() => ({
    total: visible.length,
    active: visible.filter((e) => e.status === "Active").length,
    maintenance: visible.filter((e) => e.status === "Maintenance").length,
    decommissioned: visible.filter(
      (e) => e.status === "Decommissioned"
    ).length,
  }), [visible]);

  return (
    <div>
      <h1>Dashboard</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Metric label="Total" value={metrics.total} />
        <Metric label="Active" value={metrics.active} />
        <Metric label="Maintenance" value={metrics.maintenance} />
        <Metric label="Decommissioned" value={metrics.decommissioned} />
      </div>

      <h2>Recent equipment</h2>

      <EquipmentTable
        rows={visible.slice(0, 5)}
        onChange={setEquipment}
      />
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: 16,
        background: "#f7f7f3",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
