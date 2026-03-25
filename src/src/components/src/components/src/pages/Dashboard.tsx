import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";

type EquipmentStatus = "Active" | "Maintenance" | "Decommissioned";

type Equipment = {
  id: number;
  name: string;
  category: string;
  location: string;
  status: EquipmentStatus;
  agency: string;
  updatedAt: string;
};

// Mock equipment data
const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: 1,
    name: "Rescue Truck 1",
    category: "Vehicle",
    location: "Station 1",
    status: "Active",
    agency: "Fire Dept",
    updatedAt: "2026-03-20",
  },
  {
    id: 2,
    name: "Thermal Camera",
    category: "Electronics",
    location: "Station 2",
    status: "Maintenance",
    agency: "Fire Dept",
    updatedAt: "2026-03-18",
  },
  {
    id: 3,
    name: "HazMat Trailer",
    category: "Trailer",
    location: "Depot",
    status: "Decommissioned",
    agency: "Fire Dept",
    updatedAt: "2026-03-10",
  },
  {
    id: 4,
    name: "Mobile Command Unit",
    category: "Vehicle",
    location: "HQ",
    status: "Active",
    agency: "Statewide",
    updatedAt: "2026-03-22",
  },
];

export default function Dashboard() {
  const user = useCurrentUser();
  const [loading, setLoading] = useState(true);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Filter by agency unless SystemAdmin
  const visibleEquipment = useMemo(() => {
    if (user.role === "SystemAdmin") {
      return MOCK_EQUIPMENT;
    }
    return MOCK_EQUIPMENT.filter(
      (eq) => eq.agency === user.agency
    );
  }, [user]);

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: visibleEquipment.length,
      active: visibleEquipment.filter((e) => e.status === "Active").length,
      maintenance: visibleEquipment.filter(
        (e) => e.status === "Maintenance"
      ).length,
      decommissioned: visibleEquipment.filter(
        (e) => e.status === "Decommissioned"
      ).length,
    };
  }, [visibleEquipment]);

  // Recent equipment (last 10)
  const recentEquipment = useMemo(() => {
    return [...visibleEquipment]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
      )
      .slice(0, 10);
  }, [visibleEquipment]);

  if (loading) {
    return <p>Loading dashboard…</p>;
  }

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Metrics */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <MetricCard label="Total" value={metrics.total} />
        <MetricCard label="Active" value={metrics.active} />
        <MetricCard label="In Maintenance" value={metrics.maintenance} />
        <MetricCard label="Decommissioned" value={metrics.decommissioned} />
      </div>

      {/* Recent equipment */}
      <h2>Recent Equipment</h2>

      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Category</th>
            <th align="left">Location</th>
            <th align="left">Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {recentEquipment.map((eq) => (
            <tr key={eq.id}>
              <td>{eq.name}</td>
              <td>{eq.category}</td>
              <td>{eq.location}</td>
              <td>
                <StatusBadge status={eq.status} />
              </td>
              <td>
                {user.role !== "Reporter" && (
                  <button>Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- helpers ---------- */

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "#f3f4f6",
        borderRadius: "6px",
        minWidth: "120px",
      }}
    >
      <div style={{ fontSize: "12px", opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: EquipmentStatus }) {
  const colors: Record<EquipmentStatus, string> = {
    Active: "#16a34a",
    Maintenance: "#d97706",
    Decommissioned: "#dc2626",
  };

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: "999px",
        backgroundColor: colors[status],
        color: "#ffffff",
        fontSize: "12px",
      }}
    >
      {status}
    </span>
  );
}
``
