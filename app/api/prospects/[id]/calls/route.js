import { dbConnect } from "@/lib/mongodb";
import Call from "@/models/Call";
import Prospect from "@/models/Prospect";
import { requireRole, ROLES } from "@/lib/auth";

export async function GET(request, { params }) {
  const { error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();
  const calls = await Call.find({ prospect: params.id }).sort({ date: -1 }).lean();
  return Response.json({ items: calls });
}

export async function POST(request, { params }) {
  // Staff CAN log calls.
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();
  const body = await request.json();

  const call = await Call.create({
    prospect: params.id,
    outcome: body.outcome || "other",
    notes: body.notes || "",
    date: body.date ? new Date(body.date) : new Date(),
    createdBy: user.email,
  });

  // contactedBy = first caller ever (never overwritten)
  // assignedTo  = starts as first caller; admin can later reassign
  await Promise.all([
    Prospect.updateOne(
      { _id: params.id, contactedBy: { $in: [null, "", undefined] } },
      { $set: { contactedBy: user.email } }
    ),
    Prospect.updateOne(
      { _id: params.id, assignedTo: { $in: [null, "", undefined] } },
      { $set: { assignedTo: user.email } }
    ),
  ]);

  return Response.json({ item: call }, { status: 201 });
}
