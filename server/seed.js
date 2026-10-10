import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Booking, Provider, Service, User } from "./models.js";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required. Configure .env before seeding.");

await mongoose.connect(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/haven");
await Promise.all([User.deleteMany({}), Service.deleteMany({}), Provider.deleteMany({}), Booking.deleteMany({})]);

const password = await bcrypt.hash("haven123", 12);
await User.insertMany([
  { name: "Alex Morgan", email: "alex@haven.demo", password, role: "customer" },
  { name: "Haven Admin", email: "admin@haven.demo", password, role: "admin" },
]);
await Service.insertMany([
  { name: "Home cleaning", category: "Cleaning", description: "A thorough refresh for every room, from kitchen to living space.", price: 89, duration: 120, icon: "sparkles" },
  { name: "Plumbing repair", category: "Plumbing", description: "Fast, reliable fixes for leaks, faucets, drains, and more.", price: 115, duration: 90, icon: "droplets" },
  { name: "Electrical help", category: "Electrical", description: "Safe expert help with outlets, lighting, and everyday repairs.", price: 125, duration: 90, icon: "zap" },
  { name: "Handyman visit", category: "Handyman", description: "A trusted helping hand for all those little jobs around home.", price: 75, duration: 60, icon: "wrench" },
  { name: "Garden care", category: "Outdoor", description: "Keep your outdoor spaces tidy, healthy, and ready to enjoy.", price: 95, duration: 120, icon: "leaf" },
  { name: "Appliance repair", category: "Appliances", description: "Thoughtful troubleshooting for the appliances you rely on.", price: 105, duration: 90, icon: "settings" },
]);
await Provider.insertMany([
  { name: "Olivia Chen", bio: "Bringing a little more calm to homes, one thoughtful clean at a time.", specialties: ["Deep cleaning", "Move-in / move-out"], rating: 4.9, reviews: 128, hourlyRate: 42, avatarColor: "#f5d8c9" },
  { name: "Marcus Rivera", bio: "Your neighborhood plumbing pro. Fixes done right, with no surprises.", specialties: ["Plumbing", "Water heaters"], rating: 4.8, reviews: 96, hourlyRate: 55, avatarColor: "#d7e7f5" },
  { name: "Priya Patel", bio: "Making homes safer and brighter with careful electrical work.", specialties: ["Electrical", "Lighting"], rating: 5, reviews: 84, hourlyRate: 58, avatarColor: "#e9dcf5" },
  { name: "Ethan Brooks", bio: "Handy, dependable, and happy to help with the list you've been putting off.", specialties: ["Handyman", "Furniture assembly"], rating: 4.9, reviews: 73, hourlyRate: 48, avatarColor: "#dcebd8" },
]);

console.log("Seeded Haven. Demo accounts: alex@haven.demo and admin@haven.demo (password: haven123).");
await mongoose.disconnect();
