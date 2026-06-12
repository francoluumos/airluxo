import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // AIRLUXO owns port 4180 for the E2E preview server (see the port registry in
  // TESTING.md). strictPort makes a clash fail loudly instead of silently moving
  // to another port — which would let a second project's tests hit this app.
  preview: { port: 4180, strictPort: true },
})
