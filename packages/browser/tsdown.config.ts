import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  target: 'es2020',
  dts: true,
  platform: 'browser',
  exports: true,
});
