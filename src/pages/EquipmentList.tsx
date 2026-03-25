import { useEffect, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import type { EquipmentItem } from "../types/equipment";
import { fetchEquipment } from "../api/equipmentApi";
import { exportEquipmentCsv } from "../utils/exportEquipmentCsv";

type Column<T> = {
  key: keyof T;
  label: string;
  adminOnly?: boolean;
};

const COLUMNS: Column<EquipmentItem>[] = [
  { key: "equipmentId", label: "Equipment ID" },
  { key: "itemName", label: "Item Name" },
  { key: "category", label: "Category" },
  { key: "equipmentResourceType", label: "Resource Type" },
  { key: "deployableStatus", label: "Deployable Status" },
  { key: "missionCapable", label: "Mission Capable" },
  { key: "station", label: "Station" },
  { key: "organizationName", label: "Organization" },
  { key: "quantity", label: "Quantity" },
  { key: "unit", label: "Unit" },
  { key: "manufacturerMake", label: "Make" },
  { key: "model", label: "Model" },

  // Admin-only
  { key: "cost", label: "Cost", adminOnly: true },
  { key: "fairMarketValue", label: "FMV", adminOnly: true },
];

export default function EquipmentList() {
  const { role } = useCurrentUser();
  const [rows, setRows] = useState<EquipmentItem[]>([]);

  const isAdmin = role === "SystemAdmin";
  const canExport = role === "SystemAdmin" || role === "Reporter";

  useEffect(() => {
    fetchEquipment().then(setRows);
  }, []);

  const visibleColumns = COLUMNS.filter(
    (c) => !c.adminOnly || isAdmin
  );

  return (
    <div style={{ padding: 24 }}>
      <h1>Equipment List</h1>

      {canExport && (
        <button onClick={() => exportEquipmentCsv(rows)}>
          Export CSV
        </button>
      )}

      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            {visibleColumns.map((c) => (
              <th key={String(c.key)}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.recordId}>
              {visibleColumns.map((c) => (
                <td key={String(c.key)}>
                  {String(row[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}