import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
    },
    define: {
        'process.env': {}
    },
    server: {
        warmup: {
            clientFiles: [
                './src/pages/SageOS.jsx',
                './src/pages/SubscriberGate.jsx',
                './src/App.jsx',
            ],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            }
        }
    }
});
