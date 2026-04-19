# Build your first MCP server

MCP — the Model Context Protocol — is how Claude and other LLM clients talk to external tools and data sources. An MCP server is a small program that exposes tools, resources, or prompts; Claude Code (and Claude Desktop, and Claude.ai via Custom Connectors) can connect to one and use what it offers. This lesson takes you from zero to a running server in 10 minutes.

## What you'll build

A one-tool server that returns the current weather for a location. Silly, but useful as a template — swap "weather" for "query my internal docs DB" or "search my Notion workspace" and you have the real thing.

## The two transports

- **stdio** — the server runs locally; Claude spawns it as a subprocess and talks over stdin/stdout. Simplest. Right for local, per-user servers.
- **HTTP / SSE** — the server runs somewhere (localhost, a VPS, or behind an org proxy). Claude opens an HTTP connection. Right for team servers and cloud deployments.

Start with stdio. Graduate to HTTP when you need to share.

## Python — FastMCP

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather")

@mcp.tool()
async def get_weather(location: str) -> str:
    """Get current weather for a location."""
    return f"The weather in {location} is 73°F and sunny."

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

Install: `pip install mcp`. Save as `weather_server.py`. Done.

## TypeScript — the official SDK

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "weather", version: "1.0.0" });

server.registerTool(
  "get_weather",
  {
    description: "Get current weather for a location",
    inputSchema: { location: z.string() },
  },
  async ({ location }) => ({
    content: [{ type: "text", text: `The weather in ${location} is 73°F and sunny.` }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

Install: `npm i @modelcontextprotocol/sdk zod`. Same shape: declare a tool, describe its input schema, return content.

## Telling Claude Code about it

Add the server via the CLI:

```bash
claude mcp add --transport stdio weather -- python /path/to/weather_server.py
```

Or, for team-shared config committed to the repo, drop a `.mcp.json` at the repo root:

```json
{
  "mcpServers": {
    "weather": {
      "type": "stdio",
      "command": "python",
      "args": ["./weather_server.py"]
    }
  }
}
```

Restart your Claude Code session. Ask it: "What's the weather in Tokyo?" It'll find and call your tool.

## What a good tool description looks like

Claude picks tools from their description. Bad description → Claude never calls it. Good description → Claude uses it exactly when it should.

- **State the verb.** "Get", "Search", "Create", "Summarize".
- **State the subject.** "the current weather", "issues in the tracker", "files matching a glob".
- **State the constraint.** "for a specific location", "by author", "up to N results".

Good: *"Search the internal wiki for articles matching a query, returning up to 5 results ranked by recency."*

Bad: *"Wiki tool."*

## When to NOT build an MCP server

- If a first-party Claude tool already covers it (Bash, Read, Edit, WebFetch), use that.
- If you're building a one-off script, a plain CLI + `Bash(...)` permission is simpler.
- If what you need is reference material Claude should always see, put it in CLAUDE.md instead.

## Next step

Add a second tool. Then a third. Once you hit 5-6 tools in one server, you're ready to think about auth, remote deployment, and the HTTP transport — but not before.
