import { redirect } from "next/navigation";
import { getCurrentUser, ROLES } from "@/lib/auth";
import UsersManager from "@/components/UsersManager";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canAccess = user.role === ROLES.SUPERADMIN || user.role === ROLES.ADMIN;
  if (!canAccess) {
    return (
      <div className="container">
        <div className="error-text">You do not have permission to manage team members.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Team</h1>
      <p className="page-subtitle">
        {user.role === ROLES.SUPERADMIN
          ? "Create staff and admin accounts, and change roles."
          : "Invite staff members to the team."}
      </p>
      <UsersManager currentUserRole={user.role} />
    </div>
  );
}
