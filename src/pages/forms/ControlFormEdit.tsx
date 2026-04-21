import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useControlFormApi, useEquipmentApi } from "../../api/client";

const S = {
  card: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 24, marginBottom: 20 } as React.CSSProperties,
  h2: { fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 16px", paddingBottom: 8, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4, display: "block" } as React.CSSProperties,
  input: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" as const } as React.CSSProperties,
  select: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" as const, cursor: "pointer", background: "#fff" } as React.CSSProperties,
  textarea: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: 72 } as React.CSSProperties,
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" } as React.CSSProperties,
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 24px" } as React.CSSProperties,
  btnP: { padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff" } as React.CSSProperties,
  btnS: { padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" } as React.CSSProperties,
  btnG: { padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#10b981", color: "#fff" } as React.CSSProperties,
};

const BLANK_ITEM = () => ({
  equipment_id: null as string | null,
  item_name: "",
  category: "",
  quantity: 1,
  unit_price: "",
  tag_number: "",
  serial_number: "",
  make_model: "",
  year: "",
  grant_number: "",
  condition_at_receipt: "",
  discrepancy_noted: false,
  discrepancy_notes: "",
});

type Item = ReturnType<typeof BLANK_ITEM>;

export default function ControlFormEdit() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const api = useControlFormApi();
  const equipmentApi = useEquipmentApi();
  const isNew = !id || id === "new";

  const [form, setForm] = useState({
    form_number: "",
    grant_year: "",
    po_number: "",
    vendor_name: "",
    vendor_contact: "",
    invoice_number: "",
    received_date: "",
    received_by_name: "",
    received_by_title: "",
    receiving_location: "",
    discrepancies: "",
    notes: "",
  });
  const [items, setItems] = useState<Item[]>([BLANK_ITEM()]);
  const [error, setError] = useState("");

  // Load existing form for edit mode
  const { data: existing, isLoading } = useQuery({
    queryKey: ["control-form", id],
    queryFn: () => api.getFormById(id!),
    enabled: !isNew,
  });

  // Pre-populate from equipment if equipmentId param given
  const prefillEquipmentId = searchParams.get("equipmentId");
  const { data: prefillEq } = useQuery({
    queryKey: ["equipment-detail", prefillEquipmentId],
    queryFn: () => equipmentApi.getEquipmentById(prefillEquipmentId!),
    enabled: !!prefillEquipmentId && isNew,
  });

  useEffect(() => {
    if (existing) {
      const { items: existingItems, ...header } = existing;
      setForm({
        form_number: header.form_number || "",
        grant_year: header.grant_year || "",
        po_number: header.po_number || "",
        vendor_name: header.vendor_name || "",
        vendor_contact: header.vendor_contact || "",
        invoice_number: header.invoice_number || "",
        received_date: header.received_date ? header.received_date.substring(0, 10) : "",
        received_by_name: header.received_by_name || "",
        received_by_title: header.received_by_title || "",
        receiving_location: header.receiving_location || "",
        discrepancies: header.discrepancies || "",
        notes: header.notes || "",
      });
      setItems(
        existingItems?.length
          ? existingItems.map((i: any) => ({
              equipment_id: i.equipment_id || null,
              item_name: i.item_name || "",
              category: i.category || "",
              quantity: i.quantity ?? 1,
              unit_price: i.unit_price ?? "",
              tag_number: i.tag_number || "",
              serial_number: i.serial_number || "",
              make_model: i.make_model || "",
              year: i.year || "",
              grant_number: i.grant_number || "",
              condition_at_receipt: i.condition_at_receipt || "",
              discrepancy_noted: !!i.discrepancy_noted,
              discrepancy_notes: i.discrepancy_notes || "",
            }))
          : [BLANK_ITEM()]
      );
    }
  }, [existing]);

  useEffect(() => {
    if (prefillEq && isNew) {
      setItems([{
        equipment_id: prefillEq.id,
        item_name: prefillEq.name || "",
        category: prefillEq.category || "",
        quantity: 1,
        unit_price: "",
        tag_number: "",
        serial_number: prefillEq.serial_number || "",
        make_model: "",
        year: prefillEq.purchase_date ? new Date(prefillEq.purchase_date).getFullYear().toString() : "",
        grant_number: "",
        condition_at_receipt: "",
        discrepancy_noted: false,
        discrepancy_notes: "",
      }]);
      setForm(f => ({
        ...f,
        received_by_name: user?.name || "",
        receiving_location: prefillEq.location_name || "",
      }));
    }
  }, [prefillEq]);

  const saveMut = useMutation({
    mutationFn: (status: "draft" | "submitted") => {
      const body = { ...form, status, items: items.filter(i => i.item_name.trim()) };
      if (isNew) return api.createForm(body);
      return api.updateForm(id!, body);
    },
    onSuccess: (data: any, status) => {
      qc.invalidateQueries({ queryKey: ["control-forms"] });
      if (status === "submitted" && data?.id) {
        window.open(`/forms/control/${data.id || id}/print`, "_blank");
      }
      navigate("/forms/control");
    },
    onError: (e: any) => setError(e.message),
  });

  if (!user) return null;
  if (!isNew && isLoading) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>;

  const isSubmitted = existing?.status === "submitted" && user.role !== "SystemAdmin";
  const canEdit = !isSubmitted;
  const title = isNew ? "New Inventory Control Form" : `Control Form — ${existing?.form_number || ""}`;

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const addItem = () => setItems([...items, BLANK_ITEM()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const fieldSet = (label: string, key: keyof typeof form, type: string = "text") => (
    <div>
      <label style={S.label}>{label}</label>
      <input
        style={S.input}
        type={type}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        readOnly={!canEdit}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 20 }}>
        <button style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13, padding: 0 }} onClick={() => navigate("/forms/control")}>
          ← Back to Control Forms
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
          <button style={S.btnS} onClick={() => window.open(`/forms/control/${id}/print`, "_blank")}>
            Print / PDF
          </button>
        )}
      </div>

      {/* Section 1: Form Header */}
      <div style={S.card}>
        <h2 style={S.h2}>Section 1 — Form Header</h2>
        <div style={S.grid2}>
          {fieldSet("Form Number", "form_number")}
          {fieldSet("Grant Year", "grant_year")}
          {fieldSet("PO Number", "po_number")}
          {fieldSet("Invoice Number", "invoice_number")}
          {fieldSet("Vendor Name", "vendor_name")}
          {fieldSet("Vendor Contact", "vendor_contact")}
        </div>
      </div>

      {/* Section 2: Line Items */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ ...S.h2, margin: 0, border: "none", paddingBottom: 0 }}>Section 2 — Equipment Line Items</h2>
          {canEdit && (
            <button style={S.btnS} onClick={addItem}>+ Add Item</button>
          )}
        </div>

        {items.map((item, idx) => (
          <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, marginBottom: 12, background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Line Item {idx + 1}
              </span>
              {canEdit && items.length > 1 && (
                <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>× Remove</button>
              )}
            </div>

            <div style={S.grid3}>
              <div>
                <label style={S.label}>Item Name *</label>
                <input style={S.input} value={item.item_name} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { item_name: e.target.value })} placeholder="Equipment name" />
              </div>
              <div>
                <label style={S.label}>Category</label>
                <input style={S.input} value={item.category} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { category: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Quantity</label>
                <input style={S.input} type="number" min={1} value={item.quantity} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <label style={S.label}>Serial Number</label>
                <input style={S.input} value={item.serial_number} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { serial_number: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Property / Tag Number</label>
                <input style={S.input} value={item.tag_number} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { tag_number: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Make / Model</label>
                <input style={S.input} value={item.make_model} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { make_model: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Year</label>
                <input style={S.input} value={item.year} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { year: e.target.value })} placeholder="e.g. 2023" />
              </div>
              <div>
                <label style={S.label}>Unit Price ($)</label>
                <input style={S.input} type="number" step="0.01" value={item.unit_price} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { unit_price: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label style={S.label}>Grant Number</label>
                <input style={S.input} value={item.grant_number} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { grant_number: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Condition at Receipt</label>
                <select style={S.select} value={item.condition_at_receipt}
                  onChange={e => updateItem(idx, { condition_at_receipt: e.target.value })}
                  disabled={!canEdit}>
                  <option value="">Select…</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                <input type="checkbox" id={`disc-${idx}`} checked={item.discrepancy_noted} disabled={!canEdit}
                  onChange={e => updateItem(idx, { discrepancy_noted: e.target.checked })} />
                <label htmlFor={`disc-${idx}`} style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>Discrepancy noted</label>
              </div>
            </div>
            {item.discrepancy_noted && (
              <div style={{ marginTop: 12 }}>
                <label style={S.label}>Discrepancy Notes</label>
                <textarea style={S.textarea} value={item.discrepancy_notes} readOnly={!canEdit}
                  onChange={e => updateItem(idx, { discrepancy_notes: e.target.value })} placeholder="Describe the discrepancy…" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Section 3: Receiving Info */}
      <div style={S.card}>
        <h2 style={S.h2}>Section 3 — Receiving Information</h2>
        <div style={S.grid2}>
          {fieldSet("Received Date", "received_date", "date")}
          {fieldSet("Receiving Location", "receiving_location")}
          {fieldSet("Received By (Name)", "received_by_name")}
          {fieldSet("Received By (Title)", "received_by_title")}
        </div>
      </div>

      {/* Section 4: Notes */}
      <div style={S.card}>
        <h2 style={S.h2}>Section 4 — Notes & Discrepancies</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Overall Discrepancies</label>
          <textarea style={S.textarea} value={form.discrepancies} readOnly={!canEdit}
            onChange={e => setForm({ ...form, discrepancies: e.target.value })} placeholder="Describe any delivery discrepancies, missing items, or damage…" />
        </div>
        <div>
          <label style={S.label}>Additional Notes</label>
          <textarea style={S.textarea} value={form.notes} readOnly={!canEdit}
            onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any other relevant notes…" />
        </div>
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
          <button style={S.btnS} onClick={() => navigate("/forms/control")}>Cancel</button>
        </div>
      )}
      {isSubmitted && (
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnP} onClick={() => window.open(`/forms/control/${id}/print`, "_blank")}>Print / Save as PDF</button>
          <button style={S.btnS} onClick={() => navigate("/forms/control")}>Back to List</button>
        </div>
      )}
    </div>
  );
}
