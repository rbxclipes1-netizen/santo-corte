import {
  payload,
  identity,
  result,
  fail,
  HttpError,
  dbError,
  requireValue,
} from "@/lib/server";
import { supabaseServer } from "@/lib/supabase/server";
import { uuid } from "@/lib/security.mjs";
import { dispatchPush } from "@/lib/push/worker.mjs";
export async function POST(r: Request) {
  try {
    const p = await payload(r),
      u = await identity();
    if (!u) throw new HttpError(401, "Entre com Google para confirmar.");
    requireValue(
      uuid(p.barber) &&
        uuid(p.key) &&
        Number.isInteger(p.start) &&
        typeof p.date === "string",
      "Confira os dados da reserva.",
    );
    const { data, error } = await (
      await supabaseServer()
    ).rpc("create_reservation", {
      p_barber: p.barber,
      p_service: p.service,
      p_day: p.date,
      p_start: p.start,
      p_name: p.name,
      p_phone: p.phone,
      p_key: p.key,
      p_kind: "booking",
      p_duration: null,
    });
    dbError(error);
    let push = "queued";
    try {
      const sent = await dispatchPush();
      push = sent.configured ? "processed" : "not_configured";
    } catch {
      /* Committed bookings remain valid; cron retries the durable queue. */
    }
    return result({ ok: true, reservation: data, notifications: push }, 201);
  } catch (e) {
    return fail(e);
  }
}
