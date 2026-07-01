import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "webdev_crm_session";

// Roles, from least to most privileged
export const ROLES = {
  STAFF: "staff",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
};

/**
 * Reads the session cookie (set at login) and verifies it against Firebase.
 * Returns { uid, email, role } or null if not authenticated.
 */
export async function getCurrentUser() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = decoded.role || ROLES.STAFF;
    return {
      uid: decoded.uid,
      email: decoded.email,
      role,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Throws-free guard for API routes. Returns { user, error } where error
 * is a Response to return immediately if the check fails.
 */
export async function requireRole(minRole) {
  const order = [ROLES.STAFF, ROLES.ADMIN, ROLES.SUPERADMIN];
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, error: new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 }) };
  }

  if (order.indexOf(user.role) < order.indexOf(minRole)) {
    return { user, error: new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 }) };
  }

  return { user, error: null };
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
