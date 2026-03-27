import { useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import EquipmentTable from "../components/EquipmentTable";
import type { EquipmentRow } from "../components/EquipmentTable";

type Status = "Active" | "Maintenance" | "Decommissioned";

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
    name: "Mobile Command Unit",
    category: "Vehicle",
    location: "HQ",
    status: "Active",
    agency: "Fire Dept",
  },
  {
    id: 4,
    name: "HazMat Trailer",
    category: "Trailer",
    location: "Depot",
    status: "Decommissioned",
    agency: "Fire Dept",
  },
];

export default function Dashboard() {
  const user = useCurrentUser();

  const [equipment, setEquipment] =
    useState<EquipmentRow[]>(ALL_EQUIPMENT);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [category, setCategory] = useState("");

  const visibleEquipment = useMemo(
    () =>
      equipment.filter(
        (e) => e.agency === user.agency
      ),
    [equipment, user.agency]
  );

  const filtered = useMemo(() => {
    return visibleEquipment.filter((e) => {
      const matchesQuery =
        query === "" ||
        e.name.toLowerCase().includes(query.toLowerCase());

      const matchesStatus =
        status === "" || e.status === status;

      const matchesCategory =
        category === "" || e.category === category;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [visibleEquipment, query, status, category]);

  const metrics = useMemo(() => {
    return {
      total: filtered.length,
      active: filtered.filter((e) => e.status === "Active").length,
      maintenance: filtered.filter(
        (e) => e.status === "Maintenance"
      ).length,
      decommissioned: filtered.filter(
        (e) => e.status === "Decommissioned"
      ).length,
    };
  }, [filtered]);

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
        <Metric
          label="Active"
          value={metrics.active}
          variant="Active"
        />
        <Metric
          label="Maintenance"
          value={metrics.maintenance}
          variant="Maintenance"
        />
        <Metric
          label="Decommissioned"
          value={metrics.decommissioned}
          variant="Decommissioned"
        />
      </div>
{/* =========================
    Filters (IMPROVED SIZE)
   ========================= */}
<div
  style={{
    display: "flex",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  }}
>
  <input
    type="text"
    placeholder="Search by name…"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    style={{
      height: 38,
      padding: "8px 12px",
      fontSize: 14,
      borderRadius: 6,
      border: "1px solid #d1d5db",
      minWidth: 260,
    }}
  />

  <select
    value={status}
    onChange={(e) =>
      setStatus(e.target.value as Status | "")
    }
    style={{
      height: 38,
      padding: "8px 12px",
      fontSize: 14,
      borderRadius: 6,
      border: "1px solid #d1d5db",
      minWidth: 260,
    }}
  >
    <option value="">All Statuses</option>
    <option value="Active">Active</option>
    <option value="Maintenance">Maintenance</option>
    <option value="Decommissioned">
      Decommissioned
    </option>
  </select>

  <select
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    style={{
      height: 38,
      padding: "8px 12px",
      fontSize: 14,
      borderRadius: 6,
      border: "1px solid #d1d5db",
      minWidth: 260,
    }}
  >
    <option value="">All Categories</option>
    <option value="Vehicle">Vehicle</option>
    <option value="Electronics">Electronics</option>
    <option value="Trailer">Trailer</option>
  </select>
</div>

      <EquipmentTable
        rows={filtered.slice(0, 5)}
        onChange={setEquipment}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: Status;
}) {
  const styles: Record<
    Status,
    { bg: string; fg: string }
  > = {
    Active: { bg: "#dcfce7", fg: "#166534" },
    Maintenance: { bg: "#fef3c7", fg: "#92400e" },
    Decommissioned: { bg: "#fee2e2", fg: "#991b1b" },
  };

  const style = variant ? styles[variant] : null;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 6,
        background: style ? style.bg : "#f3f4f6",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.8 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: style ? style.fg : "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}