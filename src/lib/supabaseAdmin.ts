import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url) throw new Error("SUPABASE_URL ausente (ou NEXT_PUBLIC_SUPABASE_URL).");
if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.");

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
