import { adminAuth } from "@/lib/firebase-admin";
import { requireRole, ROLES } from "@/lib/auth";

export async function GET() {
  const { error } = await requireRole(ROLES.SUPERADMIN);
  if (error) return error;

  const list = await adminAuth.listUsers(1000);
  const users = list.users.map((u) => ({
    uid: u.uid,
    email: u.email,
    role: u.customClaims?.role || "staff",
    createdAt: u.metadata.creationTime,
    disabled: u.disabled,
  }));

  return Response.json({ items: users });
}

export async function POST(request) {
  const { user, error } = await requireRole(ROLES.ADMIN);
  if (error) return error;

  const { email, password, role } = await request.json();
  if (!email || !password) {
    return Response.json({ error: "email and password are required" }, { status: 400 });
  }

  // Admins can only create staff; superadmins can create any role
  const allowedRoles =
    user.role === ROLES.SUPERADMIN
      ? [ROLES.STAFF, ROLES.ADMIN, ROLES.SUPERADMIN]
      : [ROLES.STAFF];

  if (!allowedRoles.includes(role)) {
    return Response.json({ error: "You are not allowed to assign that role" }, { status: 403 });
  }

  const userRecord = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(userRecord.uid, { role });

  return Response.json({ ok: true, uid: userRecord.uid }, { status: 201 });
}

export async function PUT(request) {
  const { error } = await requireRole(ROLES.SUPERADMIN);
  if (error) return error;

  const { uid, role } = await request.json();
  if (!uid || ![ROLES.STAFF, ROLES.ADMIN, ROLES.SUPERADMIN].includes(role)) {
    return Response.json({ error: "uid and a valid role are required" }, { status: 400 });
  }

  await adminAuth.setCustomUserClaims(uid, { role });
  return Response.json({ ok: true });
}

export async function PATCH(request) {
  const { user, error } = await requireRole(ROLES.SUPERADMIN);
  if (error) return error;

  const { uid, disabled } = await request.json();
  if (!uid || typeof disabled !== "boolean") {
    return Response.json({ error: "uid and disabled (boolean) are required" }, { status: 400 });
  }

  // Prevent superadmin from disabling themselves
  const target = await adminAuth.getUser(uid);
  if (target.email === user.email) {
    return Response.json({ error: "You cannot disable your own account" }, { status: 403 });
  }

  await adminAuth.updateUser(uid, { disabled });

  if (disabled) {
    // Revoke all existing sessions so the member is logged out immediately
    await adminAuth.revokeRefreshTokens(uid);
  }

  return Response.json({ ok: true });
}
