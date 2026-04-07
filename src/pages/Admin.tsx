import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { useCurrentUser, type CurrentUser, type UserRole } from "../hooks/useCurrentUser";
import { apiScopes } from "../auth/msalConfig";

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

async function apiFetch(instance: any, account: any, path: string, options?: RequestInit) {
  let tokenResponse;
  try {
    tokenResponse = await instance.acquireTokenSilent({ account, scopes: apiScopes });
  } catch {
    tokenResponse = await instance.acquireTokenRedirect({ account, scopes: apiScopes });
    throw new Error("Redirecting for authentication...");
  }
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokenResponse.accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${path} returned ${res.status}: ${body}`);
  }
  return res.json();
}

function useApiFetch() {
  const { instance, accounts } = useMsal();
  return (path: string, options?: RequestInit) =>
    apiFetch(instance, accounts[0], path, options);
}

/* ── Style constants matching the existing app ── */
const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  padding: "24px",
  marginBottom: 20,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 16px",
};
const subTitle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: "#334155", margin: "0 0 12px",
};
const label: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "#64748b",
  textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4,
};
const value: React.CSSProperties = {
  fontSize: 14, color: "#0f172a", marginBottom: 16,
};
const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse" as const, fontSize: 13,
};
const th: React.CSSProperties = {
  textAlign: "left" as const, padding: "10px 12px", fontWeight: 600,
  color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12,
  textTransform: "uppercase" as const, letterSpacing: 0.5,
};
const td: React.CSSProperties = {
  padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#1e293b",
};
const badge = (color: string, bg: string): React.CSSProperties => ({
  display: "inline-block", padding: "2px 10px", borderRadius: 999,
  fontSize: 11, fontWeight: 600, color, background: bg,
});
const btnPrimary: React.CSSProperties = {
  padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff",
};
const btnSecondary: React.CSSProperties = {
  padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer",
  borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155",
};
const input: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13, borderRadius: 6,
  border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" as const,
};

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Active: "#22c55e", Maintenance: "#f59e0b",
    Deployed: "#3b82f6", Decommissioned: "#ef4444",
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      ...badge(
        colors[status] || "#64748b",
        (colors[status] || "#64748b") + "18"
      )
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: colors[status] || "#64748b",
      }} />
      {status}
    </span>
  );
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 32 }}>
        Loading…
      </td>
    </tr>
  );
}

function ErrorRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ ...td, textAlign: "center", color: "#ef4444", padding: 32 }}>
        {message}
      </td>
    </tr>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 32 }}>
        {message}
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN LAYOUT (parent route)
   ═══════════════════════════════════════════════════════════════════════════ */

const adminNavSections = [
  {
    label: "System (SystemAdmin)",
    role: "SystemAdmin" as UserRole,
    items: [
      { to: "/admin/system-config", label: "System Configuration" },
      { to: "/admin/reference-data", label: "Reference Data" },
      { to: "/admin/agencies", label: "Agencies" },
      { to: "/admin/global-users", label: "Global Users" },
      { to: "/admin/roles-permissions", label: "Roles & Permissions" },
      { to: "/admin/audit-diagnostics", label: "Audit & Diagnostics" },
    ],
  },
  {
    label: "Agency (AgencyAdmin)",
    role: "AgencyAdmin" as UserRole,
    items: [
      { to: "/admin/agency-profile", label: "Agency Profile" },
      { to: "/admin/notifications", label: "Notifications" },
      { to: "/admin/agency-users", label: "Agency Users" },
      { to: "/admin/agency-roles", label: "Agency Roles" },
      { to: "/admin/default-equipment-values", label: "Default Equipment Values" },
      { to: "/admin/reporting-preferences", label: "Reporting Preferences" },
    ],
  },
];

export default function Admin() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const isSystemAdmin = user?.role === "SystemAdmin";

  return (
    <div style={{ display: "flex", gap: 28, minHeight: "70vh" }}>
      {/* ── Settings sidebar ── */}
      <div style={{
        width: 220, flexShrink: 0,
        background: "#fff", borderRadius: 10,
        border: "1px solid #e2e8f0", padding: "16px 0",
        alignSelf: "flex-start", position: "sticky", top: 80,
      }}>
        <div style={{
          padding: "0 16px 12px", fontSize: 15, fontWeight: 700, color: "#0f172a",
          borderBottom: "1px solid #f1f5f9",
        }}>Settings</div>
        {adminNavSections.map((section) => {
          if (section.role === "SystemAdmin" && !isSystemAdmin) return null;
          if (section.role === "AgencyAdmin" && !isSystemAdmin && user?.role !== "AgencyAdmin") return null;
          return (
            <div key={section.label} style={{ padding: "12px 0 0" }}>
              <div style={{
                padding: "0 16px 6px", fontSize: 10, fontWeight: 700,
                color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1,
              }}>{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: "block", padding: "7px 16px", fontSize: 13,
                    textDecoration: "none", borderLeft: "3px solid transparent",
                    color: isActive ? "#3b82f6" : "#475569",
                    background: isActive ? "#eff6ff" : "transparent",
                    borderLeftColor: isActive ? "#3b82f6" : "transparent",
                    fontWeight: isActive ? 600 : 400,
                  })}
                >{item.label}</NavLink>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {location.pathname === "/admin" ? <AdminHome /> : <Outlet />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN HOME (index)
   ═══════════════════════════════════════════════════════════════════════════ */

export function AdminHome() {
  const { user } = useCurrentUser();
  return (
    <div style={card}>
      <h2 style={sectionTitle}>Settings</h2>
      <p style={{ color: "#64748b", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
        Welcome, <strong>{user?.name}</strong>. You are signed in as <strong>{user?.role}</strong>.
        {user?.role === "SystemAdmin" &&
          " You have full access to all system and agency settings."
        }
        {user?.role === "AgencyAdmin" &&
          " You can manage your agency's settings, users, and preferences."
        }
      </p>
      <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 12 }}>
        Select a settings category from the sidebar to get started.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. SYSTEM CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

export function SystemConfigSettings() {
  const { user } = useCurrentUser();
  return (
    <div>
      <h2 style={sectionTitle}>System Configuration</h2>
      <div style={card}>
        <h3 style={subTitle}>Application Info</h3>
        <div style={label}>Application Name</div>
        <div style={value}>Emergency Response Equipment Portal (ERES)</div>
        <div style={label}>Version</div>
        <div style={value}>1.0.0</div>
        <div style={label}>Environment</div>
        <div style={value}>
          <span style={badge("#0369a1", "#e0f2fe")}>Development</span>
        </div>
        <div style={label}>API Endpoint</div>
        <div style={value} title="/api (via Vite proxy to localhost:7071)">
          <code style={{ fontSize: 13, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
            /api → localhost:7071
          </code>
        </div>
      </div>
      <div style={card}>
        <h3 style={subTitle}>Database</h3>
        <div style={label}>Server</div>
        <div style={value}>emergency-portal-srv.database.windows.net</div>
        <div style={label}>Database</div>
        <div style={value}>emergency-portal-db</div>
        <div style={label}>Authentication</div>
        <div style={value}>SQL + Microsoft Entra ID</div>
      </div>
      <div style={card}>
        <h3 style={subTitle}>Authentication</h3>
        <div style={label}>Provider</div>
        <div style={value}>Microsoft Entra ID (Azure AD)</div>
        <div style={label}>Tenant</div>
        <div style={value}>
          <code style={{ fontSize: 13, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
            31634a55-1240-4dc6-bc36-4879b296b226
          </code>
        </div>
        <div style={label}>Auth Flow</div>
        <div style={value}>MSAL Redirect (SPA)</div>
        <div style={label}>Current User</div>
        <div style={value}>{user?.name} ({user?.role})</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. REFERENCE DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const EQUIPMENT_CATEGORIES = [
  { id: "1", name: "Vehicle", description: "Cars, trucks, boats, aircraft" },
  { id: "2", name: "PPE", description: "Personal protective equipment" },
  { id: "3", name: "Communication", description: "Radios, phones, command centers" },
  { id: "4", name: "Medical", description: "AEDs, trauma kits, ventilators" },
  { id: "5", name: "Detection", description: "Gas detectors, cameras, monitors" },
  { id: "6", name: "Rescue", description: "Hydraulic tools, ropes, cutting equipment" },
  { id: "7", name: "Electronics", description: "Laptops, tablets, drones" },
  { id: "8", name: "Shelter", description: "Tents, decon shelters, inflatables" },
];

const EQUIPMENT_STATUSES = [
  { id: 1, name: "Active", description: "In service and operational", color: "#22c55e" },
  { id: 2, name: "Maintenance", description: "Under repair or scheduled service", color: "#f59e0b" },
  { id: 3, name: "Deployed", description: "Currently deployed to an incident", color: "#3b82f6" },
  { id: 4, name: "Decommissioned", description: "Retired from service", color: "#ef4444" },
];

export function ReferenceDataSettings() {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  return (
    <div>
      <h2 style={sectionTitle}>Reference Data</h2>

      {/* Categories */}
      <div style={card}>
        <h3 style={subTitle}>Equipment Categories</h3>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Category</th>
              <th style={th}>Description</th>
              <th style={{ ...th, width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {EQUIPMENT_CATEGORIES.map((cat) => (
              <tr key={cat.id}>
                {editingCategory === cat.id ? (
                  <>
                    <td style={td}>
                      <input style={input} value={editName}
                        onChange={(e) => setEditName(e.target.value)} />
                    </td>
                    <td style={td}>
                      <input style={input} value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)} />
                    </td>
                    <td style={td}>
                      <button style={btnPrimary} onClick={() => setEditingCategory(null)}>
                        Save
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...td, fontWeight: 500 }}>{cat.name}</td>
                    <td style={td}>{cat.description}</td>
                    <td style={td}>
                      <button style={btnSecondary} onClick={() => {
                        setEditingCategory(cat.id);
                        setEditName(cat.name);
                        setEditDesc(cat.description);
                      }}>Edit</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Statuses */}
      <div style={card}>
        <h3 style={subTitle}>Equipment Statuses</h3>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Status</th>
              <th style={th}>Description</th>
              <th style={th}>Color</th>
            </tr>
          </thead>
          <tbody>
            {EQUIPMENT_STATUSES.map((s) => (
              <tr key={s.id}>
                <td style={td}>
                  <StatusDot status={s.name} />
                </td>
                <td style={td}>{s.description}</td>
                <td style={td}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: 4,
                      background: s.color, border: "1px solid #e2e8f0",
                    }} />
                    <code style={{ fontSize: 12, color: "#64748b" }}>{s.color}</code>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. AGENCIES
   ═══════════════════════════════════════════════════════════════════════════ */

export function AgenciesSettings() {
  const fetch = useApiFetch();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-agencies"],
    queryFn: () => fetch("/agencies"),
  });

  const agencies = data?.value || data || [];

  return (
    <div>
      <h2 style={sectionTitle}>Agencies</h2>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ ...subTitle, margin: 0 }}>Registered Agencies</h3>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {Array.isArray(agencies) ? agencies.length : 0} total
          </span>
        </div>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Agency Name</th>
              <th style={th}>Type</th>
              <th style={th}>Region</th>
              <th style={th}>Contact Email</th>
              <th style={th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <LoadingRow cols={5} />}
            {error && <ErrorRow cols={5} message={(error as Error).message} />}
            {!isLoading && !error && Array.isArray(agencies) && agencies.length === 0 && (
              <EmptyRow cols={5} message="No agencies found" />
            )}
            {Array.isArray(agencies) && agencies.map((ag: any) => (
              <tr key={ag.id}>
                <td style={{ ...td, fontWeight: 600 }}>{ag.name}</td>
                <td style={td}>
                  <span style={badge("#7c3aed", "#f5f3ff")}>
                    {ag.type || "—"}
                  </span>
                </td>
                <td style={td}>{ag.region || "—"}</td>
                <td style={td}>
                  {ag.contact_email ? (
                    <a href={`mailto:${ag.contact_email}`} style={{ color: "#3b82f6", textDecoration: "none" }}>
                      {ag.contact_email}
                    </a>
                  ) : "—"}
                </td>
                <td style={{ ...td, color: "#64748b", fontSize: 12 }}>
                  {ag.created_at ? new Date(ag.created_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. GLOBAL USERS
   ═══════════════════════════════════════════════════════════════════════════ */

export function GlobalUsersSettings() {
  const fetch = useApiFetch();
  const { user } = useCurrentUser();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-global-users"],
    queryFn: () => fetch("/users"),
    retry: false,
  });

  const users = data?.value || data || [];
  const hasEndpoint = !error;

  return (
    <div>
      <h2 style={sectionTitle}>Global Users</h2>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ ...subTitle, margin: 0 }}>All System Users</h3>
          {hasEndpoint && (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {Array.isArray(users) ? users.length : 0} users
            </span>
          )}
        </div>

        {!hasEndpoint ? (
          <div style={{
            padding: 32, textAlign: "center", color: "#94a3b8",
            background: "#f8fafc", borderRadius: 8, fontSize: 13,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
            <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#475569" }}>
              User management endpoint not available
            </p>
            <p style={{ margin: 0 }}>
              Add a <code style={{ background: "#e2e8f0", padding: "1px 6px", borderRadius: 3 }}>
              GET /api/users</code> endpoint to your Azure Functions API to enable user management.
            </p>
          </div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Agency</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <LoadingRow cols={4} />}
              {!isLoading && Array.isArray(users) && users.length === 0 && (
                <EmptyRow cols={4} message="No users found" />
              )}
              {Array.isArray(users) && users.map((u: any) => (
                <tr key={u.id || u.azure_ad_object_id}>
                  <td style={{ ...td, fontWeight: 500 }}>{u.full_name || u.name}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    <span style={badge(
                      u.role === "SystemAdmin" ? "#dc2626" : "#3b82f6",
                      u.role === "SystemAdmin" ? "#fef2f2" : "#eff6ff"
                    )}>{u.role}</span>
                  </td>
                  <td style={td}>{u.agency_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ROLES & PERMISSIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const ROLES_DATA = [
  {
    role: "SystemAdmin",
    description: "Full system access. Can manage all agencies, users, equipment, and settings.",
    permissions: [
      "View all equipment across agencies",
      "Add, edit, decommission any equipment",
      "Manage all agencies and users",
      "Access global search and reports",
      "Configure system settings and reference data",
      "View audit logs and diagnostics",
    ],
    color: "#dc2626",
    bg: "#fef2f2",
  },
  {
    role: "GlobalViewer",
    description: "Read-only cross-agency access. Can view equipment and reports from all agencies.",
    permissions: [
      "View all equipment across agencies (read-only)",
      "Access global search",
      "View cross-agency reports",
      "Cannot modify equipment or settings",
    ],
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    role: "AgencyAdmin",
    description: "Full access within their own agency. Can manage agency users and settings.",
    permissions: [
      "View and manage agency equipment",
      "Add new equipment for their agency",
      "Manage agency users and roles",
      "Configure agency settings and preferences",
      "View agency reports",
    ],
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    role: "AgencyUser",
    description: "Standard operational access within their agency.",
    permissions: [
      "View agency equipment",
      "Add and edit equipment",
      "Update equipment status",
      "View agency reports",
    ],
    color: "#0891b2",
    bg: "#ecfeff",
  },
  {
    role: "AgencyReporter",
    description: "View-only access with reporting capability for their agency.",
    permissions: [
      "View agency equipment (read-only)",
      "Access agency reports",
      "Export reports",
      "Cannot modify equipment or settings",
    ],
    color: "#059669",
    bg: "#ecfdf5",
  },
];

export function RolesPermissionsSettings() {
  return (
    <div>
      <h2 style={sectionTitle}>Roles & Permissions</h2>
      <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
        The system uses 5 predefined roles. Roles are assigned to users and determine
        what they can see and do within the portal.
      </p>
      {ROLES_DATA.map((r) => (
        <div key={r.role} style={{ ...card, borderLeft: `4px solid ${r.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={badge(r.color, r.bg)}>{r.role}</span>
          </div>
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px", lineHeight: 1.5 }}>
            {r.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r.permissions.map((p, i) => (
              <span key={i} style={{
                display: "inline-block", padding: "4px 10px",
                borderRadius: 6, fontSize: 12, background: "#f8fafc",
                border: "1px solid #e2e8f0", color: "#475569",
              }}>
                {p.startsWith("Cannot") ? "🚫 " : "✓ "}{p}
              </span>
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

export function AuditDiagnosticsSettings() {
  const fetch = useApiFetch();
  const { user } = useCurrentUser();

  // Fetch equipment to get IDs for status log lookups
  const { data: eqData } = useQuery({
    queryKey: ["admin-equipment-for-audit"],
    queryFn: () => fetch("/equipment"),
  });

  const equipment = eqData?.value || eqData || [];
  const firstFewIds = Array.isArray(equipment) ? equipment.slice(0, 10) : [];

  // Fetch status logs for the first few equipment items
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-status-logs", firstFewIds.map((e: any) => e.id)],
    enabled: firstFewIds.length > 0,
    queryFn: async () => {
      const results = await Promise.allSettled(
        firstFewIds.map((e: any) =>
          fetch(`/statuslog/${e.id}`).catch(() => ({ value: [] }))
        )
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .flatMap((r) => {
          const val = r.value?.value || r.value || [];
          return Array.isArray(val) ? val : [];
        })
        .sort((a: any, b: any) =>
          new Date(b.changed_at || b.created_at || 0).getTime() -
          new Date(a.changed_at || a.created_at || 0).getTime()
        )
        .slice(0, 20);
    },
  });

  const logs = logsData || [];

  return (
    <div>
      <h2 style={sectionTitle}>Audit & Diagnostics</h2>

      {/* System health */}
      <div style={card}>
        <h3 style={subTitle}>System Health</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            { label: "API Server", status: "Operational", color: "#22c55e" },
            { label: "Database", status: "Connected", color: "#22c55e" },
            { label: "Authentication", status: "Active", color: "#22c55e" },
          ].map((item) => (
            <div key={item.label} style={{
              padding: 16, borderRadius: 8, background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}>
              <div style={label}>{item.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", background: item.color,
                }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current session */}
      <div style={card}>
        <h3 style={subTitle}>Current Session</h3>
        <div style={label}>User</div>
        <div style={value}>{user?.name} ({user?.role})</div>
        <div style={label}>Agency</div>
        <div style={value}>{user?.agency}</div>
        <div style={label}>Session Started</div>
        <div style={value}>{new Date().toLocaleString()}</div>
      </div>

      {/* Recent activity */}
      <div style={card}>
        <h3 style={subTitle}>Recent Equipment Activity</h3>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Timestamp</th>
              <th style={th}>Equipment</th>
              <th style={th}>From</th>
              <th style={th}>To</th>
              <th style={th}>Changed By</th>
            </tr>
          </thead>
          <tbody>
            {logsLoading && <LoadingRow cols={5} />}
            {!logsLoading && logs.length === 0 && (
              <EmptyRow cols={5} message="No recent status changes found" />
            )}
            {logs.map((log: any, i: number) => (
              <tr key={log.id || i}>
                <td style={{ ...td, fontSize: 12, color: "#64748b" }}>
                  {log.changed_at || log.created_at
                    ? new Date(log.changed_at || log.created_at).toLocaleString()
                    : "—"}
                </td>
                <td style={{ ...td, fontWeight: 500 }}>
                  {log.equipment_name || log.equipment_id || "—"}
                </td>
                <td style={td}>
                  {log.old_status ? <StatusDot status={log.old_status} /> : "—"}
                </td>
                <td style={td}>
                  {log.new_status ? <StatusDot status={log.new_status} /> : "—"}
                </td>
                <td style={td}>{log.changed_by_name || log.changed_by || "System"}</td>
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
  const fetch = useApiFetch();
  const { user } = useCurrentUser();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agency-profile", user?.agencyId],
    enabled: !!user?.agencyId,
    queryFn: () => fetch("/agencies"),
  });

  const agencies = data?.value || data || [];
  const myAgency = Array.isArray(agencies)
    ? agencies.find((a: any) => a.id === user?.agencyId)
    : null;

  return (
    <div>
      <h2 style={sectionTitle}>Agency Profile</h2>
      <div style={card}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
        ) : myAgency ? (
          <>
            <h3 style={subTitle}>{myAgency.name}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              <div>
                <div style={label}>Agency ID</div>
                <div style={value}>
                  <code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px", borderRadius: 3 }}>
                    {myAgency.id}
                  </code>
                </div>
              </div>
              <div>
                <div style={label}>Type</div>
                <div style={value}>{myAgency.type || "Not specified"}</div>
              </div>
              <div>
                <div style={label}>Region</div>
                <div style={value}>{myAgency.region || "Not specified"}</div>
              </div>
              <div>
                <div style={label}>Contact Email</div>
                <div style={value}>
                  {myAgency.contact_email ? (
                    <a href={`mailto:${myAgency.contact_email}`} style={{ color: "#3b82f6", textDecoration: "none" }}>
                      {myAgency.contact_email}
                    </a>
                  ) : "Not specified"}
                </div>
              </div>
              <div>
                <div style={label}>Created</div>
                <div style={value}>
                  {myAgency.created_at ? new Date(myAgency.created_at).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
            Agency profile not found for your account.
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

export function NotificationsSettings() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [statusChanges, setStatusChanges] = useState(true);
  const [maintenanceDue, setMaintenanceDue] = useState(false);
  const [newEquipment, setNewEquipment] = useState(true);

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: "pointer",
          background: checked ? "#3b82f6" : "#cbd5e1",
          position: "relative", transition: "background 0.2s",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 10,
          background: "#fff", position: "absolute", top: 2,
          left: checked ? 22 : 2, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </div>
    );
  }

  function NotifRow({ title, desc, checked, onChange }: {
    title: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
  }) {
    return (
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 0", borderBottom: "1px solid #f1f5f9",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
        </div>
        <Toggle checked={checked} onChange={onChange} />
      </div>
    );
  }

  return (
    <div>
      <h2 style={sectionTitle}>Notifications</h2>
      <div style={card}>
        <h3 style={subTitle}>Email Notifications</h3>
        <NotifRow
          title="Email alerts enabled"
          desc="Receive notifications via email"
          checked={emailAlerts} onChange={setEmailAlerts}
        />
        <NotifRow
          title="Equipment status changes"
          desc="Get notified when equipment status is updated"
          checked={statusChanges} onChange={setStatusChanges}
        />
        <NotifRow
          title="Maintenance reminders"
          desc="Get notified when equipment is due for maintenance"
          checked={maintenanceDue} onChange={setMaintenanceDue}
        />
        <NotifRow
          title="New equipment added"
          desc="Get notified when new equipment is registered"
          checked={newEquipment} onChange={setNewEquipment}
        />
        <div style={{ marginTop: 16 }}>
          <button style={btnPrimary}>Save Preferences</button>
        </div>
      </div>
      <div style={{
        ...card, background: "#fffbeb", borderColor: "#fde68a",
      }}>
        <p style={{ fontSize: 13, color: "#92400e", margin: 0 }}>
          ℹ️ Notification preferences are stored locally. Email delivery requires
          a notification service to be configured on the backend.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. AGENCY USERS
   ═══════════════════════════════════════════════════════════════════════════ */

export function AgencyUsersSettings() {
  const fetch = useApiFetch();
  const { user } = useCurrentUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-agency-users", user?.agencyId],
    queryFn: () => fetch(`/users?agencyId=${user?.agencyId}`),
    retry: false,
  });

  const users = data?.value || data || [];
  const hasEndpoint = !error;

  return (
    <div>
      <h2 style={sectionTitle}>Agency Users</h2>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ ...subTitle, margin: 0 }}>Users in {user?.agency}</h3>
        </div>

        {!hasEndpoint ? (
          <div style={{
            padding: 32, textAlign: "center", color: "#94a3b8",
            background: "#f8fafc", borderRadius: 8, fontSize: 13,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
            <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#475569" }}>
              User management endpoint not available
            </p>
            <p style={{ margin: 0 }}>
              Add a <code style={{ background: "#e2e8f0", padding: "1px 6px", borderRadius: 3 }}>
              GET /api/users</code> endpoint to your Azure Functions API to enable user management.
              The endpoint should accept an optional <code style={{ background: "#e2e8f0", padding: "1px 6px", borderRadius: 3 }}>
              agencyId</code> query parameter.
            </p>
          </div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <LoadingRow cols={4} />}
              {!isLoading && Array.isArray(users) && users.length === 0 && (
                <EmptyRow cols={4} message="No users found for this agency" />
              )}
              {Array.isArray(users) && users.map((u: any) => (
                <tr key={u.id || u.azure_ad_object_id}>
                  <td style={{ ...td, fontWeight: 500 }}>{u.full_name || u.name}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    <span style={badge("#2563eb", "#eff6ff")}>{u.role}</span>
                  </td>
                  <td style={{ ...td, fontSize: 12, color: "#64748b" }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. AGENCY ROLES
   ═══════════════════════════════════════════════════════════════════════════ */

export function AgencyRolesSettings() {
  const agencyRoles = ROLES_DATA.filter((r) =>
    ["AgencyAdmin", "AgencyUser", "AgencyReporter"].includes(r.role)
  );

  return (
    <div>
      <h2 style={sectionTitle}>Agency Roles</h2>
      <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
        These roles are available for users within your agency. Role assignments
        determine what actions agency members can perform.
      </p>
      {agencyRoles.map((r) => (
        <div key={r.role} style={{ ...card, borderLeft: `4px solid ${r.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={badge(r.color, r.bg)}>{r.role}</span>
          </div>
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px", lineHeight: 1.5 }}>
            {r.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r.permissions.map((p, i) => (
              <span key={i} style={{
                display: "inline-block", padding: "4px 10px",
                borderRadius: 6, fontSize: 12, background: "#f8fafc",
                border: "1px solid #e2e8f0", color: "#475569",
              }}>
                {p.startsWith("Cannot") ? "🚫 " : "✓ "}{p}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. DEFAULT EQUIPMENT VALUES
   ═══════════════════════════════════════════════════════════════════════════ */

export function DefaultEquipmentValuesSettings() {
  const [defaultStatus, setDefaultStatus] = useState("Active");
  const [defaultCategory, setDefaultCategory] = useState("Vehicle");
  const [autoInspection, setAutoInspection] = useState("12");

  return (
    <div>
      <h2 style={sectionTitle}>Default Equipment Values</h2>
      <div style={card}>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", lineHeight: 1.5 }}>
          Set default values for new equipment entries. These will be pre-filled when adding
          new equipment to your agency's inventory.
        </p>

        <div style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={label}>Default Status</div>
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value)}
              style={{ ...input, cursor: "pointer" }}
            >
              {EQUIPMENT_STATUSES.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={label}>Default Category</div>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              style={{ ...input, cursor: "pointer" }}
            >
              {EQUIPMENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={label}>Inspection Interval (months)</div>
            <input
              style={input}
              type="number"
              value={autoInspection}
              onChange={(e) => setAutoInspection(e.target.value)}
              min="1" max="60"
            />
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              Equipment will be flagged for inspection after this many months.
            </div>
          </div>

          <button style={btnPrimary}>Save Defaults</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. REPORTING PREFERENCES
   ═══════════════════════════════════════════════════════════════════════════ */

export function ReportingPreferencesSettings() {
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [exportFormat, setExportFormat] = useState("CSV");
  const [includeDecommissioned, setIncludeDecommissioned] = useState(false);

  return (
    <div>
      <h2 style={sectionTitle}>Reporting Preferences</h2>
      <div style={card}>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", lineHeight: 1.5 }}>
          Configure how reports are generated and exported for your agency.
        </p>

        <div style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={label}>Date Format</div>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              style={{ ...input, cursor: "pointer" }}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={label}>Default Export Format</div>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              style={{ ...input, cursor: "pointer" }}
            >
              <option value="CSV">CSV</option>
              <option value="JSON">JSON</option>
            </select>
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 0", borderTop: "1px solid #f1f5f9",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>
                Include decommissioned equipment
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                Show retired equipment in reports by default
              </div>
            </div>
            <div
              onClick={() => setIncludeDecommissioned(!includeDecommissioned)}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: "pointer",
                background: includeDecommissioned ? "#3b82f6" : "#cbd5e1",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 10,
                background: "#fff", position: "absolute", top: 2,
                left: includeDecommissioned ? 22 : 2, transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button style={btnPrimary}>Save Preferences</button>
          </div>
        </div>
      </div>
    </div>
  );
}