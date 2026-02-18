import { TreeSuggestion, DamageReport, Highlight, User } from '../types';
import { supabase, isBackendConfigured } from './supabaseClient';

export class DataService {
  private static CACHE_PREFIX = 'grunr_cache_';
  // Limitierung der Einträge, um Ladezeiten zu verkürzen
  private static LOAD_LIMIT = 100;

  // --- HILFSMETHODE: BILDER LÖSCHEN ---
  private static async deleteImagesFromStorage(imageUrls: string[] | undefined) {
    if (!imageUrls || imageUrls.length === 0 || !isBackendConfigured()) return;
    try {
      const pathsToDelete: string[] = [];
      imageUrls.forEach(url => {
        const bucketMatch = url.split('/images/');
        if (bucketMatch.length > 1) pathsToDelete.push(bucketMatch[1]);
      });
      if (pathsToDelete.length > 0) {
        await supabase!.storage.from('images').remove(pathsToDelete);
      }
    } catch (e) {
      console.error("Exception beim Bildlöschen:", e);
    }
  }

  // --- Upload ---
  static async uploadImage(base64Data: string): Promise<string | null> {
    if (!isBackendConfigured()) return null;
    try {
      const res = await fetch(base64Data);
      const blob = await res.blob();
      const fileName = `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
      const { error } = await supabase!.storage.from('images').upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      const { data } = supabase!.storage.from('images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (e) {
      console.error('Fehler beim Bild-Upload:', e);
      return null;
    }
  }

  // --- Nutzer ---
  static async fetchUsers(): Promise<User[]> {
    if (isBackendConfigured()) {
      // Users Tabelle ist oft klein, hier kein Limit zwingend, aber sicherer
      const { data, error } = await supabase!.from('users').select('*').limit(200); 
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

  static async deleteUser(id: string) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('users').delete().eq('id', id);
      if (error) alert(`Fehler beim Löschen des Users: ${error.message}`);
    }
  }

  // --- Vorschläge ---
  static async fetchSuggestions(): Promise<TreeSuggestion[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase!
        .from('suggestions')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(this.LOAD_LIMIT); // HIER: Begrenzung

      if (error) console.error("Error fetching suggestions:", error);
      if (data) return data.map((s: any) => ({ ...s, comments: s.comments || [] })) as TreeSuggestion[];
    }
    return [];
  }

  static async addSuggestion(suggestion: TreeSuggestion) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('suggestions').insert(suggestion);
      if (error) alert(`Fehler beim Speichern: ${error.message}`);
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
      const { data } = await supabase!.from('suggestions').select('images').eq('id', id).single();
      if (data?.images) await this.deleteImagesFromStorage(data.images);
      const { error } = await supabase!.from('suggestions').delete().eq('id', id);
      if (error) console.error("Error deleting suggestion:", error);
    }
  }

  // --- Schäden ---
  static async fetchReports(): Promise<DamageReport[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase!
        .from('reports')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(this.LOAD_LIMIT); // HIER: Begrenzung

      if (error) console.error("Error fetching reports:", error);
      if (data) return data.map((r: any) => ({ ...r, comments: r.comments || [] })) as DamageReport[];
    }
    return [];
  }

  static async addReport(report: DamageReport) {
    if (isBackendConfigured()) {
      const reportToSave = { ...report, comments: report.comments || [] };
      const { error } = await supabase!.from('reports').insert(reportToSave);
      if (error) alert(`Fehler beim Speichern: ${error.message}`);
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
      const { data } = await supabase!.from('reports').select('images').eq('id', id).single();
      if (data?.images) await this.deleteImagesFromStorage(data.images);
      const { error } = await supabase!.from('reports').delete().eq('id', id);
      if (error) console.error("Error deleting report:", error);
    }
  }

  // --- Highlights ---
  static async fetchHighlights(): Promise<Highlight[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase!
        .from('highlights')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(this.LOAD_LIMIT); // HIER: Begrenzung

      if (error) console.error("Error fetching highlights:", error);
      if (data) return data as Highlight[];
    }
    return [];
  }

  static async addHighlight(highlight: Highlight) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('highlights').insert(highlight);
      if (error) alert(`Fehler beim Speichern: ${error.message}`);
    }
  }

  static async deleteHighlight(id: string) {
    if (isBackendConfigured()) {
      const { data } = await supabase!.from('highlights').select('images').eq('id', id).single();
      if (data?.images) await this.deleteImagesFromStorage(data.images);
      const { error } = await supabase!.from('highlights').delete().eq('id', id);
      if (error) console.error("Error deleting highlight:", error);
    }
  }
}
