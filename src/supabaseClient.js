import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Variables d'environnement Supabase manquantes. Copiez .env.example vers .env et renseignez-les.");
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

export const AUTH_DOMAIN = "kibegnon.local"; // identifiant -> identifiant@kibegnon.local
