import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

export type EquipmentRow = {
  id: number;
  name: string;
  category: string;
  location: string;
  status: "Active" | "Maintenance" | "Decommissioned";
  agency: string;
};

const CATEGORY_OPTIONS = [
  "Vehicle",
  "Electronics",
  "Trailer",
  "Rescue",
  "Medical",
];

export default function EquipmentTable({
  rows,
  onChange,
}: {
  rows: EquipmentRow[];
  onChange: (rows: EquipmentRow[]) => void;
}) {
  const { user } = useCurrentUser();

  // ✅ Permission logic UNCHANGED
  const canEdit =
    user.role === "SystemAdmin" ||
    user.role === "AgencyAdmin";

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
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Location</th>
            <th style={thStyle}>Status</th>
            {canEdit && <th style={thStyle} />}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const isEditing = canEdit && editingId === row.id;

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
                    <Link to={`/equipment/${row.id}`}>
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
                        update(
                          row.id,
                          "category",
                          e.target.value
                        )
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
                        update(
                          row.id,
                          "location",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  ) : (
                    <Link
                      to={`/locations?location=${encodeURIComponent(
                        row.location
                      )}`}
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
                        update(
                          row.id,
                          "status",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    >
                      <option value="Active">Active</option>
                      <option value="Maintenance">
                        Maintenance
                      </option>
                      <option value="Decommissioned">
                        Decommissioned
                      </option>
                    </select>
                  ) : (
                    <StatusPill status={row.status} />
                  )}
                </td>

                {/* Actions */}
                {canEdit && (
                  <td style={tdStyle}>
                    {isEditing ? (
                      <button onClick={() => setEditingId(null)}>
                        Save
                      </button>
                    ) : (
                      <button onClick={() => setEditingId(row.id)}>
                        Edit
                      </button>
                    )}
                  </td>
                )}
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
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 14,
  borderRight: "1px solid #f3f4f6",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  fontSize: 14,
  borderRadius: 6,
  border: "1px solid #d1d5db",
};

/* =========================
   Status Pill
   ========================= */

function StatusPill({
  status,
}: {
  status: EquipmentRow["status"];
}) {
  const colors = {
    Active: { bg: "#dcfce7", fg: "#166534" },
    Maintenance: { bg: "#fef3c7", fg: "#92400e" },
    Decommissioned: { bg: "#fee2e2", fg: "#991b1b" },
  }[status];

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: colors.bg,
        color: colors.fg,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}
