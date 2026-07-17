import { test } from "node:test";
import assert from "node:assert/strict";

async function withServer(fn: (port: number) => Promise<void>) {
  // Clear before the server (and its config) is first imported, so a real
  // BOT_SERVICE_KEY in the local .env doesn't turn every test into a 401.
  process.env.BOT_SERVICE_KEY = "";
  const { createBotServer } = await import("./server.js");
  const server = createBotServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as { port: number };
  try {
    await fn(port);
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

test("POST /reply rejects missing fields", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://localhost:${port}/reply`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});

test("POST /soul rejects missing soul object", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://localhost:${port}/soul`, {
      method: "POST",
      body: JSON.stringify({ elderId: "e1" }),
    });
    assert.equal(res.status, 400);
  });
});

test("unknown route returns 404", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://localhost:${port}/nope`, { method: "POST" });
    assert.equal(res.status, 404);
  });
});
