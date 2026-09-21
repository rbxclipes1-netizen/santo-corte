import { payload, result, fail } from "@/lib/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function POST(r: Request) {
  try {
    await payload(r);
    await (await supabaseServer()).auth.signOut();
    return result({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
