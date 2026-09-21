import {
  identity,
  result,
  fail,
  dbError,
  normalizeBarber,
  normalizeService,
} from "@/lib/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET() {
  try {
    const s = await supabaseServer();
    const [{ data, error }, u] = await Promise.all([
      s.rpc("public_catalog"),
      identity(),
    ]);
    dbError(error);
    return result({
      services: data.services.map(normalizeService),
      barbers: data.barbers.map(normalizeBarber),
      owner: !!u?.owner,
      user: u ? { name: u.displayName, email: u.email } : null,
      googleReady: true,
      bookingEnabled: true,
    });
  } catch (e) {
    return fail(e);
  }
}
