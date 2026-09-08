import { spawn } from 'node:child_process'
import { once } from 'node:events'

// 1. no configuration at all -> exit 1, guidance on stderr, nothing on stdout
const bare = spawn(process.execPath, ['src/index.js'], {
  env: { PATH: process.env.PATH, HOME: '/nonexistent-home-for-test', APPDATA: '/nonexistent', XDG_CONFIG_HOME: '/nonexistent' },
  stdio: ['pipe', 'pipe', 'pipe']
})
let bo = '', be = ''
bare.stdout.on('data', c => bo += c); bare.stderr.on('data', c => be += c)
const [code] = await once(bare, 'exit')
if (code !== 1) { console.error('FAIL: expected exit 1, got', code); process.exit(1) }
if (bo !== '') { console.error('FAIL: wrote to stdout with no session'); process.exit(1) }
if (!/no session found/.test(be)) { console.error('FAIL: no guidance\n', be); process.exit(1) }
console.log('PASS  no session -> exit 1, guidance on stderr, stdout untouched')

// 2. wrong token against the stub -> reports the failure, does not hang
const stub = spawn(process.execPath, ['test/stub-server.js'], { env: { ...process.env, STUB_TOKEN: 'right' } })
const [portLine] = await once(stub.stdout, 'data')
const port = Number(String(portLine).trim())
const relay = spawn(process.execPath, ['src/index.js'], {
  env: { ...process.env, OPSMAXX_MCP_TOKEN: 'wrong', OPSMAXX_MCP_PORT: String(port) },
  stdio: ['pipe', 'pipe', 'pipe']
})
let re = ''
relay.stderr.on('data', c => re += c)
relay.stdin.write(JSON.stringify({ jsonrpc:'2.0', id:1, method:'initialize', params:{ protocolVersion:'2025-06-18', capabilities:{}, clientInfo:{name:'t',version:'1'} } }) + '\n')
await new Promise(r => setTimeout(r, 2500))
relay.kill(); stub.kill()
if (!/could not reach|http error|401/i.test(re)) { console.error('FAIL: bad token was not reported\n', re); process.exit(1) }
console.log('PASS  wrong token -> reported on stderr, no silent hang')
