// ============================================================================
//  Edge Function : admin-users
//  Création / suppression / réinitialisation de comptes, réservée aux admins.
//  Déploiement :
//    supabase functions deploy admin-users --no-verify-jwt
//    supabase secrets set SERVICE_ROLE_KEY=<service_role_key>
//  (SUPABASE_URL et SUPABASE_ANON_KEY sont fournis automatiquement.)
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DOMAIN = "kibegnon.local"; // pseudo-domaine interne pour l'authentification par identifiant

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SERVICE_ROLE_KEY")!;

    // 1. Vérifier l'appelant (JWT) et son rôle admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await asUser.auth.getUser();
    if (uErr || !user) return json({ error: "Non authentifié" }, 401);

    const { data: prof } = await asUser.from("profiles").select("role").eq("id", user.id).single();
    if (!prof || prof.role !== "admin") return json({ error: "Accès réservé à l'administrateur" }, 403);

    // 2. Client service-role (bypass RLS) pour les opérations Auth
    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
    const payload = await req.json();
    const action = payload.action as string;

    if (action === "create") {
      const { username, password, full_name, role, dept_id, color } = payload;
      if (!username || !password) return json({ error: "Identifiant et mot de passe requis" }, 400);
      const email = `${String(username).toLowerCase().replace(/\s/g, "")}@${DOMAIN}`;
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { username, full_name, role, dept_id, color },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, id: data.user?.id });
    }

    if (action === "delete") {
      const { user_id } = payload;
      if (user_id === user.id) return json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = payload;
      if (!password) return json({ error: "Nouveau mot de passe requis" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
