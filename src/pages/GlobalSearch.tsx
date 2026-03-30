import { useCurrentUser } from "../hooks/useCurrentUser";
import AccessDenied from "../components/AccessDenied";

export default function GlobalSearch() {
  const user = useCurrentUser();

  const canAccess =
    user.role === "GlobalViewer" ||
    user.role === "SystemAdmin";

  if (!canAccess) {
    return <AccessDenied />;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Global Search</h1>

      {/* 
        This page is intentionally read-only.

        Future phases will add:
        - Search input with debounce
        - Agency / status / category filters
        - Results table
        - Export to CSV

        In production, each search is logged to the audit table.
        Mock version will log searches to console.
      */}

      <p style={{ opacity: 0.7 }}>
        Read-only access. Global search functionality will
        be added in the next phase.
      </p>
    </div>
  );
}