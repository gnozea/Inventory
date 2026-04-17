import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useLibraryApi } from "../api/client";
import ResourceCard from "../components/ResourceCard";

interface ResourceForm {
  id?: string;
  category_id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  tags: string;
}

interface LibraryResource {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  tags?: string;
  agency_id?: string | null;
  agency_name?: string;
  created_by: string;
  created_at: string;
}

const EMPTY_FORM: ResourceForm = {
  category_id: "", title: "", description: "", file_url: "", file_type: "", tags: "",
};

const FILE_TYPES = ["pdf", "docx", "xlsx", "pptx", "video", "link", "other"];

export default function Library() {
  const { user } = useCurrentUser();
  const libraryApi = useLibraryApi();
  const qc = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ResourceForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["library-categories"],
    queryFn: () => libraryApi.getCategories(),
  });

  const { data: resources = [] as LibraryResource[], isLoading } = useQuery<LibraryResource[]>({
    queryKey: ["library", categoryFilter, search],
    queryFn: () => libraryApi.getResources({
      categoryId: categoryFilter || undefined,
      search: search || undefined,
    }),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      form.id
        ? libraryApi.updateResource(form.id, {
            title: form.title, description: form.description,
            category_id: form.category_id, file_url: form.file_url,
            file_type: form.file_type, tags: form.tags,
          })
        : libraryApi.createResource({
            category_id: form.category_id, title: form.title,
            description: form.description, file_url: form.file_url,
            file_type: form.file_type, tags: form.tags,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => libraryApi.deleteResource(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); setDeleteTarget(null); },
  });

  if (!user) return null;

  const canManage = ["SystemAdmin", "AgencyAdmin"].includes(user.role);

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" };
  const input: React.CSSProperties = { padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" };
  const btnP: React.CSSProperties = { padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff" };
  const btnS: React.CSSProperties = { padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" };

  // Group resources by category for display
  const grouped = resources.reduce((acc: Record<string, LibraryResource[]>, r) => {
    const key = r.category_name || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Resource Library</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Documents, manuals, SOPs, and training materials for emergency responders</p>
        </div>
        {canManage && (
          <button style={btnP} onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}>
            + Add Resource
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Search resources…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...input, width: "auto", flex: "1 1 200px" }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          <option value="">All Categories</option>
          {(categories as any[]).map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</div>
      ) : resources.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 48, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
          <p style={{ margin: 0, fontSize: 14 }}>No resources found.{canManage ? " Add the first one!" : ""}</p>
        </div>
      ) : (
        Object.entries(grouped).map(([catName, items]) => (
          <div key={catName} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px", paddingBottom: 6, borderBottom: "1px solid #f1f5f9" }}>
              {catName} <span style={{ fontWeight: 400, color: "#94a3b8" }}>({items.length})</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {items.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  canEdit={canManage && (user.role === "SystemAdmin" || r.agency_id === user.agencyId)}
                  onEdit={(res) => { setForm({ id: res.id, category_id: (res as LibraryResource).category_id ?? "", title: res.title, description: res.description ?? "", file_url: res.file_url ?? "", file_type: res.file_type ?? "", tags: res.tags ?? "" }); setShowForm(true); }}
                  onDelete={(res) => setDeleteTarget(res)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700 }}>{form.id ? "Edit Resource" : "Add Resource"}</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Category</label>
              <select style={{ ...input, background: "#fff", cursor: "pointer" }} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select category…</option>
                {(categories as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Title</label>
              <input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Resource title" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Description</label>
              <textarea style={{ ...input, resize: "vertical", minHeight: 72 } as React.CSSProperties} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>File / Link URL</label>
              <input style={input} value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://…" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>File Type</label>
              <select style={{ ...input, background: "#fff", cursor: "pointer" }} value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
                <option value="">Select type…</option>
                {FILE_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={label}>Tags (comma-separated)</label>
              <input style={input} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ICS, NIMS, training" />
            </div>

            {saveMut.isError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{(saveMut.error as Error).message}</p>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btnS} onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} disabled={saveMut.isPending}>Cancel</button>
              <button
                style={{ ...btnP, opacity: form.category_id && form.title ? 1 : 0.5 }}
                disabled={!form.category_id || !form.title || saveMut.isPending}
                onClick={() => saveMut.mutate()}
              >
                {saveMut.isPending ? "Saving…" : form.id ? "Save Changes" : "Add Resource"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Delete Resource</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
              Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This cannot be undone.
            </p>
            {deleteMut.isError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{(deleteMut.error as Error).message}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btnS} onClick={() => setDeleteTarget(null)} disabled={deleteMut.isPending}>Cancel</button>
              <button
                style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff" }}
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
