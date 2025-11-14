import path from 'path'
import fs from 'fs/promises'
import os from 'os'

const ENV_KEYS = ['CTH_RUNTIME_ROOT','CRAFT_TOOLS_RUNTIME_ROOT','CRAFT_TOOLS_NAS_ROOT']

export function getEnvRuntimeRoot() {
  const found = ENV_KEYS.map(k => process.env[k]).find(v => typeof v === 'string' && v.trim().length > 0)
  return found ? path.resolve(found.trim()) : null
}

export async function defaultRuntimeRoot() {
  // Try to use Electron's app.getPath('userData') when available (packaged runtime)
  try {
    const electron = await import('electron')
    if (electron && electron.app && typeof electron.app.getPath === 'function') {
      return path.resolve(electron.app.getPath('userData'), 'data')
    }
  } catch (err) {
    // Electron not available in test/dev environments; fall back to a user-home path
  }

  // Fallback for tests and non-electron environments
  return path.resolve(os.homedir(), '.craft_tools_hub', 'data')
}

export async function loadPackagedRuntimeConfig() {
  try {
    const configPath = path.join(process.resourcesPath || '', 'runtime-config.json')
    const data = await fs.readFile(configPath, 'utf8')
    const parsed = JSON.parse(data)
    return parsed?.runtimeRoot ? String(parsed.runtimeRoot) : null
  } catch (err) {
    return null
  }
}

export async function resolveRuntimeRoot() {
  const env = getEnvRuntimeRoot()
  if (env) return env
  const pkg = await loadPackagedRuntimeConfig()
  if (pkg) return path.resolve(pkg)
  return defaultRuntimeRoot()
}

export async function checkRuntimeAccess(root) {
  try {
    await fs.access(root)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err.message || err), code: err.code }
  }
}

export default {
  getEnvRuntimeRoot,
  defaultRuntimeRoot,
  loadPackagedRuntimeConfig,
  resolveRuntimeRoot,
  checkRuntimeAccess
}
