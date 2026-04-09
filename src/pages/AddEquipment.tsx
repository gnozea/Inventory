import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
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
    headers: { Authorization: `Bearer ${tok.accessToken}`, "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error(`API ${path} → ${res.status}: ${b}`); }
  return res.json();
}

const S = {
  card: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 24, marginBottom: 20 } as React.CSSProperties,
  h2: { fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px", paddingBottom: 8, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" } as React.CSSProperties,
  input: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
  select: { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box", cursor: "pointer", background: "#fff" } as React.CSSProperties,
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" } as React.CSSProperties,
  btnP: { padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff" } as React.CSSProperties,
  btnS: { padding: "10px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" } as React.CSSProperties,
};

export default function AddEquipment() {
  const { user } = useCurrentUser();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  const canAdd = user?.role === "SystemAdmin" || user?.role === "AgencyAdmin" || user?.role === "AgencyUser";
  if (!canAdd) return <AccessDenied />;

  const [form, setForm] = useState({
    name: "", serial_number: "", category: "", assigned_to: "",
    purchase_date: "", contact_phone: "", contact_email: "",
    location_id: "",
  });
  const [error, setError] = useState("");

  // Fetch reference data for categories
  const { data: refData } = useQuery({
    queryKey: ["ref-data-add"],
    queryFn: () => apiFetch(instance, accounts[0], "/reference-data"),
  });
  const categories = (refData?.value || []).filter((r: any) => r.type === "category");

  // Fetch locations
  const { data: eqData } = useQuery({
    queryKey: ["equipment-for-locations"],
    queryFn: () => apiFetch(instance, accounts[0], "/equipment"),
  });
  // Extract unique locations from equipment data
  const locations = (() => {
    const items = eqData?.value || eqData || [];
    const map = new Map<string, { id: string; name: string }>();
    if (Array.isArray(items)) {
      items.forEach((e: any) => {
        if (e.location_id && e.location_name && !map.has(e.location_id)) {
          map.set(e.location_id, { id: e.location_id, name: e.location_name });
        }
      });
    }
    return Array.from(map.values());
  })();

  const createMut = useMutation({
    mutationFn: (body: any) => apiFetch(instance, accounts[0], "/equipment", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      navigate(`/equipment/${data?.id || ""}`);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim()) { setError("Equipment name is required"); return; }
    if (!form.category) { setError("Category is required"); return; }
    setError("");
    createMut.mutate({
      name: form.name.trim(),
      serial_number: form.serial_number.trim() || null,
      category: form.category,
      status: 1, // Active
      agency_id: user?.agencyId,
      location_id: form.location_id || null,
      assigned_to: form.assigned_to.trim() || null,
      purchase_date: form.purchase_date || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
    });
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 20 }}>
        <button style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13, padding: 0 }} onClick={() => navigate("/equipment")}>← Back to Equipment</button>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>Add Equipment</h1>

      <div style={S.card}>
        <h2 style={S.h2}>Equipment Details</h2>
        <div style={S.grid2}>
          <div>
            <div style={S.label}>Name *</div>
            <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Thermal Camera TC-5" />
          </div>
          <div>
            <div style={S.label}>Serial Number</div>
            <input style={S.input} value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} placeholder="e.g. SN-12345" />
          </div>
          <div>
            <div style={S.label}>Category *</div>
            <select style={S.select} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category…</option>
              {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
              {categories.length === 0 && <>
                <option value="Vehicle">Vehicle</option>
                <option value="PPE">PPE</option>
                <option value="Communication">Communication</option>
                <option value="Medical">Medical</option>
                <option value="Detection">Detection</option>
                <option value="Rescue">Rescue</option>
                <option value="Electronics">Electronics</option>
                <option value="Shelter">Shelter</option>
              </>}
            </select>
          </div>
          <div>
            <div style={S.label}>Location</div>
            <select style={S.select} value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
              <option value="">Select location…</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <div style={S.label}>Assigned To</div>
            <input style={S.input} value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="e.g. Squad 7" />
          </div>
          <div>
            <div style={S.label}>Purchase Date</div>
            <input style={{ ...S.input, cursor: "pointer" }} type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
          </div>
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Contact Information</h2>
        <div style={S.grid2}>
          <div>
            <div style={S.label}>Contact Phone</div>
            <input style={S.input} value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="(314) 555-0100" />
          </div>
          <div>
            <div style={S.label}>Contact Email</div>
            <input style={S.input} type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="ops@agency.gov" />
          </div>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "flex", gap: 12 }}>
        <button style={S.btnP} disabled={createMut.isPending} onClick={handleSubmit}>
          {createMut.isPending ? "Creating…" : "Add Equipment"}
        </button>
        <button style={S.btnS} onClick={() => navigate("/equipment")}>Cancel</button>
      </div>
    </div>
  );
}
