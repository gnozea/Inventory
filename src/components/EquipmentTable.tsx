import { useState } from "react";
import { Link } from "react-router-dom";

/* =========================
   Types
   ========================= */

export type EquipmentRow = {
  id: number;
  name: string;
  category: string;
  location: string;
  status: "Active" | "Maintenance" | "Decommissioned";
  agency: string;
};

/* =========================
   Constants
   ========================= */

const CATEGORY_OPTIONS = [
  "Vehicle",
  "Electronics",
  "Trailer",
  "Rescue",
  "Medical",
];

/* =========================
   Component
   ========================= */

export default function EquipmentTable({
  rows,
  onChange,
}: {
  rows: EquipmentRow[];
  onChange: (rows: EquipmentRow[]) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);

  function update(
    id: number,
    field: keyof EquipmentRow,
    value: string
  ) {
    onChange(
      rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  }

  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr
            style={{
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <th align="left" style={thStyle}>Name</th>
            <th align="left" style={thStyle}>Category</th>
            <th align="left" style={thStyle}>Location</th>
            <th align="left" style={thStyle}>Status</th>
            <th style={thStyle} />
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const isEditing = editingId === row.id;

            return (
              <tr
                key={row.id}
                style={{ borderBottom: "1px solid #f3f4f6" }}
              >
                {/* Name */}
                <td style={tdStyle}>
                  {isEditing ? (
                    <input
                      value={row.name}
                      onChange={(e) =>
                        update(row.id, "name", e.target.value)
                      }
                      style={inputStyle}
                    />
                  ) : (
                    <Link
                      to={`/equipment/${row.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: "#2563eb",
                        textDecoration: "underline",
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      {row.name}
                    </Link>
                  )}
                </td>

                {/* Category */}
                <td style={tdStyle}>
                  {isEditing ? (
                    <select
                      value={row.category}
                      onChange={(e) =>
                        update(row.id, "category", e.target.value)
                      }
                      style={inputStyle}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    row.category
                  )}
                </td>

                {/* Location */}
                <td style={tdStyle}>
                  {isEditing ? (
                    <input
                      value={row.location}
                      onChange={(e) =>
                        update(row.id, "location", e.target.value)
                      }
                      style={inputStyle}
                    />
                  ) : (
                    <Link
                      to={`/locations?location=${encodeURIComponent(
                        row.location
                      )}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: "#2563eb",
                        textDecoration: "underline",
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      {row.location}
                    </Link>
                  )}
                </td>

                {/* Status */}
                <td style={tdStyle}>
                  {isEditing ? (
                    <select
                      value={row.status}
                      onChange={(e) =>
                        update(row.id, "status", e.target.value)
                      }
                      style={inputStyle}
                    >
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Decommissioned">
                        Decommissioned
                      </option>
                    </select>
                  ) : (
                    <StatusPill status={row.status} />
                  )}
                </td>

                {/* Actions */}
                <td style={tdStyle}>
                  {isEditing ? (
                    <button
                      onClick={() => setEditingId(null)}
                      style={buttonStyle}
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingId(row.id)}
                      style={buttonStyle}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* =========================
   Styles
   ========================= */

const thStyle: React.CSSProperties = {
  padding: "12px",
  fontSize: 13,
  fontWeight: 600,
  borderRight: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 14,
  borderRight: "1px solid #f3f4f6",
  verticalAlign: "middle",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  fontSize: 14,
  borderRadius: 6,
  border: "1px solid #d1d5db",
};

const buttonStyle: React.CSSProperties = {
  padding: "4px 12px",
  fontSize: 13,
  borderRadius: 6,
};

/* =========================
   Status Pill
   ========================= */

function StatusPill({
  status,
}: {
  status: EquipmentRow["status"];
}) {
  const colors: Record<
    EquipmentRow["status"],
    { bg: string; fg: string }
  > = {
    Active: { bg: "#dcfce7", fg: "#166534" },
    Maintenance: { bg: "#fef3c7", fg: "#92400e" },
    Decommissioned: { bg: "#fee2e2", fg: "#991b1b" },
  };

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: colors[status].bg,
        color: colors[status].fg,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}