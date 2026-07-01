"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

export default function Navbar({ email, role }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    try {
      await signOut(auth);
    } catch (e) {
      // ignore, cookie session is already cleared server-side
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <span className="brand">WebDev CRM</span>
        <div className="nav-links">
          <Link href="/dashboard">Prospects</Link>
          {(role === "admin" || role === "superadmin") && <Link href="/admin/upload">Upload Sheet</Link>}
          {role === "superadmin" && <Link href="/admin/users">Team</Link>}
        </div>
      </div>
      <div className="nav-right">
        <span>{email}</span>
        <span className="role-badge">{role}</span>
        <button className="btn btn-sm" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </nav>
  );
}
