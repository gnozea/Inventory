import { useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import EquipmentTable from "../components/EquipmentTable";
import type { EquipmentRow } from "../components/EquipmentTable";
import { filterVisibleEquipment } from "../utils/visibility";
import { EQUIPMENT } from "../utils/equipment";

type Status = "Active" | "Maintenance" | "Decommissioned";

export default function Dashboard() {
  const user = useCurrentUser();

  const [equipment, setEquipment] =
    useState<EquipmentRow[]>(EQUIPMENT);

  /* ✅ Filters */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<Status | "">("");
  const [categoryFilter, setCategoryFilter] =
    useState("");

  /* ✅ Visibility (roles applied here only) */
  const visibleEquipment = useMemo(
    () => filterVisibleEquipment(user, equipment),
    [user, equipment]
  );

  /* ✅ Filtering */
  const filteredEquipment = useMemo(() => {
    return visibleEquipment.filter((e) => {
      const matchesSearch =
        !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        !statusFilter || e.status === statusFilter;

      const matchesCategory =
        !categoryFilter || e.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [visibleEquipment, search, statusFilter, categoryFilter]);

  /* ✅ Metrics now match table exactly */
  const metrics = useMemo(() => {
    return {
      total: filteredEquipment.length,
      active: filteredEquipment.filter(
        (e) => e.status === "Active"
      ).length,
      maintenance: filteredEquipment.filter(
        (e) => e.status === "Maintenance"
      ).length,
      decommissioned: filteredEquipment.filter(
        (e) => e.status === "Decommissioned"
      ).length,
    };
  }, [filteredEquipment]);

  return (
    <div>
      <h1>Dashboard</h1>

      {/* ✅ Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Metric label="Total" value={metrics.total} />
        <Metric label="Active" value={metrics.active} variant="active" />
        <Metric
          label="Maintenance"
          value={metrics.maintenance}
          variant="maintenance"
        />
        <Metric
          label="Decommissioned"
          value={metrics.decommissioned}
          variant="decommissioned"
        />
      </div>

      {/* ✅ Search + filters */}
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
          placeholder="Search by name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", minWidth: 240 }}
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as Status | "")
          }
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Decommissioned">Decommissioned</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value)
          }
        >
          <option value="">All Categories</option>
          {[...new Set(equipment.map((e) => e.category))].map(
            (category) => (
              <option key={category} value={category}>
                {category}
              </option>
            )
          )}
        </select>
      </div>

      {/* ✅ Table now matches metrics (no slicing) */}
      <EquipmentTable
        rows={filteredEquipment}
        onChange={setEquipment}
      />
    </div>
  );
}

/* =========================
   Metric card
   ========================= */

function Metric({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "active" | "maintenance" | "decommissioned";
}) {
  const colors = {
    active: { bg: "#dcfce7", fg: "#166534" },
    maintenance: { bg: "#fef3c7", fg: "#92400e" },
    decommissioned: { bg: "#fee2e2", fg: "#991b1b" },
  };

  const style = variant ? colors[variant] : null;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 6,
        background: style ? style.bg : "#f3f4f6",
        color: style ? style.fg : "#111827",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}