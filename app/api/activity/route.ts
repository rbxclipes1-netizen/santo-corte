import { staff, result, fail, dbError } from "@/lib/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET() {
  try {
    const u = await staff();
    let q = (await supabaseServer())
      .from("reservations")
      .select("id,created_at")
      .neq("kind", "block")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!u.owner) q = q.eq("barber_id", u.barberId);
    const { data, error } = await q;
    dbError(error);
    return result({ items: data ?? [] });
  } catch (e) {
    return fail(e);
  }
}
