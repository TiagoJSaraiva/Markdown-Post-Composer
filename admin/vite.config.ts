/*
 * Vite build and dev-server configuration of the admin panel (React plugin).
 * Also read by Vitest when no dedicated test config applies.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
})
