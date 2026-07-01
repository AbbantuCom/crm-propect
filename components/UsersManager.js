"use client";

import { useEffect, useState, useCallback } from "react";
import PasswordInput from "@/components/PasswordInput";

const ALL_ROLES = [
  ["staff", "Staff"],
  ["admin", "Admin"],
  ["superadmin", "Super Admin"],
];

export default function UsersManager({ currentUserRole }) {
  const isSuperAdmin = currentUserRole === "superadmin";
  const assignableRoles = isSuperAdmin ? ALL_ROLES : ALL_ROLES.filter(([v]) => v === "staff");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!isSuperAdmin) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.items || []);
    setLoading(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create user");
      setEmail("");
      setPassword("");
      setRole("staff");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(uid, newRole) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, role: newRole }),
    });
    load();
  }

  async function toggleDisabled(uid, currentlyDisabled) {
    const action = currentlyDisabled ? "enable" : "disable";
    if (!confirm(`${action === "disable" ? "Disable" : "Re-enable"} this team member?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, disabled: !currentlyDisabled }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Failed"); return; }
    load();
  }

  return (
    <div>
      <form className="card" style={{ padding: 20, marginBottom: 24, maxWidth: 560 }} onSubmit={handleCreate}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Add team member</h2>
        <div className="detail-grid" style={{ marginBottom: 12 }}>
          <div className="form-row">
            <label className="field-label">Email</label>
            <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="field-label">Temporary Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div className="form-row">
            <label className="field-label">Role</label>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              {assignableRoles.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "Creating..." : "Create Account"}
        </button>
      </form>

      {isSuperAdmin && (
        <>
          <div className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Change Role</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.uid} style={{ opacity: u.disabled ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 500 }}>{u.email}</td>
                      <td>
                        <span className="role-badge" style={{ background: "#705c4e" }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.disabled ? (
                          <span className="badge" style={{ color: "#dc2626", background: "#fee2e2", border: "1px solid #dc262644" }}>
                            Disabled
                          </span>
                        ) : (
                          <span className="badge" style={{ color: "#16a34a", background: "#dcfce7", border: "1px solid #16a34a44" }}>
                            Active
                          </span>
                        )}
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <select
                          className="select"
                          value={u.role}
                          disabled={u.disabled}
                          onChange={(e) => changeRole(u.uid, e.target.value)}
                          style={{ width: "auto", minWidth: 110 }}
                        >
                          {ALL_ROLES.map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm${u.disabled ? "" : " btn-danger"}`}
                          onClick={() => toggleDisabled(u.uid, u.disabled)}
                          style={u.disabled ? { color: "#16a34a", borderColor: "#16a34a" } : {}}
                        >
                          {u.disabled ? "Re-enable" : "Disable"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="page-subtitle" style={{ marginTop: 12 }}>
            Role changes take effect the next time that person signs in (or within about an hour, when their session
            refreshes automatically).
          </p>
        </>
      )}
    </div>
  );
}
