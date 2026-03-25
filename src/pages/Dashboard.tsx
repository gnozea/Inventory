import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const canAddEquipment =
    user.role === "SystemAdmin" ||
    user.role === "AgencyAdmin" ||
    user.role === "Editor";

  const visibleEquipment = useMemo(() => {
    if (user.role === "SystemAdmin") return MOCK_EQUIPMENT;
    return MOCK_EQUIPMENT.filter((e) => e.agency === user.agency);
  }, [user]);

  const metrics = useMemo(() => {
    return {
      total: visibleEquipment.length,
      active: visibleEquipment.filter((e) => e.status === "Active").length,
      maintenance: visibleEquipment.filter((e) => e.status === "Maintenance")
        .length,
      decommissioned: visibleEquipment.filter(
        (e) => e.status === "Decommissioned"
      ).length,
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

  const goToEquipment = (status?: Status) => {
    if (status) {
      navigate(`/equipment?status=${status}`);
    } else {
      navigate("/equipment");
    }
  };

  if (loading) return <p>Loading dashboard…</p>;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 4 }}>Dashboard</h1>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            {user.agency} · Showing your agency equipment
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <input
            placeholder="Search my equipment…"
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
            }}
          />

          {canAddEquipment && (
            <button
              onClick={() => navigate("/equipment/new")}
              style={{
                padding: "8px 12px",
                fontWeight: 600,
              }}
            >
              + Add equipment
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Metric
          label="Total equipment"
          value={metrics.total}
          onClick={() => goToEquipment()}
        />
        <Metric
          label="Active"
          value={metrics.active}
          onClick={() => goToEquipment("Active")}
        />
        <Metric
          label="In maintenance"
          value={metrics.maintenance}
          onClick={() => goToEquipment("Maintenance")}
        />
        <Metric
          label="Decommissioned"
          value={metrics.decommissioned}
          onClick={() => goToEquipment("Decommissioned")}
        />
      </div>

      {/* Recent */}
      <h2 style={{ marginBottom: 12 }}>Recent equipment</h2>

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
              <td>
                <StatusPill status={e.status} />
              </td>
              <td>
                {canAddEquipment ? (
                  <button>Edit</button>
                ) : (
                  <button>View</button>
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

function Metric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        background: "#f7f7f3",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: "#2563eb",
          textDecoration: "underline",
        }}
      >
        View all
      </div>
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