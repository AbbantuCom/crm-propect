"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/components/UserProvider";

const OUTCOMES = [
  ["interested", "Interested"],
  ["not_interested", "Not interested"],
  ["no_answer", "No answer"],
  ["call_back", "Call back later"],
  ["voicemail", "Left voicemail"],
  ["other", "Other"],
];

function outcomeLabel(val) {
  return OUTCOMES.find(([v]) => v === val)?.[1] || val;
}

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

export default function CallsPanel({ prospectId, onCallLogged }) {
  const currentUser = useUser();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const [outcome, setOutcome] = useState("interested");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/prospects/${prospectId}/calls`);
    const data = await res.json();
    setCalls(data.items || []);
    setLoading(false);
  }, [prospectId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/prospects/${prospectId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notes, date }),
      });
      if (!res.ok) throw new Error("Could not log call");
      setNotes("");
      setDate(new Date().toISOString().slice(0, 10));
      load();
      onCallLogged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(call) {
    setEditingId(call._id);
    setEditForm({
      outcome: call.outcome,
      notes: call.notes || "",
      date: new Date(call.date).toISOString().slice(0, 10),
    });
  }

  async function handleUpdate(callId) {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/calls/${callId}`, {
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

  async function handleDelete(callId) {
    setDeleteId(callId);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/calls/${callId}`, { method: "DELETE" });
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

  function canModify(call) {
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.role === "superadmin" || call.createdBy === currentUser.email;
  }

  return (
    <div>
      <form className="card" style={{ padding: 16, marginBottom: 18 }} onSubmit={handleAdd}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Log a Call</h3>
        <div className="detail-grid" style={{ marginBottom: 12 }}>
          <div className="form-row">
            <label className="field-label">Outcome</label>
            <select className="select" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              {OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label className="field-label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <label className="field-label">Notes</label>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened on the call?" />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? "Saving…" : "Log Call"}
        </button>
      </form>

      {loading ? (
        <div className="empty-state">Loading calls…</div>
      ) : calls.length === 0 ? (
        <div className="empty-state">No calls logged yet.</div>
      ) : (
        calls.map((c) => (
          <div key={c._id} className="timeline-item">
            {editingId === c._id ? (
              <div>
                <div className="detail-grid" style={{ marginBottom: 10 }}>
                  <div className="form-row">
                    <label className="field-label">Outcome</label>
                    <select className="select" value={editForm.outcome} onChange={(e) => setEditForm((f) => ({ ...f, outcome: e.target.value }))}>
                      {OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-row">
                    <label className="field-label">Date</label>
                    <input type="date" className="input" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <label className="field-label">Notes</label>
                  <textarea className="textarea" value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(c._id)} disabled={editSaving}>
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                  <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div className="timeline-meta">{new Date(c.date).toLocaleDateString()} · {c.createdBy}</div>
                  {canModify(c) && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="icon-btn" title="Edit" onClick={() => startEdit(c)}><IconEdit /></button>
                      <button className="icon-btn icon-btn-danger" title="Delete" onClick={() => handleDelete(c._id)} disabled={deleteId === c._id}>
                        <IconTrash />
                      </button>
                    </div>
                  )}
                </div>
                <strong>{outcomeLabel(c.outcome)}</strong>
                {c.notes && <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{c.notes}</p>}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
