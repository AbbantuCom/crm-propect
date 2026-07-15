import { dbConnect } from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import Call from "@/models/Call";
import { requireRole, ROLES } from "@/lib/auth";

export async function GET(request, { params }) {
  const { error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();
  let prospect = await Prospect.findById(params.id).lean();
  if (!prospect) return Response.json({ error: "Not found" }, { status: 404 });

  // Sync contactedBy / assignedTo with actual call logs
  const firstCall = await Call.findOne({ prospect: params.id }).sort({ date: 1 }).lean();
  if (firstCall?.createdBy) {
    // Has calls — backfill if fields are missing
    const patch = {};
    if (!prospect.contactedBy) patch.contactedBy = firstCall.createdBy;
    if (!prospect.assignedTo)  patch.assignedTo  = firstCall.createdBy;
    if (Object.keys(patch).length > 0) {
      await Prospect.updateOne({ _id: params.id }, { $set: patch });
      prospect = { ...prospect, ...patch };
    }
  } else if (prospect.contactedBy) {
    // No calls at all — clear stale contactedBy (and assignedTo if it matched)
    const stale = prospect.contactedBy;
    await Prospect.findOneAndUpdate(
      { _id: params.id },
      [{
        $set: {
          contactedBy: null,
          assignedTo: { $cond: [{ $eq: ["$assignedTo", stale] }, null, "$assignedTo"] },
        },
      }]
    );
    prospect = {
      ...prospect,
      contactedBy: null,
      assignedTo: prospect.assignedTo === stale ? null : prospect.assignedTo,
    };
  }

  return Response.json({ item: prospect });
}

export async function PUT(request, { params }) {
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();

  // Check if this user is allowed to edit: admin/superadmin, or the assigned staff member
  const existing = await Prospect.findById(params.id).lean();
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const isPrivileged   = user.role === "admin" || user.role === "superadmin";
  const isContactedBy  = existing.contactedBy === user.email;
  const isAssignee     = existing.assignedTo  === user.email;

  if (!isPrivileged && !isContactedBy && !isAssignee) {
    return Response.json({ error: "You are not assigned to this prospect" }, { status: 403 });
  }

  const body = await request.json();
  const prospect = await Prospect.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });

  return Response.json({ item: prospect });
}

export async function PATCH(request, { params }) {
  try {
    const { user, error } = await requireRole(ROLES.STAFF);
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // ── Reassign prospect (admin/superadmin only) ──
    if ("assignedTo" in body) {
      if (user.role !== "admin" && user.role !== "superadmin") {
        return Response.json({ error: "Only admins can reassign prospects" }, { status: 403 });
      }
      const prospect = await Prospect.findByIdAndUpdate(
        params.id,
        { $set: { assignedTo: body.assignedTo || null } },
        { new: true }
      );
      if (!prospect) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ item: prospect });
    }

    // ── Sales status update (any staff) ──
    if ("salesStatus" in body) {
      const allowed = ["new", "contacted", "interested", "proposal_sent", "negotiating", "won", "lost", "not_interested"];
      if (!allowed.includes(body.salesStatus)) {
        return Response.json({ error: "Invalid salesStatus" }, { status: 400 });
      }
      const prospect = await Prospect.findByIdAndUpdate(
        params.id,
        { $set: { salesStatus: body.salesStatus } },
        { new: true }
      );
      if (!prospect) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ item: prospect });
    }

    // ── Website status update (any staff) ──
    if ("hasWebsite" in body) {
      const prospect = await Prospect.findByIdAndUpdate(
        params.id,
        { $set: { hasWebsite: Boolean(body.hasWebsite) } },
        { new: true, strict: false }
      );
      if (!prospect) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ item: prospect });
    }

    // ── Call status update (any staff) ──
    if ("callStatus" in body) {
      const allowed = ["not_called", "called", "no_answer", "voicemail", "callback", "interested", "not_interested", "do_not_call"];
      if (!allowed.includes(body.callStatus)) {
        return Response.json({ error: "Invalid callStatus" }, { status: 400 });
      }
      const prospect = await Prospect.findByIdAndUpdate(
        params.id,
        { $set: { callStatus: body.callStatus } },
        { new: true, strict: false }
      );
      if (!prospect) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ item: prospect });
    }

    return Response.json({ error: "Nothing to update" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/prospects/[id]]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  // Staff cannot delete prospects.
  const { error } = await requireRole(ROLES.ADMIN);
  if (error) return error;

  await dbConnect();
  const prospect = await Prospect.findByIdAndDelete(params.id);
  if (!prospect) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}
