import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { validPushEndpoint } from "../security.mjs";
export function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}
// Uses a service credential only on the server. Subscriptions and claims are never exposed to clients.
export async function dispatchPush() {
  if (!pushConfigured()) return { configured: false, sent: 0, failed: 0 };
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: jobs, error } = await s.rpc("claim_push_jobs", { p_limit: 10 });
  if (error) throw Error("Unable to claim push queue");
  const results = await Promise.all(
    (jobs || []).map(async (job) => {
      let ok = false,
        reason = null;
      try {
        if (!validPushEndpoint(job.endpoint))
          throw Error("Invalid push vendor");
        await webpush.sendNotification(
          {
            endpoint: job.endpoint,
            keys: { p256dh: job.p256dh, auth: job.auth },
          },
          JSON.stringify({
            title: job.title,
            body: job.body,
            url: job.url,
            tag: job.id,
          }),
          {
            vapidDetails: {
              subject: process.env.VAPID_SUBJECT,
              publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
              privateKey: process.env.VAPID_PRIVATE_KEY,
            },
            TTL: 300,
            urgency: "high",
            timeout: 5000,
            topic: job.id.replaceAll("-", "").slice(0, 32),
          },
        );
        ok = true;
      } catch (e) {
        reason =
          typeof e?.statusCode === "number"
            ? "Push HTTP " + e.statusCode
            : "Falha no envio";
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await s
            .from("push_subscriptions")
            .delete()
            .eq("id", job.subscription_id);
          return false;
        }
      }
      const { error: ack } = await s.rpc("finish_push_job", {
        p_id: job.id,
        p_token: job.claim_token,
        p_ok: ok,
        p_error: reason,
      });
      if (ack)
        console.error("Push acknowledgement failed; lease will allow retry.");
      return ok;
    }),
  );
  return {
    configured: true,
    sent: results.filter(Boolean).length,
    failed: results.filter((x) => !x).length,
  };
}
