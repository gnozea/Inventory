import { useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  getEquipmentById,
  updateEquipment,
} from "../store/equipmentStore";
import type { EquipmentItem } from "../store/equipmentStore";
import {
  logInspection,
  getInspectionHistoryForEquipment,
} from "../store/statusLogStore";
import {
  canEditEquipment,
  canSeeAllAgencies,
} from "../utils/visibility";
import AccessDenied from "../components/AccessDenied";

/* =========================
   Helpers
   ========================= */

const MONTHS_IN_YEAR = 12;

function monthsBetween(from: Date, to: Date) {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  return years * 12 + months;
}

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
}

/* =========================
   Component
   ========================= */

export default function EquipmentDetail() {
  const { id } = useParams();
  const { user } = useCurrentUser();

  const initial = getEquipmentById(Number(id));
  if (!initial) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Equipment Not Found</h1>
      </div>
    );
  }

  /* Visibility */
  const canView =
    canSeeAllAgencies(user) || initial.agency === user.agency;

  if (!canView) return <AccessDenied />;

  /* Capabilities */
  const canEditMetadata = canEditEquipment(user, initial.agency);
  const canUpdateStatus =
    user.role === "SystemAdmin" ||
    user.role === "AgencyAdmin" ||
    user.role === "AgencyUser";

  const [equipment, setEquipment] = useState<EquipmentItem>(initial);
  const [draft, setDraft] = useState<EquipmentItem>(initial);
  const [editing, setEditing] = useState(false);
  const [updatingInspection, setUpdatingInspection] = useState(false);

  /* Validation (metadata only) */
  const validationErrors = useMemo(() => {
    if (!editing) return {};
    const errors: Record<string, string> = {};
    if (!draft.name.trim()) errors.name = "Name is required.";
    if (!draft.category.trim()) errors.category = "Category is required.";
    if (!draft.location.trim()) errors.location = "Location is required.";
    return errors;
  }, [draft, editing]);

  const isValid = Object.keys(validationErrors).length === 0;

  /* Inspection status (derived) */
  let inspectionStatus = "— Not tracked";
  if (equipment.lastInspected) {
    const monthsAgo = monthsBetween(
      new Date(equipment.lastInspected),
      new Date()
    );
    inspectionStatus =
      monthsAgo > MONTHS_IN_YEAR
        ? `⚠️ Overdue (${monthsAgo - MONTHS_IN_YEAR} months)`
        : "✅ Inspected";
  }

  const inspectionHistory =
    getInspectionHistoryForEquipment(equipment.id);

  /* Handlers */
  const saveEdits = () => {
    if (!canEditMetadata || !isValid) return;
    if (!window.confirm("Save changes to this equipment?")) return;

    updateEquipment(draft);
    setEquipment(draft);
    setEditing(false);
  };

  const cancelEdits = () => {
    setDraft(equipment);
    setEditing(false);
  };

  const saveInspection = () => {
    if (!canUpdateStatus || !draft.lastInspected) return;
    if (!window.confirm("Update inspection date?")) return;

    logInspection({
      equipmentId: equipment.id,
      previousDate: equipment.lastInspected,
      newDate: draft.lastInspected,
      changedBy: user.name,
      changedAt: new Date().toISOString(),
    });

    updateEquipment(draft);
    setEquipment(draft);
    setUpdatingInspection(false);
  };

  const cancelInspection = () => {
    setDraft(equipment);
    setUpdatingInspection(false);
  };

  /* Render */
  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginBottom: 24 }}>Equipment Detail</h1>

      {/* Actions */}
      <section style={sectionStyle}>
        <h2>Actions</h2>

        {canEditMetadata && (
          <button disabled={editing} onClick={() => setEditing(true)}>
            Edit Equipment
          </button>
        )}

        {canUpdateStatus && (
          <button
            disabled={updatingInspection}
            onClick={() => setUpdatingInspection(true)}
          >
            Update Inspection
          </button>
        )}
      </section>

      {/* General Information */}
      <section style={sectionStyle}>
        <h2>General Information</h2>

        <FormRow
          label="Name"
          value={draft.name}
          editable={editing}
          error={validationErrors.name}
          onChange={(v) => setDraft({ ...draft, name: v })}
        />
        <FormRow
          label="Category"
          value={draft.category}
          editable={editing}
          error={validationErrors.category}
          onChange={(v) => setDraft({ ...draft, category: v })}
        />
        <FormRow label="Agency" value={draft.agency} />
        <FormRow
          label="Location"
          value={draft.location}
          editable={editing}
          error={validationErrors.location}
          onChange={(v) => setDraft({ ...draft, location: v })}
        />

        {editing && (
          <ActionRow
            onSave={saveEdits}
            onCancel={cancelEdits}
            saveDisabled={!isValid}
          />
        )}
      </section>

      {/* Status */}
      <section style={sectionStyle}>
        <h2>Status</h2>
        <FormRow label="Status" value={equipment.status} />
      </section>

      {/* Inspection */}
      <section style={sectionStyle}>
        <h2>Inspection</h2>

        {!updatingInspection ? (
          <>
            <FormRow
              label="Last Inspected"
              value={equipment.lastInspected ?? "—"}
            />
            <FormRow label="Inspection Status" value={inspectionStatus} />
          </>
        ) : (
          <>
            <FormRow
              label="Inspection Date"
              value={draft.lastInspected ?? ""}
              type="date"
              editable
              onChange={(v) =>
                setDraft({ ...draft, lastInspected: v })
              }
            />
            <ActionRow onSave={saveInspection} onCancel={cancelInspection} />
          </>
        )}
      </section>

      {/* Inspection History */}
      <section style={sectionStyle}>
        <h2>Inspection History</h2>

        {inspectionHistory.length === 0 ? (
          <p style={{ fontStyle: "italic" }}>
            No inspection history recorded.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Changed At</th>
                <th style={thStyle}>Previous Date</th>
                <th style={thStyle}>New Date</th>
                <th style={thStyle}>Changed By</th>
              </tr>
            </thead>
            <tbody>
              {inspectionHistory.map((entry, idx) => (
                <tr key={idx}>
                  <td style={tdStyle}>{formatDate(entry.changedAt)}</td>
                  <td style={tdStyle}>{formatDate(entry.previousDate)}</td>
                  <td style={tdStyle}>{formatDate(entry.newDate)}</td>
                  <td style={tdStyle}>{entry.changedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Manufacturer */}
      <section style={sectionStyle}>
        <h2>Manufacturer</h2>
        <FormRow
          label="Manufacturer"
          value={draft.manufacturer ?? ""}
          editable={editing && canEditMetadata}
          onChange={(v) => setDraft({ ...draft, manufacturer: v })}
        />
      </section>

      {/* Contacts */}
      <section style={sectionStyle}>
        <h2>Contacts</h2>
        <FormRow
          label="Contacts"
          value={(draft.contacts ?? []).join(", ")}
          editable={editing && canEditMetadata}
          onChange={(v) =>
            setDraft({
              ...draft,
              contacts: v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </section>

      {/* Notes */}
      <section style={sectionStyle}>
        <h2>Notes</h2>
        <textarea
          value={draft.notes ?? ""}
          readOnly={!(editing && canEditMetadata)}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          style={textAreaStyle}
        />
      </section>
    </div>
  );
}

/* =========================
   UI Helpers & Styles
   ========================= */

function FormRow({
  label,
  value,
  editable = false,
  type = "text",
  onChange,
  error,
}: {
  label: string;
  value: string;
  editable?: boolean;
  type?: string;
  onChange?: (v: string) => void;
  error?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={rowStyle}>
        <label style={labelStyle}>{label}</label>
        <input
          type={type}
          value={value}
          readOnly={!editable}
          onChange={(e) => onChange?.(e.target.value)}
          style={inputStyle}
        />
      </div>
      {error && (
        <div style={{ color: "#dc2626", fontSize: 12, marginLeft: 200 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  onSave,
  onCancel,
  saveDisabled,
}: {
  onSave: () => void;
  onCancel: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button onClick={onSave} disabled={saveDisabled}>
        Save
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}

const sectionStyle = { marginBottom: 32 };
const rowStyle = {
  display: "grid",
  gridTemplateColumns: "200px 1fr",
  gap: 12,
};
const labelStyle = { fontWeight: 600 };
const inputStyle = {
  padding: "6px 8px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
};
const thStyle = {
  textAlign: "left" as const,
  padding: "8px 4px",
  borderBottom: "1px solid #e5e7eb",
};
const tdStyle = {
  padding: "8px 4px",
  borderBottom: "1px solid #f3f4f6",
};
const textAreaStyle = {
  width: "100%",
  minHeight: 120,
  padding: 10,
  border: "1px solid #d1d5db",
  borderRadius: 6,
} as const;