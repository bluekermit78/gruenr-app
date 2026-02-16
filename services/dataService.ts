import { TreeSuggestion, DamageReport, Highlight, User } from '../types';
import { supabase, isBackendConfigured } from './supabaseClient';

export class DataService {
  private static CACHE_PREFIX = 'grunr_cache_';

  private static getLocal<T>(key: string, fallback: T): T {
    const data = localStorage.getItem(this.CACHE_PREFIX + key);
    return data ? JSON.parse(data) : fallback;
  }

  // --- Nutzer ---
  static async fetchUsers(): Promise<User[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase!.from('users').select('*');
      if (error) console.error("Error fetching users:", error);
      if (data) return data as User[];
    }
    return [];
  }

  static async saveUser(user: User) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('users').upsert(user);
      if (error) console.error("Error saving user:", error);
    }
  }

  // --- Vorschläge ---
  static async fetchSuggestions(): Promise<TreeSuggestion[]> {
    if (isBackendConfigured()) {
      // WICHTIG: Wir holen auch die Kommentare korrekt ab
      const { data, error } = await supabase!.from('suggestions').select('*').order('createdAt', { ascending: false });
      if (error) console.error("Error fetching suggestions:", error);
      if (data) return data as TreeSuggestion[];
    }
    return [];
  }

  static async addSuggestion(suggestion: TreeSuggestion) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('suggestions').insert(suggestion);
      if (error) {
        console.error("SUPABASE ERROR (addSuggestion):", error);
        alert(`Fehler beim Speichern: ${error.message}\nDetails siehe Konsole.`);
      }
    }
  }

  static async updateSuggestion(suggestion: TreeSuggestion) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('suggestions').update(suggestion).eq('id', suggestion.id);
      if (error) console.error("Error updating suggestion:", error);
    }
  }

  static async deleteSuggestion(id: string) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('suggestions').delete().eq('id', id);
      if (error) console.error("Error deleting suggestion:", error);
    }
  }

  // --- Schäden ---
  static async fetchReports(): Promise<DamageReport[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase!.from('reports').select('*').order('createdAt', { ascending: false });
      if (error) console.error("Error fetching reports:", error);
      if (data) return data as DamageReport[];
    }
    return [];
  }

  static async addReport(report: DamageReport) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('reports').insert(report);
      if (error) {
        console.error("SUPABASE ERROR (addReport):", error);
        alert(`Fehler beim Speichern: ${error.message}`);
      }
    }
  }

  static async updateReport(report: DamageReport) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('reports').update(report).eq('id', report.id);
      if (error) console.error("Error updating report:", error);
    }
  }

  static async deleteReport(id: string) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('reports').delete().eq('id', id);
      if (error) console.error("Error deleting report:", error);
    }
  }

  // --- Highlights ---
  static async fetchHighlights(): Promise<Highlight[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase!.from('highlights').select('*').order('createdAt', { ascending: false });
      if (error) console.error("Error fetching highlights:", error);
      if (data) return data as Highlight[];
    }
    return [];
  }

  static async addHighlight(highlight: Highlight) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('highlights').insert(highlight);
      if (error) {
        console.error("SUPABASE ERROR (addHighlight):", error);
        alert(`Fehler beim Speichern: ${error.message}`);
      }
    }
  }

  static async deleteHighlight(id: string) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('highlights').delete().eq('id', id);
      if (error) console.error("Error deleting highlight:", error);
    }
  }
  
   // NEU: User löschen
  static async deleteUser(id: string) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('users').delete().eq('id', id);
      if (error) {
        console.error("Error deleting user:", error);
        alert(`Fehler beim Löschen des Users: ${error.message}`);
      }
    }
  } 
}
