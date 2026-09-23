import { supabaseServer } from "@/lib/supabase/server";
import { dbError, fail, result, normalizeBarber } from "@/lib/server";
export async function GET() {
  try {
    const s = await supabaseServer();
    const { data, error } = await s.rpc("public_catalog");
    dbError(error);
    return result({
      barbers: data.barbers.map(normalizeBarber),
      services: data.services.map((s: { id: string; name: string }) => ({
        id: s.id,
        name: s.name,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}
