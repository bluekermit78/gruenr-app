import { TreeSuggestion, DamageReport, Highlight, User } from '../types';
import { supabase, isBackendConfigured } from './supabaseClient';

export class DataService {
  private static CACHE_PREFIX = 'grunr_cache_';

  private static getLocal<T>(key: string, fallback: T): T {
    const data = localStorage.getItem(this.CACHE_PREFIX + key);
    return data ? JSON.parse(data) : fallback;
  }

  private static setLocal(key: string, data: any) {
    localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(data));
  }

  // --- Nutzer ---
  static async fetchUsers(): Promise<User[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) return data as User[];
    }
    return this.getLocal('users', []);
  }

  static async saveUser(user: User) {
    if (isBackendConfigured()) {
      await supabase.from('users').upsert(user); // Upsert verhindert Duplikate
    }
    // Local Fallback Logik vereinfacht
  }

  // --- Vorschläge ---
  static async fetchSuggestions(): Promise<TreeSuggestion[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as TreeSuggestion[];
    }
    return this.getLocal('suggestions', []);
  }

  static async addSuggestion(suggestion: TreeSuggestion) {
    if (isBackendConfigured()) await supabase.from('suggestions').insert(suggestion);
  }

  static async updateSuggestion(suggestion: TreeSuggestion) {
    if (isBackendConfigured()) await supabase.from('suggestions').update(suggestion).eq('id', suggestion.id);
  }

  static async deleteSuggestion(id: string) {
    if (isBackendConfigured()) await supabase.from('suggestions').delete().eq('id', id);
  }

  // --- Schäden ---
  static async fetchReports(): Promise<DamageReport[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase.from('reports').select('*');
      if (!error && data) return data as DamageReport[];
    }
    return this.getLocal('reports', []);
  }

  static async addReport(report: DamageReport) {
    if (isBackendConfigured()) await supabase.from('reports').insert(report);
  }

  static async updateReport(report: DamageReport) {
    if (isBackendConfigured()) await supabase.from('reports').update(report).eq('id', report.id);
  }

  static async deleteReport(id: string) {
    if (isBackendConfigured()) await supabase.from('reports').delete().eq('id', id);
  }

  // --- Highlights ---
  static async fetchHighlights(): Promise<Highlight[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase.from('highlights').select('*');
      if (!error && data) return data as Highlight[];
    }
    return this.getLocal('highlights', []);
  }

  static async addHighlight(highlight: Highlight) {
    if (isBackendConfigured()) await supabase.from('highlights').insert(highlight);
  }

  static async deleteHighlight(id: string) {
    if (isBackendConfigured()) await supabase.from('highlights').delete().eq('id', id);
  }
}
