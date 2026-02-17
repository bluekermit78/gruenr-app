import { TreeSuggestion, DamageReport, Highlight, User } from '../types';
import { supabase, isBackendConfigured } from './supabaseClient';

export class DataService {
  private static CACHE_PREFIX = 'grunr_cache_';

  // --- HILFSMETHODE: BILDER LÖSCHEN ---
  /**
   * Nimmt eine Liste von öffentlichen URLs, extrahiert den Pfad
   * und löscht die Dateien aus dem Supabase Storage Bucket 'images'.
   */
  private static async deleteImagesFromStorage(imageUrls: string[] | undefined) {
    if (!imageUrls || imageUrls.length === 0 || !isBackendConfigured()) return;

    try {
      const pathsToDelete: string[] = [];

      imageUrls.forEach(url => {
        // Wir müssen den Pfad extrahieren. 
        // URL Format ist z.B.: .../storage/v1/object/public/images/uploads/123.jpg
        // Wir brauchen: uploads/123.jpg
        const bucketMatch = url.split('/images/');
        if (bucketMatch.length > 1) {
          // Nimmt den Teil nach 'images/'
          pathsToDelete.push(bucketMatch[1]);
        }
      });

      if (pathsToDelete.length > 0) {
        const { error } = await supabase!.storage
          .from('images')
          .remove(pathsToDelete);
        
        if (error) {
          console.error("Fehler beim Löschen der Bilder aus Storage:", error);
        } else {
          console.log(`${pathsToDelete.length} Bilder erfolgreich aus Storage gelöscht.`);
        }
      }
    } catch (e) {
      console.error("Exception beim Bildlöschen:", e);
    }
  }

  /**
   * Lädt ein Base64-Bild in den Supabase Storage Bucket 'images' hoch
   * und gibt die öffentliche URL zurück.
   */
  static async uploadImage(base64Data: string): Promise<string | null> {
    if (!isBackendConfigured()) return null;

    try {
      const res = await fetch(base64Data);
      const blob = await res.blob();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const fileName = `uploads/${timestamp}_${random}.jpg`;

      const { error } = await supabase!.storage
        .from('images')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

      if (error) throw error;

      const { data: publicUrlData } = supabase!.storage
        .from('images')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (e) {
      console.error('Fehler beim Bild-Upload:', e);
      return null;
    }
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

  static async deleteUser(id: string) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('users').delete().eq('id', id);
      if (error) {
        console.error("Error deleting user:", error);
        alert(`Fehler beim Löschen des Users: ${error.message}`);
      }
    }
  }

  // --- Vorschläge ---
  static async fetchSuggestions(): Promise<TreeSuggestion[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase!.from('suggestions').select('*').order('createdAt', { ascending: false });
      if (error) console.error("Error fetching suggestions:", error);
      if (data) return data.map((s: any) => ({ ...s, comments: s.comments || [] })) as TreeSuggestion[];
    }
    return [];
  }

  static async addSuggestion(suggestion: TreeSuggestion) {
    if (isBackendConfigured()) {
      const { error } = await supabase!.from('suggestions').insert(suggestion);
      if (error) {
        console.error("SUPABASE ERROR (addSuggestion):", error);
        alert(`Fehler beim Speichern: ${error.message}`);
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
      // 1. Hole den Eintrag erst, um die Bilder-URLs zu bekommen
      const { data } = await supabase!.from('suggestions').select('images').eq('id', id).single();
      
      // 2. Bilder aus Storage löschen
      if (data && data.images) {
        await this.deleteImagesFromStorage(data.images);
      }

      // 3. Datenbank-Eintrag löschen
      const { error } = await supabase!.from('suggestions').delete().eq('id', id);
      if (error) console.error("Error deleting suggestion:", error);
    }
  }

  // --- Schäden ---
  static async fetchReports(): Promise<DamageReport[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase!.from('reports').select('*').order('createdAt', { ascending: false });
      if (error) console.error("Error fetching reports:", error);
      if (data) return data.map((r: any) => ({ ...r, comments: r.comments || [] })) as DamageReport[];
    }
    return [];
  }

  static async addReport(report: DamageReport) {
    if (isBackendConfigured()) {
      const reportToSave = { ...report, comments: report.comments || [] };
      const { error } = await supabase!.from('reports').insert(reportToSave);
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
      // 1. Bilder holen
      const { data } = await supabase!.from('reports').select('images').eq('id', id).single();
      
      // 2. Bilder löschen
      if (data && data.images) {
        await this.deleteImagesFromStorage(data.images);
      }

      // 3. Eintrag löschen
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
      // 1. Bilder holen
      const { data } = await supabase!.from('highlights').select('images').eq('id', id).single();
      
      // 2. Bilder löschen
      if (data && data.images) {
        await this.deleteImagesFromStorage(data.images);
      }

      // 3. Eintrag löschen
      const { error } = await supabase!.from('highlights').delete().eq('id', id);
      if (error) console.error("Error deleting highlight:", error);
    }
  }
}
