# MCP Client Setup Guide

This guide details how to configure external MCP (Model Context Protocol) clients to connect to the Assistant's Streamable HTTP endpoint.

---

## 1. Prerequisites & Server URL

Ensure the server is running locally or behind a secure reverse proxy:

- **Local Address**: `http://localhost:3001/mcp`
- **Transport**: Streamable HTTP (Standard HTTP POST + Server-Sent Events SSE)
- **Protocol Version**: Official MCP TypeScript SDK (`@modelcontextprotocol/sdk`)

To verify the server is listening, run:
```bash
curl -i -X GET http://localhost:3001/healthz
# Expected: HTTP/1.1 200 OK {"ok": true}
```

---

## 2. Configuration for Common Clients

### 2.1 Claude Desktop

Add the server to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "alexa-assistant": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

If authentication is enabled via `AUTH_TOKEN`, supply the header:

```json
{
  "mcpServers": {
    "alexa-assistant": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer your-secret-token"
      }
    }
  }
}
```

---

### 2.2 Cursor IDE

In Cursor IDE Settings -> Features -> MCP Servers:

1. Click **Add New MCP Server**.
2. **Name**: `alexa-assistant`
3. **Type**: `SSE` / `Streamable HTTP`
4. **URL**: `http://localhost:3001/mcp`
5. Save and reload Cursor window. The tools will show up in the Agent Composer.

---

### 2.3 Official TypeScript MCP Client

To programmatically connect from any Node.js or TypeScript application:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3001/mcp"), {
    requestInit: {
      headers: {
        "Authorization": "Bearer optional-secret-token"
      }
    }
  });

  const client = new Client({ name: "my-mcp-client", version: "1.0.0" });
  await client.connect(transport);

  // 1. Discover registered tools
  const toolsList = await client.listTools();
  console.log("Registered Tools:", toolsList.tools.map(t => t.name));

  // 2. Execute a question
  const response = await client.callTool({
    name: "ask_assistant",
    arguments: {
      question: "How is the project configured and what are the primary dependencies?"
    }
  });

  console.log("Answer:", (response.content as any)[0].text);

  await client.close();
}

main().catch(console.error);
```

---

## 3. Registered Tool Catalog

When connected, the client will automatically discover:

| Tool | Purpose | Primary Arguments |
|---|---|---|
| `ask_assistant` | Universal natural-language question answering with evidence grounding | `question`, `scope` |
| `search_knowledge` | Lexical BM25 search across indexed project documents and Markdown | `query`, `limit` |
| `inspect_repository` | Workspace structure, dependency analysis, file inspection | `action`, `path` |
| `analyze_error` | Root cause analysis of error messages, stack traces, and logs | `errorText`, `stackTrace` |
| `manage_memory` | Save, retrieve, list, or delete scoped user preferences | `action`, `key`, `value` |
| `get_system_status` | Comprehensive diagnostics of Ollama, SQLite, and tools | (none) |
| *Digital Detective Tools* | Scam and fraud verification tools for backwards compatibility | `url`, `claims`, `analysis` |
