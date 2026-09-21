import { dispatchPush } from "../../lib/push/worker.mjs";
export default async function () {
  const r = await dispatchPush();
  console.log("Push queue processed", {
    configured: r.configured,
    sent: r.sent,
    failed: r.failed,
  });
}
export const config = { schedule: "* * * * *" };
