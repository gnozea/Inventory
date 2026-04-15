import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiScopes } from "../auth/msalConfig";
import AccessDenied from "../components/AccessDenied";

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

const STATUS_MAP: Record<number, string> = { 0: "Active", 1: "Active", 2: "Maintenance", 3: "Deployed", 4: "Decommissioned" };
const STATUS_COLORS: Record<string, string> = { Active: "#22c55e", Maintenance: "#f59e0b", Deployed: "#3b82f6", Decommissioned: "#ef4444" };

function StatusBadge({ status }: { status: string | number | null | undefined }) {
  if (status == null) return <span style={{ color: "#94a3b8" }}>—</span>;
  const name = typeof status === "number" ? (STATUS_MAP[status] || `Status ${status}`) : status;
  const color = STATUS_COLORS[name] || "#64748b";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color, background: color + "18" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      {name}
    </span>
  );
}

const S = {
  card: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 24, marginBottom: 20 } as React.CSSProperties,
  h2: { fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px", paddingBottom: 8, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" } as React.CSSProperties,
  val: { fontSize: 14, color: "#0f172a", marginBottom: 16 } as React.CSSProperties,
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" } as React.CSSProperties,
  input: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
  select: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box", cursor: "pointer", background: "#fff" } as React.CSSProperties,
  btnP: { padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff" } as React.CSSProperties,
  btnS: { padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 } as React.CSSProperties,
  th: { textAlign: "left", padding: "10px 12px", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 } as React.CSSProperties,
  td: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" } as React.CSSProperties,
};

function formatDate(d?: string | null) { return d ? new Date(d).toLocaleDateString() : "—"; }

export default function EquipmentDetail() {
  const { id } = useParams();
  const api = useApi();
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [toast, setToast] = useState("");

  const { data: eq, isLoading, error } = useQuery({
    queryKey: ["equipment-detail", id],
    queryFn: () => api(`/equipment/${id}`),
    enabled: !!id,
  });

  const { data: logData } = useQuery({
    queryKey: ["status-log", id],
    queryFn: () => api(`/statuslog/${id}`),
    enabled: !!id,
  });
  const statusLogs = logData?.value || logData || [];

  // Status update
  const statusMut = useMutation({
    mutationFn: (body: any) => api(`/equipment/${id}/status`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment-detail", id] });
      qc.invalidateQueries({ queryKey: ["status-log", id] });
      setToast("Status updated");
      setTimeout(() => setToast(""), 2500);
    },
  });

  if (!user) return null;
  if (isLoading) return (
    <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      Loading…<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: "#dc2626" }}>Error</h1>
      <p>{(error as Error).message}</p>
      <Link to="/equipment" style={{ color: "#3b82f6" }}>← Back to Equipment</Link>
    </div>
  );
  if (!eq) return <div style={{ padding: 24 }}><h1>Equipment Not Found</h1><Link to="/equipment" style={{ color: "#3b82f6" }}>← Back</Link></div>;

  const canEdit = ["SystemAdmin", "AgencyAdmin", "AgencyUser"].includes(user.role);
  const statusName = typeof eq.status === "number" ? (STATUS_MAP[eq.status] || String(eq.status)) : eq.status;

  const startEditing = () => { setDraft({ ...eq }); setEditing(true); };
  const cancelEditing = () => { setDraft(null); setEditing(false); };

  return (
    <div style={{ maxWidth: 900 }}>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: "#166534", color: "#bbf7d0", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>✓ {toast}</div>}

      <div style={{ marginBottom: 20 }}><Link to="/equipment" style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>← Back to Equipment</Link></div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{editing ? draft.name : eq.name}</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <StatusBadge status={eq.status} />
            <span style={{ fontSize: 13, color: "#64748b" }}>{eq.agency_name}</span>
            {eq.serial_number && <span style={{ fontSize: 12, color: "#94a3b8" }}>SN: {eq.serial_number}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canEdit && !editing && <button style={S.btnP} onClick={startEditing}>Edit Equipment</button>}
          {editing && <button style={S.btnP} onClick={() => { setToast("Changes saved"); cancelEditing(); }}>Save Changes</button>}
          {editing && <button style={S.btnS} onClick={cancelEditing}>Cancel</button>}
        </div>
      </div>

      {/* General Information */}
      <div style={S.card}>
        <h2 style={S.h2}>General Information</h2>
        <div style={S.grid2}>
          {editing ? (
            <>
              <div><div style={S.label}>Name</div><input style={S.input} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
              <div><div style={S.label}>Serial Number</div><input style={S.input} value={draft.serial_number || ""} onChange={e => setDraft({ ...draft, serial_number: e.target.value })} /></div>
              <div><div style={S.label}>Category</div><input style={S.input} value={draft.category || ""} onChange={e => setDraft({ ...draft, category: e.target.value })} /></div>
              <div><div style={S.label}>Assigned To</div><input style={S.input} value={draft.assigned_to || ""} onChange={e => setDraft({ ...draft, assigned_to: e.target.value })} /></div>
              <div><div style={S.label}>Purchase Date</div><input style={S.input} type="date" value={draft.purchase_date || ""} onChange={e => setDraft({ ...draft, purchase_date: e.target.value })} /></div>
              <div><div style={S.label}>Last Inspected</div><input style={S.input} type="date" value={draft.last_inspected || ""} onChange={e => setDraft({ ...draft, last_inspected: e.target.value })} /></div>
            </>
          ) : (
            <>
              <div><div style={S.label}>Name</div><div style={S.val}>{eq.name}</div></div>
              <div><div style={S.label}>Serial Number</div><div style={S.val}>{eq.serial_number || "—"}</div></div>
              <div><div style={S.label}>Category</div><div style={S.val}>{eq.category || "—"}</div></div>
              <div><div style={S.label}>Status</div><div style={S.val}><StatusBadge status={eq.status} /></div></div>
              <div><div style={S.label}>Agency</div><div style={S.val}>{eq.agency_name || "—"}</div></div>
              <div><div style={S.label}>Assigned To</div><div style={S.val}>{eq.assigned_to || "—"}</div></div>
              <div><div style={S.label}>Purchase Date</div><div style={S.val}>{formatDate(eq.purchase_date)}</div></div>
              <div><div style={S.label}>Last Inspected</div><div style={S.val}>{formatDate(eq.last_inspected)}</div></div>
            </>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div style={S.card}>
        <h2 style={S.h2}>Contact Information</h2>
        <div style={S.grid2}>
          {editing ? (
            <>
              <div><div style={S.label}>Contact Phone</div><input style={S.input} value={draft.contact_phone || ""} onChange={e => setDraft({ ...draft, contact_phone: e.target.value })} /></div>
              <div><div style={S.label}>Contact Email</div><input style={S.input} value={draft.contact_email || ""} onChange={e => setDraft({ ...draft, contact_email: e.target.value })} /></div>
            </>
          ) : (
            <>
              <div><div style={S.label}>Contact Phone</div><div style={S.val}>{eq.contact_phone ? <a href={`tel:${eq.contact_phone}`} style={{ color: "#3b82f6", textDecoration: "none" }}>{eq.contact_phone}</a> : "—"}</div></div>
              <div><div style={S.label}>Contact Email</div><div style={S.val}>{eq.contact_email ? <a href={`mailto:${eq.contact_email}`} style={{ color: "#3b82f6", textDecoration: "none" }}>{eq.contact_email}</a> : "—"}</div></div>
            </>
          )}
        </div>
      </div>

      {/* Location */}
      <div style={S.card}>
        <h2 style={S.h2}>Location</h2>
        <div style={S.grid2}>
          <div><div style={S.label}>Location Name</div><div style={S.val}>{eq.location_name || "—"}</div></div>
          <div><div style={S.label}>Street Address</div><div style={S.val}>{eq.location_address || "—"}</div></div>
          <div><div style={S.label}>City</div><div style={S.val}>{eq.location_city || "—"}</div></div>
          <div><div style={S.label}>County</div><div style={S.val}>{eq.location_county || "—"}</div></div>
          <div><div style={S.label}>State</div><div style={S.val}>{eq.location_state || "—"}</div></div>
          <div><div style={S.label}>Zip Code</div><div style={S.val}>{eq.location_zip_code || "—"}</div></div>
          <div><div style={S.label}>Country</div><div style={S.val}>{eq.location_country || "—"}</div></div>
        </div>
        {(eq.latitude || eq.longitude) && (
          <div style={{ marginTop: 8 }}>
            <div style={S.grid2}>
              <div><div style={S.label}>Latitude</div><div style={S.val}>{eq.latitude ?? "—"}</div></div>
              <div><div style={S.label}>Longitude</div><div style={S.val}>{eq.longitude ?? "—"}</div></div>
            </div>
            <a href={`https://www.google.com/maps?q=${eq.latitude},${eq.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>📍 View on Google Maps →</a>
          </div>
        )}
      </div>

      {/* Status Update */}
      {canEdit && (
        <div style={S.card}>
          <h2 style={S.h2}>Update Status</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>Current:</span>
            <StatusBadge status={eq.status} />
            <span style={{ fontSize: 13, color: "#64748b", margin: "0 8px" }}>→</span>
            <select style={{ ...S.select, width: "auto", minWidth: 160 }} defaultValue=""
              onChange={e => {
                if (!e.target.value) return;
                const newStatus = parseInt(e.target.value, 10);
                if (window.confirm(`Change status from "${statusName}" to "${STATUS_MAP[newStatus]}"?`)) {
                  statusMut.mutate({ newStatus, oldStatus: eq.status, notes: `Status changed by ${user.name}`, changed_by: user.name });
                }
                e.target.value = "";
              }}>
              <option value="">Select new status…</option>
              <option value="1">Active</option>
              <option value="2">Maintenance</option>
              <option value="3">Deployed</option>
              <option value="4">Decommissioned</option>
            </select>
            {statusMut.isPending && <span style={{ fontSize: 12, color: "#94a3b8" }}>Updating…</span>}
          </div>
          {statusMut.isError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{(statusMut.error as Error).message}</p>}
        </div>
      )}

      {/* Status History */}
      <div style={S.card}>
        <h2 style={S.h2}>Status History</h2>
        {Array.isArray(statusLogs) && statusLogs.length > 0 ? (
          <table style={S.table}>
            <thead><tr><th style={S.th}>Date</th><th style={S.th}>From</th><th style={S.th}>To</th><th style={S.th}>Changed By</th><th style={S.th}>Notes</th></tr></thead>
            <tbody>
              {statusLogs.map((log: any, i: number) => (
                <tr key={log.id || i}>
                  <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                  <td style={S.td}><StatusBadge status={log.old_status} /></td>
                  <td style={S.td}><StatusBadge status={log.new_status} /></td>
                  <td style={S.td}>{log.changed_by || "System"}</td>
                  <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{log.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>No status changes recorded.</p>
        )}
      </div>

      {/* Record Info */}
      <div style={S.card}>
        <h2 style={S.h2}>Record Info</h2>
        <div style={S.grid2}>
          <div><div style={S.label}>Created</div><div style={S.val}>{formatDate(eq.created_at)}</div></div>
          <div><div style={S.label}>Last Modified</div><div style={S.val}>{formatDate(eq.modified_at)}</div></div>
          <div><div style={S.label}>Equipment ID</div><div style={S.val}><code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px", borderRadius: 3 }}>{eq.id}</code></div></div>
        </div>
      </div>
    </div>
  );
}