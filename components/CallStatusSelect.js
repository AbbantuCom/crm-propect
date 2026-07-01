"use client";

import { useState, useEffect } from "react";

export const CALL_STATUSES = [
  { value: "not_called",     label: "Not Called",     color: "#6b7280", bg: "#f3f4f6" },
  { value: "called",         label: "Called",         color: "#2563eb", bg: "#dbeafe" },
  { value: "no_answer",      label: "No Answer",      color: "#d97706", bg: "#fef3c7" },
  { value: "voicemail",      label: "Voicemail",      color: "#7c3aed", bg: "#ede9fe" },
  { value: "callback",       label: "Callback",       color: "#ea580c", bg: "#ffedd5" },
  { value: "interested",     label: "Interested",     color: "#16a34a", bg: "#dcfce7" },
  { value: "not_interested", label: "Not Interested", color: "#9ca3af", bg: "#f9fafb" },
  { value: "do_not_call",    label: "Do Not Call",    color: "#dc2626", bg: "#fee2e2" },
];

function getStatus(value) {
  return CALL_STATUSES.find((s) => s.value === value) || CALL_STATUSES[0];
}

export default function CallStatusSelect({ prospectId, value, onChange }) {
  const [status, setStatus] = useState(value || "not_called");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState("");

  useEffect(() => {
    setStatus(value || "not_called");
  }, [value]);

  const current = getStatus(status);

  async function handleChange(e) {
    const next = e.target.value;
    const prev = status;
    setStatus(next);
    setSaving(true);
    setSaved(false);
    setErr("");
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callStatus: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Server error ${res.status}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      onChange?.(next);
    } catch (error) {
      setStatus(prev);
      setErr(error.message);
      setTimeout(() => setErr(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="status-select-wrap" onClick={(e) => e.stopPropagation()}>
      <select
        className="status-select"
        value={status}
        onChange={handleChange}
        disabled={saving}
        style={{ color: current.color, background: current.bg, borderColor: current.color + "55" }}
      >
        {CALL_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {saving && <span className="status-indicator">…</span>}
      {saved  && <span className="status-indicator status-saved">✓</span>}
      {err    && <span className="status-indicator" style={{ color: "#dc2626", fontSize: 11 }} title={err}>!</span>}
    </div>
  );
}
