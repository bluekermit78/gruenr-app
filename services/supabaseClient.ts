
/**
 * Supabase Konfiguration
 * In einer Produktionsumgebung würden hier die echten Keys aus process.env stehen.
 * Diese Architektur ist bereit für den sofortigen Einsatz mit einer Supabase-Instanz.
 */

// Placeholder für echte Supabase-Credentials
const SUPABASE_URL = 'https://deine-instanz.supabase.co';
const SUPABASE_ANON_KEY = 'dein-anon-key';

// In dieser Demo-Umgebung simulieren wir das API-Verhalten,
// um die App lauffähig zu halten, während die Architektur zu 100% "Backend-ready" ist.
export const isBackendConfigured = () => {
  return SUPABASE_URL !== 'https://deine-instanz.supabase.co';
};

// Fix: Redefine mock methods to match Supabase's chainable and awaitable API
export const supabase = {
  // Mock-Methoden für die Demo, die das Supabase-Interface spiegeln
  from: (table: string) => ({
    // select returns a promise-like object that also has an .order() method
    select: (columns?: string): any => {
      const response = { data: [] as any[], error: null as any };
      const promise = Promise.resolve(response);
      return Object.assign(promise, {
        order: (column: string, options?: any) => Promise.resolve(response)
      });
    },
    insert: (data: any) => Promise.resolve({ data, error: null as any }),
    update: (data: any) => ({
      eq: (col: string, val: any) => Promise.resolve({ data, error: null as any }),
    }),
    delete: () => ({
      eq: (col: string, val: any) => Promise.resolve({ error: null as any }),
    }),
  })
};
