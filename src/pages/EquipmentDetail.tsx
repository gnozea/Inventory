import { useParams } from "react-router-dom";

/* =========================
   TEMP TYPE + DATA
   (Replace with real data later)
   ========================= */

type Equipment = {
  id: number;
  name: string;
  category: string;
  location: string;
  status: string;
  readiness: string;
  manufacturer: string;
  serialNumber: string;
  agency: string;
  notes: string;
};

const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: 1,
    name: "Rescue Truck 1",
    category: "Vehicle",
    location: "Station A",
    status: "Active",
    readiness: "Fully Operational",
    manufacturer: "Pierce Manufacturing",
    serialNumber: "RT-001-A",
    agency: "Fire Department",
    notes: "Assigned to urban search and rescue.",
  },
  {
    id: 2,
    name: "Medical Kit Alpha",
    category: "Medical",
    location: "Station B",
    status: "Maintenance",
    readiness: "Out of Service",
    manufacturer: "Medline",
    serialNumber: "MK-ALPHA-22",
    agency: "EMS",
    notes: "Awaiting replacement supplies.",
  },
];

/* =========================
   Component
   ========================= */

export default function EquipmentDetail() {
  const { id } = useParams();

  const equipment = MOCK_EQUIPMENT.find(
    (e) => e.id === Number(id)
  );

  if (!equipment) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Equipment Not Found</h1>
        <p>No record found for ID: {id}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginBottom: 24 }}>Equipment Detail</h1>

      {/* =========================
         General Information
         ========================= */}

      <section style={sectionStyle}>
        <h2>General Information</h2>

        <FormRow label="Name" value={equipment.name} />
        <FormRow label="Category" value={equipment.category} />
        <FormRow label="Agency" value={equipment.agency} />
        <FormRow label="Location" value={equipment.location} />
      </section>

      {/* =========================
         Status & Readiness
         ========================= */}

      <section style={sectionStyle}>
        <h2>Status &amp; Readiness</h2>

        <FormRow label="Status" value={equipment.status} />
        <FormRow label="Readiness" value={equipment.readiness} />
      </section>

      {/* =========================
         Inventory
         ========================= */}

      <section style={sectionStyle}>
        <h2>Inventory</h2>

        <FormRow
          label="Serial Number"
          value={equipment.serialNumber}
        />
      </section>

      {/* =========================
         Manufacturer
         ========================= */}

      <section style={sectionStyle}>
        <h2>Manufacturer</h2>

        <FormRow
          label="Manufacturer"
          value={equipment.manufacturer}
        />
      </section>

      {/* =========================
         Contacts
         ========================= */}

      <section style={sectionStyle}>
        <h2>Contacts</h2>

        <p style={{ fontStyle: "italic" }}>
          No contacts assigned.
        </p>
      </section>

      {/* =========================
         Notes
         ========================= */}

      <section style={sectionStyle}>
        <h2>Notes</h2>

        <textarea
          value={equipment.notes}
          readOnly
          style={textAreaStyle}
        />
      </section>
    </div>
  );
}

/* =========================
   Reusable Form Row
   ========================= */

function FormRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={rowStyle}>
      <label style={labelStyle}>{label}</label>
      <input value={value} readOnly style={inputStyle} />
    </div>
  );
}

/* =========================
   Styles
   ========================= */

const sectionStyle: React.CSSProperties = {
  marginBottom: 32,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "200px 1fr",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: 14,
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
};

const textAreaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 100,
  padding: 10,
  fontSize: 14,
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
};