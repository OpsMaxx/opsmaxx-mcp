// Drives the real bin over stdio, against the stub, and asserts the reply
// comes back intact.
import { spawn } from 'node:child_process'
import { once } from 'node:events'

const TOKEN = 'test-token-abc'
const stub = spawn(process.execPath, ['test/stub-server.js'], { env: { ...process.env, STUB_TOKEN: TOKEN } })
const [portLine] = await once(stub.stdout, 'data')
const port = Number(String(portLine).trim())

const relay = spawn(process.execPath, ['src/index.js'], {
  env: { ...process.env, OPSMAXX_MCP_TOKEN: TOKEN, OPSMAXX_MCP_PORT: String(port) },
  stdio: ['pipe', 'pipe', 'pipe']
})

let out = ''
relay.stdout.on('data', (c) => (out += c))
let err = ''
relay.stderr.on('data', (c) => (err += c))

relay.stdin.write(JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } }
}) + '\n')

await new Promise((r) => setTimeout(r, 2500))
relay.kill(); stub.kill()

const line = out.split('\n').find((l) => l.trim().startsWith('{'))
if (!line) { console.error('FAIL: nothing on stdout\nstderr:', err); process.exit(1) }
const reply = JSON.parse(line)
const name = reply?.result?.serverInfo?.name
if (name !== 'stub-opsmaxx') { console.error('FAIL: unexpected reply', line); process.exit(1) }
if (!/relaying to http/.test(err)) { console.error('FAIL: no startup line on stderr'); process.exit(1) }
if (/\{/.test(err.replace(/relaying to[^\n]*/g, ''))) { console.error('FAIL: protocol leaked to stderr'); process.exit(1) }
console.log('PASS  initialize round-tripped, bearer token accepted, stdout carried only protocol')
