import { useEffect, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import AccessDenied from "../components/AccessDenied";

type Status = "Active" | "Maintenance" | "Decommissioned";

export default function GlobalSearch() {
  const user = useCurrentUser();

  const canAccess =
    user.role === "GlobalViewer" ||
    user.role === "SystemAdmin";

  if (!canAccess) {
    return <AccessDenied />;
  }

  /* =========================
     Phase 2: Search controls
     ========================= */

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [agencyFilter, setAgencyFilter] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState<Status | "">("");
  const [categoryFilter, setCategoryFilter] =
    useState("");

  /* ✅ 300ms debounce */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Global Search</h1>

      <p
        style={{
          marginBottom: 16,
          padding: "8px 12px",
          background: "#fef3c7",
          borderRadius: 6,
          fontSize: 13,
        }}
      >
        Read-only access. You can search across all
        agencies but cannot modify records.
      </p>

      {/* =========================
          Search Input
         ========================= */}
      <input
        type="text"
        placeholder="Search equipment by name, serial number, or keyword…"
        value={searchInput}
        onChange={(e) =>
          setSearchInput(e.target.value)
        }
        style={{
          width: "100%",
          maxWidth: 520,
          padding: "12px 14px",
          fontSize: 16,
          marginBottom: 20,
        }}
      />

      {/* =========================
          Filters Row
         ========================= */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <select
          value={agencyFilter}
          onChange={(e) =>
            setAgencyFilter(e.target.value)
          }
        >
          <option value="">
            All Agencies
          </option>
          {/* Options wired in Phase 3 */}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as Status | ""
            )
          }
        >
          <option value="">
            All Statuses
          </option>
          <option value="Active">
            Active
          </option>
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
          <option value="">
            All Categories
          </option>
          {/* Options wired in Phase 3 */}
        </select>
      </div>

      {/* =========================
          Placeholder (no results yet)
         ========================= */}
      <p style={{ opacity: 0.6 }}>
        Enter a search term to begin. Results
        will appear here in the next phase.
      </p>

      {/* 
        In production, each search is logged to the audit table.
        Mock version will log searches to console.
      */}

      {/* Debug-only echo to prove wiring (safe, removable) */}
      <pre
        style={{
          marginTop: 24,
          fontSize: 12,
          opacity: 0.5,
        }}
      >
        Search: {debouncedSearch || "(empty)"}{"\n"}
        Agency: {agencyFilter || "(all)"}{"\n"}
        Status: {statusFilter || "(all)"}{"\n"}
        Category: {categoryFilter || "(all)"}
      </pre>
    </div>
  );
}
