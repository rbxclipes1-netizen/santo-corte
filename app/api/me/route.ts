import {
  payload,
  identity,
  result,
  fail,
  HttpError,
  dbError,
  normalizeBooking,
} from "@/lib/server";
import { supabaseServer } from "@/lib/supabase/server";
import { dispatchPush } from "@/lib/push/worker.mjs";
export async function GET() {
  try {
    const u = await identity();
    if (!u)
      throw new HttpError(401, "Entre com Google para ver seus horários.");
    const { data, error } = await (await supabaseServer()).rpc("my_bookings");
    dbError(error);
    return result({
      bookings: (data ?? []).map(normalizeBooking),
      name: u.displayName,
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(r: Request) {
  try {
    const p = await payload(r);
    const u = await identity();
    if (!u) throw new HttpError(401, "Entre com Google.");
    const { error } = await (
      await supabaseServer()
    ).rpc("change_reservation_status", { p_id: p.id, p_status: "cancelled" });
    dbError(error);
    try {
      await dispatchPush();
    } catch {}
    return result({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
