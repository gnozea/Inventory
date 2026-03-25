import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import AccessDenied from "../components/AccessDenied";

export default function AddEquipment() {
  const user = useCurrentUser();
  const navigate = useNavigate();

  const canAdd =
    user.role === "SystemAdmin" ||
    user.role === "AgencyAdmin" ||
    user.role === "Editor";

  const [form, setForm] = useState({
    name: "",
    category: "",
    location: "",
    status: "Active",
    quantity: 1,
    notes: "",
  });

  if (!canAdd) {
    return <AccessDenied />;
  }

  function update(
    field: keyof typeof form,
    value: string | number
  ) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ✅ Mock submit (replace with API later)
    console.log("New equipment:", {
      ...form,
      agency: user.agency,
    });

    navigate("/equipment");
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Add New Equipment</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        {user.agency} · Equipment record
      </p>

      <form onSubmit={handleSubmit}>
        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20,
            marginBottom: 24,
          }}
        >
          <Field label="Equipment name">
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>

          <Field label="Category">
            <select
              required
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">Select…</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Electronics">Electronics</option>
              <option value="Medical">Medical</option>
              <option value="Rescue">Rescue</option>
            </select>
          </Field>

          <Field label="Location">
            <input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
          </Field>

          <Field label="Quantity">
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => update("quantity", Number(e.target.value))}
            />
          </Field>

          <Field label="Notes">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" style={{ fontWeight: 600 }}>
            Save equipment
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ opacity: 0.7 }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- helpers ---------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.8 }}>{label}</span>
      {children}
    </label>
  );
}