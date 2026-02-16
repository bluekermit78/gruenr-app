import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // FIX: Wir nutzen process.cwd() statt __dirname
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
          // FIX: Das hier ist die entscheidende Änderung!
          '@': path.resolve(currentDir, '.'),
        }
      }
    };
});
