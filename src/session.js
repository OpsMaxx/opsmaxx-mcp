import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

/**
 * Where the `opsmaxx` CLI caches the sessions it pairs. Reading the same file
 * means someone who has already run `opsmaxx claude` once does not have to
 * paste a token here as well.
 *
 * Kept byte-for-byte in step with src/cli/paths.ts in the OpsMaxx repository.
 */
function configDir() {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'OpsMaxx', 'cli')
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'OpsMaxx', 'cli')
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'opsmaxx', 'cli')
}

function fromCache(agentKey) {
  let cache
  try {
    cache = JSON.parse(readFileSync(join(configDir(), 'sessions.json'), 'utf8'))
  } catch {
    return null
  }
  // Prefer the named agent, then any entry that has not expired: a token is
  // scoped to a workspace and an access group, not to which client asked.
  const candidates = agentKey && cache[agentKey] ? [cache[agentKey]] : Object.values(cache)
  for (const entry of candidates) {
    if (!entry?.token || !entry?.port) continue
    if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= Date.now()) continue
    return { token: entry.token, port: entry.port, source: 'the opsmaxx CLI session cache' }
  }
  return null
}

/**
 * Resolves how to reach the bridge. Explicit environment wins, because that is
 * what someone writing an mcp.json by hand will reach for; the CLI cache is
 * the convenience path behind it.
 */
export function resolveSession({ agentKey } = {}) {
  const token = process.env.OPSMAXX_MCP_TOKEN
  const url = process.env.OPSMAXX_MCP_URL
  const port = process.env.OPSMAXX_MCP_PORT

  if (token && (url || port)) {
    return {
      token,
      url: url || `http://127.0.0.1:${port}/mcp`,
      source: 'the environment'
    }
  }

  const cached = fromCache(agentKey)
  if (cached) {
    return { token: cached.token, url: `http://127.0.0.1:${cached.port}/mcp`, source: cached.source }
  }

  return null
}
