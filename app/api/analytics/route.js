import { dbConnect } from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import Call from "@/models/Call";
import { requireRole, ROLES } from "@/lib/auth";

export async function GET() {
  try {
    const { user, error } = await requireRole(ROLES.STAFF);
    if (error) return error;

    await dbConnect();

    // ── Prospect status breakdown (all prospects) ──
    const statusAgg = await Prospect.aggregate([
      { $group: { _id: { $ifNull: ["$salesStatus", "new"] }, count: { $sum: 1 } } },
    ]);
    const statusBreakdown = {};
    for (const row of statusAgg) {
      statusBreakdown[row._id] = row.count;
    }

    const totalProspects = await Prospect.countDocuments();

    // Prospects that have been called at least once
    const calledIds = await Call.distinct("prospect");
    const contactedCount = calledIds.length;

    const wonCount  = statusBreakdown["won"]  || 0;
    const lostCount = statusBreakdown["lost"] || 0;
    const closedCount = wonCount + lostCount;

    // ── Current user's personal stats ──
    const [myAgg] = await Call.aggregate([
      { $match: { createdBy: user.email } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          prospects: { $addToSet: "$prospect" },
        },
      },
      {
        $project: {
          _id: 0,
          totalCalls: 1,
          uniqueProspects: { $size: "$prospects" },
        },
      },
    ]);
    const myStats = myAgg || { totalCalls: 0, uniqueProspects: 0 };

    // Outcome breakdown for current user
    const myOutcomeAgg = await Call.aggregate([
      { $match: { createdBy: user.email } },
      { $group: { _id: "$outcome", count: { $sum: 1 } } },
    ]);
    const myOutcomes = {};
    for (const row of myOutcomeAgg) {
      myOutcomes[row._id] = row.count;
    }

    const result = {
      totalProspects,
      contactedCount,
      wonCount,
      lostCount,
      closedCount,
      statusBreakdown,
      myStats: { ...myStats, outcomes: myOutcomes },
    };

    // ── Team breakdown (admin/superadmin only) ──
    if (user.role === "admin" || user.role === "superadmin") {
      const teamAgg = await Call.aggregate([
        {
          $group: {
            _id: "$createdBy",
            totalCalls: { $sum: 1 },
            prospects: { $addToSet: "$prospect" },
          },
        },
        {
          $project: {
            _id: 0,
            user: "$_id",
            totalCalls: 1,
            uniqueProspects: { $size: "$prospects" },
          },
        },
        { $sort: { totalCalls: -1 } },
      ]);
      result.teamStats = teamAgg;
    }

    return Response.json(result);
  } catch (err) {
    console.error("[analytics]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
