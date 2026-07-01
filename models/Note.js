import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    prospect: { type: mongoose.Schema.Types.ObjectId, ref: "Prospect", required: true, index: true },
    title: { type: String, required: true, trim: true },
    details: { type: String, trim: true },
    date: { type: Date, required: true, default: Date.now },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);
