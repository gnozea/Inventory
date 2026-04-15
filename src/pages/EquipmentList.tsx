import { useMemo, useState } from "react";
import { useSearchParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiScopes } from "../auth/msalConfig";

/* ═══════════════════════════════════════════════════════════════════════════
   API HELPER
   ═══════════════════════════════════════════════════════════════════════════ */

async function apiFetch(instance: any, account: any, path: string) {
  let tok;
  try { tok = await instance.acquireTokenSilent({ account, scopes: apiScopes }); }
  catch { await instance.acquireTokenRedirect({ account, scopes: apiScopes }); throw new Error("Redirecting…"); }
  const res = await fetch(`/api${path}`, {
    headers: { 'X-MSAL-Token': `Bearer ${tok.accessToken}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const STATUS_MAP: Record<number, string> = { 0: "Active", 1: "Active", 2: "Maintenance", 3: "Deployed", 4: "Decommissioned" };
const STATUS_COLORS: Record<string, string> = {
  Active: "#22c55e", Maintenance: "#f59e0b", Deployed: "#3b82f6", Decommissioned: "#ef4444",
};

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

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════ */

const S = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" } as React.CSSProperties,
  th: { textAlign: "left", padding: "12px 14px", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, background: "#f8fafc" } as React.CSSProperties,
  td: { padding: "12px 14px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" } as React.CSSProperties,
  input: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", minWidth: 200 } as React.CSSProperties,
  select: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer", background: "#fff" } as React.CSSProperties,
  btnP: { padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff" } as React.CSSProperties,
  btnS: { padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function EquipmentList() {
  const { user } = useCurrentUser();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const selectedLocation = searchParams.get("location");
  const isLocationsView = location.pathname === "/locations";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Fetch equipment from API
  const { data, isLoading, error } = useQuery({
    queryKey: ["equipment-list", statusFilter, categoryFilter, search],
    queryFn: () => {
      let path = "/equipment";
      const params: string[] = [];
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (categoryFilter) params.push(`category=${categoryFilter}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (params.length) path += `?${params.join("&")}`;
      return apiFetch(instance, accounts[0], path);
    },
  });

  const equipment = data?.value || data || [];

  if (!user) return null;

  const canExport = ["SystemAdmin", "GlobalViewer", "AgencyAdmin", "AgencyUser", "AgencyReporter"].includes(user.role);
  const canAdd = ["SystemAdmin", "AgencyAdmin", "AgencyUser"].includes(user.role);

  // Client-side filtering for location view
  const filteredEquipment = useMemo(() => {
    let rows = Array.isArray(equipment) ? equipment : [];

    if (selectedLocation) {
      rows = rows.filter((e: any) => e.location_name === selectedLocation);
    }

    if (isLocationsView && !selectedLocation) {
      rows = [...rows].sort((a: any, b: any) => (a.location_name || "").localeCompare(b.location_name || ""));
    }

    return rows;
  }, [equipment, selectedLocation, isLocationsView]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = Array.isArray(equipment) ? [...new Set(equipment.map((e: any) => e.category).filter(Boolean))] : [];
    return cats.sort();
  }, [equipment]);

  const pageTitle = useMemo(() => {
    if (selectedLocation) return `Equipment at ${selectedLocation}`;
    return user.role === "SystemAdmin" || user.role === "GlobalViewer" ? "All Equipment" : "My Equipment";
  }, [selectedLocation, user]);

  // CSV export
  const exportCsv = () => {
    if (!filteredEquipment.length) return;
    const headers = ["Name", "Category", "Status", "Location", "Agency", "Serial Number", "Assigned To"];
    const rows = filteredEquipment.map((e: any) => [
      e.name, e.category, typeof e.status === "number" ? STATUS_MAP[e.status] || e.status : e.status,
      e.location_name || "", e.agency_name || "", e.serial_number || "", e.assigned_to || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "equipment.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{pageTitle}</h1>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {canExport && <button style={S.btnS} onClick={exportCsv}>Export CSV</button>}
        {canAdd && <button style={S.btnP} onClick={() => navigate("/equipment/new")}>Add Equipment</button>}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          style={S.input}
          type="text"
          placeholder="Search by name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="1">Active</option>
          <option value="2">Maintenance</option>
          <option value="3">Deployed</option>
          <option value="4">Decommissioned</option>
        </select>
        <select style={S.select} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Loading equipment…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: 20, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
          Failed to load equipment: {(error as Error).message}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <>
          {filteredEquipment.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              No equipment found.
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Category</th>
                  <th style={S.th}>Location</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Agency</th>
                  <th style={S.th}>Serial #</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((eq: any) => (
                  <tr key={eq.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/equipment/${eq.id}`)}>
                    <td style={{ ...S.td, fontWeight: 600 }}>
                      <Link to={`/equipment/${eq.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                        {eq.name}
                      </Link>
                    </td>
                    <td style={S.td}>{eq.category || "—"}</td>
                    <td style={S.td}>{eq.location_name || "—"}</td>
                    <td style={S.td}><StatusBadge status={eq.status} /></td>
                    <td style={S.td}>{eq.agency_name || "—"}</td>
                    <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{eq.serial_number || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
            {filteredEquipment.length} item{filteredEquipment.length !== 1 ? "s" : ""}
          </div>
        </>
      )}
    </div>
  );
}