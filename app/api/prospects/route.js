import { dbConnect } from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import Call from "@/models/Call";
import { requireRole, ROLES } from "@/lib/auth";

const PAGE_SIZE = 20;

export async function GET(request) {
  const { user, error } = await requireRole(ROLES.STAFF);
  if (error) return error;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const search = (searchParams.get("search") || "").trim();
  const category = searchParams.get("category") || "";
  const hasWebsite = searchParams.get("hasWebsite"); // "yes" | "no" | null
  const location = (searchParams.get("location") || "").trim();
  const callStatusFilter = searchParams.get("callStatus") || "";

  // Base query — no callStatus filter, used for per-tab counts
  const baseQuery = {};
  if (category) baseQuery.category = category;
  if (hasWebsite === "yes") baseQuery.hasWebsite = true;
  if (hasWebsite === "no") baseQuery.hasWebsite = { $ne: true };
  if (location) baseQuery.address = { $regex: location, $options: "i" };
  if (search) {
    baseQuery.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { contactPerson: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { mobile: { $regex: search, $options: "i" } },
      { tel: { $regex: search, $options: "i" } },
    ];
  }

  // Main query = base + optional callStatus tab filter
  const query = { ...baseQuery };
  if (callStatusFilter === "not_called") {
    // null / missing field also counts as "not_called"
    query.callStatus = { $in: ["not_called", null] };
  } else if (callStatusFilter) {
    query.callStatus = callStatusFilter;
  }

  const [items, total, categories, statusAgg] = await Promise.all([
    Prospect.find(query)
      .sort({ companyName: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Prospect.countDocuments(query),
    Prospect.distinct("category", baseQuery),
    Prospect.aggregate([
      { $match: baseQuery },
      { $group: { _id: { $ifNull: ["$callStatus", "not_called"] }, count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = {};
  for (const s of statusAgg) statusCounts[s._id] = s.count;
  const allTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // Sync contactedBy / assignedTo for every prospect on this page.
  // One aggregation covers both directions: backfill when missing, clear when stale.
  const allIds = items.map((p) => p._id);
  const callData = await Call.aggregate([
    { $match: { prospect: { $in: allIds } } },
    { $sort: { date: 1 } },
    { $group: { _id: "$prospect", firstCaller: { $first: "$createdBy" } } },
  ]);
  const callMap = {};
  for (const c of callData) callMap[String(c._id)] = c.firstCaller;

  for (const item of items) {
    const firstCaller = callMap[String(item._id)];
    if (firstCaller) {
      // Has calls — backfill missing fields
      if (!item.contactedBy) {
        item.contactedBy = firstCaller;
        Prospect.updateOne({ _id: item._id, contactedBy: { $in: [null, "", undefined] } }, { $set: { contactedBy: firstCaller } }).exec();
      }
      if (!item.assignedTo) {
        item.assignedTo = firstCaller;
        Prospect.updateOne({ _id: item._id, assignedTo: { $in: [null, "", undefined] } }, { $set: { assignedTo: firstCaller } }).exec();
      }
    } else if (item.contactedBy) {
      // No calls — clear stale contactedBy (and assignedTo if it matched)
      const stale = item.contactedBy;
      item.contactedBy = null;
      Prospect.updateOne({ _id: item._id }, { $set: { contactedBy: null } }).exec();
      if (item.assignedTo === stale) {
        item.assignedTo = null;
        Prospect.updateOne({ _id: item._id, assignedTo: stale }, { $set: { assignedTo: null } }).exec();
      }
    }
  }

  return Response.json({
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    categories: categories.filter(Boolean).sort(),
    statusCounts,
    allTotal,
  });
}

export async function POST(request) {
  // Staff cannot create prospects — admin and superadmin only.
  const { user, error } = await requireRole(ROLES.ADMIN);
  if (error) return error;

  await dbConnect();
  const body = await request.json();

  if (!body.companyName) {
    return Response.json({ error: "companyName is required" }, { status: 400 });
  }

  const prospect = await Prospect.create({ ...body, createdBy: user.email });
  return Response.json({ item: prospect }, { status: 201 });
}
