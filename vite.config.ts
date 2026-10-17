import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/dinnerRomantique/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
