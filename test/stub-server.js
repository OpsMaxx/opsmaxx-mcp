// Minimal Streamable HTTP MCP server, enough to prove the relay round-trips a
// real initialize handshake and that the bearer token arrives.
import { createServer } from 'node:http'

const TOKEN = process.env.STUB_TOKEN
let sawAuth = null

const server = createServer((req, res) => {
  if (req.method !== 'POST') { res.writeHead(405).end(); return }
  sawAuth = req.headers.authorization
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const msg = JSON.parse(body)
    if (sawAuth !== `Bearer ${TOKEN}`) {
      res.writeHead(401).end('bad token'); return
    }
    if (msg.method === 'initialize') {
      const reply = {
        jsonrpc: '2.0', id: msg.id,
        result: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'stub-opsmaxx', version: '0.0.0' }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'mcp-session-id': 'stub-1' })
      res.end(JSON.stringify(reply))
      return
    }
    res.writeHead(202).end()
  })
})
server.listen(0, '127.0.0.1', () => process.stdout.write(String(server.address().port) + '\n'))
