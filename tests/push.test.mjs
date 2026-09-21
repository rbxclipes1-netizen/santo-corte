import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import webpush from "web-push";
import { dispatchPush } from "../lib/push/worker.mjs";
test("Push worker acknowledges successes, retries failures, removes expired endpoints and refuses SSRF", async () => {
  const calls = [],
    sent = [];
  const jobs = [
    ["success", "https://fcm.googleapis.com/send/one"],
    ["retry", "https://web.push.apple.com/two"],
    ["expired", "https://updates.push.services.mozilla.com/three"],
    ["invalid", "https://127.0.0.1/internal"],
  ].map(([id, endpoint]) => ({
    id,
    claim_token: "lease-" + id,
    subscription_id: "sub-" + id,
    title: "Teste",
    body: "Teste",
    url: "/painel",
    endpoint,
    p256dh: "x",
    auth: "y",
  }));
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    calls.push({
      url: req.url,
      method: req.method,
      body: raw ? JSON.parse(raw) : null,
    });
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(req.url === "/rest/v1/rpc/claim_push_jobs" ? jobs : null),
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
  ];
  const previous = Object.fromEntries(names.map((k) => [k, process.env[k]])),
    original = webpush.sendNotification;
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${server.address().port}`,
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-public",
    VAPID_PRIVATE_KEY: "test-private",
    VAPID_SUBJECT: "mailto:test@example.com",
  });
  webpush.sendNotification = async (sub) => {
    sent.push(sub.endpoint);
    if (sub.endpoint.includes("two"))
      throw Object.assign(Error("temporary"), { statusCode: 503 });
    if (sub.endpoint.includes("three"))
      throw Object.assign(Error("expired"), { statusCode: 410 });
    return { statusCode: 201 };
  };
  try {
    const r = await dispatchPush();
    assert.equal(r.sent, 1);
    assert.equal(r.failed, 3);
    assert.equal(sent.length, 3);
    const acks = calls.filter((c) => c.url.endsWith("finish_push_job"));
    assert.equal(acks.length, 3);
    assert(acks.find((x) => x.body.p_id === "success").body.p_ok);
    assert.equal(acks.find((x) => x.body.p_id === "retry").body.p_ok, false);
    assert.equal(acks.find((x) => x.body.p_id === "invalid").body.p_ok, false);
    assert(
      calls.some(
        (c) => c.method === "DELETE" && c.url.includes("push_subscriptions"),
      ),
    );
  } finally {
    webpush.sendNotification = original;
    for (const k of names)
      if (previous[k] === undefined) delete process.env[k];
      else process.env[k] = previous[k];
    await new Promise((r) => server.close(r));
  }
});
