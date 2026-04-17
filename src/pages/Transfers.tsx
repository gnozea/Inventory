import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useTransferApi } from "../api/client";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:        { bg: "#fef3c7", color: "#92400e" },
  agency_approved:{ bg: "#dbeafe", color: "#1e40af" },
  approved:       { bg: "#d1fae5", color: "#065f46" },
  denied:         { bg: "#fee2e2", color: "#991b1b" },
  in_transit:     { bg: "#e0e7ff", color: "#3730a3" },
  completed:      { bg: "#f0fdf4", color: "#166534" },
  returned:       { bg: "#f0fdf4", color: "#166534" },
  cancelled:      { bg: "#f1f5f9", color: "#64748b" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || { bg: "#f1f5f9", color: "#64748b" };
  const label = status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: c.bg, color: c.color }}>
      {label}
    </span>
  );
}

const S = {
  card: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 20, marginBottom: 12 } as React.CSSProperties,
  th: { textAlign: "left" as const, padding: "10px 12px", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  td: { padding: "12px 12px", borderBottom: "1px solid #f1f5f9", color: "#1e293b", fontSize: 13 } as React.CSSProperties,
  btn: (primary = false) => ({
    padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 6,
    border: primary ? "none" : "1px solid #cbd5e1",
    background: primary ? "#3b82f6" : "#fff",
    color: primary ? "#fff" : "#334155",
  } as React.CSSProperties),
  btnDanger: { padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "1px solid #fecaca", background: "#fff", color: "#ef4444" } as React.CSSProperties,
};

export default function Transfers() {
  const { user } = useCurrentUser();
  const transferApi = useTransferApi();
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [denyModalId, setDenyModalId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["transfers", statusFilter, typeFilter],
    queryFn: () => transferApi.getTransfers({
      status: statusFilter || undefined,
      type: typeFilter || undefined,
    }),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => transferApi.approveTransfer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transfers"] }),
  });

  const denyMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => transferApi.denyTransfer(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transfers"] }); setDenyModalId(null); setDenyReason(""); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => transferApi.updateTransferStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transfers"] }),
  });

  if (!user) return null;

  const isSystemAdmin = user.role === "SystemAdmin";
  const isAgencyAdmin = user.role === "AgencyAdmin";
  const canApprove = isSystemAdmin || isAgencyAdmin;

  function getActions(tr: any) {
    const actions: React.ReactNode[] = [];

    if (canApprove) {
      // Approve button
      const pendingApprover =
        isSystemAdmin ||
        (isAgencyAdmin && tr.from_agency_id === user.agencyId);
      if (tr.status === "pending" && pendingApprover) {
        const label =
          tr.request_type === "borrow"
            ? "Approve"
            : isSystemAdmin
            ? "Approve (Both Stages)"
            : "Agency Approve";
        actions.push(
          <button key="approve" style={S.btn(true)} onClick={() => approveMut.mutate(tr.id)} disabled={approveMut.isPending}>
            {label}
          </button>
        );
      }
      if (tr.status === "agency_approved" && isSystemAdmin) {
        actions.push(
          <button key="approve" style={S.btn(true)} onClick={() => approveMut.mutate(tr.id)} disabled={approveMut.isPending}>
            Final Approve
          </button>
        );
      }
      // Deny button
      if (["pending", "agency_approved"].includes(tr.status)) {
        const canDenyThis =
          isSystemAdmin ||
          (isAgencyAdmin && tr.from_agency_id === user.agencyId);
        if (canDenyThis) {
          actions.push(
            <button key="deny" style={S.btnDanger} onClick={() => setDenyModalId(tr.id)}>Deny</button>
          );
        }
      }
    }

    // Logistics transitions (anyone involved in agency, or SystemAdmin)
    const isInvolved = isSystemAdmin || tr.from_agency_id === user.agencyId || tr.to_agency_id === user.agencyId;
    if (isInvolved) {
      if (tr.status === "approved") {
        actions.push(
          <button key="transit" style={S.btn()} onClick={() => statusMut.mutate({ id: tr.id, status: "in_transit" })} disabled={statusMut.isPending}>
            Mark In Transit
          </button>
        );
      }
      if (tr.status === "in_transit") {
        const nextStatus = tr.request_type === "borrow" ? "returned" : "completed";
        actions.push(
          <button key="done" style={S.btn(true)} onClick={() => statusMut.mutate({ id: tr.id, status: nextStatus })} disabled={statusMut.isPending}>
            {nextStatus === "returned" ? "Mark Returned" : "Mark Completed"}
          </button>
        );
      }
    }

    return actions;
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Transfers & Borrows</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Track equipment transfer and borrow requests across agencies</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: "7px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          <option value="">All Types</option>
          <option value="transfer">Transfers</option>
          <option value="borrow">Borrows</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "7px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="agency_approved">Agency Approved</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="in_transit">In Transit</option>
          <option value="completed">Completed</option>
          <option value="returned">Returned</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</div>
      ) : transfers.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48, color: "#94a3b8" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>↔</div>
          <p style={{ margin: 0, fontSize: 14 }}>No transfer or borrow requests found.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={S.th}>Equipment</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>From → To</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Requested By</th>
                <th style={S.th}>Date</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((tr: any) => (
                <tr key={tr.id} style={{ background: "#fff" }}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{tr.equipment_name}</div>
                    {tr.serial_number && <div style={{ fontSize: 11, color: "#94a3b8" }}>SN: {tr.serial_number}</div>}
                  </td>
                  <td style={S.td}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: tr.request_type === "borrow" ? "#fef3c7" : "#e0e7ff", color: tr.request_type === "borrow" ? "#92400e" : "#3730a3" }}>
                      {tr.request_type === "borrow" ? "Borrow" : "Transfer"}
                    </span>
                  </td>
                  <td style={S.td}>
                    <span style={{ color: "#475569" }}>{tr.from_agency_name}</span>
                    <span style={{ color: "#94a3b8", margin: "0 6px" }}>→</span>
                    <span style={{ color: "#475569" }}>{tr.to_agency_name}</span>
                    {tr.request_type === "borrow" && tr.expected_return_date && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        Return by: {new Date(tr.expected_return_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={S.td}><StatusBadge status={tr.status} /></td>
                  <td style={{ ...S.td, color: "#64748b" }}>{tr.requested_by_name}</td>
                  <td style={{ ...S.td, color: "#64748b", fontSize: 12 }}>
                    {new Date(tr.created_at).toLocaleDateString()}
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {getActions(tr)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deny modal */}
      {denyModalId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Deny Request</h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>Optionally provide a reason for the denial.</p>
            <textarea
              style={{ padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 80 } as React.CSSProperties}
              placeholder="Reason (optional)"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
            />
            {denyMut.isError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{(denyMut.error as Error).message}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button style={S.btn()} onClick={() => { setDenyModalId(null); setDenyReason(""); }} disabled={denyMut.isPending}>Cancel</button>
              <button style={S.btnDanger} onClick={() => denyMut.mutate({ id: denyModalId, reason: denyReason })} disabled={denyMut.isPending}>
                {denyMut.isPending ? "Denying…" : "Confirm Deny"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
