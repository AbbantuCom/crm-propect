import { adminAuth } from "@/lib/firebase-admin";
import { requireRole, ROLES } from "@/lib/auth";

export async function PATCH(request) {
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return Response.json({ error: "Both current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return Response.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  // Verify current password using Firebase Auth REST API
  const verifyRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: currentPassword, returnSecureToken: false }),
    }
  );

  if (!verifyRes.ok) {
    const data = await verifyRes.json().catch(() => ({}));
    const code = data.error?.message || "";
    const msg =
      code === "INVALID_PASSWORD" || code === "INVALID_LOGIN_CREDENTIALS"
        ? "Current password is incorrect"
        : "Could not verify current password";
    return Response.json({ error: msg }, { status: 400 });
  }

  // Update password via Admin SDK and revoke existing sessions
  await adminAuth.updateUser(user.uid, { password: newPassword });
  await adminAuth.revokeRefreshTokens(user.uid);

  return Response.json({ ok: true });
}
