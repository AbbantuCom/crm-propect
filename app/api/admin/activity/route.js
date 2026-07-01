import { dbConnect } from "@/lib/mongodb";
import Call from "@/models/Call";
import { requireRole, ROLES } from "@/lib/auth";

const PAGE_SIZE = 20;

export async function GET(request) {
  try {
    const { error } = await requireRole(ROLES.ADMIN);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page      = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const search    = searchParams.get("search")?.trim() || "";
    const outcome   = searchParams.get("outcome")?.trim() || "";
    const userEmail = searchParams.get("user")?.trim() || "";
    const dateFrom  = searchParams.get("dateFrom")?.trim() || "";
    const dateTo    = searchParams.get("dateTo")?.trim() || "";

    await dbConnect();

    const callMatch = {};
    if (outcome)   callMatch.outcome   = outcome;
    if (userEmail) callMatch.createdBy = userEmail;
    if (dateFrom || dateTo) {
      callMatch.date = {};
      if (dateFrom) callMatch.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        callMatch.date.$lte = end;
      }
    }

    const pipeline = [
      { $match: callMatch },
      { $sort: { date: -1 } },
      {
        $lookup: {
          from: "prospects",
          localField: "prospect",
          foreignField: "_id",
          as: "prospectData",
        },
      },
      { $unwind: { path: "$prospectData", preserveNullAndEmptyArrays: false } },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "prospectData.companyName": { $regex: search, $options: "i" } },
                  { createdBy: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: 1,
          prospectId: "$prospect",
          companyName: "$prospectData.companyName",
          category: "$prospectData.category",
          salesStatus: "$prospectData.salesStatus",
          callStatus: "$prospectData.callStatus",
          contactedBy: "$prospectData.contactedBy",
          assignedTo: "$prospectData.assignedTo",
          contactPerson: "$prospectData.contactPerson",
          createdBy: 1,
          date: 1,
          outcome: 1,
          notes: 1,
        },
      },
    ];

    const [countResult] = await Call.aggregate([...pipeline, { $count: "total" }]);
    const total = countResult?.total || 0;

    const items = await Call.aggregate([
      ...pipeline,
      { $skip: (page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE },
    ]);

    const usersRaw = await Call.distinct("createdBy");
    const users = usersRaw.filter(Boolean).sort();

    return Response.json({
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      users,
    });
  } catch (err) {
    console.error("[admin/activity]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
