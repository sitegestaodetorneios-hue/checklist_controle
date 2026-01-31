import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type CurrentUser = {
  id: string;
  username: string;
  nome?: string;
  role?: string;
  unidade_id?: string;
};

const COOKIE_NAME = "ct_sid";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const sid = jar.get(COOKIE_NAME)?.value || "";
  if (!sid) return null;

  const sessQ = await supabaseAdmin
    .from("ct_sessions")
    .select("id,user_id, ct_users(id,username,nome,role,unidade_id,ativo)")
    .eq("id", sid)
    .maybeSingle();

  if (sessQ.error || !sessQ.data) return null;

  const u = (sessQ.data as any).ct_users;
  if (!u?.id || !u.ativo) return null;

  return {
    id: u.id,
    username: u.username,
    nome: u.nome ?? "",
    role: u.role ?? "operador",
    unidade_id: u.unidade_id ?? null,
  };
}
