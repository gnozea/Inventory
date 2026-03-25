import { useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";

type Status = "Active" | "Maintenance" | "Decommissioned";

type Equipment = {
  id: number;
  name: string;
  category: string;
  location: string;
  status: Status;
  agency: string;
};

// Mock data
const MOCK_EQUIPMENT: Equipment[] = [
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
    name: "Mobile Command Unit",
    category: "Vehicle",
    location: "HQ",
    status: "Active",
    agency: "Statewide",
  },
  {
    id: 4,
    name: "HazMat Trailer",
    category: "Trailer",
    location: "Depot",
    status: "Decommissioned",
    agency: "Fire Dept",
  },
];

export default function Search() {
  const user = useCurrentUser();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [category, setCategory] = useState("");

  const results = useMemo(() => {
    return MOCK_EQUIPMENT.filter((e) => {
      const matchesQuery =
        query === "" ||
        e.name.toLowerCase().includes(query.toLowerCase());

      const matchesStatus =
        status === "" || e.status === status;

      const matchesCategory =
        category === "" || e.category === category;

      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [query, status, category]);

  return (
    <div>
      <h1>Global Search</h1>

      {/* Filters */}
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
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            padding: "6px 8px",
            border: "1px solid #ccc",
            borderRadius: 4,
            backgroundColor: "#ffffff",
            color: "#000000",
            minWidth: 220,
          }}
        />

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as Status | "")
          }
          style={{
            padding: "6px 8px",
            border: "1px solid #ccc",
            borderRadius: 4,
            backgroundColor: "#ffffff",
            color: "#000000",
          }}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Decommissioned">Decommissioned</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "6px 8px",
            border: "1px solid #ccc",
            borderRadius: 4,
            backgroundColor: "#ffffff",
            color: "#000000",
          }}
        >
          <option value="">All Categories</option>
          <option value="Vehicle">Vehicle</option>
          <option value="Electronics">Electronics</option>
          <option value="Trailer">Trailer</option>
        </select>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <p>No equipment matches your search.</p>
      ) : (
        <table width="100%" cellPadding={8}>
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Category</th>
              <th align="left">Location</th>
              <th align="left">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{e.category}</td>
                <td>{e.location}</td>
                <td>
                  <StatusPill status={e.status} />
                </td>
                <td>
                  <button>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function StatusPill({ status }: { status: Status }) {
  const colors: Record<Status, string> = {
    Active: "#16a34a",
    Maintenance: "#d97706",
    Decommissioned: "#dc2626",
  };

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: colors[status],
        color: "#ffffff",
        fontSize: 12,
      }}
    >
      {status}
    </span>
  );
}
