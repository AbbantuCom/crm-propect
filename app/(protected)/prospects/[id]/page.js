"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import NotesPanel from "@/components/NotesPanel";
import CallsPanel from "@/components/CallsPanel";
import EditProspectModal from "@/components/EditProspectModal";
import SalesStatusSelect from "@/components/SalesStatusSelect";

const DETAIL_FIELDS = [
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

export default function ProspectDetailPage() {
  const { id } = useParams();
  const router  = useRouter();
  const user    = useUser();

  const [prospect,   setProspect]  = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState("");
  const [tab,        setTab]       = useState("calls");
  const [showEdit,   setShowEdit]  = useState(false);

  // Assign UI state (admin/superadmin only)
  const [teamMembers,  setTeamMembers]  = useState([]);
  const [assignTarget, setAssignTarget] = useState("");
  const [assigning,    setAssigning]    = useState(false);
  const [assignMsg,    setAssignMsg]    = useState("");

  const isPrivileged  = user?.role === "admin" || user?.role === "superadmin";
  const isContactedBy = prospect?.contactedBy === user?.email;
  const isAssignee    = prospect?.assignedTo  === user?.email;
  const canEdit       = isPrivileged || isContactedBy || isAssignee;
  const canDelete     = isPrivileged;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/${id}`);
      if (!res.ok) throw new Error("Prospect not found");
      const data = await res.json();
      setProspect(data.item);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Fetch team members for the assign dropdown (admin/superadmin only)
  useEffect(() => {
    if (!isPrivileged) return;
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setTeamMembers(d.items || []))
      .catch(() => {});
  }, [isPrivileged]);

  // Keep assignTarget in sync with prospect.assignedTo
  useEffect(() => {
    setAssignTarget(prospect?.assignedTo || "");
  }, [prospect?.assignedTo]);

  async function patchAssignedTo(value) {
    setAssigning(true);
    setAssignMsg("");
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update assignment");
      setProspect((p) => ({ ...p, assignedTo: value || null }));
      setAssignTarget(value || "");
      setAssignMsg(value ? "Assigned successfully." : "Unassigned.");
      setTimeout(() => setAssignMsg(""), 2500);
    } catch (err) {
      setAssignMsg(err.message);
    } finally {
      setAssigning(false);
    }
  }

  const handleAssign   = () => patchAssignedTo(assignTarget);
  const handleUnassign = () => patchAssignedTo("");

  async function handleDelete() {
    if (!confirm(`Delete ${prospect.companyName}? This cannot be undone.`)) return;
    const res = await fetch(`/api/prospects/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard");
    else alert("Could not delete prospect.");
  }

  if (loading) return <div className="container">Loading...</div>;
  if (error)   return <div className="container error-text">{error}</div>;
  if (!prospect) return null;

  return (
    <div className="container">
      <div className="section-header">
        <div>
          <h1 className="page-title">{prospect.companyName}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <span className="page-subtitle" style={{ margin: 0 }}>
              {prospect.category || "Uncategorized"} ·{" "}
              <span className={`badge ${prospect.hasWebsite ? "badge-yes" : "badge-no"}`}>
                {prospect.hasWebsite ? "Has website" : "No website"}
              </span>
            </span>
            {(isPrivileged || isContactedBy || isAssignee) && (
              <SalesStatusSelect
                prospectId={id}
                value={prospect.salesStatus || "new"}
                onChange={(next) => setProspect((p) => ({ ...p, salesStatus: next }))}
              />
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canEdit   && <button className="btn"            onClick={() => setShowEdit(true)}>Edit</button>}
          {canDelete && <button className="btn btn-danger" onClick={handleDelete}>Delete</button>}
        </div>
      </div>

      {/* ── Contacted By / Assigned To card ── */}
      <div
        className="card"
        style={{
          padding: "14px 20px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          borderLeft: `4px solid ${prospect.contactedBy ? "#2563eb" : "var(--border)"}`,
        }}
      >
        {/* Left: Contacted By (immutable) + Assigned To (current, if different) */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: prospect.contactedBy ? "#2563eb" : "var(--latte-light)", flexShrink: 0 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--latte)", marginBottom: 2 }}>
              Contacted By
            </div>
            {prospect.contactedBy ? (
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--coffee)", display: "flex", alignItems: "center", gap: 8 }}>
                {prospect.contactedBy}
                {prospect.contactedBy === user?.email && (
                  <span className="badge" style={{ background: "#dbeafe", color: "#2563eb", fontSize: 11, border: "1px solid #2563eb44" }}>You</span>
                )}
              </div>
            ) : (
              <span className="badge" style={{ background: "var(--cream-2)", color: "var(--latte)", fontSize: 12 }}>
                Uncontacted
              </span>
            )}
          </div>

          {/* Show Assigned To separately only when it differs from Contacted By */}
          {prospect.assignedTo && prospect.assignedTo !== prospect.contactedBy && (
            <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--latte)", marginBottom: 2 }}>
                Assigned To
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--coffee)", display: "flex", alignItems: "center", gap: 8 }}>
                {prospect.assignedTo}
                {prospect.assignedTo === user?.email && (
                  <span className="badge" style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, border: "1px solid #16a34a44" }}>You</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Assign dropdown — admin/superadmin only */}
        {isPrivileged && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select
              className="input"
              style={{ width: "auto", minWidth: 200 }}
              value={assignTarget}
              onChange={(e) => setAssignTarget(e.target.value)}
            >
              <option value="">— Unassigned —</option>
              {teamMembers.map((m) => (
                <option key={m.uid} value={m.email}>
                  {m.email} ({m.role})
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAssign}
              disabled={assigning || !assignTarget || assignTarget === (prospect.assignedTo || "")}
            >
              {assigning ? "Saving…" : "Assign"}
            </button>
            {prospect.assignedTo && (
              <button
                className="btn btn-sm btn-danger"
                onClick={handleUnassign}
                disabled={assigning}
              >
                Unassign
              </button>
            )}
            {assignMsg && (
              <span style={{ fontSize: 12, color: assignMsg.includes("Unassigned") || assignMsg.includes("success") ? "var(--success)" : "var(--danger)" }}>
                {assignMsg}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div className="detail-grid">
          {DETAIL_FIELDS.map(([key, label]) => (
            <div key={key} className="detail-item">
              <span className="field-label">{label}</span>
              <div className="value">{prospect[key] || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button className={`tab-btn ${tab === "calls" ? "active" : ""}`} onClick={() => setTab("calls")}>Call Log</button>
        <button className={`tab-btn ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>Notes</button>
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === "notes"
          ? <NotesPanel prospectId={id} />
          : <CallsPanel prospectId={id} onCallLogged={load} />
        }
      </div>

      {showEdit && (
        <EditProspectModal
          prospect={prospect}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setProspect(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
