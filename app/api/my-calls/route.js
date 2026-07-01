import { dbConnect } from "@/lib/mongodb";
import Call from "@/models/Call";
import Prospect from "@/models/Prospect";
import { requireRole, ROLES } from "@/lib/auth";

export async function GET() {
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();

  // Call stats for every prospect this user has personally called
  const callStats = await Call.aggregate([
    { $match: { createdBy: user.email } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: "$prospect",
        lastCallDate: { $first: "$date" },
        lastOutcome:  { $first: "$outcome" },
        lastNotes:    { $first: "$notes" },
        totalCalls:   { $sum: 1 },
      },
    },
  ]);

  const calledIds = callStats.map((s) => s._id);
  const statsMap  = {};
  for (const s of callStats) statsMap[String(s._id)] = s;

  // All prospects the user has called OR that are assigned to them
  const prospects = await Prospect.find({
    $or: [
      { _id: { $in: calledIds } },
      { assignedTo: user.email },
    ],
  }).lean();

  // Backfill contactedBy / assignedTo for legacy prospects missing these fields.
  const needsBackfill = prospects.filter((p) => !p.contactedBy).map((p) => p._id);
  if (needsBackfill.length > 0) {
    const firstCalls = await Call.aggregate([
      { $match: { prospect: { $in: needsBackfill } } },
      { $sort: { date: 1 } },
      { $group: { _id: "$prospect", firstCaller: { $first: "$createdBy" } } },
    ]);
    if (firstCalls.length > 0) {
      const callMap = {};
      for (const c of firstCalls) callMap[String(c._id)] = c.firstCaller;
      for (const p of prospects) {
        const caller = callMap[String(p._id)];
        if (!p.contactedBy && caller) p.contactedBy = caller;
        if (!p.assignedTo  && caller) p.assignedTo  = caller;
      }
      for (const c of firstCalls) {
        Prospect.updateOne(
          { _id: c._id, contactedBy: { $in: [null, "", undefined] } },
          { $set: { contactedBy: c.firstCaller } }
        ).exec();
        Prospect.updateOne(
          { _id: c._id, assignedTo: { $in: [null, "", undefined] } },
          { $set: { assignedTo: c.firstCaller } }
        ).exec();
      }
    }
  }

  const items = prospects.map((p) => {
    const s = statsMap[String(p._id)] || {};
    return {
      prospectId:   p._id,
      companyName:  p.companyName,
      category:     p.category,
      salesStatus:  p.salesStatus,
      contactPerson: p.contactPerson,
      mobile:       p.mobile,
      tel:          p.tel,
      contactedBy:  p.contactedBy,
      assignedTo:   p.assignedTo,
      lastCallDate: s.lastCallDate  || null,
      lastOutcome:  s.lastOutcome   || null,
      lastNotes:    s.lastNotes     || null,
      totalCalls:   s.totalCalls    || 0,
    };
  });

  // Prospects with calls shown first (most recent first), then assigned-only alphabetically
  items.sort((a, b) => {
    if (a.lastCallDate && b.lastCallDate) return new Date(b.lastCallDate) - new Date(a.lastCallDate);
    if (a.lastCallDate) return -1;
    if (b.lastCallDate) return 1;
    return (a.companyName || "").localeCompare(b.companyName || "");
  });

  return Response.json({ items });
}
