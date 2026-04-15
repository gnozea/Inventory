import { useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiScopes } from "../auth/msalConfig";

async function apiFetch(instance: any, account: any, path: string) {
  let tok;
  try { tok = await instance.acquireTokenSilent({ account, scopes: apiScopes }); }
  catch { await instance.acquireTokenRedirect({ account, scopes: apiScopes }); throw new Error("Redirecting…"); }
  const res = await fetch(`/api${path}`, { headers: { 'X-MSAL-Token': `Bearer ${tok.accessToken}` } });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

const STATUS_MAP: Record<number, string> = { 0: "Active", 1: "Active", 2: "Maintenance", 3: "Deployed", 4: "Decommissioned" };
const STATUS_COLORS: Record<string, string> = { Active: "#22c55e", Maintenance: "#f59e0b", Deployed: "#3b82f6", Decommissioned: "#ef4444" };
const PIE_COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4"];

const S = {
  card: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 24, marginBottom: 20 } as React.CSSProperties,
  h2: { fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 } as React.CSSProperties,
  th: { textAlign: "left", padding: "10px 12px", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 } as React.CSSProperties,
  td: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" } as React.CSSProperties,
};

export default function Reports() {
  const { user } = useCurrentUser();
  const { instance, accounts } = useMsal();

  const { data: eqData, isLoading } = useQuery({
    queryKey: ["reports-equipment"],
    queryFn: () => apiFetch(instance, accounts[0], "/equipment"),
  });

  const { data: agData } = useQuery({
    queryKey: ["reports-agencies"],
    queryFn: () => apiFetch(instance, accounts[0], "/agencies"),
  });

  const equipment = eqData?.value || eqData || [];
  const agencies = agData?.value || agData || [];
  if (!user) return null;

  const isGlobal = user.role === "SystemAdmin" || user.role === "GlobalViewer";

  // ── Derived data ──────────────────────────────────────────────────────

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    (Array.isArray(equipment) ? equipment : []).forEach((e: any) => {
      const cat = e.category || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  }, [equipment]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    (Array.isArray(equipment) ? equipment : []).forEach((e: any) => {
      const name = typeof e.status === "number" ? (STATUS_MAP[e.status] || "Unknown") : e.status;
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [equipment]);

  const locationCounts = useMemo(() => {
    const map = new Map<string, number>();
    (Array.isArray(equipment) ? equipment : []).forEach((e: any) => {
      const loc = e.location_name || "Unassigned";
      map.set(loc, (map.get(loc) || 0) + 1);
    });
    return Array.from(map.entries()).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count);
  }, [equipment]);

  const equipmentByAgency = useMemo(() => {
    const map = new Map<string, number>();
    (Array.isArray(equipment) ? equipment : []).forEach((e: any) => {
      const ag = e.agency_name || "Unknown";
      map.set(ag, (map.get(ag) || 0) + 1);
    });
    return Array.from(map.entries()).map(([agency, count]) => ({ agency, count })).sort((a, b) => b.count - a.count);
  }, [equipment]);

  const totalEquipment = Array.isArray(equipment) ? equipment.length : 0;
  const activeCount = Array.isArray(equipment) ? equipment.filter((e: any) => e.status === 1 || e.status === 0).length : 0;
  const maintenanceCount = Array.isArray(equipment) ? equipment.filter((e: any) => e.status === 2).length : 0;
  const deployedCount = Array.isArray(equipment) ? equipment.filter((e: any) => e.status === 3).length : 0;

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        Loading reports…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>Reports</h1>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Equipment" value={totalEquipment} />
        <StatCard label="Active" value={activeCount} color="#22c55e" />
        <StatCard label="Maintenance" value={maintenanceCount} color="#f59e0b" />
        <StatCard label="Deployed" value={deployedCount} color="#3b82f6" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Category breakdown */}
        <div style={S.card}>
          <h2 style={S.h2}>Equipment by Category</h2>
          {categoryCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryCounts} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No data available.</p>
          )}
        </div>

        {/* Status pie chart */}
        <div style={S.card}>
          <h2 style={S.h2}>Status Distribution</h2>
          {statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="count" nameKey="status" innerRadius={60} outerRadius={110} label={({ status, count }) => `${status}: ${count}`} labelLine={false}>
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No data available.</p>
          )}
        </div>
      </div>

      {/* Equipment by Location */}
      <div style={S.card}>
        <h2 style={S.h2}>Equipment by Location</h2>
        {locationCounts.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(200, locationCounts.length * 40)}>
            <BarChart data={locationCounts} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" />
              <YAxis dataKey="location" type="category" width={180} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>No location data available.</p>
        )}
      </div>

      {/* Global: Equipment by Agency */}
      {isGlobal && equipmentByAgency.length > 0 && (
        <div style={S.card}>
          <h2 style={S.h2}>Equipment by Agency (Global)</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, equipmentByAgency.length * 50)}>
            <BarChart data={equipmentByAgency} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" />
              <YAxis dataKey="agency" type="category" width={200} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary stats */}
      {isGlobal && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
          <StatCard label="Total Agencies" value={Array.isArray(agencies) ? agencies.length : 0} />
          <StatCard label="% Active" value={totalEquipment > 0 ? `${Math.round((activeCount / totalEquipment) * 100)}%` : "—"} color="#22c55e" />
          <StatCard label="% Maintenance" value={totalEquipment > 0 ? `${Math.round((maintenanceCount / totalEquipment) * 100)}%` : "—"} color="#f59e0b" />
        </div>
      )}

      {/* Equipment detail table */}
      <div style={S.card}>
        <h2 style={S.h2}>Full Inventory</h2>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>Category</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Location</th>
              <th style={S.th}>Agency</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(equipment) ? equipment : []).map((eq: any) => {
              const statusName = typeof eq.status === "number" ? (STATUS_MAP[eq.status] || "Unknown") : eq.status;
              const color = STATUS_COLORS[statusName] || "#64748b";
              return (
                <tr key={eq.id}>
                  <td style={{ ...S.td, fontWeight: 500 }}>{eq.name}</td>
                  <td style={S.td}>{eq.category || "—"}</td>
                  <td style={S.td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color, background: color + "18" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                      {statusName}
                    </span>
                  </td>
                  <td style={S.td}>{eq.location_name || "—"}</td>
                  <td style={S.td}>{eq.agency_name || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || "#0f172a", marginTop: 4 }}>{value}</div>
    </div>
  );
}