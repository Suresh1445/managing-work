import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint reports the API as available", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("private account and booking data require an authenticated account", async () => {
  for (const path of ["/api/auth/me", "/api/bookings"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: "Sign in to continue." });
  }
});

test("catalog writes require an administrator account", async () => {
  const response = await fetch(`${baseUrl}/api/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test service" }),
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "Sign in to continue." });
});

test("registration rejects missing fields before writing to MongoDB", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "short" }),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Name, email, and a password/);
});
