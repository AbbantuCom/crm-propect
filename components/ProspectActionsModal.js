"use client";

import { useState } from "react";
import CallsPanel from "@/components/CallsPanel";
import NotesPanel from "@/components/NotesPanel";
import { SALES_STATUSES } from "@/components/SalesStatusSelect";

export default function ProspectActionsModal({ prospectId, companyName, initialTab = "calls", currentStatus, onStatusChange, onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusSaved, setStatusSaved] = useState(false);

  async function handleStatusChange(next) {
    setStatusSaving(true);
    setStatusSaved(false);
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
      onStatusChange?.(next);
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 1800);
    } catch (err) {
      alert(`Could not update status: ${err.message}`);
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <div className="modal-label">Prospect</div>
            <h2 className="modal-title">{companyName}</h2>
          </div>
          <button className="btn btn-sm" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Close
          </button>
        </div>

        <div className="modal-tabs">
          <button className={`tab-btn${tab === "status" ? " active" : ""}`} onClick={() => setTab("status")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Status
          </button>
          <button className={`tab-btn${tab === "calls" ? " active" : ""}`} onClick={() => setTab("calls")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Call Log
          </button>
          <button className={`tab-btn${tab === "notes" ? " active" : ""}`} onClick={() => setTab("notes")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Notes
          </button>
        </div>

        <div className="modal-body">
          {tab === "status" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <p className="page-subtitle" style={{ margin: 0 }}>Select a status to update it immediately.</p>
                {statusSaving && <span style={{ fontSize: 12, color: "var(--latte)" }}>Saving…</span>}
                {statusSaved && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>✓ Saved</span>}
              </div>
              <div className="status-option-list">
                {SALES_STATUSES.map((s) => {
                  const active = (currentStatus || "new") === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      disabled={statusSaving}
                      className={`status-option${active ? " status-option-active" : ""}`}
                      style={{ borderColor: active ? s.color : undefined, background: active ? s.bg : undefined }}
                      onClick={() => !active && handleStatusChange(s.value)}
                    >
                      <span className="status-option-dot" style={{ background: s.color }} />
                      <span style={{ fontWeight: active ? 700 : 500, color: active ? s.color : "var(--coffee)" }}>
                        {s.label}
                      </span>
                      {active && (
                        <svg style={{ marginLeft: "auto", color: s.color }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {tab === "calls" && <CallsPanel prospectId={prospectId} />}
          {tab === "notes" && <NotesPanel prospectId={prospectId} />}
        </div>

      </div>
    </div>
  );
}
