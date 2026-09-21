import test from "node:test";
import assert from "node:assert/strict";
import { safeNext, validPushEndpoint, uuid } from "../lib/security.mjs";
test("OAuth callback accepts only same-origin paths", () => {
  assert.equal(safeNext("/painel?date=2026-09-21"), "/painel?date=2026-09-21");
  for (const v of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\nevil",
    null,
  ])
    assert.equal(safeNext(v), "/agendar");
});
test("Push workers reject private networks and fake provider suffixes", () => {
  for (const ep of [
    "http://fcm.googleapis.com/send",
    "https://127.0.0.1",
    "https://localhost",
    "https://fcm.googleapis.com.evil.test/send",
    "https://evil.test@fcm.googleapis.com/send",
    "https://fcm.googleapis.com:444/send",
  ])
    assert.equal(validPushEndpoint(ep), false, ep);
  for (const ep of [
    "https://fcm.googleapis.com/fcm/send/x",
    "https://web.push.apple.com/Qx",
    "https://updates.push.services.mozilla.com/wpush/v2/x",
    "https://wns2-db5p.notify.windows.com/w/?token=x",
  ])
    assert.equal(validPushEndpoint(ep), true, ep);
});
test("Reservation keys must be UUIDs", () => {
  assert(uuid("11111111-1111-4111-8111-111111111111"));
  assert(!uuid("1"));
  assert(!uuid(null));
});
