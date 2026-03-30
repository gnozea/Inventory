import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/* ✅ NEW shared data import */
import { EQUIPMENT } from "../utils/equipment";

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
        <p style={{ opacity: 0.7 }}>
          Showing results for <strong>{selectedLocation}</strong>
        </p>
      )}

      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            <th align="left">Location</th>
            <th align="left">Total</th>
            <th align="left">Active</th>
            <th align="left">Maintenance</th>
            <th align="left">Decommissioned</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((l) => (
            <tr key={l.name}>
              <td>{l.name}</td>
              <td>{l.total}</td>
              <td>{l.active}</td>
              <td>{l.maintenance}</td>
              <td>{l.decommissioned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
