import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
            format: {
                comments: false,
            },
        },
    },
    server: {
        port: 5173,
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true
            }
        }
    }
})
