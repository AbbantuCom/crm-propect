"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { SALES_STATUSES } from "@/components/SalesStatusSelect";
import RowActionsDropdown from "@/components/RowActionsDropdown";
import ProspectActionsModal from "@/components/ProspectActionsModal";

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

function OutcomePill({ value }) {
  const c = OUTCOME_COLORS[value] || OUTCOME_COLORS.other;
  return (
    <span className="badge" style={{ color: c.color, background: c.bg }}>
      {OUTCOME_LABELS[value] || value}
    </span>
  );
}

function StatusPill({ value }) {
  const s = SALES_STATUSES.find((x) => x.value === value) || SALES_STATUSES[0];
  return (
    <span className="badge" style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  );
}

export default function AllActivityPage() {
  const user   = useUser();
  const router = useRouter();

  const isPrivileged = user?.role === "admin" || user?.role === "superadmin";
  function canActOn(item) {
    if (isPrivileged) return true;
    if (!item.contactedBy && !item.assignedTo) return true;
    return item.contactedBy === user?.email || item.assignedTo === user?.email;
  }

  const [items,       setItems]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [userList,    setUserList]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeAction, setActiveAction] = useState(null);

  // Filter state
  const [search,   setSearch]   = useState("");
  const [outcome,  setOutcome]  = useState("");
  const [selUser,  setSelUser]  = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  // Stale-closure fix
  const stateRef = useRef({});
  stateRef.current = { search, outcome, selUser, dateFrom, dateTo, page };

  const load = useCallback(async (opts = {}) => {
    const s = stateRef.current;
    setLoading(true);
    const params = new URLSearchParams({
      page:     String(opts.page     ?? s.page),
      search:   opts.search   ?? s.search,
      outcome:  opts.outcome  ?? s.outcome,
      user:     opts.selUser  ?? s.selUser,
      dateFrom: opts.dateFrom ?? s.dateFrom,
      dateTo:   opts.dateTo   ?? s.dateTo,
    });
    try {
      const res  = await fetch(`/api/admin/activity?${params}`);
      const text = await res.text();
      if (!text) throw new Error("Empty response from server");
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      if (data.users?.length) setUserList(data.users);
    } catch (err) {
      console.error("[AllActivity]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Immediate re-fetch for dropdown filters
  useEffect(() => { load({ page: 1, outcome, selUser, dateFrom, dateTo }); }, [outcome, selUser, dateFrom, dateTo]);

  // Debounced re-fetch for text search
  useEffect(() => {
    const t = setTimeout(() => load({ page: 1, search }), 400);
    return () => clearTimeout(t);
  }, [search]);

  function reset() {
    setSearch(""); setOutcome(""); setSelUser(""); setDateFrom(""); setDateTo(""); setPage(1);
    load({ page: 1, search: "", outcome: "", selUser: "", dateFrom: "", dateTo: "" });
  }

  function goPage(p) { setPage(p); load({ page: p }); }

  function openActions(item, tab) {
    setActiveAction({
      prospectId:  String(item.prospectId),
      companyName: item.companyName,
      salesStatus: item.salesStatus || "new",
      tab,
    });
  }

  if (user && user.role === "staff") {
    return (
      <div className="container">
        <div className="empty-state">You do not have permission to view this page.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="section-header">
        <div>
          <h1 className="page-title">All Team Activity</h1>
          <p className="page-subtitle">Every call log from all staff and admins.</p>
        </div>
        {!loading && (
          <span style={{ fontSize: 13, color: "var(--latte)", fontWeight: 600 }}>
            {total} call{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="filters-row">
        <input
          className="input"
          placeholder="Search company or user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          <option value="">All Outcomes</option>
          {Object.entries(OUTCOME_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select className="input" value={selUser} onChange={(e) => setSelUser(e.target.value)}>
          <option value="">All Users</option>
          {userList.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <input
          type="date"
          className="input"
          title="From date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="input"
          title="To date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />

        <button className="btn btn-sm" onClick={reset}>Reset</button>
      </div>

      {loading ? (
        <div className="empty-state">Loading activity…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <p style={{ color: "var(--latte)", margin: 0 }}>No call logs match your filters.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Category</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Outcome</th>
                  <th>Notes</th>
                  <th>Sales Status</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={String(item._id)}
                    className="table-row-link"
                    onClick={() => router.push(`/prospects/${item.prospectId}`)}
                  >
                    <td className="link-row">{item.companyName || "—"}</td>
                    <td>{item.category || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--latte)" }}>{item.createdBy}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td><OutcomePill value={item.outcome} /></td>
                    <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "var(--latte)" }}>
                      {item.notes || "—"}
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

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                ← Prev
              </button>
              <span style={{ fontSize: 13, color: "var(--latte)" }}>
                Page {page} of {totalPages}
              </span>
              <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {activeAction && (
        <ProspectActionsModal
          prospectId={activeAction.prospectId}
          companyName={activeAction.companyName}
          initialTab={activeAction.tab}
          currentStatus={activeAction.salesStatus}
          onAction={() => load({ page })}
          onStatusChange={(next) => {
            setActiveAction((a) => ({ ...a, salesStatus: next }));
            load({ page });
          }}
          onClose={() => {
            setActiveAction(null);
            load({ page });
          }}
        />
      )}
    </div>
  );
}
