import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
  },
  { timestamps: true },
);

const serviceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 15 },
    icon: { type: String, default: "sparkles" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const providerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    bio: { type: String, required: true, trim: true },
    specialties: { type: [String], default: [] },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, required: true, min: 0 },
    available: { type: Boolean, default: true },
    avatarColor: { type: String, default: "#dfe8d8" },
  },
  { timestamps: true },
);

const bookingSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    provider: { type: Schema.Types.ObjectId, ref: "Provider", default: null },
    date: { type: String, required: true },
    time: { type: String, required: true },
    address: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: "" },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const User = model("User", userSchema);
export const Service = model("Service", serviceSchema);
export const Provider = model("Provider", providerSchema);
export const Booking = model("Booking", bookingSchema);
