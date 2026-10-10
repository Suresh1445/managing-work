import "dotenv/config";
import mongoose from "mongoose";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 5000);
const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/haven";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is required. Copy .env.example to .env and configure it.");
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  app.listen(port, () => console.log(`Haven API listening on http://localhost:${port}`));
} catch (error) {
  console.error(`Could not connect to MongoDB at ${mongoUri}:`, error.message);
  process.exit(1);
}
