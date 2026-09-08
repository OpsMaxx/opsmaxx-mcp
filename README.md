# @opsmaxx/mcp

Connect any stdio MCP client to a running [OpsMaxx](https://opsmaxx.dev) desktop app.

```bash
npx -y @opsmaxx/mcp
```

## Why this exists

OpsMaxx already exposes an MCP server over Streamable HTTP on `127.0.0.1`, and
clients that can express an HTTP server with an `Authorization` header — Claude
Code, Codex — should use that directly. It is one command:

```bash
opsmaxx claude
```

Some clients cannot. Claude Desktop, notably, does not read `url` or `headers`
from `claude_desktop_config.json` at all, so an HTTP MCP server is simply not
expressible there. This package is the adapter for those: stdio in, authenticated
HTTP out.

## What it does, and does not

It is a protocol relay. Every message is forwarded unmodified in both
directions. No tool, session or policy logic lives here — access groups,
approvals, secret redaction and the audit log all stay in the app, so a stdio
client gets exactly the same treatment an HTTP client would.

It talks only to `127.0.0.1`. It is not a server, it holds no state, and it
cannot reach anything OpsMaxx would not already allow.

**OpsMaxx must be running**, with the bridge enabled under **AI & MCP**.

## Configuration

Environment first, then the session the `opsmaxx` CLI has already cached:

| Variable | Meaning |
|---|---|
| `OPSMAXX_MCP_TOKEN` | Session token from **AI & MCP → AI Agents → New AI agent session** |
| `OPSMAXX_MCP_PORT` | Bridge port, shown under **AI & MCP → Security** |
| `OPSMAXX_MCP_URL` | Full endpoint instead of the port, e.g. `http://127.0.0.1:5177/mcp` |

If none are set it reads the session cached by the CLI, so running
`opsmaxx claude` once is enough and there is no token to paste.

### Claude Desktop

```json
{
  "mcpServers": {
    "opsmaxx": {
      "command": "npx",
      "args": ["-y", "@opsmaxx/mcp"],
      "env": {
        "OPSMAXX_MCP_TOKEN": "your-session-token",
        "OPSMAXX_MCP_PORT": "5177"
      }
    }
  }
}
```

Restart Claude Desktop afterwards.

## A note on the token

The token is scoped to one workspace and one access group, and it is the same
secret you would otherwise paste into a client's config by hand. It is not an
SSH key and it is not a vault password: an agent holding it still never
receives an SSH password, a private key, a database credential, a hostname or
an interactive root shell. See the
[threat model](https://github.com/OpsMaxx/OpsMaxx/blob/main/docs/AI-SECURITY.md).

## Licence

MIT. Source: <https://github.com/OpsMaxx/OpsMaxx>
