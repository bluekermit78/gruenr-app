import { supabase } from './supabaseClient';

export const AuthService = {
  // Registrierung: Sendet Bestätigungs-Mail (Magic Link Prinzip)
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        // WICHTIG: Hier senden wir den Namen an den SQL Trigger
        data: { name: name } 
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
