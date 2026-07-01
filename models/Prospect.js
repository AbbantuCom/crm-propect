import mongoose from "mongoose";

const ProspectSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    category: { type: String, trim: true, index: true },
    address: { type: String, trim: true },
    poBox: { type: String, trim: true },
    tel: { type: String, trim: true },
    mobile: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true },
    website: { type: String, trim: true },
    hasWebsite: { type: Boolean, default: false, index: true },
    contactPerson: { type: String, trim: true },
    designation: { type: String, trim: true },
    productsServices: { type: String, trim: true },
    brands: { type: String, trim: true },
    facebook: { type: String, trim: true },
    twitter: { type: String, trim: true },
    salesStatus: {
      type: String,
      enum: ["new", "contacted", "interested", "proposal_sent", "negotiating", "won", "lost", "not_interested"],
      default: "new",
      index: true,
    },
    createdBy:   { type: String, trim: true },
    contactedBy: { type: String, trim: true, index: true }, // first caller, immutable
    assignedTo:  { type: String, trim: true, index: true }, // admin-assignable, mutable
  },
  { timestamps: true }
);

ProspectSchema.index({
  companyName: "text",
  contactPerson: "text",
  email: "text",
  address: "text",
  category: "text",
});

ProspectSchema.pre("save", function setHasWebsite(next) {
  this.hasWebsite = Boolean(this.website && this.website.trim().length > 0);
  next();
});

export default mongoose.models.Prospect || mongoose.model("Prospect", ProspectSchema);
