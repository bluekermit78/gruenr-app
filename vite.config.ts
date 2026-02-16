import * as path from 'path'; // Änderung: "* as path" ist sicherer
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const currentDir = process.cwd();
    const env = loadEnv(mode, currentDir, '');
    
    // WICHTIG: Das hier hat in deinem Code gefehlt!
    // Wir garantieren, dass es ein String ist (zur Not leer), damit der Build nicht abstürzt.
    const geminiKey = env.GEMINI_API_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Jetzt stürzt JSON.stringify nicht mehr ab, weil geminiKey garantiert existiert
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(currentDir, '.'),
        }
      }
    };
});
