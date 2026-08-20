import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@zk-kyc/verifier-sdk': path.resolve(__dirname, '../../src/index.ts'),
      '@zk-kyc/zk-core': path.resolve(__dirname, '../../../zk-core/src/index.ts'),
      '@zk-kyc/shared-types': path.resolve(__dirname, '../../../shared-types/src/index.ts'),
    },
  },
  server: {
    port: 5174,
  },
});
