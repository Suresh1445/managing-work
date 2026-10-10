import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Booking, Provider, Service, User } from "./models.js";

export const app = express();
app.use(cors());
app.use(express.json());

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const auth = asyncRoute(async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Sign in to continue." });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
  const user = await User.findById(payload.id);
  if (!user) return res.status(401).json({ message: "Your session is no longer valid." });
  req.user = user;
  next();
});

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Administrator access required." });
  next();
};

const required = (values) => Object.values(values).every((value) => value !== undefined && value !== null && value !== "");
const validObjectId = (value) => /^[a-f\d]{24}$/i.test(value ?? "");
const validBookingDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsedDate.valueOf())
    && parsedDate.toISOString().slice(0, 10) === date
    && date >= new Date().toISOString().slice(0, 10);
};
const validBookingTime = (time) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time ?? "");

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const { name, email, password } = req.body;
  if (!required({ name, email, password }) || password.length < 8) {
    return res.status(400).json({ message: "Name, email, and a password of at least 8 characters are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
  if (await User.exists({ email: email.toLowerCase().trim() })) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: "customer",
  });
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase().trim() }).select("+password");
  if (!user || !(await bcrypt.compare(password ?? "", user.password))) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.get("/api/auth/me", auth, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role });
});

app.get("/api/services", asyncRoute(async (_req, res) => {
  res.json(await Service.find({ active: true }).sort({ category: 1, name: 1 }));
}));

app.post("/api/services", auth, adminOnly, asyncRoute(async (req, res) => {
  const { name, category, description, price, duration } = req.body;
  if (!required({ name, category, description, price, duration })) return res.status(400).json({ message: "Complete all required service fields." });
  res.status(201).json(await Service.create(req.body));
}));

app.put("/api/services/:id", auth, adminOnly, asyncRoute(async (req, res) => {
  if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid service id." });
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!service) return res.status(404).json({ message: "Service not found." });
  res.json(service);
}));

app.delete("/api/services/:id", auth, adminOnly, asyncRoute(async (req, res) => {
  if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid service id." });
  const service = await Service.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!service) return res.status(404).json({ message: "Service not found." });
  res.status(204).end();
}));

app.get("/api/providers", asyncRoute(async (_req, res) => {
  res.json(await Provider.find({ available: true }).sort({ rating: -1, name: 1 }));
}));

app.post("/api/providers", auth, adminOnly, asyncRoute(async (req, res) => {
  const { name, bio, hourlyRate } = req.body;
  if (!required({ name, bio, hourlyRate })) return res.status(400).json({ message: "Complete all required provider fields." });
  res.status(201).json(await Provider.create(req.body));
}));

app.put("/api/providers/:id", auth, adminOnly, asyncRoute(async (req, res) => {
  if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid provider id." });
  const provider = await Provider.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!provider) return res.status(404).json({ message: "Provider not found." });
  res.json(provider);
}));

app.delete("/api/providers/:id", auth, adminOnly, asyncRoute(async (req, res) => {
  if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid provider id." });
  const provider = await Provider.findByIdAndUpdate(req.params.id, { available: false }, { new: true });
  if (!provider) return res.status(404).json({ message: "Provider not found." });
  res.status(204).end();
}));

app.get("/api/bookings", auth, asyncRoute(async (req, res) => {
  const query = req.user.role === "admin" ? {} : { customer: req.user.id };
  res.json(await Booking.find(query).populate("service provider customer", "name category icon email").sort({ date: -1, createdAt: -1 }));
}));

app.post("/api/bookings", auth, asyncRoute(async (req, res) => {
  const { service: serviceId, provider: providerId, date, time, address } = req.body;
  if (!required({ service: serviceId, date, time, address })) return res.status(400).json({ message: "Choose a service, date, time, and address." });
  if (!validObjectId(serviceId) || (providerId && !validObjectId(providerId))) return res.status(400).json({ message: "Invalid service or provider." });
  if (!validBookingDate(date)) {
    return res.status(400).json({ message: "Choose a valid date that is not in the past." });
  }
  if (!validBookingTime(time)) return res.status(400).json({ message: "Choose a valid appointment time." });
  const service = await Service.findOne({ _id: serviceId, active: true });
  if (!service) return res.status(404).json({ message: "This service is no longer available." });
  if (providerId && !(await Provider.exists({ _id: providerId, available: true }))) return res.status(404).json({ message: "This provider is no longer available." });
  const booking = await Booking.create({
    customer: req.user.id,
    service: service.id,
    provider: providerId || null,
    date,
    time,
    address,
    notes: req.body.notes ?? "",
    totalPrice: service.price,
  });
  res.status(201).json(await booking.populate("service provider customer", "name category icon email"));
}));

app.put("/api/bookings/:id", auth, asyncRoute(async (req, res) => {
  if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking id." });
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  const isOwner = booking.customer.toString() === req.user.id;
  if (req.user.role !== "admin" && !isOwner) return res.status(403).json({ message: "You can only manage your own bookings." });
  if (req.user.role === "admin") {
    if (req.body.status && !["pending", "confirmed", "completed", "cancelled"].includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid booking status." });
    }
    if (req.body.date !== undefined && !validBookingDate(req.body.date)) return res.status(400).json({ message: "Choose a valid date that is not in the past." });
    if (req.body.time !== undefined && !validBookingTime(req.body.time)) return res.status(400).json({ message: "Choose a valid appointment time." });
    if (req.body.status) booking.status = req.body.status;
    if (req.body.provider !== undefined) {
      if (req.body.provider && !validObjectId(req.body.provider)) return res.status(400).json({ message: "Invalid provider." });
      if (req.body.provider && !(await Provider.exists({ _id: req.body.provider, available: true }))) return res.status(404).json({ message: "This provider is no longer available." });
      booking.provider = req.body.provider || null;
    }
    if (req.body.date !== undefined) booking.date = req.body.date;
    if (req.body.time !== undefined) booking.time = req.body.time;
    if (req.body.address) booking.address = req.body.address;
    if (req.body.notes !== undefined) booking.notes = req.body.notes;
  } else {
    if (req.body.status !== "cancelled" || !["pending", "confirmed"].includes(booking.status)) {
      return res.status(403).json({ message: "Customers can cancel upcoming bookings only." });
    }
    booking.status = "cancelled";
  }
  await booking.save();
  res.json(await booking.populate("service provider customer", "name category icon email"));
}));

app.delete("/api/bookings/:id", auth, adminOnly, asyncRoute(async (req, res) => {
  if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking id." });
  const booking = await Booking.findByIdAndDelete(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  res.status(204).end();
}));

app.use((err, _req, res, _next) => {
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: "A record with this value already exists." });
  console.error(err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});
