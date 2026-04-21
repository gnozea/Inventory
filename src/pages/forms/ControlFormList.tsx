import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useControlFormApi } from "../../api/client";

function StatusBadge({ status }: { status: string }) {
  const cfg = status === "submitted"
    ? { bg: "#d1fae5", color: "#065f46" }
    : { bg: "#fef3c7", color: "#92400e" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: cfg.bg, color: cfg.color }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

const S = {
  th: { textAlign: "left" as const, padding: "10px 12px", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  td: { padding: "12px 12px", borderBottom: "1px solid #f1f5f9", color: "#1e293b", fontSize: 13 } as React.CSSProperties,
  btn: (primary = false) => ({ padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: primary ? "none" : "1px solid #cbd5e1", background: primary ? "#3b82f6" : "#fff", color: primary ? "#fff" : "#334155" } as React.CSSProperties),
};

export default function ControlFormList() {
  const { user } = useCurrentUser();
  const api = useControlFormApi();
  const navigate = useNavigate();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["control-forms"],
    queryFn: () => api.getForms(),
  });

  if (!user) return null;
  const canCreate = ["SystemAdmin", "AgencyAdmin", "AgencyUser"].includes(user.role);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Inventory Control Forms</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Record receipt of new or incoming equipment</p>
        </div>
        {canCreate && (
          <button style={S.btn(true)} onClick={() => navigate("/forms/control/new")}>+ New Control Form</button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</div>
      ) : forms.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 48, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <p style={{ margin: 0, fontSize: 14 }}>No inventory control forms yet.</p>
          {canCreate && (
            <button style={{ ...S.btn(true), marginTop: 16 }} onClick={() => navigate("/forms/control/new")}>Create First Form</button>
          )}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={S.th}>Form #</th>
                <th style={S.th}>Date Received</th>
                <th style={S.th}>Vendor</th>
                <th style={S.th}>PO #</th>
                <th style={S.th}>Items</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Created</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f: any) => (
                <tr key={f.id}>
                  <td style={S.td}>
                    <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace", fontSize: 12 }}>{f.form_number}</span>
                  </td>
                  <td style={S.td}>{f.received_date ? new Date(f.received_date).toLocaleDateString() : "—"}</td>
                  <td style={S.td}>{f.vendor_name || "—"}</td>
                  <td style={{ ...S.td, color: "#64748b" }}>{f.po_number || "—"}</td>
                  <td style={{ ...S.td, textAlign: "center" as const }}>{f.item_count ?? 0}</td>
                  <td style={S.td}><StatusBadge status={f.status} /></td>
                  <td style={{ ...S.td, color: "#64748b", fontSize: 12 }}>{new Date(f.created_at).toLocaleDateString()}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={S.btn()} onClick={() => navigate(`/forms/control/${f.id}`)}>
                        {f.status === "draft" ? "Edit" : "View"}
                      </button>
                      {f.status === "submitted" && (
                        <button style={S.btn()} onClick={() => window.open(`/forms/control/${f.id}/print`, "_blank")}>
                          Print
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
