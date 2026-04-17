import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTransferApi, useAgencyApi } from "../api/client";

interface Props {
  equipmentId: string;
  equipmentName: string;
  fromAgencyId: string;
  onClose: () => void;
}

export default function TransferRequestModal({ equipmentId, equipmentName, fromAgencyId, onClose }: Props) {
  const transferApi = useTransferApi();
  const agencyApi = useAgencyApi();
  const qc = useQueryClient();

  const [requestType, setRequestType] = useState<"transfer" | "borrow">("transfer");
  const [toAgencyId, setToAgencyId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => agencyApi.getAgencies(),
  });

  const otherAgencies = agencies.filter((a: any) => a.id !== fromAgencyId);

  const mutation = useMutation({
    mutationFn: () => transferApi.createTransfer({
      equipment_id: equipmentId,
      request_type: requestType,
      to_agency_id: toAgencyId,
      notes: notes || undefined,
      expected_return_date: requestType === "borrow" ? expectedReturnDate : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] });
      onClose();
    },
  });

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  };
  const modal: React.CSSProperties = {
    background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  };
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" };
  const input: React.CSSProperties = { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" };
  const select: React.CSSProperties = { ...input, background: "#fff", cursor: "pointer" };
  const btnP: React.CSSProperties = { padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff" };
  const btnS: React.CSSProperties = { padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" };

  const canSubmit = !!toAgencyId && (requestType === "transfer" || !!expectedReturnDate);

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
          Request Transfer / Borrow
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>{equipmentName}</p>

        {/* Request type toggle */}
        <div style={{ marginBottom: 16 }}>
          <div style={label as React.CSSProperties}>Request Type</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["transfer", "borrow"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRequestType(t)}
                style={{
                  flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", borderRadius: 6,
                  border: requestType === t ? "2px solid #3b82f6" : "1px solid #cbd5e1",
                  background: requestType === t ? "#eff6ff" : "#fff",
                  color: requestType === t ? "#1d4ed8" : "#475569",
                }}
              >
                {t === "transfer" ? "Permanent Transfer" : "Temporary Borrow"}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
            {requestType === "transfer"
              ? "Requires approval from your AgencyAdmin and a SystemAdmin."
              : "Requires approval from your AgencyAdmin only."}
          </p>
        </div>

        {/* To Agency */}
        <div style={{ marginBottom: 16 }}>
          <label style={label}>Receiving Agency</label>
          <select style={select} value={toAgencyId} onChange={(e) => setToAgencyId(e.target.value)}>
            <option value="">Select agency…</option>
            {otherAgencies.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Expected return date — borrow only */}
        {requestType === "borrow" && (
          <div style={{ marginBottom: 16 }}>
            <label style={label}>Expected Return Date</label>
            <input
              type="date"
              style={input}
              value={expectedReturnDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
            />
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Notes (optional)</label>
          <textarea
            style={{ ...input, resize: "vertical", minHeight: 72 } as React.CSSProperties}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for request, deployment details, etc."
          />
        </div>

        {mutation.isError && (
          <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>
            {(mutation.error as Error).message}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={btnS} onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button
            style={{ ...btnP, opacity: canSubmit ? 1 : 0.5 }}
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
