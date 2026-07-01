import * as XLSX from "xlsx";
import { dbConnect } from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import { requireRole, ROLES } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Maps the messy real-world header text (from the Google Sheet export) to
// our schema fields. Keys are normalized: lowercased, punctuation stripped.
const HEADER_MAP = {
  "company name": "companyName",
  category: "category",
  address: "address",
  "po box": "poBox",
  "p o box": "poBox",
  tel: "tel",
  telephone: "tel",
  mobile: "mobile",
  whatsapp: "whatsapp",
  email: "email",
  website: "website",
  "contact person": "contactPerson",
  designation: "designation",
  "products services": "productsServices",
  "products / services": "productsServices",
  brands: "brands",
  facebook: "facebook",
  twitter: "twitter",
};

function normalizeHeader(h) {
  return String(h || "")
    .toLowerCase()
    .replace(/[.\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rowToProspect(row) {
  const out = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const norm = normalizeHeader(rawKey);
    const field = HEADER_MAP[norm];
    if (!field) continue;
    const val = value == null ? "" : String(value).trim();
    if (val) out[field] = val;
  }
  return out;
}

export async function POST(request) {
  // Only super admin can bulk-upload the prospect sheet.
  const { user, error } = await requireRole(ROLES.SUPERADMIN);
  if (error) return error;

  await dbConnect();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    return Response.json({ error: "Could not parse the file. Upload an .xlsx or .csv export." }, { status: 400 });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!rows.length) {
    return Response.json({ error: "The sheet appears to be empty" }, { status: 400 });
  }

  const docs = rows
    .map(rowToProspect)
    .filter((doc) => doc.companyName)
    .map((doc) => ({
      ...doc,
      hasWebsite: Boolean(doc.website),
      createdBy: user.email,
    }));

  if (!docs.length) {
    return Response.json({ error: "No valid rows found (missing Company Name column?)" }, { status: 400 });
  }

  // Insert in batches to stay well within MongoDB's write limits for ~1700+ rows.
  const BATCH_SIZE = 500;
  let inserted = 0;
  const errors = [];

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    try {
      const result = await Prospect.insertMany(batch, { ordered: false });
      inserted += result.length;
    } catch (err) {
      // insertMany with ordered:false still inserts the valid docs in the batch
      // and reports failures in err.writeErrors / err.insertedDocs depending on driver version.
      inserted += err.insertedDocs ? err.insertedDocs.length : 0;
      errors.push(err.message);
    }
  }

  return Response.json({
    ok: true,
    totalRows: rows.length,
    inserted,
    skipped: rows.length - inserted,
    errorCount: errors.length,
  });
}
