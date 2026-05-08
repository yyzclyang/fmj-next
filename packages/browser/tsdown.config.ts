import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  target: 'es2015',
  dts: true,
  platform: 'browser',
  exports: true,
  deps: {
    neverBundle: ['@fmj-next/core'],
  },
});
