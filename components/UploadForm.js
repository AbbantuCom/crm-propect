"use client";

import { useState } from "react";

export default function UploadForm() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 560 }}>
      <form onSubmit={handleUpload}>
        <div className="form-row">
          <label className="field-label">Prospect sheet (.xlsx or .csv, up to ~2MB)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="input"
          />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload and Import"}
        </button>
      </form>

      {result && (
        <div className="success-text" style={{ marginTop: 16 }}>
          Imported {result.inserted.toLocaleString()} of {result.totalRows.toLocaleString()} rows.
          {result.skipped > 0 && ` ${result.skipped.toLocaleString()} rows were skipped (missing Company Name or duplicate error).`}
        </div>
      )}
    </div>
  );
}
