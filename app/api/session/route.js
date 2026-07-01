import { adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "webdev_crm_session";
const EXPIRES_IN = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return Response.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the token and pull the role custom claim (set via scripts/set-role.js
    // or the /admin/users screen) onto the session cookie itself.
    const decoded = await adminAuth.verifyIdToken(idToken);
    const role = decoded.role || "staff";

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: EXPIRES_IN });

    cookies().set(COOKIE_NAME, sessionCookie, {
      maxAge: EXPIRES_IN / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return Response.json({ ok: true, role, email: decoded.email });
  } catch (err) {
    console.error("Session creation failed:", err);
    return Response.json({ error: "Could not create session" }, { status: 401 });
  }
}

export async function DELETE() {
  cookies().delete(COOKIE_NAME);
  return Response.json({ ok: true });
}
