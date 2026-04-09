import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiScopes } from "../auth/msalConfig";

async function apiFetch(instance: any, account: any, path: string) {
  let tok;
  try { tok = await instance.acquireTokenSilent({ account, scopes: apiScopes }); }
  catch { await instance.acquireTokenRedirect({ account, scopes: apiScopes }); throw new Error("Redirecting…"); }
  const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${tok.accessToken}` } });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

const STATUS_MAP: Record<number, string> = { 0: "Active", 1: "Active", 2: "Maintenance", 3: "Deployed", 4: "Decommissioned" };
const STATUS_COLORS: Record<string, string> = { Active: "#22c55e", Maintenance: "#f59e0b", Deployed: "#3b82f6", Decommissioned: "#ef4444" };

function StatusBadge({ status }: { status: string | number }) {
  const name = typeof status === "number" ? (STATUS_MAP[status] || String(status)) : status;
  const color = STATUS_COLORS[name] || "#64748b";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color, background: color + "18" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      {name}
    </span>
  );
}

const S = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" } as React.CSSProperties,
  th: { textAlign: "left", padding: "12px 14px", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, background: "#f8fafc" } as React.CSSProperties,
  td: { padding: "12px 14px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" } as React.CSSProperties,
  input: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", minWidth: 200 } as React.CSSProperties,
  select: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer", background: "#fff" } as React.CSSProperties,
};

export default function Dashboard() {
  const { user } = useCurrentUser();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-equipment"],
    queryFn: () => apiFetch(instance, accounts[0], "/equipment"),
  });

  const equipment = data?.value || data || [];
  if (!user) return null;

  const filtered = useMemo(() => {
    let rows = Array.isArray(equipment) ? equipment : [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((e: any) => (e.name || "").toLowerCase().includes(q) || (e.location_name || "").toLowerCase().includes(q));
    }
    if (statusFilter) rows = rows.filter((e: any) => String(e.status) === statusFilter);
    if (categoryFilter) rows = rows.filter((e: any) => e.category === categoryFilter);
    return rows;
  }, [equipment, search, statusFilter, categoryFilter]);

  const metrics = useMemo(() => {
    const all = Array.isArray(equipment) ? equipment : [];
    return {
      total: all.length,
      active: all.filter((e: any) => e.status === 1 || e.status === 0).length,
      maintenance: all.filter((e: any) => e.status === 2).length,
      deployed: all.filter((e: any) => e.status === 3).length,
      decommissioned: all.filter((e: any) => e.status === 4).length,
    };
  }, [equipment]);

  const categories = useMemo(() => {
    const cats = Array.isArray(equipment) ? [...new Set(equipment.map((e: any) => e.category).filter(Boolean))] : [];
    return cats.sort();
  }, [equipment]);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>Dashboard</h1>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        <Metric label="Total" value={metrics.total} />
        <Metric label="Active" value={metrics.active} color="#22c55e" bg="#dcfce7" />
        <Metric label="Maintenance" value={metrics.maintenance} color="#f59e0b" bg="#fef3c7" />
        <Metric label="Deployed" value={metrics.deployed} color="#3b82f6" bg="#dbeafe" />
        <Metric label="Decommissioned" value={metrics.decommissioned} color="#ef4444" bg="#fee2e2" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input style={S.input} type="text" placeholder="Search by name or location…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={S.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="1">Active</option>
          <option value="2">Maintenance</option>
          <option value="3">Deployed</option>
          <option value="4">Decommissioned</option>
        </select>
        <select style={S.select} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Loading…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {error && (
        <div style={{ padding: 20, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
          {(error as Error).message}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Category</th>
                <th style={S.th}>Location</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Agency</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 32 }}>No equipment found.</td></tr>
              ) : filtered.map((eq: any) => (
                <tr key={eq.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/equipment/${eq.id}`)}>
                  <td style={{ ...S.td, fontWeight: 600 }}>
                    <Link to={`/equipment/${eq.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>{eq.name}</Link>
                  </td>
                  <td style={S.td}>{eq.category || "—"}</td>
                  <td style={S.td}>{eq.location_name || "—"}</td>
                  <td style={S.td}><StatusBadge status={eq.status} /></td>
                  <td style={S.td}>{eq.agency_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, color, bg }: { label: string; value: number; color?: string; bg?: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 8, background: bg || "#f8fafc", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: color || "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#0f172a", marginTop: 4 }}>{value}</div>
    </div>
  );
}