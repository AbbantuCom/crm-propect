import { adminAuth } from "@/lib/firebase-admin";
import { requireRole, ROLES } from "@/lib/auth";

// Returns all team members' emails — accessible to any authenticated user
// so that the assign dropdown can be populated for admins.
export async function GET() {
  const { error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  try {
    const list = await adminAuth.listUsers(1000);
    const members = list.users
      .filter((u) => !u.disabled)
      .map((u) => ({ uid: u.uid, email: u.email, role: u.customClaims?.role || "staff" }))
      .sort((a, b) => a.email.localeCompare(b.email));

    return Response.json({ items: members });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
