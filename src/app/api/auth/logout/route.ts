import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COOKIE_NAME = "sid";

export async function POST() {
  const jar = await cookies();
  const sid = jar.get(COOKIE_NAME)?.value || "";

  if (sid) {
    await supabaseAdmin.from("sessions").delete().eq("id", sid);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE_NAME, value: "", path: "/", maxAge: 0 });
  return res;
}
