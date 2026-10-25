import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

async function bundleElectron() {
  const isDev = process.env.NODE_ENV === 'development'

  try {
    // 1. Bundle Main Process
    await build({
      entryPoints: [path.join(rootDir, 'electron/main.ts')],
      outfile: path.join(rootDir, 'dist-electron/main.cjs'),
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      external: ['electron'],
      sourcemap: isDev ? 'inline' : false,
      minify: !isDev,
    })

    // 2. Bundle Preload Script
    await build({
      entryPoints: [path.join(rootDir, 'electron/preload.ts')],
      outfile: path.join(rootDir, 'dist-electron/preload.cjs'),
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      external: ['electron'],
      sourcemap: isDev ? 'inline' : false,
      minify: !isDev,
    })

    console.log('[ASTRION Desktop Build] Successfully compiled Electron main and preload bundles.')
  } catch (err) {
    console.error('[ASTRION Desktop Build] Compilation failed:', err)
    process.exit(1)
  }
}

bundleElectron()
