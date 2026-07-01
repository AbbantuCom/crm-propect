import { dbConnect } from "@/lib/mongodb";
import Call from "@/models/Call";
import { requireRole, ROLES } from "@/lib/auth";

async function getCallAndCheck(callId, user) {
  const call = await Call.findById(callId);
  if (!call) return { call: null, authError: Response.json({ error: "Not found" }, { status: 404 }) };
  const isOwner = call.createdBy === user.email;
  const isPrivileged = user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;
  if (!isOwner && !isPrivileged) {
    return { call: null, authError: Response.json({ error: "Not authorized" }, { status: 403 }) };
  }
  return { call, authError: null };
}

export async function PUT(request, { params }) {
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();
  const { call, authError } = await getCallAndCheck(params.callId, user);
  if (authError) return authError;

  const body = await request.json();
  if (body.outcome) call.outcome = body.outcome;
  if (body.notes !== undefined) call.notes = body.notes;
  if (body.date) call.date = new Date(body.date);
  await call.save();

  return Response.json({ item: call });
}

export async function DELETE(request, { params }) {
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();
  const { call, authError } = await getCallAndCheck(params.callId, user);
  if (authError) return authError;

  await call.deleteOne();
  return Response.json({ ok: true });
}
