import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = Number(env.PORT);
  const vitePort = Number(env.VITE_PORT);

  if (!Number.isInteger(apiPort) || !Number.isInteger(vitePort)) {
    throw new Error('Set valid PORT and VITE_PORT values in .env.');
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: vitePort,
      strictPort: true,
      proxy: {
        '/expenses': `http://127.0.0.1:${apiPort}`,
      },
    },
  };
});