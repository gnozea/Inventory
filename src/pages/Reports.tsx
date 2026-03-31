import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { EQUIPMENT } from "../utils/equipment";

/* =========================
   Constants
   ========================= */

const STATUS_COLORS = {
  Active: "#16a34a",
  Maintenance: "#f59e0b",
  Decommissioned: "#dc2626",
};

export default function Reports() {
  const user = useCurrentUser();

  const isGlobal =
    user.role === "GlobalViewer" ||
    user.role === "SystemAdmin";

  /* =========================
     Agency‑level data
     ========================= */

  const agencyEquipment = useMemo(
    () =>
      EQUIPMENT.filter(
        (e) => e.agency === user.agency
      ),
    [user.agency]
  );

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    agencyEquipment.forEach((e) =>
      map.set(e.category, (map.get(e.category) ?? 0) + 1)
    );
    return Array.from(map.entries()).map(
      ([category, count]) => ({ category, count })
    );
  }, [agencyEquipment]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    agencyEquipment.forEach((e) =>
      map.set(e.status, (map.get(e.status) ?? 0) + 1)
    );
    return Array.from(map.entries()).map(
      ([status, count]) => ({ status, count })
    );
  }, [agencyEquipment]);

  /* =========================
     Overdue inspections (stub)
     ========================= */

  const overdue = []; // TODO: wire when lastInspected is modeled

  /* =========================
     Multi‑agency data
     ========================= */

  const equipmentByAgency = useMemo(() => {
    const map = new Map<string, number>();
    EQUIPMENT.forEach((e) =>
      map.set(e.agency, (map.get(e.agency) ?? 0) + 1)
    );
    return Array.from(map.entries())
      .map(([agency, count]) => ({ agency, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const statusTrends = [
    { month: "Oct", Active: 30, Maintenance: 8, Decommissioned: 2 },
    { month: "Nov", Active: 33, Maintenance: 7, Decommissioned: 3 },
    { month: "Dec", Active: 35, Maintenance: 6, Decommissioned: 4 },
    { month: "Jan", Active: 38, Maintenance: 5, Decommissioned: 5 },
    { month: "Feb", Active: 40, Maintenance: 4, Decommissioned: 6 },
    { month: "Mar", Active: 42, Maintenance: 3, Decommissioned: 7 },
  ];

  const totalEquipment = EQUIPMENT.length;
  const activeCount = EQUIPMENT.filter(
    (e) => e.status === "Active"
  ).length;

  const mostDecommissionedAgency = useMemo(() => {
    const map = new Map<string, number>();
    EQUIPMENT.filter(e => e.status === "Decommissioned").forEach(
      (e) => map.set(e.agency, (map.get(e.agency) ?? 0) + 1)
    );
    return Array.from(map.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Reports</h1>

      {/* =========================
          Agency‑level section
         ========================= */}
      <h2>Agency Overview</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={categoryCounts}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>

        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={statusBreakdown}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              outerRadius={100}
              label
            >
              {statusBreakdown.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <h3>Overdue Inspections</h3>
      {overdue.length === 0 && (
        <p style={{ opacity: 0.6 }}>
          Inspection tracking not yet enabled.
        </p>
      )}

      {/* =========================
          Multi‑agency section
         ========================= */}
      {isGlobal && (
        <>
          <h2>Global Overview</h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={equipmentByAgency} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="agency" type="category" />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={statusTrends}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line dataKey="Active" stroke={STATUS_COLORS.Active} />
              <Line dataKey="Maintenance" stroke={STATUS_COLORS.Maintenance} />
              <Line dataKey="Decommissioned" stroke={STATUS_COLORS.Decommissioned} />
            </LineChart>
          </ResponsiveContainer>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <StatCard label="Total Equipment" value={totalEquipment} />
            <StatCard
              label="% Active"
              value={`${Math.round((activeCount / totalEquipment) * 100)}%`}
            />
            <StatCard
              label="Most Decommissioned Agency"
              value={mostDecommissionedAgency ?? "—"}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );
}


