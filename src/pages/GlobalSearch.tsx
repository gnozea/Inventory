import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import AccessDenied from "../components/AccessDenied";
import { EQUIPMENT } from "../utils/equipment";
import exportEquipmentCsv from "../utils/exportEquipmentCsv";

/* =========================
   Types
   ========================= */

type Status = "Active" | "Maintenance" | "Decommissioned";
type Availability = "Available" | "In Use" | "Unavailable";

/* =========================
   Helpers
   ========================= */

function getAgencyType(agency: string) {
  const a = agency.toLowerCase();
  if (a.includes("fire")) return "fire";
  if (a.includes("police")) return "police";
  if (a.includes("ems")) return "ems";
  return "rescue";
}

function availabilityFromStatus(status: Status): Availability {
  if (status === "Active") return "Available";
  if (status === "Maintenance") return "In Use";
  return "Unavailable";
}

/* =========================
   Component
   ========================= */

export default function GlobalSearch() {
  const user = useCurrentUser();

  const canAccess =
    user.role === "GlobalViewer" ||
    user.role === "SystemAdmin";

  if (!canAccess) return <AccessDenied />;

  /* =========================
     Search + Filters (state)
     ========================= */

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [agencyFilter, setAgencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* =========================
     Derived filter options
     ========================= */

  const agencies = useMemo(
    () => Array.from(new Set(EQUIPMENT.map(e => e.agency))).sort(),
    []
  );

  const categories = useMemo(
    () => Array.from(new Set(EQUIPMENT.map(e => e.category))).sort(),
    []
  );

  /* =========================
     Filtered Results
     ========================= */

  const results = useMemo(() => {
    return EQUIPMENT.filter(e => {
      if (
        debouncedSearch &&
        !e.name.toLowerCase().includes(debouncedSearch)
      ) {
        return false;
      }

      if (agencyFilter && e.agency !== agencyFilter) {
        return false;
      }

      if (statusFilter && e.status !== statusFilter) {
        return false;
      }

      if (categoryFilter && e.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [
    debouncedSearch,
    agencyFilter,
    statusFilter,
    categoryFilter,
  ]);

  /* =========================
     Results summary + audit
     ========================= */

  const agencyCount = useMemo(
    () => new Set(results.map(r => r.agency)).size,
    [results]
  );

  useEffect(() => {
    if (!debouncedSearch && !agencyFilter && !statusFilter && !categoryFilter) {
      return;
    }
    console.log(
      `[GlobalSearch] user=${user.role} results=${results.length} agencies=${agencyCount} query="${debouncedSearch}"`
    );
  }, [
    debouncedSearch,
    agencyFilter,
    statusFilter,
    categoryFilter,
    results,
    agencyCount,
    user.role,
  ]);

  /* =========================
     Render
     ========================= */

  return (
    <div style={{ padding: 24 }}>
      <h1>Global Search</h1>

      <div
        style={{
          marginBottom: 16,
          padding: "8px 12px",
          background: "#fef3c7",
          borderRadius: 6,
          fontSize: 13,
        }}
      >
        Read-only access. This page allows discovery across all
        agencies without editing.
      </div>

      <input
        type="text"
        placeholder="Search equipment by name…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        style={{
          width: "100%",
          maxWidth: 520,
          padding: "12px 14px",
          fontSize: 16,
          marginBottom: 16,
        }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)}>
          <option value="">All Agencies</option>
          {agencies.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as Status | "")}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Decommissioned">Decommissioned</option>
        </select>

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button onClick={() => exportEquipmentCsv(results, "global-search.csv")}>
          Export CSV
        </button>
      </div>

      <p style={{ fontSize: 13, marginBottom: 8 }}>
        <strong>{results.length}</strong> results across{" "}
        <strong>{agencyCount}</strong> agencies
      </p>

      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <table width="100%" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={thStyle}>Equipment</th>
              <th style={thStyle}>Agency</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Availability</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={tdStyle}>
                  <Link to={`/equipment/${r.id}`}>
                    <strong>{r.name}</strong>
                  </Link>
                </td>
                <td style={tdStyle}>
                  <AgencyPill
                    name={r.agency}
                    type={getAgencyType(r.agency)}
                  />
                </td>
                <td style={tdStyle}>{r.location}</td>
                <td style={tdStyle}>
                  <AvailabilityBadge
                    value={availabilityFromStatus(r.status)}
                  />
                </td>
                <td style={tdStyle}>
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================
   Styles + Pills
   ========================= */

const thStyle: React.CSSProperties = {
  padding: "12px",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 14,
};

function StatusPill({ status }: { status: Status }) {
  const colors = {
    Active: "#dcfce7",
    Maintenance: "#fef3c7",
    Decommissioned: "#fee2e2",
  };
  return (
    <span style={{ padding: "4px 8px", borderRadius: 999, background: colors[status], fontSize: 12 }}>
      {status}
    </span>
  );
}

function AvailabilityBadge({ value }: { value: Availability }) {
  const map = {
    Available: "#dcfce7",
    "In Use": "#e0f2fe",
    Unavailable: "#fee2e2",
  };
  return (
    <span style={{ padding: "4px 8px", borderRadius: 999, background: map[value], fontSize: 12 }}>
      {value}
    </span>
  );
}

function AgencyPill({
  name,
  type,
}: {
  name: string;
  type: "fire" | "police" | "ems" | "rescue";
}) {
  const colors = {
    fire: "#fee2e2",
    police: "#dbeafe",
    ems: "#dcfce7",
    rescue: "#fef3c7",
  };
  return (
    <span style={{ padding: "4px 8px", borderRadius: 999, background: colors[type], fontSize: 12 }}>
      {name}
    </span>
  );
}

