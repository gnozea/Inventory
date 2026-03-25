import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import EquipmentTable from "../components/EquipmentTable";
import type { EquipmentRow } from "../components/EquipmentTable";

export default function EquipmentList() {
  const user = useCurrentUser();
  const navigate = useNavigate();

  const canAdd =
    user.role === "SystemAdmin" ||
    user.role === "AgencyAdmin" ||
    user.role === "Editor";

  const rows: EquipmentRow[] = [
    {
      id: "1",
      name: "Engine 7 — Pumper Truck",
      category: "Vehicle",
      location: "Station 4",
      status: "Active",
      canEdit: canAdd,
    },
    {
      id: "2",
      name: "AED Unit — Cardiac Monitor",
      category: "Medical",
      location: "Station 2",
      status: "Maintenance",
      canEdit: canAdd,
    },
    {
      id: "3",
      name: "Thermal Imaging Camera",
      category: "Rescue",
      location: "Station 4",
      status: "Decommissioned",
      canEdit: false,
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>My Equipment</h1>

        {canAdd && (
          <button
            onClick={() => navigate("/equipment/new")}
            style={{
              padding: "8px 12px",
              fontWeight: 600,
            }}
          >
            + Add equipment
          </button>
        )}
      </div>

      <EquipmentTable
        rows={rows}
        onRowClick={(row) =>
          navigate(`/equipment/${row.id}`)
        }
      />
    </div>
  );
}