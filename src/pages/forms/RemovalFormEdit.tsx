import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useRemovalFormApi, useEquipmentApi, useAgencyApi } from "../../api/client";

const S = {
  card: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 24, marginBottom: 20 } as React.CSSProperties,
  h2: { fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 16px", paddingBottom: 8, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4, display: "block" } as React.CSSProperties,
  val: { fontSize: 14, color: "#0f172a", marginBottom: 16 } as React.CSSProperties,
  input: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" as const } as React.CSSProperties,
  select: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" as const, cursor: "pointer", background: "#fff" } as React.CSSProperties,
  textarea: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: 72 } as React.CSSProperties,
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" } as React.CSSProperties,
  btnP: { padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff" } as React.CSSProperties,
  btnS: { padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" } as React.CSSProperties,
  btnG: { padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#10b981", color: "#fff" } as React.CSSProperties,
};

export default function RemovalFormEdit() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const api = useRemovalFormApi();
  const equipmentApi = useEquipmentApi();
  const agencyApi = useAgencyApi();
  const isNew = !id || id === "new";

  const [form, setForm] = useState({
    form_number: "",
    equipment_id: searchParams.get("equipmentId") || "",
    action_type: "removal" as "removal" | "transfer",
    date_of_action: "",
    removal_reason: "",
    disposal_method: "",
    transfer_to_entity: "",
    transfer_to_agency_id: "",
    prior_location: "",
    poc_name: "",
    poc_title: "",
    poc_phone: "",
    poc_email: "",
    authorized_by_name: "",
    authorized_by_title: "",
    authorized_date: "",
    notes: "",
  });
  const [error, setError] = useState("");

  // Load existing form
  const { data: existing, isLoading } = useQuery({
    queryKey: ["removal-form", id],
    queryFn: () => api.getFormById(id!),
    enabled: !isNew,
  });

  // Equipment data for pre-population
  const equipmentId = form.equipment_id || existing?.equipment_id || "";
  const { data: eq } = useQuery({
    queryKey: ["equipment-detail", equipmentId],
    queryFn: () => equipmentApi.getEquipmentById(equipmentId),
    enabled: !!equipmentId,
  });

  // All equipment to pick from (if no equipmentId pre-filled)
  const { data: allEquipment = [] } = useQuery({
    queryKey: ["equipment-list-for-form"],
    queryFn: () => equipmentApi.getEquipment(),
    enabled: isNew && !form.equipment_id,
  });

  // Agencies for transfer target
  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => agencyApi.getAgencies(),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        form_number: existing.form_number || "",
        equipment_id: existing.equipment_id || "",
        action_type: existing.action_type || "removal",
        date_of_action: existing.date_of_action ? existing.date_of_action.substring(0, 10) : "",
        removal_reason: existing.removal_reason || "",
        disposal_method: existing.disposal_method || "",
        transfer_to_entity: existing.transfer_to_entity || "",
        transfer_to_agency_id: existing.transfer_to_agency_id || "",
        prior_location: existing.prior_location || "",
        poc_name: existing.poc_name || "",
        poc_title: existing.poc_title || "",
        poc_phone: existing.poc_phone || "",
        poc_email: existing.poc_email || "",
        authorized_by_name: existing.authorized_by_name || "",
        authorized_by_title: existing.authorized_by_title || "",
        authorized_date: existing.authorized_date ? existing.authorized_date.substring(0, 10) : "",
        notes: existing.notes || "",
      });
    }
  }, [existing]);

  // When equipment is selected for a new form, pre-populate location/contact
  useEffect(() => {
    if (eq && isNew) {
      setForm(f => ({
        ...f,
        prior_location: f.prior_location || eq.location_name || "",
        poc_name: f.poc_name || eq.assigned_to || "",
        poc_phone: f.poc_phone || eq.contact_phone || "",
        poc_email: f.poc_email || eq.contact_email || "",
        authorized_by_name: f.authorized_by_name || user?.name || "",
      }));
    }
  }, [eq]);

  const saveMut = useMutation({
    mutationFn: (status: "draft" | "submitted") => {
      if (!form.equipment_id) throw new Error("Equipment is required");
      const body = { ...form, status };
      if (isNew) return api.createForm(body);
      return api.updateForm(id!, body);
    },
    onSuccess: (data: any, status) => {
      qc.invalidateQueries({ queryKey: ["removal-forms"] });
      if (status === "submitted" && data?.id) {
        window.open(`/forms/removal/${data.id || id}/print`, "_blank");
      }
      navigate("/forms/removal");
    },
    onError: (e: any) => setError(e.message),
  });

  if (!user) return null;
  if (!isNew && isLoading) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>;

  const isSubmitted = existing?.status === "submitted" && user.role !== "SystemAdmin";
  const canEdit = !isSubmitted;
  const isTransfer = form.action_type === "transfer";
  const title = isNew ? "New Removal / Transfer Form" : `Removal Form — ${existing?.form_number || ""}`;

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <label style={S.label}>{label}</label>
      <input style={S.input} type={type} placeholder={placeholder}
        value={form[key] as string}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        readOnly={!canEdit} />
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <button style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13, padding: 0 }} onClick={() => navigate("/forms/removal")}>
          ← Back to Removal Forms
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{title}</h1>
          {isSubmitted && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: "#d1fae5", color: "#065f46" }}>Submitted — read only</span>
          )}
        </div>
        {existing?.status === "submitted" && (
          <button style={S.btnS} onClick={() => window.open(`/forms/removal/${id}/print`, "_blank")}>Print / PDF</button>
        )}
      </div>

      {/* Section 1: Form Header & Equipment */}
      <div style={S.card}>
        <h2 style={S.h2}>Section 1 — Equipment & Form Details</h2>
        <div style={S.grid2}>
          <div>
            <label style={S.label}>Form Number</label>
            <input style={S.input} value={form.form_number} readOnly={!canEdit}
              onChange={e => setForm({ ...form, form_number: e.target.value })} placeholder="Auto-generated if blank" />
          </div>
          <div>
            <label style={S.label}>Date of Action *</label>
            <input style={S.input} type="date" value={form.date_of_action} readOnly={!canEdit}
              onChange={e => setForm({ ...form, date_of_action: e.target.value })} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={S.label}>Equipment *</label>
          {eq ? (
            <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{eq.name}</span>
              {eq.serial_number && <span style={{ color: "#94a3b8", marginLeft: 10, fontSize: 12 }}>SN: {eq.serial_number}</span>}
              <span style={{ color: "#64748b", marginLeft: 10 }}>— {eq.agency_name}</span>
              {isNew && canEdit && (
                <button style={{ marginLeft: 12, background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 12 }}
                  onClick={() => setForm({ ...form, equipment_id: "" })}>Change</button>
              )}
            </div>
          ) : (
            canEdit ? (
              <select style={S.select} value={form.equipment_id}
                onChange={e => setForm({ ...form, equipment_id: e.target.value })}>
                <option value="">Select equipment…</option>
                {allEquipment.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.name}{e.serial_number ? ` (SN: ${e.serial_number})` : ""}</option>
                ))}
              </select>
            ) : <div style={S.val}>—</div>
          )}
        </div>
      </div>

      {/* Section 2: Action Type */}
      <div style={S.card}>
        <h2 style={S.h2}>Section 2 — Action Type</h2>
        <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
          {(["removal", "transfer"] as const).map(type => (
            <label key={type} style={{ display: "flex", alignItems: "center", gap: 8, cursor: canEdit ? "pointer" : "default", fontSize: 14 }}>
              <input type="radio" name="action_type" value={type} checked={form.action_type === type} disabled={!canEdit}
                onChange={() => setForm({ ...form, action_type: type })} />
              {type === "removal" ? "Removal (Permanent / Disposal)" : "Transfer (to Another Entity)"}
            </label>
          ))}
        </div>

        {!isTransfer && (
          <div style={S.grid2}>
            <div>
              <label style={S.label}>Removal Reason</label>
              <select style={S.select} value={form.removal_reason}
                onChange={e => setForm({ ...form, removal_reason: e.target.value })}
                disabled={!canEdit}>
                <option value="">Select reason…</option>
                <option value="surplus">Surplus</option>
                <option value="damage">Damage / Inoperable</option>
                <option value="end-of-life">End of Life / Obsolete</option>
                <option value="loss">Loss</option>
                <option value="theft">Theft</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Disposal Method</label>
              <select style={S.select} value={form.disposal_method}
                onChange={e => setForm({ ...form, disposal_method: e.target.value })}
                disabled={!canEdit}>
                <option value="">Select method…</option>
                <option value="auction">Public Auction</option>
                <option value="destruction">Destruction / Scrap</option>
                <option value="donation">Donation</option>
                <option value="trade-in">Trade-In</option>
                <option value="returned-to-vendor">Returned to Vendor</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}

        {isTransfer && (
          <div style={S.grid2}>
            <div>
              <label style={S.label}>Transfer To (Entity Name)</label>
              <input style={S.input} value={form.transfer_to_entity} readOnly={!canEdit}
                onChange={e => setForm({ ...form, transfer_to_entity: e.target.value })}
                placeholder="Receiving organization name" />
            </div>
            <div>
              <label style={S.label}>Receiving Agency (if in system)</label>
              <select style={S.select} value={form.transfer_to_agency_id}
                onChange={e => setForm({ ...form, transfer_to_agency_id: e.target.value })}
                disabled={!canEdit}>
                <option value="">External / none</option>
                {agencies.filter((a: any) => a.id !== eq?.agency_id).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Location & Point of Contact */}
      <div style={S.card}>
        <h2 style={S.h2}>Section 3 — Location & Point of Contact</h2>
        <div style={S.grid2}>
          {field("Prior Physical Location", "prior_location")}
          {field("Point of Contact Name", "poc_name")}
          {field("Title / Role", "poc_title")}
          {field("Phone", "poc_phone", "tel")}
          {field("Email", "poc_email", "email")}
        </div>
      </div>

      {/* Section 4: Authorization */}
      <div style={S.card}>
        <h2 style={S.h2}>Section 4 — Authorization</h2>
        <div style={S.grid2}>
          {field("Authorized By (Name)", "authorized_by_name")}
          {field("Title / Role", "authorized_by_title")}
          {field("Authorization Date", "authorized_date", "date")}
        </div>
      </div>

      {/* Section 5: Notes */}
      <div style={S.card}>
        <h2 style={S.h2}>Section 5 — Notes</h2>
        <label style={S.label}>Additional Notes</label>
        <textarea style={S.textarea} value={form.notes} readOnly={!canEdit}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="Any additional context, supporting documentation references, etc." />
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {canEdit && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={S.btnP} disabled={saveMut.isPending} onClick={() => saveMut.mutate("draft")}>
            {saveMut.isPending ? "Saving…" : "Save Draft"}
          </button>
          <button style={S.btnG} disabled={saveMut.isPending} onClick={() => {
            if (window.confirm("Submit this form? It will be locked for editing and a print view will open.")) {
              saveMut.mutate("submitted");
            }
          }}>
            Submit & Print
          </button>
          <button style={S.btnS} onClick={() => navigate("/forms/removal")}>Cancel</button>
        </div>
      )}
      {isSubmitted && (
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnP} onClick={() => window.open(`/forms/removal/${id}/print`, "_blank")}>Print / Save as PDF</button>
          <button style={S.btnS} onClick={() => navigate("/forms/removal")}>Back to List</button>
        </div>
      )}
    </div>
  );
}
