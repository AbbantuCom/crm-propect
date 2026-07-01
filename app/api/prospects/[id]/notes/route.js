import { dbConnect } from "@/lib/mongodb";
import Note from "@/models/Note";
import { requireRole, ROLES } from "@/lib/auth";

export async function GET(request, { params }) {
  const { error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();
  const notes = await Note.find({ prospect: params.id }).sort({ date: -1 }).lean();
  return Response.json({ items: notes });
}

export async function POST(request, { params }) {
  // Staff CAN add notes — that's allowed even though they can't edit the prospect record.
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();
  const body = await request.json();

  if (!body.title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const note = await Note.create({
    prospect: params.id,
    title: body.title,
    details: body.details || "",
    date: body.date ? new Date(body.date) : new Date(),
    createdBy: user.email,
  });

  return Response.json({ item: note }, { status: 201 });
}
