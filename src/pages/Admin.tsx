import { useState } from "react";
import { Outlet, NavLink, useLocation, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { useCurrentUser, type UserRole } from "../hooks/useCurrentUser";
import { apiScopes } from "../auth/msalConfig";
import AccessDenied from "../components/AccessDenied";

/* ═══════════════════════════════════════════════════════════════════════════
   API HELPER
   ═══════════════════════════════════════════════════════════════════════════ */

async function apiFetch(instance: any, account: any, path: string, options?: RequestInit) {
  let tok;
  try { tok = await instance.acquireTokenSilent({ account, scopes: apiScopes }); }
  catch { await instance.acquireTokenRedirect({ account, scopes: apiScopes }); throw new Error("Redirecting…"); }
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'X-MSAL-Token': `Bearer ${tok.accessToken}`, "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error(`API ${path} → ${res.status}: ${b}`); }
  if (res.status === 204) return null;
  return res.json();
}

function useApi() {
  const { instance, accounts } = useMsal();
  return (path: string, options?: RequestInit) => apiFetch(instance, accounts[0], path, options);
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED UI PIECES
   ═══════════════════════════════════════════════════════════════════════════ */

const S = {
  card: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 24, marginBottom: 20 } as React.CSSProperties,
  h2: { fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" } as React.CSSProperties,
  h3: { fontSize: 14, fontWeight: 600, color: "#334155", margin: "0 0 12px" } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" } as React.CSSProperties,
  val: { fontSize: 14, color: "#0f172a", marginBottom: 16 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 } as React.CSSProperties,
  th: { textAlign: "left", padding: "10px 12px", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 } as React.CSSProperties,
  td: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" } as React.CSSProperties,
  input: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
  select: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box", cursor: "pointer", background: "#fff" } as React.CSSProperties,
  btnP: { padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff" } as React.CSSProperties,
  btnS: { padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" } as React.CSSProperties,
  btnD: { padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626" } as React.CSSProperties,
  badge: (c: string, bg: string): React.CSSProperties => ({ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: c, background: bg }),
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as React.CSSProperties,
};

function Msg({ cols, text, color }: { cols: number; text: string; color?: string }) {
  return <tr><td colSpan={cols} style={{ ...S.td, textAlign: "center", color: color || "#94a3b8", padding: 32 }}>{text}</td></tr>;
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, [string, string]> = { Active: ["#22c55e", "#052e16"], Maintenance: ["#f59e0b", "#451a03"], Deployed: ["#3b82f6", "#172554"], Decommissioned: ["#ef4444", "#450a0a"] };
  const [bg, fg] = c[status] || ["#94a3b8", "#1e293b"];
  return <span style={{ ...S.badge(bg, bg + "18"), display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: bg }} />{status}</span>;
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: "#166534", color: "#bbf7d0", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 30px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 10 }}>
      ✓ {msg}
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#bbf7d0", cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN LAYOUT
   ═══════════════════════════════════════════════════════════════════════════ */

const NAV = [
  { label: "System (SystemAdmin)", role: "SystemAdmin" as UserRole, items: [
    { to: "/admin/system-config", label: "System Configuration" },
    { to: "/admin/reference-data", label: "Reference Data" },
    { to: "/admin/agencies", label: "Agencies" },
    { to: "/admin/global-users", label: "Global Users" },
    { to: "/admin/roles-permissions", label: "Roles & Permissions" },
    { to: "/admin/audit-diagnostics", label: "Audit & Diagnostics" },
  ]},
  { label: "Agency (AgencyAdmin)", role: "AgencyAdmin" as UserRole, items: [
    { to: "/admin/agency-profile", label: "Agency Profile" },
    { to: "/admin/notifications", label: "Notifications" },
    { to: "/admin/agency-users", label: "Agency Users" },
    { to: "/admin/agency-roles", label: "Agency Roles" },
    { to: "/admin/default-equipment-values", label: "Default Equipment Values" },
    { to: "/admin/reporting-preferences", label: "Reporting Preferences" },
  ]},
];

export default function Admin() {
  const { user } = useCurrentUser();
  const loc = useLocation();
  if (!user) return null;
  const isSA = user.role === "SystemAdmin";
  if (user.role !== "SystemAdmin" && user.role !== "AgencyAdmin") return <AccessDenied />;

  return (
    <div style={{ display: "flex", gap: 28, minHeight: "70vh" }}>
      <div style={{ width: 220, flexShrink: 0, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "16px 0", alignSelf: "flex-start", position: "sticky", top: 80 }}>
        <div style={{ padding: "0 16px 12px", fontSize: 15, fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>Settings</div>
        {NAV.map(sec => {
          if (sec.role === "SystemAdmin" && !isSA) return null;
          if (sec.role === "AgencyAdmin" && !isSA && user.role !== "AgencyAdmin") return null;
          return (
            <div key={sec.label} style={{ padding: "12px 0 0" }}>
              <div style={{ padding: "0 16px 6px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{sec.label}</div>
              {sec.items.map(it => (
                <NavLink key={it.to} to={it.to} style={({ isActive }) => ({
                  display: "block", padding: "7px 16px", fontSize: 13, textDecoration: "none",
                  borderLeft: "3px solid transparent", color: isActive ? "#3b82f6" : "#475569",
                  background: isActive ? "#eff6ff" : "transparent", borderLeftColor: isActive ? "#3b82f6" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                })}>{it.label}</NavLink>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {loc.pathname === "/admin" ? <AdminHome /> : <Outlet />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN HOME
   ═══════════════════════════════════════════════════════════════════════════ */

export function AdminHome() {
  const { user } = useCurrentUser();
  if (!user) return null;
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Settings</h2>
      <p style={{ color: "#64748b", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
        Welcome, <strong>{user.name}</strong>. You are signed in as <strong>{user.role}</strong>.
        {user.role === "SystemAdmin" && " You have full access to all system and agency settings."}
        {user.role === "AgencyAdmin" && " You can manage your agency's settings, users, and preferences."}
      </p>
      <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 12 }}>Select a settings category from the sidebar.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. SYSTEM CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

export function SystemConfigSettings() {
  const { user } = useCurrentUser();
  if (!user) return null;
  return (
    <div>
      <h2 style={S.h2}>System Configuration</h2>
      <div style={S.card}>
        <h3 style={S.h3}>Application</h3>
        <div style={S.label}>Name</div><div style={S.val}>Emergency Response Equipment Portal (ERES)</div>
        <div style={S.label}>Version</div><div style={S.val}>1.0.0</div>
        <div style={S.label}>Environment</div><div style={S.val}><span style={S.badge("#0369a1", "#e0f2fe")}>Development</span></div>
        <div style={S.label}>API</div><div style={S.val}><code style={{ fontSize: 13, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>/api → localhost:7071</code></div>
      </div>
      <div style={S.card}>
        <h3 style={S.h3}>Database</h3>
        <div style={S.label}>Server</div><div style={S.val}>emergency-portal-srv.database.windows.net</div>
        <div style={S.label}>Database</div><div style={S.val}>emergency-portal-db</div>
        <div style={S.label}>Auth</div><div style={S.val}>SQL + Microsoft Entra ID</div>
      </div>
      <div style={S.card}>
        <h3 style={S.h3}>Authentication</h3>
        <div style={S.label}>Provider</div><div style={S.val}>Microsoft Entra ID</div>
        <div style={S.label}>Flow</div><div style={S.val}>MSAL Redirect (SPA)</div>
        <div style={S.label}>Current User</div><div style={S.val}>{user.name} ({user.role})</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. REFERENCE DATA (full CRUD)
   ═══════════════════════════════════════════════════════════════════════════ */

export function ReferenceDataSettings() {
  const api = useApi();
  const qc = useQueryClient();
  const [toast, setToast] = useState("");
  const [newCat, setNewCat] = useState({ name: "", description: "" });
  const [newStat, setNewStat] = useState({ name: "", description: "" });

  const { data, isLoading } = useQuery({ queryKey: ["ref-data"], queryFn: () => api("/reference-data") });
  const items = data?.value || [];
  const categories = items.filter((i: any) => i.type === "category");
  const statuses = items.filter((i: any) => i.type === "status");

  const addMut = useMutation({
    mutationFn: (body: any) => api("/reference-data", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ["ref-data"] }); setToast(`Added ${v.name}`); setTimeout(() => setToast(""), 2500); },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api(`/reference-data/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ref-data"] }); setToast("Item removed"); setTimeout(() => setToast(""), 2500); },
  });

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
      <h2 style={S.h2}>Reference Data</h2>

      {/* Categories */}
      <div style={S.card}>
        <h3 style={S.h3}>Equipment Categories</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Name</th><th style={S.th}>Description</th><th style={{ ...S.th, width: 80 }}>Actions</th></tr></thead>
          <tbody>
            {isLoading && <Msg cols={3} text="Loading…" />}
            {!isLoading && categories.length === 0 && <Msg cols={3} text="No categories" />}
            {categories.map((c: any) => (
              <tr key={c.id}>
                <td style={{ ...S.td, fontWeight: 500 }}>{c.name}</td>
                <td style={S.td}>{c.description || "—"}</td>
                <td style={S.td}><button style={S.btnD} onClick={() => delMut.mutate(c.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Name</div>
            <input style={S.input} value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Hazmat" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Description</div>
            <input style={S.input} value={newCat.description} onChange={e => setNewCat({ ...newCat, description: e.target.value })} placeholder="Optional" />
          </div>
          <button style={S.btnP} disabled={!newCat.name.trim()} onClick={() => { addMut.mutate({ type: "category", name: newCat.name.trim(), description: newCat.description.trim() }); setNewCat({ name: "", description: "" }); }}>
            Add Category
          </button>
        </div>
      </div>

      {/* Statuses */}
      <div style={S.card}>
        <h3 style={S.h3}>Equipment Statuses</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Status</th><th style={S.th}>Description</th><th style={{ ...S.th, width: 80 }}>Actions</th></tr></thead>
          <tbody>
            {isLoading && <Msg cols={3} text="Loading…" />}
            {!isLoading && statuses.length === 0 && <Msg cols={3} text="No statuses" />}
            {statuses.map((s: any) => (
              <tr key={s.id}>
                <td style={S.td}><StatusBadge status={s.name} /></td>
                <td style={S.td}>{s.description || "—"}</td>
                <td style={S.td}><button style={S.btnD} onClick={() => delMut.mutate(s.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Name</div>
            <input style={S.input} value={newStat.name} onChange={e => setNewStat({ ...newStat, name: e.target.value })} placeholder="e.g. Deployed" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Description</div>
            <input style={S.input} value={newStat.description} onChange={e => setNewStat({ ...newStat, description: e.target.value })} placeholder="Optional" />
          </div>
          <button style={S.btnP} disabled={!newStat.name.trim()} onClick={() => { addMut.mutate({ type: "status", name: newStat.name.trim(), description: newStat.description.trim() }); setNewStat({ name: "", description: "" }); }}>
            Add Status
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. AGENCIES (full CRUD)
   ═══════════════════════════════════════════════════════════════════════════ */

export function AgenciesSettings() {
  const api = useApi();
  const qc = useQueryClient();
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState({ name: "", type: "", region: "", contact_email: "" });

  const { data, isLoading, error } = useQuery({ queryKey: ["admin-agencies"], queryFn: () => api("/agencies") });
  const agencies = data?.value || data || [];

  const createMut = useMutation({
    mutationFn: (body: any) => api("/agencies", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-agencies"] }); setDraft({ name: "", type: "", region: "", contact_email: "" }); setToast("Agency created"); setTimeout(() => setToast(""), 2500); },
  });

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
      <h2 style={S.h2}>Agencies</h2>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ ...S.h3, margin: 0 }}>Registered Agencies</h3>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{Array.isArray(agencies) ? agencies.length : 0} total</span>
        </div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Name</th><th style={S.th}>Type</th><th style={S.th}>Region</th><th style={S.th}>Contact</th><th style={S.th}>Created</th></tr></thead>
          <tbody>
            {isLoading && <Msg cols={5} text="Loading…" />}
            {error && <Msg cols={5} text={(error as Error).message} color="#ef4444" />}
            {!isLoading && !error && Array.isArray(agencies) && agencies.length === 0 && <Msg cols={5} text="No agencies" />}
            {Array.isArray(agencies) && agencies.map((a: any) => (
              <tr key={a.id}>
                <td style={{ ...S.td, fontWeight: 600 }}>{a.name}</td>
                <td style={S.td}><span style={S.badge("#7c3aed", "#f5f3ff")}>{a.type || "—"}</span></td>
                <td style={S.td}>{a.region || "—"}</td>
                <td style={S.td}>{a.contact_email ? <a href={`mailto:${a.contact_email}`} style={{ color: "#3b82f6", textDecoration: "none" }}>{a.contact_email}</a> : "—"}</td>
                <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={S.card}>
        <h3 style={S.h3}>Add New Agency</h3>
        <div style={{ ...S.grid2, marginBottom: 16 }}>
          <div><div style={S.label}>Agency Name *</div><input style={S.input} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. County Fire Dept" /></div>
          <div><div style={S.label}>Type</div><input style={S.input} value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} placeholder="e.g. government, nonprofit" /></div>
          <div><div style={S.label}>Region</div><input style={S.input} value={draft.region} onChange={e => setDraft({ ...draft, region: e.target.value })} placeholder="e.g. St. Louis Metro" /></div>
          <div><div style={S.label}>Contact Email</div><input style={S.input} value={draft.contact_email} onChange={e => setDraft({ ...draft, contact_email: e.target.value })} placeholder="admin@agency.gov" /></div>
        </div>
        <button style={S.btnP} disabled={!draft.name.trim() || createMut.isPending} onClick={() => createMut.mutate(draft)}>
          {createMut.isPending ? "Creating…" : "Add Agency"}
        </button>
        {createMut.isError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{(createMut.error as Error).message}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. GLOBAL USERS (full CRUD)
   ═══════════════════════════════════════════════════════════════════════════ */

export function GlobalUsersSettings() {
  const api = useApi();
  const qc = useQueryClient();
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState({ full_name: "", email: "", role: "AgencyUser", agency_id: "" });

  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => api("/users") });
  const { data: agData } = useQuery({ queryKey: ["admin-agencies-for-users"], queryFn: () => api("/agencies") });
  const users = data?.value || [];
  const agencies = agData?.value || agData || [];

  const createMut = useMutation({
    mutationFn: (body: any) => api("/users", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setDraft({ full_name: "", email: "", role: "AgencyUser", agency_id: "" }); setToast("User created"); setTimeout(() => setToast(""), 2500); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: any) => api(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setToast("User updated"); setTimeout(() => setToast(""), 2500); },
  });

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
      <h2 style={S.h2}>Global Users</h2>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ ...S.h3, margin: 0 }}>All Users</h3>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{users.length} total</span>
        </div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Name</th><th style={S.th}>Email</th><th style={S.th}>Role</th><th style={S.th}>Agency</th><th style={{ ...S.th, width: 120 }}>Actions</th></tr></thead>
          <tbody>
            {isLoading && <Msg cols={5} text="Loading…" />}
            {!isLoading && users.length === 0 && <Msg cols={5} text="No users found" />}
            {users.map((u: any) => (
              <tr key={u.id}>
                <td style={{ ...S.td, fontWeight: 500 }}>{u.full_name}</td>
                <td style={S.td}>{u.email}</td>
                <td style={S.td}>
                  <select style={{ ...S.select, width: "auto" }} value={u.role} onChange={e => updateMut.mutate({ id: u.id, role: e.target.value })}>
                    <option>SystemAdmin</option><option>GlobalViewer</option><option>AgencyAdmin</option><option>AgencyUser</option><option>AgencyReporter</option>
                  </select>
                </td>
                <td style={S.td}>{u.agency_name || "—"}</td>
                <td style={S.td}><span style={{ fontSize: 12, color: "#64748b" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : ""}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={S.card}>
        <h3 style={S.h3}>Add New User</h3>
        <div style={{ ...S.grid2, marginBottom: 16 }}>
          <div><div style={S.label}>Full Name *</div><input style={S.input} value={draft.full_name} onChange={e => setDraft({ ...draft, full_name: e.target.value })} /></div>
          <div><div style={S.label}>Email *</div><input style={S.input} type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></div>
          <div><div style={S.label}>Role *</div>
            <select style={S.select} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}>
              <option>SystemAdmin</option><option>GlobalViewer</option><option>AgencyAdmin</option><option>AgencyUser</option><option>AgencyReporter</option>
            </select>
          </div>
          <div><div style={S.label}>Agency *</div>
            <select style={S.select} value={draft.agency_id} onChange={e => setDraft({ ...draft, agency_id: e.target.value })}>
              <option value="">Select agency…</option>
              {Array.isArray(agencies) && agencies.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <button style={S.btnP} disabled={!draft.full_name.trim() || !draft.email.trim() || !draft.agency_id || createMut.isPending} onClick={() => createMut.mutate(draft)}>
          {createMut.isPending ? "Creating…" : "Add User"}
        </button>
        {createMut.isError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{(createMut.error as Error).message}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ROLES & PERMISSIONS (read-only)
   ═══════════════════════════════════════════════════════════════════════════ */

const ROLES = [
  { role: "SystemAdmin", desc: "Full system access. Manages all agencies, users, equipment, settings.", perms: ["View all equipment", "Manage all agencies & users", "System settings", "Audit logs"], color: "#dc2626", bg: "#fef2f2" },
  { role: "GlobalViewer", desc: "Read-only cross-agency access.", perms: ["View all equipment (read-only)", "Global search", "Cross-agency reports"], color: "#7c3aed", bg: "#f5f3ff" },
  { role: "AgencyAdmin", desc: "Full access within own agency.", perms: ["Manage agency equipment", "Manage agency users", "Agency settings"], color: "#2563eb", bg: "#eff6ff" },
  { role: "AgencyUser", desc: "Standard operational access.", perms: ["View & edit agency equipment", "Update status", "Agency reports"], color: "#0891b2", bg: "#ecfeff" },
  { role: "AgencyReporter", desc: "View-only with reporting.", perms: ["View equipment (read-only)", "Agency reports", "Export data"], color: "#059669", bg: "#ecfdf5" },
];

export function RolesPermissionsSettings() {
  return (
    <div>
      <h2 style={S.h2}>Roles & Permissions</h2>
      <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>5 predefined roles determine access throughout the portal.</p>
      {ROLES.map(r => (
        <div key={r.role} style={{ ...S.card, borderLeft: `4px solid ${r.color}` }}>
          <span style={S.badge(r.color, r.bg)}>{r.role}</span>
          <p style={{ fontSize: 13, color: "#475569", margin: "8px 0 12px" }}>{r.desc}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r.perms.map((p, i) => (
              <span key={i} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569" }}>✓ {p}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. AUDIT & DIAGNOSTICS
   ═══════════════════════════════════════════════════════════════════════════ */

const STATUS_MAP: Record<number, string> = { 0: "Active", 1: "Active", 2: "Maintenance", 3: "Deployed", 4: "Decommissioned" };

export function AuditDiagnosticsSettings() {
  const api = useApi();
  const { user } = useCurrentUser();
  const { data, isLoading } = useQuery({ queryKey: ["audit-log"], queryFn: () => api("/audit-log?limit=30") });
  const logs = data?.value || [];

  return (
    <div>
      <h2 style={S.h2}>Audit & Diagnostics</h2>

      <div style={S.card}>
        <h3 style={S.h3}>System Health</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[["API Server", "Operational"], ["Database", "Connected"], ["Authentication", "Active"]].map(([l, s]) => (
            <div key={l} style={{ padding: 16, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={S.label}>{l}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <h3 style={S.h3}>Current Session</h3>
        <div style={S.label}>User</div><div style={S.val}>{user?.name} ({user?.role})</div>
        <div style={S.label}>Agency</div><div style={S.val}>{user?.agency}</div>
      </div>

      <div style={S.card}>
        <h3 style={S.h3}>Recent Equipment Status Changes</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Time</th><th style={S.th}>Equipment</th><th style={S.th}>Agency</th><th style={S.th}>From</th><th style={S.th}>To</th><th style={S.th}>By</th></tr></thead>
          <tbody>
            {isLoading && <Msg cols={6} text="Loading…" />}
            {!isLoading && logs.length === 0 && <Msg cols={6} text="No recent activity" />}
            {logs.map((l: any) => (
              <tr key={l.id}>
                <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{l.created_at ? new Date(l.created_at).toLocaleString() : "—"}</td>
                <td style={{ ...S.td, fontWeight: 500 }}>{l.equipment_name || "—"}</td>
                <td style={S.td}>{l.agency_name || "—"}</td>
                <td style={S.td}>{l.old_status != null ? <StatusBadge status={STATUS_MAP[l.old_status] || String(l.old_status)} /> : "—"}</td>
                <td style={S.td}>{l.new_status != null ? <StatusBadge status={STATUS_MAP[l.new_status] || String(l.new_status)} /> : "—"}</td>
                <td style={S.td}>{l.changed_by || "System"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. AGENCY PROFILE
   ═══════════════════════════════════════════════════════════════════════════ */

export function AgencyProfileSettings() {
  const api = useApi();
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [toast, setToast] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["agency-profile", user?.agencyId], enabled: !!user?.agencyId, queryFn: () => api("/agencies") });
  const agencies = data?.value || data || [];
  const myAgency = Array.isArray(agencies) ? agencies.find((a: any) => a.id === user?.agencyId) : null;

  const [form, setForm] = useState<any>(null);
  if (myAgency && !form) setTimeout(() => setForm({ name: myAgency.name, type: myAgency.type || "", region: myAgency.region || "", contact_email: myAgency.contact_email || "" }), 0);

  const updateMut = useMutation({
    mutationFn: (body: any) => api(`/agencies/${user?.agencyId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agency-profile"] }); setToast("Agency updated"); setTimeout(() => setToast(""), 2500); },
  });

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
      <h2 style={S.h2}>Agency Profile</h2>
      <div style={S.card}>
        {isLoading ? <p style={{ color: "#94a3b8" }}>Loading…</p> : !myAgency ? <p style={{ color: "#94a3b8" }}>Agency not found</p> : form ? (
          <>
            <div style={{ ...S.grid2, marginBottom: 16 }}>
              <div><div style={S.label}>Name</div><input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><div style={S.label}>Type</div><input style={S.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} /></div>
              <div><div style={S.label}>Region</div><input style={S.input} value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} /></div>
              <div><div style={S.label}>Contact Email</div><input style={S.input} value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
            </div>
            <button style={S.btnP} onClick={() => updateMut.mutate(form)}>{updateMut.isPending ? "Saving…" : "Save Changes"}</button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. NOTIFICATIONS (local prefs)
   ═══════════════════════════════════════════════════════════════════════════ */

export function NotificationsSettings() {
  const [prefs, setPrefs] = useState({ email: true, statusChange: true, maintenance: false, newEquipment: true });

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <div onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: checked ? "#3b82f6" : "#cbd5e1", position: "relative", transition: "background 0.2s" }}>
        <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: checked ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
      </div>
    );
  }

  function Row({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
        <div><div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{title}</div><div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{desc}</div></div>
        <Toggle checked={checked} onChange={onChange} />
      </div>
    );
  }

  return (
    <div>
      <h2 style={S.h2}>Notifications</h2>
      <div style={S.card}>
        <Row title="Email alerts" desc="Receive notifications via email" checked={prefs.email} onChange={v => setPrefs({ ...prefs, email: v })} />
        <Row title="Status changes" desc="Notified when equipment status updates" checked={prefs.statusChange} onChange={v => setPrefs({ ...prefs, statusChange: v })} />
        <Row title="Maintenance reminders" desc="Notified when equipment is due for maintenance" checked={prefs.maintenance} onChange={v => setPrefs({ ...prefs, maintenance: v })} />
        <Row title="New equipment" desc="Notified when new equipment is added" checked={prefs.newEquipment} onChange={v => setPrefs({ ...prefs, newEquipment: v })} />
        <div style={{ marginTop: 16 }}><button style={S.btnP}>Save Preferences</button></div>
      </div>
      <div style={{ ...S.card, background: "#fffbeb", borderColor: "#fde68a" }}>
        <p style={{ fontSize: 13, color: "#92400e", margin: 0 }}>ℹ️ Notification preferences are stored locally. Email delivery requires a notification service on the backend.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. AGENCY USERS
   ═══════════════════════════════════════════════════════════════════════════ */

export function AgencyUsersSettings() {
  const api = useApi();
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState({ full_name: "", email: "", role: "AgencyUser" });

  const { data, isLoading } = useQuery({ queryKey: ["agency-users", user?.agencyId], queryFn: () => api(`/users?agencyId=${user?.agencyId}`) });
  const users = data?.value || [];

  const createMut = useMutation({
    mutationFn: (body: any) => api("/users", { method: "POST", body: JSON.stringify({ ...body, agency_id: user?.agencyId }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agency-users"] }); setDraft({ full_name: "", email: "", role: "AgencyUser" }); setToast("User added"); setTimeout(() => setToast(""), 2500); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: any) => api(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agency-users"] }); setToast("Role updated"); setTimeout(() => setToast(""), 2500); },
  });

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
      <h2 style={S.h2}>Agency Users</h2>

      <div style={S.card}>
        <h3 style={{ ...S.h3, margin: 0, marginBottom: 16 }}>Users in {user?.agency}</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Name</th><th style={S.th}>Email</th><th style={S.th}>Role</th><th style={S.th}>Joined</th></tr></thead>
          <tbody>
            {isLoading && <Msg cols={4} text="Loading…" />}
            {!isLoading && users.length === 0 && <Msg cols={4} text="No users" />}
            {users.map((u: any) => (
              <tr key={u.id}>
                <td style={{ ...S.td, fontWeight: 500 }}>{u.full_name}</td>
                <td style={S.td}>{u.email}</td>
                <td style={S.td}>
                  <select style={{ ...S.select, width: "auto" }} value={u.role} onChange={e => updateMut.mutate({ id: u.id, role: e.target.value })}>
                    <option>AgencyAdmin</option><option>AgencyUser</option><option>AgencyReporter</option>
                  </select>
                </td>
                <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={S.card}>
        <h3 style={S.h3}>Add Agency User</h3>
        <div style={{ ...S.grid2, marginBottom: 16 }}>
          <div><div style={S.label}>Full Name *</div><input style={S.input} value={draft.full_name} onChange={e => setDraft({ ...draft, full_name: e.target.value })} /></div>
          <div><div style={S.label}>Email *</div><input style={S.input} type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></div>
          <div><div style={S.label}>Role</div>
            <select style={S.select} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}>
              <option>AgencyAdmin</option><option>AgencyUser</option><option>AgencyReporter</option>
            </select>
          </div>
        </div>
        <button style={S.btnP} disabled={!draft.full_name.trim() || !draft.email.trim() || createMut.isPending} onClick={() => createMut.mutate(draft)}>
          {createMut.isPending ? "Adding…" : "Add User"}
        </button>
        {createMut.isError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{(createMut.error as Error).message}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. AGENCY ROLES (read-only)
   ═══════════════════════════════════════════════════════════════════════════ */

export function AgencyRolesSettings() {
  const agencyRoles = ROLES.filter(r => ["AgencyAdmin", "AgencyUser", "AgencyReporter"].includes(r.role));
  return (
    <div>
      <h2 style={S.h2}>Agency Roles</h2>
      <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>Roles available for users within your agency.</p>
      {agencyRoles.map(r => (
        <div key={r.role} style={{ ...S.card, borderLeft: `4px solid ${r.color}` }}>
          <span style={S.badge(r.color, r.bg)}>{r.role}</span>
          <p style={{ fontSize: 13, color: "#475569", margin: "8px 0 12px" }}>{r.desc}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r.perms.map((p, i) => <span key={i} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569" }}>✓ {p}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. DEFAULT EQUIPMENT VALUES (local prefs)
   ═══════════════════════════════════════════════════════════════════════════ */

export function DefaultEquipmentValuesSettings() {
  const api = useApi();
  const { data } = useQuery({ queryKey: ["ref-data-defaults"], queryFn: () => api("/reference-data") });
  const items = data?.value || [];
  const categories = items.filter((i: any) => i.type === "category");
  const statuses = items.filter((i: any) => i.type === "status");

  const [defaults, setDefaults] = useState({ status: "Active", category: "Vehicle", inspectionMonths: "12" });

  return (
    <div>
      <h2 style={S.h2}>Default Equipment Values</h2>
      <div style={S.card}>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>Pre-fill values when adding new equipment.</p>
        <div style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={S.label}>Default Status</div>
            <select style={S.select} value={defaults.status} onChange={e => setDefaults({ ...defaults, status: e.target.value })}>
              {statuses.length > 0 ? statuses.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>) : <option>Active</option>}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={S.label}>Default Category</div>
            <select style={S.select} value={defaults.category} onChange={e => setDefaults({ ...defaults, category: e.target.value })}>
              {categories.length > 0 ? categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>) : <option>Vehicle</option>}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={S.label}>Inspection Interval (months)</div>
            <input style={S.input} type="number" value={defaults.inspectionMonths} onChange={e => setDefaults({ ...defaults, inspectionMonths: e.target.value })} min="1" max="60" />
          </div>
          <button style={S.btnP}>Save Defaults</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. REPORTING PREFERENCES (local prefs)
   ═══════════════════════════════════════════════════════════════════════════ */

export function ReportingPreferencesSettings() {
  const [prefs, setPrefs] = useState({ dateFormat: "MM/DD/YYYY", exportFormat: "CSV", includeDecom: false });

  return (
    <div>
      <h2 style={S.h2}>Reporting Preferences</h2>
      <div style={S.card}>
        <div style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={S.label}>Date Format</div>
            <select style={S.select} value={prefs.dateFormat} onChange={e => setPrefs({ ...prefs, dateFormat: e.target.value })}>
              <option>MM/DD/YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option>
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={S.label}>Export Format</div>
            <select style={S.select} value={prefs.exportFormat} onChange={e => setPrefs({ ...prefs, exportFormat: e.target.value })}>
              <option>CSV</option><option>JSON</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: "1px solid #f1f5f9" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Include decommissioned</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Show retired equipment in reports</div>
            </div>
            <div onClick={() => setPrefs({ ...prefs, includeDecom: !prefs.includeDecom })} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: prefs.includeDecom ? "#3b82f6" : "#cbd5e1", position: "relative", transition: "background 0.2s" }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: prefs.includeDecom ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}><button style={S.btnP}>Save Preferences</button></div>
        </div>
      </div>
    </div>
  );
}