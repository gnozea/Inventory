import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  filterVisibleEquipment,
  canSeeAllAgencies,
} from "../utils/visibility";
import EquipmentTable from "../components/EquipmentTable";
import type { EquipmentRow } from "../components/EquipmentTable";

/* =========================
   Mock data
   ========================= */

const ALL_EQUIPMENT: EquipmentRow[] = [
  {
    id: 1,
    name: "Rescue Truck 1",
    category: "Vehicle",
    location: "Station 1",
    status: "Active",
    agency: "Fire Dept",
  },
  {
    id: 2,
    name: "Thermal Camera",
    category: "Electronics",
    location: "Station 2",
    status: "Maintenance",
    agency: "Fire Dept",
  },
  {
    id: 3,
    name: "HazMat Trailer",
    category: "Trailer",
    location: "Depot",
    status: "Decommissioned",
    agency: "Fire Dept",
  },
  {
    id: 4,
    name: "Medical Kit Alpha",
    category: "Medical",
    location: "Station 3",
    status: "Active",
    agency: "EMS",
  },
];

/* =========================
   Page
   ========================= */

export default function EquipmentList() {
  const user = useCurrentUser();
  const [searchParams] = useSearchParams();

  const selectedLocation = searchParams.get("location");

  const [equipment, setEquipment] =
    useState<EquipmentRow[]>(ALL_EQUIPMENT);

  const visibleEquipment = useMemo(
    () => filterVisibleEquipment(user, equipment),
    [user, equipment]
  );

  const filteredEquipment = useMemo(() => {
    if (!selectedLocation) {
      return visibleEquipment;
    }

    return visibleEquipment.filter(
      (e) => e.location === selectedLocation
    );
  }, [visibleEquipment, selectedLocation]);

  const pageTitle = useMemo(() => {
    if (selectedLocation) {
      return `Equipment at ${selectedLocation}`;
    }

    return canSeeAllAgencies(user)
      ? "All Equipment"
      : "My Equipment";
  }, [selectedLocation, user]);

  return (
    <div>
      <h1>{pageTitle}</h1>

      <EquipmentTable
        rows={filteredEquipment}
        onChange={setEquipment}
      />
    </div>
  );
}