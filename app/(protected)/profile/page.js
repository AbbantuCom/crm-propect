"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

export default function ProfilePage() {
  const user   = useUser();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  async function handleChangePassword(e) {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    try {
      const res  = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setSuccess("Password updated. You will be logged out to sign in with your new password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Sign out after a brief pause so user sees the success message
      setTimeout(async () => {
        await fetch("/api/session", { method: "DELETE" });
        try { await signOut(auth); } catch (_) {}
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const ROLE_LABELS = { staff: "Staff", admin: "Admin", superadmin: "Super Admin" };

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="section-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">View your account info and update your password.</p>
        </div>
      </div>

      {/* Account info */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>Account Details</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="field-label">Email</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--coffee)" }}>{user?.email || "—"}</div>
          </div>
          <div>
            <div className="field-label">Role</div>
            <span className="role-badge">{ROLE_LABELS[user?.role] || user?.role || "—"}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>Change Password</h2>
        <p className="page-subtitle" style={{ margin: "0 0 20px" }}>
          You will be logged out automatically after a successful change.
        </p>

        {success && (
          <div style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-row">
            <label className="field-label">Current Password</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-row">
            <label className="field-label">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="form-row">
            <label className="field-label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
