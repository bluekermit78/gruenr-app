import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // FIX: Wir holen uns den Pfad sicher über process.cwd() statt __dirname
    const currentDir = process.cwd();
    const env = loadEnv(mode, currentDir, '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // FIX: Hier nutzen wir jetzt die sichere Variable
          '@': path.resolve(currentDir, '.'),
        }
      }
    };
});
