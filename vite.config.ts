import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.ELECTRON === 'true' ? './' : process.env.VITE_BASE_PATH || '/music-player/',
  plugins: [react()],
})
