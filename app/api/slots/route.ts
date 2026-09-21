import { result, fail, dbError, requireValue } from "@/lib/server";
import { supabaseServer } from "@/lib/supabase/server";
import { uuid } from "@/lib/security.mjs";
export async function GET(r: Request) {
  try {
    const q = new URL(r.url).searchParams;
    requireValue(
      /^\d{4}-\d{2}-\d{2}$/.test(q.get("date") || "") && uuid(q.get("barber")),
      "Confira a data e o profissional.",
    );
    const { data, error } = await (
      await supabaseServer()
    ).rpc("available_slots", {
      p_barber: q.get("barber"),
      p_service: q.get("service"),
      p_day: q.get("date"),
    });
    dbError(error);
    return result({
      slots: (data ?? []).map((x: { start_min: number }) => x.start_min),
    });
  } catch (e) {
    return fail(e);
  }
}
