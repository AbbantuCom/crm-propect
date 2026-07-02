import { dbConnect } from "@/lib/mongodb";
import Prospect from "@/models/Prospect";

export async function GET() {
  try {
    await dbConnect();
    // Count is enough to confirm DB is reachable without leaking real data
    const count = await Prospect.countDocuments();
    return Response.json({ ok: true, db: "connected", prospectCount: count });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
