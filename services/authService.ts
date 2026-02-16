import { supabase } from './supabaseClient';

export const AuthService = {
  // Registrierung
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: { name: name },
        // WICHTIG: Das hier sagt Supabase: "Komm zurück zu genau dieser Domain"
        // window.location.origin ist automatisch "localhost" beim Testen oder "vercel.app" im Web
        emailRedirectTo: window.location.origin 
      }
    });
    return { data, error };
  },

  // Login
  async signIn(email: string, password: string) {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Logout
  async signOut() {
    const { error } = await supabase!.auth.signOut();
    return { error };
  }
};
