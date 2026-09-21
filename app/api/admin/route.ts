import {
  staff,
  payload,
  result,
  fail,
  requireValue,
  dbError,
  normalizeService,
  normalizeBarber,
  normalizeBooking,
  HttpError,
} from "@/lib/server";
import { supabaseServer } from "@/lib/supabase/server";
import { dispatchPush } from "@/lib/push/worker.mjs";
export async function GET(r: Request) {
  try {
    const u = await staff(),
      s = await supabaseServer(),
      date = new URL(r.url).searchParams.get("date") || "";
    requireValue(/^\d{4}-\d{2}-\d{2}$/.test(date), "Data inválida.");
    const [services, barbers, bookings] = await Promise.all([
      s.from("services").select("*").order("sort_order"),
      s.from("barbers").select("*").order("name"),
      (u.owner
        ? s.from("reservations").select("*,barbers(name)").eq("day", date)
        : s
            .from("reservations")
            .select("*,barbers(name)")
            .eq("day", date)
            .eq("barber_id", u.barberId)
      ).order("start_min"),
    ]);
    [services, barbers, bookings].forEach((x) => dbError(x.error));
    return result({
      owner: u.owner,
      name: u.displayName,
      services: (services.data ?? []).map(normalizeService),
      barbers: (barbers.data ?? []).map(normalizeBarber),
      bookings: (bookings.data ?? []).map(normalizeBooking),
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
    let call;
    if (p.action === "service")
      call = s.rpc("save_service", { p_service: p.service });
    else if (p.action === "barber")
      call = s.rpc("save_barber", { p_barber: p.barber });
    else if (p.action === "status")
      call = s.rpc("change_reservation_status", {
        p_id: p.id,
        p_status: p.status,
      });
    else if (p.action === "reserve")
      call = s.rpc("create_reservation", {
        p_barber: p.barber,
        p_service: p.kind === "block" ? null : p.service,
        p_day: p.date,
        p_start: p.start,
        p_name: p.name,
        p_phone: p.kind === "block" ? "" : p.phone,
        p_key: p.key,
        p_kind: p.kind,
        p_duration: p.kind === "block" ? p.duration : null,
      });
    else throw new HttpError(400, "Ação inválida.");
    const { data, error } = await call;
    dbError(error);
    if (p.action === "reserve" || p.action === "status") {
      try {
        await dispatchPush();
      } catch {}
    }
    return result({ ok: true, reservation: data });
  } catch (e) {
    return fail(e);
  }
}
