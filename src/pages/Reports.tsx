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
import { STATUS_LOG } from "../utils/statusLog";

/* =========================
   Constants
   ========================= */

const STATUS_COLORS = {
  Active: "#16a34a",
  Maintenance: "#f59e0b",
  Decommissioned: "#dc2626",
};

const MONTHS_IN_YEAR = 12;

function monthsBetween(from: Date, to: Date) {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  return years * 12 + months;
}

function getLastSixMonths(): string[] {
  const result: string[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(d.toISOString().slice(0, 7)); // YYYY-MM
  }

  return result;
}

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
     Overdue inspections
     ========================= */

  const overdue = useMemo(() => {
    const now = new Date();

    return agencyEquipment
      .filter((e) => e.lastInspected)
      .map((e) => {
        const inspectedDate = new Date(e.lastInspected!);
        const monthsAgo = monthsBetween(inspectedDate, now);
        const monthsOverdue = monthsAgo - MONTHS_IN_YEAR;

        return monthsOverdue > 0
          ? {
              name: e.name,
              category: e.category,
              location: e.location,
              monthsOverdue,
            }
          : null;
      })
      .filter(
        (
          item
        ): item is {
          name: string;
          category: string;
          location: string;
          monthsOverdue: number;
        } => item !== null
      )
      .sort((a, b) => b.monthsOverdue - a.monthsOverdue);
  }, [agencyEquipment]);

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

  /* =========================
     Status trends (from StatusLog)
     ========================= */

  const statusTrends = useMemo(() => {
    const months = getLastSixMonths();

    return months.map((month) => {
      const entries = STATUS_LOG.filter((log) =>
        log.changedAt.startsWith(month)
      );

      const counts = {
        Active: 0,
        Maintenance: 0,
        Decommissioned: 0,
      };

      entries.forEach((entry) => {
        counts[entry.status]++;
      });

      return {
        month: new Date(`${month}-01`).toLocaleString("en-US", {
          month: "short",
        }),
        ...counts,
      };
    });
  }, []);

  const totalEquipment = EQUIPMENT.length;
  const activeCount = EQUIPMENT.filter(
    (e) => e.status === "Active"
  ).length;

  const mostDecommissionedAgency = useMemo(() => {
    const map = new Map<string, number>();
    EQUIPMENT.filter((e) => e.status === "Decommissioned").forEach(
      (e) => map.set(e.agency, (map.get(e.agency) ?? 0) + 1)
    );
    return Array.from(map.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Reports</h1>

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
                  fill={
                    STATUS_COLORS[
                      entry.status as keyof typeof STATUS_COLORS
                    ]
                  }
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <h3>Overdue Inspections</h3>
      {overdue.length === 0 ? (
        <p style={{ opacity: 0.6 }}>No overdue inspections found.</p>
      ) : (
        <table style={{ width: "100%", marginTop: 8 }}>
          <thead>
            <tr>
              <th align="left">Equipment</th>
              <th align="left">Category</th>
              <th align="left">Location</th>
              <th align="right">Months Overdue</th>
            </tr>
          </thead>
          <tbody>
            {overdue.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>{item.location}</td>
                <td align="right">{item.monthsOverdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
              <Line
                dataKey="Decommissioned"
                stroke={STATUS_COLORS.Decommissioned}
              />
            </LineChart>
          </ResponsiveContainer>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            <StatCard label="Total Equipment" value={totalEquipment} />
            <StatCard
              label="% Active"
              value={`${Math.round(
                (activeCount / totalEquipment) * 100
              )}%`}
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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );
}