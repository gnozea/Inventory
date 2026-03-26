import { useState } from "react";

/* =======================
   ✅ SHARED DATA MODEL
   ======================= */

export type EquipmentRow = {
  id: string;
  name: string;
  category: string;
  location: string;
  status: "Active" | "Maintenance" | "Decommissioned";

  // ✅ REQUIRED for visibility rules
  agency: string;
};

export default function EquipmentTable({
  rows,
  onChange,
}: {
  rows: EquipmentRow[];
  onChange: (rows: EquipmentRow[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const grid = {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1.5fr 1fr auto",
    alignItems: "center",
  };

  function update(
    id: string,
    field: keyof EquipmentRow,
    value: string
  ) {
    onChange(
      rows.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      )
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          ...grid,
          padding: "12px 16px",
          fontSize: 12,
          fontWeight: 600,
          color: "#6b7280",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div>Name</div>
        <div>Category</div>
        <div>Location</div>
        <div>Status</div>
        <div />
      </div>

      {/* Rows */}
      {rows.map((e) => {
        const editing = editingId === e.id;

        return (
          <div
            key={e.id}
            style={{
              ...grid,
              padding: "14px 16px",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <div style={{ fontWeight: 600 }}>{e.name}</div>

            <div>
              {editing ? (
                <input
                  value={e.category}
                  onChange={(ev) =>
                    update(e.id, "category", ev.target.value)
                  }
                />
              ) : (
                e.category
              )}
            </div>

            <div>
              {editing ? (
                <input
                  value={e.location}
                  onChange={(ev) =>
                    update(e.id, "location", ev.target.value)
                  }
                />
              ) : (
                e.location
              )}
            </div>

            <div>
              {editing ? (
                <select
                  value={e.status}
                  onChange={(ev) =>
                    update(e.id, "status", ev.target.value)
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Decommissioned">Decommissioned</option>
                </select>
              ) : (
                <StatusPill status={e.status} />
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              {editing ? (
                <button onClick={() => setEditingId(null)}>
                  Save
                </button>
              ) : (
                <button onClick={() => setEditingId(e.id)}>
                  Edit
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =======================
   ✅ STATUS PILL
   ======================= */

function StatusPill({
  status,
}: {
  status: EquipmentRow["status"];
}) {
  const map = {
    Active: { bg: "#dcfce7", fg: "#166534" },
    Maintenance: { bg: "#fef3c7", fg: "#92400e" },
    Decommissioned: { bg: "#fee2e2", fg: "#991b1b" },
  }[status];

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: map.bg,
        color: map.fg,
      }}
    >
      {status}
    </span>
  );
}