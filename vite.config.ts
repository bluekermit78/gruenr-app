import * as path from 'path'; // WICHTIG: * as path für ESM Kompatibilität
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Sicherer Pfad für alle Systeme
    const currentDir = process.cwd();
    const env = loadEnv(mode, currentDir, '');
    
    // Sicherer Zugriff auf Keys (verhindert Absturz wenn undefined)
    const geminiKey = env.GEMINI_API_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Fallback auf leeren String verhindert Build-Crash
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
