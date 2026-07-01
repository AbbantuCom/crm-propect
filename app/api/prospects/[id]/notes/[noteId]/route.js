import { dbConnect } from "@/lib/mongodb";
import Note from "@/models/Note";
import { requireRole, ROLES } from "@/lib/auth";

async function getNoteAndCheck(noteId, user) {
  const note = await Note.findById(noteId);
  if (!note) return { note: null, authError: Response.json({ error: "Not found" }, { status: 404 }) };
  const isOwner = note.createdBy === user.email;
  const isPrivileged = user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;
  if (!isOwner && !isPrivileged) {
    return { note: null, authError: Response.json({ error: "Not authorized" }, { status: 403 }) };
  }
  return { note, authError: null };
}

export async function PUT(request, { params }) {
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();
  const { note, authError } = await getNoteAndCheck(params.noteId, user);
  if (authError) return authError;

  const body = await request.json();
  if (body.title) note.title = body.title;
  if (body.details !== undefined) note.details = body.details;
  if (body.date) note.date = new Date(body.date);
  await note.save();

  return Response.json({ item: note });
}

export async function DELETE(request, { params }) {
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();
  const { note, authError } = await getNoteAndCheck(params.noteId, user);
  if (authError) return authError;

  await note.deleteOne();
  return Response.json({ ok: true });
}
