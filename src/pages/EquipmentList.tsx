import { useMemo, useState } from "react";
import {
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  filterVisibleEquipment,
  canSeeAllAgencies,
} from "../utils/visibility";
import EquipmentTable from "../components/EquipmentTable";
import type { EquipmentRow } from "../components/EquipmentTable";

import { EQUIPMENT } from "../utils/equipment";
import exportEquipmentCsv from "../utils/exportEquipmentCsv";

/* =========================
   Page
   ========================= */

type Status = "Active" | "Maintenance" | "Decommissioned";

export default function EquipmentList() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const selectedLocation = searchParams.get("location");
  const isLocationsView = location.pathname === "/locations";

  /**
   * IMPORTANT:
   * This state is used by EquipmentTable (inline edits, etc).
   * Do NOT change UI behavior here.
   */
  const [equipment, setEquipment] =
    useState<EquipmentRow[]>(EQUIPMENT);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<Status | "">("");
  const [categoryFilter, setCategoryFilter] =
    useState("");

  /**
   * ✅ FIX #1:
   * Correct role name: "Reporter" (not "AgencyReporter")
   */
  

const canExport =
  user.role === "SystemAdmin" ||
  user.role === "GlobalViewer" ||
  user.role === "AgencyAdmin" ||
  user.role === "AgencyUser" ||
  user.role === "AgencyReporter";


  /**
   * ✅ FIX #2:
   * Centralized visibility logic ONLY.
   * This is where AgencyAdmin scoping belongs.
   */
  const visibleEquipment = useMemo(
    () => filterVisibleEquipment(user, equipment),
    [user, equipment]
  );

  /**
   * ✅ All existing search, filters, sorting remain untouched
   */
  const filteredEquipment = useMemo(() => {
    let rows = visibleEquipment.filter((e) => {
      const matchesLocation =
        !selectedLocation || e.location === selectedLocation;

      const matchesSearch =
        !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        !statusFilter || e.status === statusFilter;

      const matchesCategory =
        !categoryFilter || e.category === categoryFilter;

      return (
        matchesLocation &&
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });

    if (isLocationsView && !selectedLocation) {
      rows = [...rows].sort((a, b) =>
        a.location.localeCompare(b.location)
      );
    }

    return rows;
  }, [
    visibleEquipment,
    selectedLocation,
    search,
    statusFilter,
    categoryFilter,
    isLocationsView,
  ]);

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

      {/* ✅ Actions row — unchanged */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        {canExport && (
          <button
            onClick={() =>
              exportEquipmentCsv(
                filteredEquipment,
                "equipment.csv"
              )
            }
          >
            Export CSV
          </button>
        )}

        {(user.role === "SystemAdmin" ||
  user.role === "AgencyAdmin" ||
  user.role === "AgencyUser") && (
  <button onClick={() => navigate("/equipment/new")}>
    Add Equipment
  </button>
)}
      </div>

      {/* ✅ Search + filters — unchanged */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search by name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as Status | ""
            )
          }
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Maintenance">
            Maintenance
          </option>
          <option value="Decommissioned">
            Decommissioned
          </option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value)
          }
        >
          <option value="">All Categories</option>
          {[...new Set(
            equipment.map((e) => e.category)
          )].map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* ✅ Table preserved exactly */}
      <EquipmentTable
        rows={filteredEquipment}
        onChange={setEquipment}
      />
    </div>
  );
}