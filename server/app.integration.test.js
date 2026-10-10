import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { app } from "./app.js";
import { Provider, Service, User } from "./models.js";

const mongoUri = process.env.MONGODB_URI_TEST;

test("Mongo-backed authentication, roles, catalogs, and booking workflows", { skip: !mongoUri }, async () => {
  process.env.JWT_SECRET = randomUUID();
  const databaseUrl = new URL(mongoUri);
  databaseUrl.pathname = `/haven_test_${randomUUID().replaceAll("-", "")}`;
  await mongoose.connect(databaseUrl.toString());

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function call(path, { token, method = "GET", body, status = 200 } = {}) {
    const response = await fetch(`${baseUrl}/api${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = response.status === 204 ? null : await response.json();
    assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
    return data;
  }

  try {
    const password = await bcrypt.hash("testing-password", 4);
    const customer = await User.create({ name: "Test Customer", email: "customer@example.test", password });
    const admin = await User.create({ name: "Test Admin", email: "admin@example.test", password, role: "admin" });
    const service = await Service.create({
      name: "Test cleaning",
      category: "Cleaning",
      description: "Integration test service",
      price: 89,
      duration: 60,
    });
    const provider = await Provider.create({
      name: "Test Professional",
      bio: "Integration test provider",
      specialties: ["Cleaning"],
      hourlyRate: 40,
    });

    const customerSession = await call("/auth/login", {
      method: "POST",
      body: { email: customer.email, password: "testing-password" },
    });
    const adminSession = await call("/auth/login", {
      method: "POST",
      body: { email: admin.email, password: "testing-password" },
    });
    await call("/auth/me", { token: customerSession.token });
    await call("/services", {
      token: customerSession.token,
      method: "POST",
      body: { name: "Unauthorized service" },
      status: 403,
    });

    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await call("/bookings", {
      token: customerSession.token,
      method: "POST",
      body: { service: service.id, date: "2000-01-01", time: "09:00", address: "1 Test St" },
      status: 400,
    });
    const booking = await call("/bookings", {
      token: customerSession.token,
      method: "POST",
      body: {
        service: service.id,
        provider: provider.id,
        date: tomorrow,
        time: "09:00",
        address: "1 Test St",
        totalPrice: 1,
      },
      status: 201,
    });
    assert.equal(booking.totalPrice, 89, "the server takes price from the service catalog");
    assert.equal(booking.service.name, service.name);
    assert.equal(booking.provider.name, provider.name);

    const otherCustomer = await call("/auth/register", {
      method: "POST",
      body: { name: "Other Customer", email: "other@example.test", password: "testing-password" },
      status: 201,
    });
    const otherBooking = await call("/bookings", {
      token: otherCustomer.token,
      method: "POST",
      body: { service: service.id, date: tomorrow, time: "10:00", address: "2 Test St" },
      status: 201,
    });
    assert.equal((await call("/bookings", { token: customerSession.token })).length, 1);
    assert.equal((await call("/bookings", { token: adminSession.token })).length, 2);
    await call(`/bookings/${booking._id}`, {
      token: adminSession.token,
      method: "PUT",
      body: { time: "25:00" },
      status: 400,
    });
    await call(`/bookings/${otherBooking._id}`, {
      token: customerSession.token,
      method: "PUT",
      body: { status: "cancelled" },
      status: 403,
    });

    const newService = await call("/services", {
      token: adminSession.token,
      method: "POST",
      body: { name: "Admin service", category: "Repair", description: "Created in test", price: 50, duration: 45 },
      status: 201,
    });
    await call(`/services/${newService._id}`, { token: adminSession.token, method: "PUT", body: { price: 60 } });
    assert.equal((await Service.findById(newService._id)).price, 60);
    await call(`/services/${newService._id}`, { token: adminSession.token, method: "DELETE", status: 204 });
    assert.equal((await call("/services")).some((item) => item._id === newService._id), false);

    const newProvider = await call("/providers", {
      token: adminSession.token,
      method: "POST",
      body: { name: "Admin pro", bio: "Created in test", hourlyRate: 35 },
      status: 201,
    });
    await call(`/providers/${newProvider._id}`, { token: adminSession.token, method: "PUT", body: { hourlyRate: 37 } });
    await call(`/providers/${newProvider._id}`, { token: adminSession.token, method: "DELETE", status: 204 });
    assert.equal((await call("/providers")).some((item) => item._id === newProvider._id), false);

    await call(`/bookings/${booking._id}`, {
      token: adminSession.token,
      method: "PUT",
      body: { status: "confirmed", provider: provider.id },
    });
    const cancelled = await call(`/bookings/${booking._id}`, {
      token: customerSession.token,
      method: "PUT",
      body: { status: "cancelled" },
    });
    assert.equal(cancelled.status, "cancelled");
    await call(`/bookings/${otherBooking._id}`, { token: adminSession.token, method: "DELETE", status: 204 });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
