import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";

type Status = "Active" | "Maintenance" | "Decommissioned";

type Equipment = {
  id: number;
  name: string;
  category: string;
  location: string;
  status: Status;
  agency: string;
  updatedAt: string;
};

const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: 1,
    name: "Rescue Truck 1",
    category: "Vehicle",
    location: "Station 1",
    status: "Active",
    agency: "Fire Dept",
    updatedAt: "2026-03-22",
  },
  {
    id: 2,
    name: "Thermal Camera",
    category: "Electronics",
    location: "Station 2",
    status: "Maintenance",
    agency: "Fire Dept",
    updatedAt: "2026-03-20",
  },
  {
    id: 3,
    name: "HazMat Trailer",
    category: "Trailer",
    location: "Depot",
    status: "Decommissioned",
    agency: "Fire Dept",
    updatedAt: "2026-03-15",
  },
  {
    id: 4,
    name: "Mobile Command Unit",
    category: "Vehicle",
    location: "HQ",
    status: "Active",
    agency: "Statewide",
    updatedAt: "2026-03-23",
  },
];

export default function Dashboard() {
  const user = useCurrentUser();
  const [loading, setLoading] = useState(true);

  // Fake loading delay
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // Agency filter
  const visibleEquipment = useMemo(() => {
    if (user.role === "SystemAdmin") return MOCK_EQUIPMENT;
    return MOCK_EQUIPMENT.filter(
      (e) => e.agency === user.agency
    );
  }, [user]);

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: visibleEquipment.length,
      active: visibleEquipment.filter(e => e.status === "Active").length,
      maintenance: visibleEquipment.filter(e => e.status === "Maintenance").length,
      decommissioned: visibleEquipment.filter(e => e.status === "Decommissioned").length,
    };
  }, [visibleEquipment]);

  const recent = useMemo(() => {
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
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <Metric label="Total" value={metrics.total} />
        <Metric label="Active" value={metrics.active} />
        <Metric label="Maintenance" value={metrics.maintenance} />
        <Metric label="Decommissioned" value={metrics.decommissioned} />
      </div>

      {/* Recent table */}
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
          {recent.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td>{e.category}</td>
              <td>{e.location}</td>
              <td><StatusPill status={e.status} /></td>
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: 16, background: "#f3f4f6", borderRadius: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const colors: Record<Status, string> = {
    Active: "#16a34a",
    Maintenance: "#d97706",
    Decommissioned: "#dc2626",
  };

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: colors[status],
        color: "#fff",
        fontSize: 12,
      }}
    >
      {status}
    </span>
  );
}