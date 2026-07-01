import mongoose from "mongoose";

const CallSchema = new mongoose.Schema(
  {
    prospect: { type: mongoose.Schema.Types.ObjectId, ref: "Prospect", required: true, index: true },
    outcome: {
      type: String,
      enum: ["interested", "not_interested", "no_answer", "call_back", "voicemail", "other"],
      default: "other",
    },
    notes: { type: String, trim: true },
    date: { type: Date, required: true, default: Date.now },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Call || mongoose.model("Call", CallSchema);
