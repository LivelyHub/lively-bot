import { test } from "node:test";
import assert from "node:assert/strict";
import { createBotServer } from "./server.js";

test("POST /reply rejects missing fields", async () => {
  const server = createBotServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as { port: number };

  const res = await fetch(`http://localhost:${port}/reply`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);

  server.close();
});

test("unknown route returns 404", async () => {
  const server = createBotServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as { port: number };

  const res = await fetch(`http://localhost:${port}/nope`, { method: "POST" });
  assert.equal(res.status, 404);

  server.close();
});
