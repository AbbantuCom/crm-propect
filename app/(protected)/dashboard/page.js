"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import AddProspectModal from "@/components/AddProspectModal";
import RowActionsDropdown from "@/components/RowActionsDropdown";
import ProspectActionsModal from "@/components/ProspectActionsModal";
import SalesStatusSelect from "@/components/SalesStatusSelect";

export default function DashboardPage() {
  const user = useUser();
  const router = useRouter();
  const canManage    = user?.role === "admin" || user?.role === "superadmin";
  const isPrivileged = canManage;

  function canActOn(p) {
    if (isPrivileged) return true;
    if (!p.contactedBy && !p.assignedTo) return true; // uncontacted: anyone can act
    return p.contactedBy === user?.email || p.assignedTo === user?.email;
  }

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [hasWebsite, setHasWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // { prospectId, companyName, tab }

  const stateRef = useRef({});
  stateRef.current = { search, category, hasWebsite, location, page };

  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    setError("");
    const s = stateRef.current;
    const params = new URLSearchParams({
      page: String(opts.page ?? s.page),
      search: opts.search ?? s.search,
      category: opts.category ?? s.category,
      hasWebsite: opts.hasWebsite ?? s.hasWebsite,
      location: opts.location ?? s.location,
    });

    try {
      const res = await fetch(`/api/prospects?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load prospects");
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCategories(data.categories);
      setPage(data.page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dropdowns fire immediately; text inputs are debounced 400 ms
  useEffect(() => {
    load({ page: 1, category, hasWebsite });
  }, [category, hasWebsite]);

  useEffect(() => {
    const timer = setTimeout(() => load({ page: 1, search, location }), 400);
    return () => clearTimeout(timer);
  }, [search, location]);

  function resetFilters() {
    setSearch("");
    setCategory("");
    setHasWebsite("");
    setLocation("");
    load({ page: 1, search: "", category: "", hasWebsite: "", location: "" });
  }

  return (
    <div className="container">
      <div className="section-header">
        <div>
          <h1 className="page-title">Prospects</h1>
          <p className="page-subtitle">
            {total.toLocaleString()} companies in the list
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add Prospect
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="filter-item" style={{ flex: 2, minWidth: 220 }}>
          <label className="field-label">Search</label>
          <input
            className="input"
            placeholder="Company, contact, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label className="field-label">Category</label>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label className="field-label">Website</label>
          <select className="select" value={hasWebsite} onChange={(e) => setHasWebsite(e.target.value)}>
            <option value="">All</option>
            <option value="yes">Has website</option>
            <option value="no">No website</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="field-label">Location / Address</label>
          <input className="input" placeholder="e.g. Jinja Road" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>

        <div className="filter-item" style={{ display: "flex", alignItems: "flex-end", minWidth: "auto" }}>
          <button type="button" className="btn" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Category</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Website</th>
              <th>Contacted By</th>
              <th>Sales Status</th>
              <th style={{ width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="empty-state">
                  Loading prospects...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-state">
                  No prospects match these filters.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr
                  key={p._id}
                  className="table-row-link"
                  onClick={() => router.push(`/prospects/${p._id}`)}
                >
                  <td className="link-row">{p.companyName}</td>
                  <td>{p.category || "—"}</td>
                  <td>{p.contactPerson || "—"}</td>
                  <td>{p.mobile || p.tel || "—"}</td>
                  <td>
                    <span className={`badge ${p.hasWebsite ? "badge-yes" : "badge-no"}`}>
                      {p.hasWebsite ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--latte)" }}>
                    {p.contactedBy ? (
                      <span title={p.contactedBy}>
                        {p.contactedBy === user?.email
                          ? <span style={{ color: "#2563eb", fontWeight: 600 }}>You</span>
                          : p.contactedBy.split("@")[0]}
                      </span>
                    ) : (
                      <span style={{ color: "var(--latte-light)" }}>Uncontacted</span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {canActOn(p) ? (
                      <SalesStatusSelect
                        prospectId={p._id}
                        value={p.salesStatus || "new"}
                        onChange={(next) => {
                          setItems((prev) => prev.map((x) => x._id === p._id ? { ...x, salesStatus: next } : x));
                        }}
                      />
                    ) : (
                      <span className="badge" style={{ color: "var(--latte)", background: "var(--cream-2)" }}>
                        {p.salesStatus || "new"}
                      </span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()} style={{ padding: "6px 8px" }}>
                    {canActOn(p) && (
                      <RowActionsDropdown
                        onAction={(tab) =>
                          setActiveAction({ prospectId: p._id, companyName: p.companyName, salesStatus: p.salesStatus || "new", tab })
                        }
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => load({ page: page - 1 })}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => load({ page: page + 1 })}>
            Next
          </button>
        </div>
      )}

      {showAdd && (
        <AddProspectModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load({ page: 1 });
          }}
        />
      )}

      {activeAction && (
        <ProspectActionsModal
          prospectId={activeAction.prospectId}
          companyName={activeAction.companyName}
          initialTab={activeAction.tab}
          currentStatus={activeAction.salesStatus}
          onStatusChange={(next) => {
            setActiveAction((a) => ({ ...a, salesStatus: next }));
            setItems((prev) =>
              prev.map((x) => x._id === activeAction.prospectId ? { ...x, salesStatus: next } : x)
            );
          }}
          onClose={() => setActiveAction(null)}
        />
      )}
    </div>
  );
}
