import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useControlFormApi } from "../../api/client";

const ITEMS_PER_PAGE = 5;

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
      .item-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 4px; }
      .item-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 8pt; font-weight: 600; text-align: left; color: #475569; text-transform: uppercase; }
      .item-table td { border: 1px solid #cbd5e1; padding: 5px 8px; height: 28px; vertical-align: top; }
      .meta-row { display: flex; gap: 16px; margin-bottom: 16px; font-size: 9.5pt; }
      .meta-row .field { flex: 1; }
      .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8pt; color: #94a3b8; }
      .continuation-header { font-size: 10pt; font-weight: 700; color: #475569; margin-bottom: 8px; padding: 6px 10px; background: #f1f5f9; border-radius: 4px; }
      @media print {
        .print-bar { display: none; }
        body { font-size: 10pt; }
        .page { padding: 0; max-width: none; }
        .section-title { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .item-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-break { page-break-before: always; }
      }
    `}</style>
  );
}

function ItemChunk({ items, startIdx }: { items: any[]; startIdx: number }) {
  return (
    <table className="item-table">
      <thead>
        <tr>
          <th style={{ width: "4%" }}>#</th>
          <th style={{ width: "18%" }}>Item Name</th>
          <th style={{ width: "10%" }}>Category</th>
          <th style={{ width: "5%" }}>Qty</th>
          <th style={{ width: "10%" }}>Serial #</th>
          <th style={{ width: "10%" }}>Tag #</th>
          <th style={{ width: "12%" }}>Make / Model</th>
          <th style={{ width: "6%" }}>Year</th>
          <th style={{ width: "8%" }}>Unit Price</th>
          <th style={{ width: "10%" }}>Condition</th>
          <th style={{ width: "7%" }}>Discrep.</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any, i: number) => (
          <tr key={i}>
            <td>{startIdx + i + 1}</td>
            <td>{item.item_name}</td>
            <td>{item.category || ""}</td>
            <td style={{ textAlign: "center" }}>{item.quantity}</td>
            <td>{item.serial_number || ""}</td>
            <td>{item.tag_number || ""}</td>
            <td>{item.make_model || ""}</td>
            <td>{item.year || ""}</td>
            <td>{item.unit_price != null ? `$${Number(item.unit_price).toFixed(2)}` : ""}</td>
            <td>{item.condition_at_receipt || ""}</td>
            <td style={{ textAlign: "center" }}>{item.discrepancy_noted ? "Yes" : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ControlFormPrint() {
  const { id } = useParams();
  const api = useControlFormApi();

  const { data: form, isLoading, error } = useQuery({
    queryKey: ["control-form-print", id],
    queryFn: () => api.getFormById(id!),
    enabled: !!id,
  });

  if (isLoading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading form…</div>;
  if (error || !form) return <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>Form not found.</div>;

  const items: any[] = form.items || [];
  const chunks: any[][] = [];
  for (let i = 0; i < Math.max(items.length, 1); i += ITEMS_PER_PAGE) {
    chunks.push(items.slice(i, i + ITEMS_PER_PAGE));
  }
  // Discrep notes
  const discrepItems = items.filter((i: any) => i.discrepancy_noted && i.discrepancy_notes);

  const fd = (val: any) => val ? String(val) : "";
  const fDate = (val: any) => val ? new Date(val).toLocaleDateString() : "";

  return (
    <>
      <PrintStyles />
      <div className="print-bar">
        <span>Inventory Control Form — {form.form_number}</span>
        <button onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="page">
        <div className="header">
          <div className="logo-placeholder">Agency<br />Logo</div>
          <div className="title-block">
            <h1>Inventory Control Form</h1>
            <p>Emergency Response Equipment Portal — East-West Gateway Council of Governments</p>
          </div>
          <div className="logo-placeholder">Agency<br />Logo</div>
        </div>

        {/* Meta row */}
        <div className="meta-row">
          <div className="field"><label>Form / Request ID</label><div className="value">{fd(form.form_number)}</div></div>
          <div className="field"><label>Date Received</label><div className="value">{fDate(form.received_date)}</div></div>
          <div className="field"><label>Grant Year</label><div className="value">{fd(form.grant_year)}</div></div>
          <div className="field"><label>Status</label><div className="value">{fd(form.status).toUpperCase()}</div></div>
        </div>

        {/* Section 1: Vendor / Procurement */}
        <div className="section">
          <div className="section-title">Section 1 — Vendor &amp; Procurement</div>
          <div className="grid-2">
            <div className="field"><label>Vendor Name</label><div className="value">{fd(form.vendor_name)}</div></div>
            <div className="field"><label>Vendor Contact</label><div className="value">{fd(form.vendor_contact)}</div></div>
            <div className="field"><label>PO Number</label><div className="value">{fd(form.po_number)}</div></div>
            <div className="field"><label>Invoice Number</label><div className="value">{fd(form.invoice_number)}</div></div>
          </div>
        </div>

        {/* Section 2: Receiving */}
        <div className="section">
          <div className="section-title">Section 2 — Receiving Information</div>
          <div className="grid-2">
            <div className="field"><label>Received By (Name)</label><div className="value">{fd(form.received_by_name)}</div></div>
            <div className="field"><label>Title / Role</label><div className="value">{fd(form.received_by_title)}</div></div>
            <div className="field"><label>Date Received</label><div className="value">{fDate(form.received_date)}</div></div>
            <div className="field"><label>Receiving Location</label><div className="value">{fd(form.receiving_location)}</div></div>
          </div>
        </div>

        {/* Section 3: Equipment Line Items (first chunk) */}
        <div className="section">
          <div className="section-title">Section 3 — Equipment Line Items {chunks.length > 1 ? `(Page 1 of ${chunks.length})` : ""}</div>
          <ItemChunk items={chunks[0] || []} startIdx={0} />
        </div>

        {/* Section 4: Discrepancies */}
        {(form.discrepancies || discrepItems.length > 0) && (
          <div className="section">
            <div className="section-title">Section 4 — Discrepancies</div>
            {form.discrepancies && (
              <div style={{ marginBottom: 10 }}>
                <div className="field"><label>Overall Discrepancies</label><div className="tall-value">{form.discrepancies}</div></div>
              </div>
            )}
            {discrepItems.map((item: any, i: number) => (
              <div key={i} className="field" style={{ marginBottom: 8 }}>
                <label>Item {item.line_number} — {item.item_name}</label>
                <div className="tall-value">{item.discrepancy_notes}</div>
              </div>
            ))}
          </div>
        )}

        {/* Section 5: Notes & Signatures */}
        <div className="section">
          <div className="section-title">Section 5 — Notes &amp; Authorization</div>
          {form.notes && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Notes</label>
              <div className="tall-value">{form.notes}</div>
            </div>
          )}
          <div className="grid-2" style={{ marginTop: 12 }}>
            <div className="field"><label>Prepared By</label><div className="value" style={{ minHeight: 36 }}>{fd(form.created_by_name)}</div></div>
            <div className="field"><label>Date Submitted</label><div className="value">{fDate(form.submitted_at)}</div></div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Signature</label>
            <div className="value" style={{ minHeight: 40 }}></div>
          </div>
        </div>

        <div className="footer">
          <span>Emergency Response Equipment Portal — East-West Gateway Council of Governments</span>
          <span>Form version 1.0 — {fd(form.form_number)}</span>
        </div>
      </div>

      {/* Continuation pages for additional item chunks */}
      {chunks.slice(1).map((chunk, chunkIdx) => (
        <div key={chunkIdx} className="page page-break">
          <div className="continuation-header">
            Inventory Control Form — {form.form_number} — Continuation (Page {chunkIdx + 2} of {chunks.length})
          </div>
          <div className="section">
            <div className="section-title">Section 3 (cont.) — Equipment Line Items</div>
            <ItemChunk items={chunk} startIdx={(chunkIdx + 1) * ITEMS_PER_PAGE} />
          </div>
          <div className="footer">
            <span>Emergency Response Equipment Portal — East-West Gateway Council of Governments</span>
            <span>Continuation — {fd(form.form_number)}</span>
          </div>
        </div>
      ))}
    </>
  );
}
