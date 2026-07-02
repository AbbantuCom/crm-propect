import { dbConnect } from "@/lib/mongodb";
import Prospect from "@/models/Prospect";

export async function GET() {
  try {
    await dbConnect();
    const prospect = await Prospect.findOne().sort({ createdAt: 1 }).lean();
    return Response.json({
      ok: true,
      db: "connected",
      firstProspect: prospect || null,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
