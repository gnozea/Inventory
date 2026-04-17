interface Resource {
  id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  tags?: string;
  category_name: string;
  agency_name?: string;
  created_by: string;
  created_at: string;
}

interface Props {
  resource: Resource;
  canEdit?: boolean;
  onEdit?: (resource: Resource) => void;
  onDelete?: (resource: Resource) => void;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄",
  docx: "📝",
  xlsx: "📊",
  pptx: "📋",
  video: "🎥",
  link: "🔗",
};

export default function ResourceCard({ resource, canEdit, onEdit, onDelete }: Props) {
  const icon = FILE_TYPE_ICONS[resource.file_type?.toLowerCase() ?? ""] ?? "📁";
  const tags = resource.tags ? resource.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2, wordBreak: "break-word" }}>
              {resource.title}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{resource.category_name}</div>
          </div>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {onEdit && (
              <button
                onClick={() => onEdit(resource)}
                style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer", borderRadius: 5, border: "1px solid #cbd5e1", background: "#fff", color: "#475569" }}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(resource)}
                style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer", borderRadius: 5, border: "1px solid #fecaca", background: "#fff", color: "#ef4444" }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {resource.description && (
        <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{resource.description}</p>
      )}

      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", color: "#64748b" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          {resource.agency_name ? resource.agency_name : "Global"} · {resource.created_by}
        </span>
        {resource.file_url && (
          <a
            href={resource.file_url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6", textDecoration: "none" }}
          >
            Open →
          </a>
        )}
      </div>
    </div>
  );
}
