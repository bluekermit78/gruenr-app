
import { TreeSuggestion, DamageReport, Highlight, User } from '../types';
import { supabase, isBackendConfigured } from './supabaseClient';

/**
 * DataService - Übernimmt die Kommunikation mit dem Backend.
 * Implementiert ein "Cloud-First" Pattern mit Fallback auf LocalStorage.
 */
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
      if (!error && data) {
        this.setLocal('users', data);
        return data as User[];
      }
    }
    return this.getLocal('users', []);
  }

  static async saveUser(user: User) {
    if (isBackendConfigured()) {
      await supabase.from('users').insert(user);
    }
    const users = this.getLocal<User[]>('users', []);
    const updated = users.find(u => u.id === user.id) 
      ? users.map(u => u.id === user.id ? user : u)
      : [...users, user];
    this.setLocal('users', updated);
  }

  // --- Vorschläge ---
  static async fetchSuggestions(): Promise<TreeSuggestion[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        this.setLocal('suggestions', data);
        return data as TreeSuggestion[];
      }
    }
    return this.getLocal('suggestions', []);
  }

  static async addSuggestion(suggestion: TreeSuggestion) {
    if (isBackendConfigured()) {
      await supabase.from('suggestions').insert(suggestion);
    }
    const current = this.getLocal<TreeSuggestion[]>('suggestions', []);
    this.setLocal('suggestions', [suggestion, ...current]);
  }

  static async updateSuggestion(suggestion: TreeSuggestion) {
    if (isBackendConfigured()) {
      await supabase.from('suggestions').update(suggestion).eq('id', suggestion.id);
    }
    const current = this.getLocal<TreeSuggestion[]>('suggestions', []);
    this.setLocal('suggestions', current.map(s => s.id === suggestion.id ? suggestion : s));
  }

  static async deleteSuggestion(id: string) {
    if (isBackendConfigured()) {
      await supabase.from('suggestions').delete().eq('id', id);
    }
    const current = this.getLocal<TreeSuggestion[]>('suggestions', []);
    this.setLocal('suggestions', current.filter(s => s.id !== id));
  }

  // --- Schäden ---
  static async fetchReports(): Promise<DamageReport[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase.from('reports').select('*');
      if (!error && data) {
        this.setLocal('reports', data);
        return data as DamageReport[];
      }
    }
    return this.getLocal('reports', []);
  }

  static async addReport(report: DamageReport) {
    if (isBackendConfigured()) await supabase.from('reports').insert(report);
    const current = this.getLocal<DamageReport[]>('reports', []);
    this.setLocal('reports', [report, ...current]);
  }

  // --- Highlights ---
  static async fetchHighlights(): Promise<Highlight[]> {
    if (isBackendConfigured()) {
      const { data, error } = await supabase.from('highlights').select('*');
      if (!error && data) {
        this.setLocal('highlights', data);
        return data as Highlight[];
      }
    }
    return this.getLocal('highlights', []);
  }

  static async addHighlight(highlight: Highlight) {
    if (isBackendConfigured()) await supabase.from('highlights').insert(highlight);
    const current = this.getLocal<Highlight[]>('highlights', []);
    this.setLocal('highlights', [highlight, ...current]);
  }
}
