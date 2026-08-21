import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { ledgerPlugin } from './scripts/vite-ledger-plugin.mjs'

const liveBackend = "https://onetra-veda-live.azurewebsites.net"
const backendTarget = process.env.VITE_BACKEND_TARGET || liveBackend
const proxy = {
  "/api/clinical-recommendation": { target: backendTarget, changeOrigin: true },
  "/api/doctor1-vnext": { target: backendTarget, changeOrigin: true },
  "/doctor3": { target: backendTarget, changeOrigin: true },
}

export default defineConfig({
  plugins: [react(), ledgerPlugin()],
  server: { host: "127.0.0.1", proxy },
  preview: { host: "127.0.0.1", proxy },
})
