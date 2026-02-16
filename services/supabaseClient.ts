import { createClient } from '@supabase/supabase-js';

// Nutze Vite Environment Variables für Sicherheit
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL oder Key fehlt in den Umgebungsvariablen!');
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

export const isBackendConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};;
