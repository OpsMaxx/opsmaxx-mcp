#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { resolveSession } from './session.js'

/**
 * A protocol relay, and deliberately nothing more.
 *
 * An MCP client talks stdio to this process; every message is forwarded
 * unmodified to the OpsMaxx desktop app's own MCP endpoint over authenticated
 * HTTP on the loopback interface, and every reply is forwarded back. No tool,
 * session or policy logic lives here — it all stays in the app, so a stdio
 * client gets the identical approval and audit path an HTTP client would.
 *
 * This exists because some clients, Claude Desktop among them, cannot express
 * an HTTP MCP server with an Authorization header in their config at all.
 */

const HELP = `
opsmaxx-mcp — connect a stdio MCP client to a running OpsMaxx app

  This is a relay. OpsMaxx itself must be running, with its MCP bridge
  enabled under AI & MCP.

Configuration, in order of precedence:

  OPSMAXX_MCP_TOKEN   session token from AI & MCP -> AI Agents -> New session
  OPSMAXX_MCP_URL     full endpoint, e.g. http://127.0.0.1:5177/mcp
  OPSMAXX_MCP_PORT    port only; the rest of the URL is assumed

  Otherwise the session cached by the opsmaxx CLI is used, so running
  \`opsmaxx claude\` once is enough.

Example, in claude_desktop_config.json:

  {
    "mcpServers": {
      "opsmaxx": {
        "command": "npx",
        "args": ["-y", "@opsmaxx/mcp"],
        "env": { "OPSMAXX_MCP_TOKEN": "...", "OPSMAXX_MCP_PORT": "5177" }
      }
    }
  }
`

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(HELP)
  process.exit(0)
}

const session = resolveSession({ agentKey: process.env.OPSMAXX_AGENT_KEY })

if (!session) {
  // stderr, never stdout: stdout is the MCP channel and anything else on it
  // corrupts the stream for the client.
  process.stderr.write(
    'opsmaxx-mcp: no session found.\n' +
      '  Set OPSMAXX_MCP_TOKEN together with OPSMAXX_MCP_PORT or OPSMAXX_MCP_URL,\n' +
      '  or run `opsmaxx claude` once so the CLI caches a session.\n' +
      '  Run with --help for detail.\n'
  )
  process.exit(1)
}

const stdio = new StdioServerTransport()
const http = new StreamableHTTPClientTransport(new URL(session.url), {
  requestInit: { headers: { Authorization: `Bearer ${session.token}` } }
})

stdio.onmessage = (message) => void http.send(message)
http.onmessage = (message) => void stdio.send(message)

let closing = false
async function shutdown(code = 0) {
  if (closing) return
  closing = true
  await Promise.allSettled([stdio.close(), http.close()])
  process.exit(code)
}

stdio.onclose = () => void shutdown()
http.onclose = () => void shutdown()
stdio.onerror = (err) => process.stderr.write(`opsmaxx-mcp: stdio error: ${err.message}\n`)
http.onerror = (err) => process.stderr.write(`opsmaxx-mcp: http error: ${err.message}\n`)

try {
  await http.start()
  await stdio.start()
  process.stderr.write(`opsmaxx-mcp: relaying to ${session.url} (credentials from ${session.source})\n`)
} catch (err) {
  process.stderr.write(
    `opsmaxx-mcp: could not reach ${session.url}: ${err.message}\n` +
      '  Is OpsMaxx running, with the MCP bridge enabled under AI & MCP -> Security?\n'
  )
  await shutdown(1)
}
