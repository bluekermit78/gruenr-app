
import { TreeSuggestion, DamageReport, Highlight, User } from '../types';

/**
 * StorageService - Zentrale Stelle für Daten-Persistenz.
 * Implementiert mit LocalStorage als Fallback.
 */
export class StorageService {
  private static PREFIX = 'grunr_';

  // Hilfsmethode zum Laden
  private static load<T>(key: string, defaultValue: T): T {
    const stored = localStorage.getItem(this.PREFIX + key);
    if (!stored) return defaultValue;
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(`Fehler beim Laden von ${key}:`, e);
      return defaultValue;
    }
  }

  // Hilfsmethode zum Speichern mit Error-Handling (Quota)
  private static save(key: string, value: any): boolean {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('Speicherplatz überschritten! Nutze In-Memory.');
      }
      return false;
    }
  }

  static async getUsers(defaults: User[]): Promise<User[]> {
    return this.load('users', defaults);
  }

  static async saveUsers(users: User[]) {
    this.save('users', users);
  }

  static async getCurrentUser(): Promise<User | null> {
    return this.load('current_user', null);
  }

  static async saveCurrentUser(user: User | null) {
    this.save('current_user', user);
  }

  static async getSuggestions(defaults: TreeSuggestion[]): Promise<TreeSuggestion[]> {
    return this.load('suggestions', defaults);
  }

  static async saveSuggestions(data: TreeSuggestion[]) {
    this.save('suggestions', data);
  }

  static async getReports(defaults: DamageReport[]): Promise<DamageReport[]> {
    return this.load('reports', defaults);
  }

  static async saveReports(data: DamageReport[]) {
    this.save('reports', data);
  }

  static async getHighlights(defaults: Highlight[]): Promise<Highlight[]> {
    return this.load('highlights', defaults);
  }

  static async saveHighlights(data: Highlight[]) {
    this.save('highlights', data);
  }
}
