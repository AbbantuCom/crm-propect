"use client";

import { useState } from "react";
import { SALES_STATUSES } from "@/components/SalesStatusSelect";

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

export default function EditProspectModal({ prospect, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...FIELDS.reduce((acc, [key]) => ({ ...acc, [key]: prospect[key] || "" }), {}),
    salesStatus: prospect.salesStatus || "new",
  }));
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
      const res = await fetch(`/api/prospects/${prospect._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Could not save changes");
      const data = await res.json();
      onSaved(data.item);
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
          Edit Prospect
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Sales status — prominent at the top */}
          <div className="form-row" style={{ marginBottom: 20 }}>
            <label className="field-label">Sales Status</label>
            <select
              className="select"
              value={form.salesStatus}
              onChange={(e) => update("salesStatus", e.target.value)}
            >
              {SALES_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

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

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
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
