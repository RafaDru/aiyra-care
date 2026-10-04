import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const monorepoRoot = resolve(__dirname, '../../')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, monorepoRoot, '')
  const stackKey = env.OPS_CONSOLE_STACK_KEY?.trim() || ''

  return {
    envDir: monorepoRoot,
    define: stackKey
      ? { 'import.meta.env.VITE_OPS_CONSOLE_STACK_KEY': JSON.stringify(stackKey) }
      : {},
    plugins: [react()],
    resolve: {
      alias: {
        '@aiyra-care/design-tokens': resolve(monorepoRoot, 'packages/design-tokens/src/index.ts'),
      },
    },
    root: resolve(__dirname, 'src/client'),
    build: {
      outDir: resolve(__dirname, 'dist/client'),
      emptyOutDir: true,
    },
    server: {
      middlewareMode: true,
    },
  }
})
