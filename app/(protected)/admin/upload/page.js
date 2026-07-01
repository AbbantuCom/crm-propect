import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import UploadForm from "@/components/UploadForm";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") {
    return (
      <div className="container">
        <div className="error-text">Only the super admin can upload the prospect sheet.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Upload Prospect Sheet</h1>
      <p className="page-subtitle">
        Upload the Google Sheet export (.xlsx or .csv). Existing columns like Company Name, Category, Address,
        Tel, Mobile, Email, Website, Contact Person etc. are matched automatically. Rows are added, not
        deduplicated against existing prospects.
      </p>
      <UploadForm />
    </div>
  );
}
