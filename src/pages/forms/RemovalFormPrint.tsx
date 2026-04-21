import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRemovalFormApi } from "../../api/client";

function PrintStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a; background: #fff; }
      .print-bar { position: sticky; top: 0; background: #1e293b; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 10; }
      .print-bar span { color: #94a3b8; font-size: 12px; }
      .print-bar button { padding: 7px 18px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
      .page { max-width: 820px; margin: 0 auto; padding: 24px; }
      .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px; }
      .logo-placeholder { width: 110px; height: 52px; border: 1.5px dashed #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #94a3b8; text-align: center; padding: 4px; }
      .title-block { text-align: center; flex: 1; padding: 0 16px; }
      .title-block h1 { font-size: 14pt; font-weight: 700; color: #0f172a; line-height: 1.3; }
      .title-block p { font-size: 9pt; color: #64748b; margin-top: 4px; }
      .section { margin-bottom: 16px; }
      .section-title { background: #1e293b; color: #fff; font-size: 9.5pt; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; padding: 5px 10px; margin-bottom: 10px; border-radius: 3px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
      .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 20px; }
      .field label { display: block; font-size: 8pt; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
      .field .value { border-bottom: 1px solid #475569; min-height: 22px; font-size: 10.5pt; padding: 2px 0; }
      .field .tall-value { border: 1px solid #475569; min-height: 52px; padding: 4px; border-radius: 2px; font-size: 10.5pt; white-space: pre-wrap; }
      .cb-row { display: flex; gap: 24px; align-items: center; margin: 6px 0; }
      .cb-row label { font-size: 10.5pt; display: flex; align-items: center; gap: 7px; }
      .cb { width: 14px; height: 14px; border: 1.5px solid #475569; border-radius: 2px; display: inline-block; flex-shrink: 0; position: relative; }
      .cb.checked::after { content: "✓"; position: absolute; top: -2px; left: 1px; font-size: 12px; color: #0f172a; }
      .meta-row { display: flex; gap: 16px; margin-bottom: 16px; font-size: 9.5pt; }
      .meta-row .field { flex: 1; }
      .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8pt; color: #94a3b8; }
      @media print {
        .print-bar { display: none; }
        body { font-size: 10pt; }
        .page { padding: 0; max-width: none; }
        .section-title { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  );
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <label className="cb-row" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "10.5pt" }}>
      <span className={`cb ${checked ? "checked" : ""}`} />
      {label}
    </label>
  );
}

export default function RemovalFormPrint() {
  const { id } = useParams();
  const api = useRemovalFormApi();

  const { data: form, isLoading, error } = useQuery({
    queryKey: ["removal-form-print", id],
    queryFn: () => api.getFormById(id!),
    enabled: !!id,
  });

  if (isLoading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading form…</div>;
  if (error || !form) return <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>Form not found.</div>;

  const fd = (val: any) => val ? String(val) : "";
  const fDate = (val: any) => val ? new Date(val).toLocaleDateString() : "";
  const fReason = (val: string) => val ? val.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "";
  const isTransfer = form.action_type === "transfer";

  return (
    <>
      <PrintStyles />
      <div className="print-bar">
        <span>Inventory Removal / Transfer Form — {form.form_number}</span>
        <button onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="page">
        <div className="header">
          <div className="logo-placeholder">Agency<br />Logo</div>
          <div className="title-block">
            <h1>Inventory Removal / Transfer<br />Authorization Form</h1>
            <p>Emergency Response Equipment Portal — East-West Gateway Council of Governments</p>
          </div>
          <div className="logo-placeholder">Agency<br />Logo</div>
        </div>

        {/* Meta */}
        <div className="meta-row">
          <div className="field"><label>Form / Request ID</label><div className="value">{fd(form.form_number)}</div></div>
          <div className="field"><label>Date of Action</label><div className="value">{fDate(form.date_of_action)}</div></div>
          <div className="field">
            <label>Action Type</label>
            <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
              <Checkbox checked={!isTransfer} label="Removal" />
              <Checkbox checked={isTransfer} label="Transfer" />
            </div>
          </div>
          <div className="field"><label>Status</label><div className="value">{fd(form.status).toUpperCase()}</div></div>
        </div>

        {/* Section 1: Equipment */}
        <div className="section">
          <div className="section-title">Section 1 — Equipment Details</div>
          <div className="grid-2">
            <div className="field"><label>Equipment Name</label><div className="value">{fd(form.equipment_name)}</div></div>
            <div className="field"><label>Serial Number</label><div className="value">{fd(form.equipment_serial)}</div></div>
            <div className="field"><label>Category</label><div className="value">{fd(form.equipment_category)}</div></div>
            <div className="field"><label>Prior Physical Location</label><div className="value">{fd(form.prior_location)}</div></div>
          </div>
        </div>

        {/* Section 2: Action Details */}
        <div className="section">
          <div className="section-title">
            Section 2 — {isTransfer ? "Transfer Details" : "Removal & Disposal Details"}
          </div>
          {!isTransfer ? (
            <div className="grid-2">
              <div className="field"><label>Removal Reason</label><div className="value">{fReason(form.removal_reason)}</div></div>
              <div className="field"><label>Disposal Method</label><div className="value">{fReason(form.disposal_method)}</div></div>
            </div>
          ) : (
            <div className="grid-2">
              <div className="field"><label>Transfer To (Entity)</label><div className="value">{fd(form.transfer_to_entity)}</div></div>
              <div className="field"><label>Receiving Agency (System)</label><div className="value">{fd(form.transfer_to_agency_name)}</div></div>
            </div>
          )}
        </div>

        {/* Section 3: Point of Contact */}
        <div className="section">
          <div className="section-title">Section 3 — Point of Contact</div>
          <div className="grid-3">
            <div className="field"><label>Name</label><div className="value">{fd(form.poc_name)}</div></div>
            <div className="field"><label>Title / Role</label><div className="value">{fd(form.poc_title)}</div></div>
            <div className="field"><label>Phone</label><div className="value">{fd(form.poc_phone)}</div></div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="field"><label>Email</label><div className="value">{fd(form.poc_email)}</div></div>
          </div>
        </div>

        {/* Section 4: Authorization */}
        <div className="section">
          <div className="section-title">Section 4 — Authorization</div>
          <div className="grid-3">
            <div className="field"><label>Authorized By (Name)</label><div className="value">{fd(form.authorized_by_name)}</div></div>
            <div className="field"><label>Title / Role</label><div className="value">{fd(form.authorized_by_title)}</div></div>
            <div className="field"><label>Date</label><div className="value">{fDate(form.authorized_date)}</div></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="field"><label>Signature</label><div className="value" style={{ minHeight: 40 }}></div></div>
          </div>
        </div>

        {/* Section 5: Notes */}
        {form.notes && (
          <div className="section">
            <div className="section-title">Section 5 — Notes</div>
            <div className="field"><label>Additional Notes</label><div className="tall-value">{form.notes}</div></div>
          </div>
        )}

        {/* Section 6: Transfer notice */}
        {isTransfer && (
          <div className="section">
            <div className="section-title">Section 6 — Transfer Notice</div>
            <p style={{ fontSize: "9.5pt", color: "#475569", lineHeight: 1.6 }}>
              The receiving entity must complete a separate <strong>Inventory Control Form</strong> upon receipt of the transferred equipment.
              This form documents the originating agency's release of the equipment only.
            </p>
          </div>
        )}

        <div className="footer">
          <span>Emergency Response Equipment Portal — East-West Gateway Council of Governments</span>
          <span>Form version 1.0 — {fd(form.form_number)}</span>
        </div>
      </div>
    </>
  );
}
