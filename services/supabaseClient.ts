import { createClient } from '@supabase/supabase-js';

// Wir lesen die echten Variablen aus Vercel (Environment Variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Logik: Sind beide Schlüssel da?
export const isBackendConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

// Erstelle den echten Client (oder null, falls Konfiguration fehlt)
// @ts-ignore
export const supabase = isBackendConfigured() 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
