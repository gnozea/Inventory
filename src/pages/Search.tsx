import { useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { filterVisibleEquipment } from "../utils/visibility";
import { EQUIPMENT } from "../utils/equipment";

type Status = "Active" | "Maintenance" | "Decommissioned";

export default function Search() {
  const { user } = useCurrentUser();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const visibleEquipment = useMemo(
    () => filterVisibleEquipment(user, EQUIPMENT),
    [user]
  );

  const results = useMemo(() => {
    if (!query && !statusFilter && !categoryFilter) return [];

    const q = query.toLowerCase();

    return visibleEquipment.filter((e) => {
      const matchesQuery =
        !query ||
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.agency.toLowerCase().includes(q);

      const matchesStatus =
        !statusFilter || e.status === statusFilter;

      const matchesCategory =
        !categoryFilter || e.category === categoryFilter;

      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [query, statusFilter, categoryFilter, visibleEquipment]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Global Search</h1>
      <p style={{ opacity: 0.7 }}>
        Search across all agencies and equipment.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search equipment…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as Status | "")
          }
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Decommissioned">Decommissioned</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {[...new Set(visibleEquipment.map((e) => e.category))].map(
            (category) => (
              <option key={category} value={category}>
                {category}
              </option>
            )
          )}
        </select>
      </div>

      {results.length > 0 && (
        <table width="100%" cellPadding={6}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Location</th>
              <th>Agency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{e.category}</td>
                <td>{e.location}</td>
                <td>{e.agency}</td>
                <td>{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {results.length === 0 &&
        (query || statusFilter || categoryFilter) && (
          <p>No matching results.</p>
        )}
    </div>
  );
}