import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.js";

test("GET /health returns 200 and { ok: true }", async () => {
  const app = await buildApp();
  try {
    const response = await app.inject({ method: "GET", url: "/health" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
  } finally {
    await app.close();
  }
});

test("GET on an unknown route returns 404", async () => {
  const app = await buildApp();
  try {
    const response = await app.inject({ method: "GET", url: "/does-not-exist" });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error, "Not Found");
  } finally {
    await app.close();
  }
});
