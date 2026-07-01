import { adminAuth } from "@/lib/firebase-admin";

export async function GET() {
  const list = await adminAuth.listUsers(1);
  return Response.json({ needsSetup: list.users.length === 0 });
}

export async function POST(request) {
  const list = await adminAuth.listUsers(1);
  if (list.users.length > 0) {
    return Response.json({ error: "Setup already complete" }, { status: 403 });
  }

  const { email, password } = await request.json();
  if (!email || !password) {
    return Response.json({ error: "email and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const userRecord = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(userRecord.uid, { role: "superadmin" });

  return Response.json({ ok: true }, { status: 201 });
}
