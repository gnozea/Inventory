import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiScopes } from "../auth/msalConfig";
import AccessDenied from "../components/AccessDenied";

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
const AVAIL_MAP: Record<string, [string, string]> = { Active: ["Available", "#dcfce7"], Maintenance: ["In Use", "#fef3c7"], Deployed: ["Deployed", "#dbeafe"], Decommissioned: ["Unavailable", "#fee2e2"] };

const S = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" } as React.CSSProperties,
  th: { textAlign: "left", padding: "12px 14px", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, background: "#f8fafc" } as React.CSSProperties,
  td: { padding: "12px 14px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" } as React.CSSProperties,
  input: { width: "100%", maxWidth: 520, padding: "12px 14px", fontSize: 15, borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 16, boxSizing: "border-box" } as React.CSSProperties,
  select: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer", background: "#fff" } as React.CSSProperties,
  btnS: { padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" } as React.CSSProperties,
};

export default function GlobalSearch() {
  const { user } = useCurrentUser();
  const { instance, accounts } = useMsal();

  const canAccess = user?.role === "GlobalViewer" || user?.role === "SystemAdmin";
  if (!canAccess) return <AccessDenied />;

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch all equipment (global search sees everything)
  const { data, isLoading } = useQuery({
    queryKey: ["global-search", debouncedSearch],
    queryFn: () => {
      const path = debouncedSearch ? `/search?q=${encodeURIComponent(debouncedSearch)}` : "/equipment";
      return apiFetch(instance, accounts[0], path);
    },
  });

  const { data: agData } = useQuery({
    queryKey: ["global-search-agencies"],
    queryFn: () => apiFetch(instance, accounts[0], "/agencies"),
  });

  const allEquipment = data?.value || data || [];
  const agencies = agData?.value || agData || [];

  // Client-side filters
  const results = useMemo(() => {
    let rows = Array.isArray(allEquipment) ? allEquipment : [];
    if (agencyFilter) rows = rows.filter((e: any) => e.agency_name === agencyFilter || e.agency_id === agencyFilter);
    if (statusFilter) rows = rows.filter((e: any) => String(e.status) === statusFilter);
    if (categoryFilter) rows = rows.filter((e: any) => e.category === categoryFilter);
    return rows;
  }, [allEquipment, agencyFilter, statusFilter, categoryFilter]);

  const agencyCount = useMemo(() => new Set(results.map((r: any) => r.agency_name)).size, [results]);
  const categories = useMemo(() => [...new Set((Array.isArray(allEquipment) ? allEquipment : []).map((e: any) => e.category).filter(Boolean))].sort(), [allEquipment]);

  // CSV export
  const exportCsv = () => {
    if (!results.length) return;
    const headers = ["Name", "Agency", "Location", "Category", "Status", "Availability", "Serial Number"];
    const rows = results.map((e: any) => {
      const sn = typeof e.status === "number" ? (STATUS_MAP[e.status] || "") : e.status;
      const av = AVAIL_MAP[sn]?.[0] || "Unknown";
      return [e.name, e.agency_name || "", e.location_name || "", e.category || "", sn, av, e.serial_number || ""];
    });
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "global-search.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Global Search</h1>

      <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef3c7", borderRadius: 8, fontSize: 13, color: "#92400e", border: "1px solid #fde68a" }}>
        Read-only cross-agency view. Search and filter equipment across all agencies.
      </div>

      <input
        style={S.input}
        type="text"
        placeholder="Search equipment by name, serial number, or location…"
        value={searchInput}
        onChange={e => setSearchInput(e.target.value)}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <select style={S.select} value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)}>
          <option value="">All Agencies</option>
          {Array.isArray(agencies) && agencies.map((a: any) => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>
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
        <button style={S.btnS} onClick={exportCsv}>Export CSV</button>
      </div>

      <p style={{ fontSize: 13, marginBottom: 12, color: "#64748b" }}>
        <strong style={{ color: "#0f172a" }}>{results.length}</strong> results across <strong style={{ color: "#0f172a" }}>{agencyCount}</strong> agencies
      </p>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Searching…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Equipment</th>
              <th style={S.th}>Agency</th>
              <th style={S.th}>Location</th>
              <th style={S.th}>Category</th>
              <th style={S.th}>Availability</th>
              <th style={S.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 32 }}>No equipment found.</td></tr>
            ) : results.map((r: any) => {
              const statusName = typeof r.status === "number" ? (STATUS_MAP[r.status] || "Unknown") : r.status;
              const color = STATUS_COLORS[statusName] || "#64748b";
              const [avail, availBg] = AVAIL_MAP[statusName] || ["Unknown", "#f1f5f9"];
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={S.td}>
                    <Link to={`/equipment/${r.id}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>{r.name}</Link>
                  </td>
                  <td style={S.td}>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#2563eb" }}>{r.agency_name || "—"}</span>
                  </td>
                  <td style={S.td}>{r.location_name || "—"}</td>
                  <td style={S.td}>{r.category || "—"}</td>
                  <td style={S.td}>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: availBg, color: "#1e293b" }}>{avail}</span>
                  </td>
                  <td style={S.td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color, background: color + "18" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />{statusName}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}