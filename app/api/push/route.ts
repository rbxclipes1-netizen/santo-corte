import {
  staff,
  payload,
  result,
  fail,
  dbError,
  requireValue,
} from "@/lib/server";
import { supabaseServer } from "@/lib/supabase/server";
import { validPushEndpoint } from "@/lib/security.mjs";
import { dispatchPush, pushConfigured } from "@/lib/push/worker.mjs";
export async function GET() {
  try {
    await staff();
    const { data, error } = await (
      await supabaseServer()
    ).rpc("my_push_status");
    dbError(error);
    return result({
      ...data,
      configured: pushConfigured(),
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(r: Request) {
  try {
    const p = await payload(r);
    await staff();
    const s = await supabaseServer();
    if (p.action === "subscribe") {
      requireValue(
        pushConfigured(),
        "Configure as chaves de notificações na Netlify primeiro.",
      );
      requireValue(
        validPushEndpoint(p.subscription?.endpoint),
        "Serviço de notificações não reconhecido.",
      );
      const { error } = await s.rpc("save_push_subscription", {
        p_subscription: p.subscription,
      });
      dbError(error);
      return result({ ok: true });
    }
    if (p.action === "unsubscribe") {
      const { error } = await s.rpc("remove_push_subscription", {
        p_endpoint: p.endpoint,
      });
      dbError(error);
      return result({ ok: true });
    }
    if (p.action === "test") {
      requireValue(
        pushConfigured(),
        "As notificações ainda não foram configuradas.",
      );
      const { data, error } = await s.rpc("enqueue_test_push");
      dbError(error);
      requireValue(data > 0, "Ative os avisos neste aparelho primeiro.");
      const sent = await dispatchPush();
      return result({ ok: true, queued: data, processed: sent.sent });
    }
    throw Error("Invalid push action");
  } catch (e) {
    return fail(e);
  }
}
