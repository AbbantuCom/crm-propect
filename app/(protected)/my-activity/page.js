"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { SALES_STATUSES } from "@/components/SalesStatusSelect";
import CallStatusSelect from "@/components/CallStatusSelect";
import ProspectActionsModal from "@/components/ProspectActionsModal";
import RowActionsDropdown from "@/components/RowActionsDropdown";

const OUTCOME_LABELS = {
  interested:     "Interested",
  not_interested: "Not Interested",
  no_answer:      "No Answer",
  call_back:      "Call Back Later",
  voicemail:      "Left Voicemail",
  other:          "Other",
};

const OUTCOME_COLORS = {
  interested:     { color: "#16a34a", bg: "#dcfce7" },
  not_interested: { color: "#dc2626", bg: "#fee2e2" },
  no_answer:      { color: "#9ca3af", bg: "#f9fafb" },
  call_back:      { color: "#d97706", bg: "#fef3c7" },
  voicemail:      { color: "#7c3aed", bg: "#ede9fe" },
  other:          { color: "#6b7280", bg: "#f3f4f6" },
};

function StatusPill({ value }) {
  const s = SALES_STATUSES.find((x) => x.value === value) || SALES_STATUSES[0];
  return (
    <span className="badge" style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  );
}

function OutcomePill({ value }) {
  const c = OUTCOME_COLORS[value] || OUTCOME_COLORS.other;
  return (
    <span className="badge" style={{ color: c.color, background: c.bg }}>
      {OUTCOME_LABELS[value] || value}
    </span>
  );
}

export default function MyActivityPage() {
  const user   = useUser();
  const router = useRouter();
  const [items,        setItems]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [activeAction, setActiveAction] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res  = await fetch("/api/my-calls", { cache: "no-store" });
      const data = await res.json();
      const normalized = (data.items || []).map((x) => ({
        ...x,
        prospectId: String(x.prospectId),
      }));
      setItems(normalized);
    } catch (_) {}
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const isPrivileged = user?.role === "admin" || user?.role === "superadmin";

  function canActOn(item) {
    if (isPrivileged) return true;
    if (!item.contactedBy && !item.assignedTo) return true;
    return item.contactedBy === user?.email || item.assignedTo === user?.email;
  }

  function openActions(item, tab) {
    setActiveAction({
      prospectId:  String(item.prospectId),
      companyName: item.companyName,
      salesStatus: item.salesStatus || "new",
      tab,
    });
  }

  return (
    <div className="container">
      <div className="section-header">
        <div>
          <h1 className="page-title">My Activity</h1>
          <p className="page-subtitle">
            Prospects you have logged calls for, sorted by most recent interaction.
          </p>
        </div>
        {!loading && (
          <span style={{ fontSize: 13, color: "var(--latte)", fontWeight: 600 }}>
            {items.length} prospect{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="empty-state">Loading your activity…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📞</div>
          <p style={{ color: "var(--latte)", margin: 0 }}>
            You haven't logged any calls yet. Go to a prospect and log your first call.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Last Call</th>
                <th>Last Outcome</th>
                <th>Total Calls</th>
                <th>Call Status</th>
                <th>Sales Status</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.prospectId}
                  className="table-row-link"
                  onClick={() => router.push(`/prospects/${item.prospectId}`)}
                >
                  <td className="link-row">{item.companyName}</td>
                  <td>{item.category || "—"}</td>
                  <td>{item.contactPerson || item.mobile || item.tel || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(item.lastCallDate).toLocaleDateString()}
                  </td>
                  <td><OutcomePill value={item.lastOutcome} /></td>
                  <td style={{ textAlign: "center" }}>
                    <span className="badge" style={{ background: "var(--cream-2)", color: "var(--coffee)", minWidth: 24, justifyContent: "center" }}>
                      {item.totalCalls}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {canActOn(item) ? (
                      <CallStatusSelect
                        prospectId={item.prospectId}
                        value={item.callStatus || "not_called"}
                        onChange={(next) => {
                          setItems((prev) => prev.map((x) => x.prospectId === item.prospectId ? { ...x, callStatus: next } : x));
                        }}
                      />
                    ) : (
                      <span className="badge" style={{ color: "var(--latte)", background: "var(--cream-2)" }}>
                        {item.callStatus || "not_called"}
                      </span>
                    )}
                  </td>
                  <td><StatusPill value={item.salesStatus || "new"} /></td>
                  <td onClick={(e) => e.stopPropagation()} style={{ padding: "6px 8px" }}>
                    {canActOn(item) && (
                      <RowActionsDropdown onAction={(tab) => openActions(item, tab)} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeAction && (
        <ProspectActionsModal
          prospectId={activeAction.prospectId}
          companyName={activeAction.companyName}
          initialTab={activeAction.tab}
          currentStatus={activeAction.salesStatus}
          onAction={refresh}
          onStatusChange={(next) => {
            setActiveAction((a) => ({ ...a, salesStatus: next }));
            refresh();
          }}
          onClose={() => {
            setActiveAction(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
