import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type Status = "Active" | "Maintenance" | "Decommissioned";

type Equipment = {
  id: number;
  name: string;
  location: string;
  status: Status;
};

/* =========================
   TEMP mock data
   (same source as equipment for now)
   ========================= */

const EQUIPMENT: Equipment[] = [
  { id: 1, name: "Rescue Truck 1", location: "Station 1", status: "Active" },
  { id: 2, name: "Thermal Camera", location: "Station 1", status: "Maintenance" },
  { id: 3, name: "Mobile Command Unit", location: "HQ", status: "Active" },
  { id: 4, name: "HazMat Trailer", location: "Depot", status: "Decommissioned" },
  { id: 5, name: "Rescue Boat", location: "Depot", status: "Active" },

  // ✅ ADD THIS RECORD
  {
    id: 6,
    name: "Air Monitoring Kit",
    location: "Station 1",
    status: "Decommissioned",
  },
];

/* =========================
   Page
   ========================= */

export default function Locations() {
  const [params] = useSearchParams();
  const selectedLocation = params.get("location");

  const locations = useMemo(() => {
    const map = new Map<
      string,
      { total: number; active: number; maintenance: number; decommissioned: number }
    >();

    EQUIPMENT.forEach((e) => {
      if (selectedLocation && e.location !== selectedLocation) return;

      if (!map.has(e.location)) {
        map.set(e.location, {
          total: 0,
          active: 0,
          maintenance: 0,
          decommissioned: 0,
        });
      }

      const entry = map.get(e.location)!;
      entry.total += 1;

      if (e.status === "Active") entry.active += 1;
      if (e.status === "Maintenance") entry.maintenance += 1;
      if (e.status === "Decommissioned") entry.decommissioned += 1;
    });

    return Array.from(map.entries()).map(([name, stats]) => ({
      name,
      ...stats,
    }));
  }, [selectedLocation]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Locations</h1>

      {selectedLocation && (
        <p style={{ opacity: 0.7, marginBottom: 16 }}>
          Showing results for <strong>{selectedLocation}</strong>
        </p>
      )}

      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{
          borderCollapse: "collapse",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            <th align="left" style={thStyle}>Location</th>
            <th align="left" style={thStyle}>Total</th>
            <th align="left" style={thStyle}>Active</th>
            <th align="left" style={thStyle}>Maintenance</th>
            <th align="left" style={thStyle}>Decommissioned</th>
          </tr>
        </thead>

        <tbody>
          {locations.map((l) => (
            <tr key={l.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={tdStyle}>{l.name}</td>
              <td style={tdStyle}>{l.total}</td>
              <td style={tdStyle}>{l.active}</td>
              <td style={tdStyle}>{l.maintenance}</td>
              <td style={tdStyle}>{l.decommissioned}</td>
            </tr>
          ))}
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
};