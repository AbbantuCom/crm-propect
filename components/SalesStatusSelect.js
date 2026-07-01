"use client";

import { useState, useEffect } from "react";

export const SALES_STATUSES = [
  { value: "new",            label: "New",            color: "#6b7280", bg: "#f3f4f6" },
  { value: "contacted",      label: "Contacted",      color: "#2563eb", bg: "#dbeafe" },
  { value: "interested",     label: "Interested",     color: "#16a34a", bg: "#dcfce7" },
  { value: "proposal_sent",  label: "Proposal Sent",  color: "#d97706", bg: "#fef3c7" },
  { value: "negotiating",    label: "Negotiating",    color: "#7c3aed", bg: "#ede9fe" },
  { value: "won",            label: "Won",            color: "#15803d", bg: "#bbf7d0" },
  { value: "lost",           label: "Lost",           color: "#dc2626", bg: "#fee2e2" },
  { value: "not_interested", label: "Not Interested", color: "#9ca3af", bg: "#f9fafb" },
];

function getStatus(value) {
  return SALES_STATUSES.find((s) => s.value === value) || SALES_STATUSES[0];
}

export default function SalesStatusSelect({ prospectId, value, onChange }) {
  const [status, setStatus] = useState(value || "new");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep in sync when the parent updates the value prop
  useEffect(() => {
    setStatus(value || "new");
  }, [value]);

  const current = getStatus(status);

  async function handleChange(e) {
    const next = e.target.value;
    const prev = status; // capture before optimistic update
    setStatus(next);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesStatus: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      onChange?.(next);
    } catch (err) {
      setStatus(prev); // revert to actual previous value
      console.error("Status save failed:", err.message);
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
        {SALES_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {saving && <span className="status-indicator">…</span>}
      {saved  && <span className="status-indicator status-saved">✓</span>}
    </div>
  );
}
