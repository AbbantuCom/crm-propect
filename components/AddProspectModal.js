"use client";

import { useState } from "react";

const FIELDS = [
  ["companyName", "Company Name", true],
  ["category", "Category"],
  ["address", "Address"],
  ["poBox", "P.O. Box"],
  ["tel", "Tel"],
  ["mobile", "Mobile"],
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
  ["website", "Website"],
  ["contactPerson", "Contact Person"],
  ["designation", "Designation"],
  ["productsServices", "Products / Services"],
  ["brands", "Brands"],
  ["facebook", "Facebook"],
  ["twitter", "Twitter"],
];

export default function AddProspectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.companyName) {
      setError("Company Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save prospect");
      }
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 className="page-title" style={{ fontSize: 20 }}>
          Add Prospect
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="detail-grid">
            {FIELDS.map(([key, label, required]) => (
              <div key={key} className="form-row">
                <label className="field-label">
                  {label} {required && "*"}
                </label>
                <input className="input" value={form[key] || ""} onChange={(e) => update(key, e.target.value)} />
              </div>
            ))}
          </div>

          {error && <div className="error-text">{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Prospect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(36,29,25,0.45)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "40px 20px",
  overflowY: "auto",
  zIndex: 50,
};

const modalStyle = {
  width: "100%",
  maxWidth: 760,
  padding: 28,
};
