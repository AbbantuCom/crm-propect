"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/components/UserProvider";

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function NotesPanel({ prospectId }) {
  const currentUser = useUser();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/prospects/${prospectId}/notes`);
    const data = await res.json();
    setNotes(data.items || []);
    setLoading(false);
  }, [prospectId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/prospects/${prospectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, details, date }),
      });
      if (!res.ok) throw new Error("Could not save note");
      setTitle("");
      setDetails("");
      setDate(new Date().toISOString().slice(0, 10));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(note) {
    setEditingId(note._id);
    setEditForm({
      title: note.title,
      details: note.details || "",
      date: new Date(note.date).toISOString().slice(0, 10),
    });
  }

  async function handleUpdate(noteId) {
    if (!editForm.title?.trim()) { alert("Title is required."); return; }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Could not update");
      }
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(noteId) {
    setDeleteId(noteId);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Could not delete");
      }
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleteId(null);
    }
  }

  function canModify(note) {
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.role === "superadmin" || note.createdBy === currentUser.email;
  }

  return (
    <div>
      <form className="card" style={{ padding: 16, marginBottom: 18 }} onSubmit={handleAdd}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Add a Note</h3>
        <div className="detail-grid" style={{ marginBottom: 12 }}>
          <div className="form-row" style={{ gridColumn: "span 2" }}>
            <label className="field-label">Title *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow-up email sent" />
          </div>
          <div className="form-row">
            <label className="field-label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <label className="field-label">Details</label>
          <textarea className="textarea" value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? "Saving…" : "Add Note"}
        </button>
      </form>

      {loading ? (
        <div className="empty-state">Loading notes…</div>
      ) : notes.length === 0 ? (
        <div className="empty-state">No notes yet.</div>
      ) : (
        notes.map((n) => (
          <div key={n._id} className="timeline-item">
            {editingId === n._id ? (
              <div>
                <div className="detail-grid" style={{ marginBottom: 10 }}>
                  <div className="form-row" style={{ gridColumn: "span 2" }}>
                    <label className="field-label">Title *</label>
                    <input className="input" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <label className="field-label">Date</label>
                    <input type="date" className="input" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <label className="field-label">Details</label>
                  <textarea className="textarea" value={editForm.details} onChange={(e) => setEditForm((f) => ({ ...f, details: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(n._id)} disabled={editSaving}>
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                  <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div className="timeline-meta">{new Date(n.date).toLocaleDateString()} · {n.createdBy}</div>
                  {canModify(n) && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="icon-btn" title="Edit" onClick={() => startEdit(n)}><IconEdit /></button>
                      <button className="icon-btn icon-btn-danger" title="Delete" onClick={() => handleDelete(n._id)} disabled={deleteId === n._id}>
                        <IconTrash />
                      </button>
                    </div>
                  )}
                </div>
                <strong>{n.title}</strong>
                {n.details && <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{n.details}</p>}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
